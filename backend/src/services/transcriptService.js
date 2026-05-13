const AppError = require('../utils/appError');
const pool = require('../config/database');
const transcriptRepository = require('../repositories/transcriptRepository');
const profileRepository = require('../repositories/profileRepository');
const gpaService = require('./gpaService');

exports.fetchAcademicHistory = async (student_id) => {
  const { rows } = await pool.query(
    `SELECT ri.student_id, ri.course_id, ri.grade, ri.grade_point, ri.credit_unit, ri.total_score,
            r.academic_session_id, r.semester_id, c.code AS course_code, c.title AS course_title
     FROM result_items ri
     JOIN results r ON r.id = ri.result_id
     JOIN courses c ON c.id = ri.course_id
     WHERE ri.student_id = $1
       AND r.current_status = 'published'
       AND ri.status IN ('approved', 'published', 'corrected')
     ORDER BY r.academic_session_id, r.semester_id`,
    [student_id]
  );
  return rows;
};

exports.generateTranscript = async ({ creator, student_id, transcript_request_id }) => {
  if (!creator.roles.includes('exam_officer')) {
    throw new AppError('Only Exam Officer can generate transcripts', 403);
  }

  const student = await profileRepository.getStudentById(student_id);
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  const history = await exports.fetchAcademicHistory(student_id);
  if (!history.length) {
    throw new AppError('No academic history available for transcript generation', 404);
  }

  const semesterIds = Array.from(new Set(history.map((item) => item.semester_id)));
  const semesterResults = [];
  for (const semesterId of semesterIds) {
    const gpaRecord = await gpaService.calculateGPA(student_id, semesterId);
    semesterResults.push(gpaRecord.gpa);
  }

  const averageGPA = Number((semesterResults.reduce((sum, value) => sum + value, 0) / semesterResults.length).toFixed(4));
  const cgpaResult = await gpaService.calculateCGPA(student_id);

  const transcript = await transcriptRepository.createTranscript({
    transcript_request_id,
    student_id,
    university_id: student.university_id,
    gpa: averageGPA,
    cgpa: cgpaResult.cgpa,
  });

  for (const item of history) {
    await transcriptRepository.createTranscriptCourse({
      transcript_id: transcript.id,
      course_id: item.course_id,
      student_id: item.student_id,
      academic_session_id: item.academic_session_id,
      semester_id: item.semester_id,
      grade: item.grade,
      grade_point: item.grade_point,
      credit_unit: item.credit_unit,
      total_score: item.total_score,
    });
  }

  return transcript;
};

exports.computeFinalCGPA = async (student_id) => {
  return gpaService.calculateCGPA(student_id);
};
