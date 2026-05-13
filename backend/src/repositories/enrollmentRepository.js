const pool = require('../config/database');

exports.getStudentById = async (studentId) => {
  const { rows } = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
  return rows[0];
};

exports.getCourseById = async (courseId) => {
  const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  return rows[0];
};

exports.getSemesterById = async (semesterId) => {
  const { rows } = await pool.query('SELECT * FROM semesters WHERE id = $1', [semesterId]);
  return rows[0];
};

exports.getAcademicSessionById = async (sessionId) => {
  const { rows } = await pool.query('SELECT * FROM academic_sessions WHERE id = $1', [sessionId]);
  return rows[0];
};

exports.getCourseRegistration = async ({ student_id, course_id, academic_session_id, semester_id }) => {
  const { rows } = await pool.query(
    `SELECT * FROM course_registrations
     WHERE student_id = $1 AND course_id = $2 AND academic_session_id = $3 AND semester_id = $4`,
    [student_id, course_id, academic_session_id, semester_id]
  );
  return rows[0];
};

exports.createCourseRegistration = async (registration) => {
  const { student_id, course_id, academic_session_id, semester_id } = registration;
  const { rows } = await pool.query(
    `INSERT INTO course_registrations (student_id, course_id, academic_session_id, semester_id, status, registered_at)
     VALUES ($1, $2, $3, $4, 'registered', now()) RETURNING *`,
    [student_id, course_id, academic_session_id, semester_id]
  );
  return rows[0];
};

exports.getEnrollment = async ({ student_id, academic_session_id, semester_id }) => {
  const { rows } = await pool.query(
    `SELECT * FROM enrollments WHERE student_id = $1 AND academic_session_id = $2 AND semester_id = $3`,
    [student_id, academic_session_id, semester_id]
  );
  return rows[0];
};
