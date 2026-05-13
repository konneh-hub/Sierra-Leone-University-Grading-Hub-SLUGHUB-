const pool = require('../config/database');

exports.createStudentProfile = async ({ user_id, university_id, department_id, program_id, matric_number = null, academic_level = 'year1', enrollment_year }) => {
  const { rows } = await pool.query(
    `INSERT INTO students (user_id, university_id, department_id, program_id, matric_number, academic_level, enrollment_year, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, now()) RETURNING *`,
    [user_id, university_id, department_id, program_id, matric_number, academic_level, enrollment_year]
  );
  return rows[0];
};

exports.createLecturerProfile = async ({ user_id, university_id, department_id, staff_number, hire_date }) => {
  const { rows } = await pool.query(
    `INSERT INTO lecturers (user_id, university_id, department_id, staff_number, hire_date, is_active, created_at)
     VALUES ($1, $2, $3, $4, $5, true, now()) RETURNING *`,
    [user_id, university_id, department_id, staff_number, hire_date]
  );
  return rows[0];
};

exports.createStaffProfile = async ({ user_id, university_id, department_id, role_description }) => {
  const { rows } = await pool.query(
    `INSERT INTO staff_profiles (user_id, university_id, department_id, role_description, created_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING *`,
    [user_id, university_id, department_id, role_description]
  );
  return rows[0];
};

exports.getStudentByMatricNumber = async (university_id, matric_number) => {
  const { rows } = await pool.query(
    `SELECT * FROM students WHERE university_id = $1 AND matric_number = $2`,
    [university_id, matric_number]
  );
  return rows[0];
};

exports.getLecturerByStaffNumber = async (university_id, staff_number) => {
  const { rows } = await pool.query(
    `SELECT * FROM lecturers WHERE university_id = $1 AND staff_number = $2`,
    [university_id, staff_number]
  );
  return rows[0];
};

exports.getStudentById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM students WHERE id = $1', [id]);
  return rows[0];
};

exports.getLecturerById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM lecturers WHERE id = $1', [id]);
  return rows[0];
};

exports.getStudentByUserId = async (user_id) => {
  const { rows } = await pool.query('SELECT * FROM students WHERE user_id = $1', [user_id]);
  return rows[0];
};

exports.getLecturerByUserId = async (user_id) => {
  const { rows } = await pool.query('SELECT * FROM lecturers WHERE user_id = $1', [user_id]);
  return rows[0];
};
