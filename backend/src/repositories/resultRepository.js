const pool = require('../config/database');

exports.createResult = async (payload) => {
  const { university_id, academic_session_id, semester_id, course_id, lecturer_id, created_by } = payload;
  const { rows } = await pool.query(
    `INSERT INTO results (university_id, academic_session_id, semester_id, course_id, lecturer_id, created_by, current_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', now(), now()) RETURNING *`,
    [university_id, academic_session_id, semester_id, course_id, lecturer_id, created_by]
  );
  return rows[0];
};

exports.getResultById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM results WHERE id = $1', [id]);
  return rows[0];
};

exports.getResultItem = async (resultId, studentId) => {
  const { rows } = await pool.query(
    `SELECT * FROM result_items WHERE result_id = $1 AND student_id = $2`,
    [resultId, studentId]
  );
  return rows[0];
};

exports.createResultItem = async (item) => {
  const { result_id, student_id, course_id, ca_score, exam_score, grade, grade_point, credit_unit, status } = item;
  const { rows } = await pool.query(
    `INSERT INTO result_items (result_id, student_id, course_id, ca_score, exam_score, grade, grade_point, credit_unit, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now()) RETURNING *`,
    [result_id, student_id, course_id, ca_score, exam_score, grade, grade_point, credit_unit, status]
  );
  return rows[0];
};

exports.updateResultItemScores = async (itemId, ca_score, exam_score, grade, grade_point) => {
  const { rows } = await pool.query(
    `UPDATE result_items
     SET ca_score = $1, exam_score = $2, grade = $3, grade_point = $4, updated_at = now()
     WHERE id = $5 RETURNING *`,
    [ca_score, exam_score, grade, grade_point, itemId]
  );
  return rows[0];
};

exports.findResultItemsByResult = async (resultId) => {
  const { rows } = await pool.query('SELECT * FROM result_items WHERE result_id = $1', [resultId]);
  return rows;
};

exports.updateResultStatus = async (resultId, status) => {
  const { rows } = await pool.query(
    `UPDATE results SET current_status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, resultId]
  );
  return rows[0];
};

exports.createResultSubmission = async (payload) => {
  const { result_id, submitted_by, comment } = payload;
  const { rows } = await pool.query(
    `INSERT INTO result_submissions (result_id, submitted_by, submitted_at, comment, status)
     VALUES ($1, $2, now(), $3, 'submitted') RETURNING *`,
    [result_id, submitted_by, comment]
  );
  return rows[0];
};

exports.getResultSubmissionById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM result_submissions WHERE id = $1', [id]);
  return rows[0];
};

exports.createResultReview = async (payload) => {
  const { result_submission_id, reviewed_by, comment, status } = payload;
  const { rows } = await pool.query(
    `INSERT INTO result_reviews (result_submission_id, reviewed_by, reviewed_at, comment, status)
     VALUES ($1, $2, now(), $3, $4) RETURNING *`,
    [result_submission_id, reviewed_by, comment, status]
  );
  return rows[0];
};

exports.getLatestResultReview = async (submissionId) => {
  const { rows } = await pool.query(
    `SELECT * FROM result_reviews WHERE result_submission_id = $1 ORDER BY reviewed_at DESC LIMIT 1`,
    [submissionId]
  );
  return rows[0];
};

exports.createResultPublication = async (payload) => {
  const { result_review_id, published_by } = payload;
  const { rows } = await pool.query(
    `INSERT INTO result_publications (result_review_id, published_by, published_at, status)
     VALUES ($1, $2, now(), 'published') RETURNING *`,
    [result_review_id, published_by]
  );
  return rows[0];
};

exports.createResultCorrection = async (payload) => {
  const { result_publication_id, corrected_by, correction_reason } = payload;
  const { rows } = await pool.query(
    `INSERT INTO result_corrections (result_publication_id, corrected_by, corrected_at, correction_reason, status)
     VALUES ($1, $2, now(), $3, 'corrected') RETURNING *`,
    [result_publication_id, corrected_by, correction_reason]
  );
  return rows[0];
};

exports.getResultsByUniversity = async (universityId) => {
  const { rows } = await pool.query(
    `SELECT r.* FROM results r
     WHERE r.university_id = $1
     ORDER BY r.created_at DESC`,
    [universityId]
  );
  return rows;
};

exports.getAllResults = async () => {
  const { rows } = await pool.query(
    `SELECT r.* FROM results r
     ORDER BY r.created_at DESC`
  );
  return rows;
};

exports.getResultsByLecturer = async (lecturerId) => {
  const { rows } = await pool.query(
    `SELECT r.* FROM results r
     WHERE r.lecturer_id = $1
     ORDER BY r.created_at DESC`,
    [lecturerId]
  );
  return rows;
};

exports.getResultsForStudent = async (studentId) => {
  const { rows } = await pool.query(
    `SELECT r.*, ri.* FROM results r
     JOIN result_items ri ON ri.result_id = r.id
     WHERE ri.student_id = $1
     ORDER BY r.academic_session_id, r.semester_id, r.created_at`,
    [studentId]
  );
  return rows;
};

exports.logResultStatus = async (payload) => {
  const { result_id, changed_by, from_status, to_status, comment } = payload;
  const { rows } = await pool.query(
    `INSERT INTO result_status_logs (result_id, changed_by, from_status, to_status, occurred_at, comment)
     VALUES ($1, $2, $3, $4, now(), $5) RETURNING *`,
    [result_id, changed_by, from_status, to_status, comment]
  );
  return rows[0];
};

exports.getPublishedResultItems = async (studentId, semesterId) => {
  const { rows } = await pool.query(
    `SELECT ri.* FROM result_items ri
     JOIN results r ON r.id = ri.result_id
     WHERE ri.student_id = $1
       AND r.semester_id = $2
       AND r.current_status = 'published'
       AND ri.status IN ('approved', 'published', 'corrected')`,
    [studentId, semesterId]
  );
  return rows;
};

exports.getGpaRecords = async (studentId) => {
  const { rows } = await pool.query(
    `SELECT * FROM gpa_records WHERE student_id = $1 ORDER BY academic_session_id`,
    [studentId]
  );
  return rows;
};

exports.getTranscriptRequestsByStudent = async (studentId) => {
  const { rows } = await pool.query('SELECT * FROM transcript_requests WHERE student_id = $1', [studentId]);
  return rows;
};

exports.getTranscriptById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM transcripts WHERE id = $1', [id]);
  return rows[0];
};

exports.getTranscriptCourses = async (transcriptId) => {
  const { rows } = await pool.query('SELECT * FROM transcript_courses WHERE transcript_id = $1', [transcriptId]);
  return rows;
};
