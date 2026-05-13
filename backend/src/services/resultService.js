const AppError = require('../utils/appError');
const resultRepository = require('../repositories/resultRepository');
const gradeRepository = require('../repositories/gradeRepository');
const academicRepository = require('../repositories/academicRepository');
const profileRepository = require('../repositories/profileRepository');
const userRepository = require('../repositories/userRepository');
const pool = require('../config/database');

const validateResultOwnership = async (resultId, user) => {
  const result = await resultRepository.getResultById(resultId);
  if (!result) {
    throw new AppError('Result not found', 404);
  }
  const lecturer = await profileRepository.getLecturerByUserId(user.id);
  if (!lecturer || result.lecturer_id !== lecturer.id) {
    throw new AppError('Only the assigned lecturer can manage this result', 403);
  }
  return result;
};

const getGradeForScore = async (university_id, score) => {
  const mapping = await gradeRepository.getGradeMapping(university_id, score);
  if (!mapping) {
    throw new AppError('Unable to calculate grade for score', 500);
  }
  return mapping;
};

exports.createDraftResult = async ({ creator, course_id, academic_session_id, semester_id }) => {
  if (!creator.roles.includes('lecturer')) {
    throw new AppError('Only lecturers can create draft results', 403);
  }

  const lecturer = await profileRepository.getLecturerByUserId(creator.id);
  if (!lecturer) {
    throw new AppError('Lecturer profile not found', 404);
  }

  const course = await academicRepository.getCourseById(course_id);
  if (!course || course.university_id !== creator.university_id) {
    throw new AppError('Course not found for lecturer university', 404);
  }

  return resultRepository.createResult({
    university_id: creator.university_id,
    academic_session_id,
    semester_id,
    course_id,
    lecturer_id: lecturer.id,
    created_by: creator.id,
  });
};

exports.uploadScores = async ({ creator, result_id, scores }) => {
  const result = await validateResultOwnership(result_id, creator);
  if (!['draft', 'corrected'].includes(result.current_status)) {
    throw new AppError('Scores can only be uploaded to draft or corrected results', 400);
  }

  const course = await academicRepository.getCourseById(result.course_id);
  if (!course) {
    throw new AppError('Course not found', 404);
  }

  const uploaded = [];
  for (const score of scores) {
    const student = await profileRepository.getStudentById(score.student_id);
    if (!student) {
      throw new AppError(`Student ${score.student_id} not found`, 404);
    }
    if (student.university_id !== creator.university_id) {
      throw new AppError('Student does not belong to the same university', 400);
    }

    const totalScore = Number(score.ca_score) + Number(score.exam_score);
    const mapping = await getGradeForScore(creator.university_id, totalScore);
    const existingItem = await resultRepository.getResultItem(result_id, score.student_id);

    if (existingItem) {
      const updatedItem = await resultRepository.updateResultItemScores(existingItem.id, score.ca_score, score.exam_score, mapping.grade_letter, mapping.grade_point);
      await pool.query(
        `INSERT INTO result_entries (result_item_id, student_id, course_id, ca_score, exam_score, grade, grade_point, credit_unit, status, recorded_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)`,
        [existingItem.id, score.student_id, course.id, score.ca_score, score.exam_score, mapping.grade_letter, mapping.grade_point, course.credit_unit, existingItem.status, score.notes || null]
      );
      uploaded.push(updatedItem);
    } else {
      const item = await resultRepository.createResultItem({
        result_id,
        student_id: score.student_id,
        course_id: course.id,
        ca_score: score.ca_score,
        exam_score: score.exam_score,
        grade: mapping.grade_letter,
        grade_point: mapping.grade_point,
        credit_unit: course.credit_unit,
        status: 'draft',
      });
      await pool.query(
        `INSERT INTO result_entries (result_item_id, student_id, course_id, ca_score, exam_score, grade, grade_point, credit_unit, status, recorded_at, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10)`,
        [item.id, score.student_id, course.id, score.ca_score, score.exam_score, mapping.grade_letter, mapping.grade_point, course.credit_unit, item.status, score.notes || null]
      );
      uploaded.push(item);
    }
  }
  return uploaded;
};

const updateItemStatuses = async (result_id, status) => {
  await pool.query(`UPDATE result_items SET status = $1, updated_at = now() WHERE result_id = $2`, [status, result_id]);
};

const logTransition = async ({ result_id, user_id, from_status, to_status, comment }) => {
  return resultRepository.logResultStatus({
    result_id,
    changed_by: user_id,
    from_status,
    to_status,
    comment,
  });
};

exports.listResults = async (user) => {
  if (user.roles.includes('system_admin')) {
    return resultRepository.getAllResults();
  }

  if (user.roles.includes('university_admin') || user.roles.includes('exam_officer') || user.roles.includes('dean') || user.roles.includes('hod')) {
    return resultRepository.getResultsByUniversity(user.university_id);
  }

  if (user.roles.includes('lecturer')) {
    const lecturer = await profileRepository.getLecturerByUserId(user.id);
    if (!lecturer) {
      throw new AppError('Lecturer profile not found', 404);
    }
    return resultRepository.getResultsByLecturer(lecturer.id);
  }

  if (user.roles.includes('student')) {
    const student = await profileRepository.getStudentByUserId(user.id);
    if (!student) {
      throw new AppError('Student profile not found', 404);
    }
    return resultRepository.getResultsForStudent(student.id);
  }

  throw new AppError('Unauthorized to list results', 403);
};

exports.getResultsForStudent = async (studentId, user) => {
  if (user.roles.includes('student')) {
    const student = await profileRepository.getStudentByUserId(user.id);
    if (!student || student.id !== studentId) {
      throw new AppError('Students can only view their own results', 403);
    }
    return resultRepository.getResultsForStudent(studentId);
  }

  if (user.roles.includes('lecturer') || user.roles.includes('hod') || user.roles.includes('dean') || user.roles.includes('exam_officer') || user.roles.includes('university_admin') || user.roles.includes('system_admin')) {
    return resultRepository.getResultsForStudent(studentId);
  }

  throw new AppError('Unauthorized to access student results', 403);
};

exports.submitResultToHOD = async ({ creator, result_id, comment }) => {
  if (!creator.roles.includes('lecturer')) {
    throw new AppError('Only lecturers can submit results', 403);
  }
  const result = await validateResultOwnership(result_id, creator);
  if (!['draft', 'corrected'].includes(result.current_status)) {
    throw new AppError('Only draft or corrected results can be submitted', 400);
  }
  const submission = await resultRepository.createResultSubmission({ result_id, submitted_by: creator.id, comment });
  await resultRepository.updateResultStatus(result_id, 'submitted');
  await updateItemStatuses(result_id, 'submitted');
  await logTransition({ result_id, user_id: creator.id, from_status: result.current_status, to_status: 'submitted', comment });
  return submission;
};

exports.verifyResultByHOD = async ({ creator, submission_id, comment }) => {
  if (!creator.roles.includes('hod')) {
    throw new AppError('Only HOD can verify results', 403);
  }
  const submission = await resultRepository.getResultSubmissionById(submission_id);
  if (!submission || submission.status !== 'submitted') {
    throw new AppError('Submission must be submitted to verify', 400);
  }
  const result = await resultRepository.getResultById(submission.result_id);
  await resultRepository.createResultReview({ result_submission_id: submission.id, reviewed_by: creator.id, comment, status: 'verified' });
  await resultRepository.updateResultStatus(result.id, 'verified');
  await updateItemStatuses(result.id, 'verified');
  await logTransition({ result_id: result.id, user_id: creator.id, from_status: 'submitted', to_status: 'verified', comment });
  return { submission, status: 'verified' };
};

exports.reviewResultByDean = async ({ creator, submission_id, comment }) => {
  if (!creator.roles.includes('dean')) {
    throw new AppError('Only Dean can review results', 403);
  }
  const submission = await resultRepository.getResultSubmissionById(submission_id);
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }
  const latestReview = await resultRepository.getLatestResultReview(submission.id);
  if (!latestReview || latestReview.status !== 'verified') {
    throw new AppError('Result must be verified before review', 400);
  }
  const result = await resultRepository.getResultById(submission.result_id);
  await resultRepository.createResultReview({ result_submission_id: submission.id, reviewed_by: creator.id, comment, status: 'reviewed' });
  await resultRepository.updateResultStatus(result.id, 'reviewed');
  await updateItemStatuses(result.id, 'reviewed');
  await logTransition({ result_id: result.id, user_id: creator.id, from_status: 'verified', to_status: 'reviewed', comment });
  return { submission, status: 'reviewed' };
};

exports.approveResultByExamOfficer = async ({ creator, submission_id, comment }) => {
  if (!creator.roles.includes('exam_officer')) {
    throw new AppError('Only Exam Officer can approve results', 403);
  }
  const submission = await resultRepository.getResultSubmissionById(submission_id);
  if (!submission) {
    throw new AppError('Submission not found', 404);
  }
  const latestReview = await resultRepository.getLatestResultReview(submission.id);
  if (!latestReview || latestReview.status !== 'reviewed') {
    throw new AppError('Result must be reviewed before approval', 400);
  }
  const result = await resultRepository.getResultById(submission.result_id);
  await resultRepository.createResultReview({ result_submission_id: submission.id, reviewed_by: creator.id, comment, status: 'approved' });
  await resultRepository.updateResultStatus(result.id, 'approved');
  await updateItemStatuses(result.id, 'approved');
  await logTransition({ result_id: result.id, user_id: creator.id, from_status: 'reviewed', to_status: 'approved', comment });
  return { submission, status: 'approved' };
};

exports.publishResult = async ({ creator, result_id }) => {
  if (!creator.roles.includes('exam_officer')) {
    throw new AppError('Only Exam Officer can publish results', 403);
  }
  const result = await resultRepository.getResultById(result_id);
  if (!result) {
    throw new AppError('Result not found', 404);
  }
  if (result.current_status !== 'approved') {
    throw new AppError('Result must be approved before publishing', 400);
  }
  const submissions = await pool.query('SELECT * FROM result_submissions WHERE result_id = $1 ORDER BY submitted_at DESC LIMIT 1', [result_id]);
  const submission = submissions.rows[0];
  if (!submission) {
    throw new AppError('Submission record not found', 404);
  }
  const latestReview = await resultRepository.getLatestResultReview(submission.id);
  if (!latestReview || latestReview.status !== 'approved') {
    throw new AppError('Result review approval required before publishing', 400);
  }
  const publication = await resultRepository.createResultPublication({ result_review_id: latestReview.id, published_by: creator.id });
  await resultRepository.updateResultStatus(result_id, 'published');
  await updateItemStatuses(result_id, 'published');
  await logTransition({ result_id, user_id: creator.id, from_status: 'approved', to_status: 'published', comment: null });
  return publication;
};

// ==========================================
// BACKGROUND JOB METHODS
// ==========================================

exports.calculateGPAForResult = async (resultId) => {
  const result = await resultRepository.getResultById(resultId);
  if (!result) {
    throw new Error(`Result ${resultId} not found`);
  }

  // Get all result items for this result
  const resultItems = await resultRepository.getResultItemsByResultId(resultId);

  // Calculate GPA for each student
  for (const item of resultItems) {
    const semesterResults = await resultRepository.getStudentResultsBySemester(item.student_id, result.semester_id);

    let totalPoints = 0;
    let totalCredits = 0;

    for (const semesterResult of semesterResults) {
      if (semesterResult.grade_point && semesterResult.credit_unit) {
        totalPoints += semesterResult.grade_point * semesterResult.credit_unit;
        totalCredits += semesterResult.credit_unit;
      }
    }

    const gpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

    // Update GPA in result item
    await resultRepository.updateResultItemGPA(item.id, gpa);
  }

  return { resultId, processed: resultItems.length };
};

exports.updateCGPAForStudent = async (studentId) => {
  // Get all results for the student across all semesters
  const allResults = await resultRepository.getAllStudentResults(studentId);

  let totalPoints = 0;
  let totalCredits = 0;

  for (const result of allResults) {
    if (result.grade_point && result.credit_unit) {
      totalPoints += result.grade_point * result.credit_unit;
      totalCredits += result.credit_unit;
    }
  }

  const cgpa = totalCredits > 0 ? totalPoints / totalCredits : 0;

  // Update CGPA in student profile
  await profileRepository.updateStudentCGPA(studentId, cgpa);

  return { studentId, cgpa, totalCredits };
};

exports.sendResultNotifications = async (resultId) => {
  const result = await resultRepository.getResultById(resultId);
  if (!result) {
    throw new Error(`Result ${resultId} not found`);
  }

  // Get all students who have results in this result set
  const resultItems = await resultRepository.getResultItemsByResultId(resultId);

  const notifications = [];
  for (const item of resultItems) {
    const student = await profileRepository.getStudentById(item.student_id);
    if (student && student.user_id) {
      notifications.push({
        userId: student.user_id,
        type: 'result_published',
        title: 'New Result Published',
        message: `Your result for ${result.course?.code || 'course'} has been published. Grade: ${item.grade}`,
        data: {
          resultId,
          courseId: result.course_id,
          grade: item.grade,
          score: item.total_score
        }
      });
    }
  }

  // Send notifications in bulk
  if (notifications.length > 0) {
    const notificationService = require('./notificationService');
    await notificationService.sendBulkNotification('result_published', notifications);
  }

  return { resultId, notificationsSent: notifications.length };
};

exports.getResultByStudentCourseSemester = async (studentId, courseId, semesterId) => {
  return await resultRepository.getResultByStudentCourseSemester(studentId, courseId, semesterId);
};

exports.rejectResult = async ({ creator, result_id, reason }) => {
  if (!['hod', 'dean', 'exam_officer'].some((role) => creator.roles.includes(role))) {
    throw new AppError('Only HOD, Dean, or Exam Officer can reject results', 403);
  }
  const result = await resultRepository.getResultById(result_id);
  if (!result) {
    throw new AppError('Result not found', 404);
  }
  await resultRepository.updateResultStatus(result_id, 'rejected');
  await updateItemStatuses(result_id, 'rejected');
  await logTransition({ result_id, user_id: creator.id, from_status: result.current_status, to_status: 'rejected', comment: reason });
  return { result_id, status: 'rejected' };
};

exports.resubmitResult = async ({ creator, result_id, comment }) => {
  if (!creator.roles.includes('lecturer')) {
    throw new AppError('Only lecturers can resubmit rejected results', 403);
  }
  const result = await validateResultOwnership(result_id, creator);
  if (!['rejected', 'corrected'].includes(result.current_status)) {
    throw new AppError('Only rejected or corrected results can be resubmitted', 400);
  }
  await resultRepository.updateResultStatus(result_id, 'draft');
  await updateItemStatuses(result_id, 'draft');
  await logTransition({ result_id, user_id: creator.id, from_status: result.current_status, to_status: 'draft', comment });
  return { result_id, status: 'draft' };
};
