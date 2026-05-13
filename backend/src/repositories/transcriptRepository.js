const pool = require('../config/database');

exports.createTranscriptRequest = async ({ student_id, requested_by, remarks }) => {
  const { rows } = await pool.query(
    `INSERT INTO transcript_requests (student_id, requested_by, requested_at, status, remarks, created_at, updated_at)
     VALUES ($1, $2, now(), 'requested', $3, now(), now()) RETURNING *`,
    [student_id, requested_by, remarks]
  );
  return rows[0];
};

exports.createTranscript = async ({ transcript_request_id, student_id, university_id, gpa, cgpa }) => {
  const { rows } = await pool.query(
    `INSERT INTO transcripts (transcript_request_id, student_id, university_id, request_date, generated_at, status, gpa, cgpa, created_at, updated_at)
     VALUES ($1, $2, $3, now(), now(), 'generated', $4, $5, now(), now()) RETURNING *`,
    [transcript_request_id, student_id, university_id, gpa, cgpa]
  );
  return rows[0];
};

exports.createTranscriptCourse = async ({ transcript_id, course_id, student_id, academic_session_id, semester_id, grade, grade_point, credit_unit, total_score }) => {
  const { rows } = await pool.query(
    `INSERT INTO transcript_courses (transcript_id, course_id, student_id, academic_session_id, semester_id, grade, grade_point, credit_unit, total_score)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [transcript_id, course_id, student_id, academic_session_id, semester_id, grade, grade_point, credit_unit, total_score]
  );
  return rows[0];
};

exports.getTranscriptRequestById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM transcript_requests WHERE id = $1', [id]);
  return rows[0];
};

exports.updateTranscriptRequestStatus = async (id, status, approved_by) => {
  const { rows } = await pool.query(
    `UPDATE transcript_requests SET status = $1, approved_by = $2, approved_at = now(), updated_at = now()
     WHERE id = $3 RETURNING *`,
    [status, approved_by, id]
  );
  return rows[0];
};
