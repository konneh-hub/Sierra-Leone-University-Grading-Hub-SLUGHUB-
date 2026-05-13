const pool = require('../config/database');

exports.createFaculty = async ({ university_id, code, name }) => {
  const { rows } = await pool.query(
    `INSERT INTO faculties (university_id, code, name, created_at)
     VALUES ($1, $2, $3, now()) RETURNING *`,
    [university_id, code, name]
  );
  return rows[0];
};

exports.createDepartment = async ({ university_id, faculty_id, code, name }) => {
  const { rows } = await pool.query(
    `INSERT INTO departments (university_id, faculty_id, code, name, created_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING *`,
    [university_id, faculty_id, code, name]
  );
  return rows[0];
};

exports.createProgram = async ({ university_id, department_id, code, name, program_type, duration_years }) => {
  const { rows } = await pool.query(
    `INSERT INTO programs (university_id, department_id, code, name, program_type, duration_years, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, now()) RETURNING *`,
    [university_id, department_id, code, name, program_type, duration_years]
  );
  return rows[0];
};

exports.createCourse = async ({ university_id, program_id, department_id, code, title, credit_unit, semester_id }) => {
  const { rows } = await pool.query(
    `INSERT INTO courses (university_id, program_id, department_id, code, title, credit_unit, semester_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING *`,
    [university_id, program_id, department_id, code, title, credit_unit, semester_id]
  );
  return rows[0];
};

exports.getDepartmentById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM departments WHERE id = $1', [id]);
  return rows[0];
};

exports.getFacultyById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM faculties WHERE id = $1', [id]);
  return rows[0];
};

exports.assignHODProfile = async (user_id, department_id) => {
  const { rows } = await pool.query(
    `UPDATE staff_profiles SET department_id = $2, role_description = 'hod' WHERE user_id = $1 RETURNING *`,
    [user_id, department_id]
  );
  return rows[0];
};

exports.assignDeanProfile = async (user_id, department_id) => {
  const { rows } = await pool.query(
    `UPDATE staff_profiles SET department_id = $2, role_description = 'dean' WHERE user_id = $1 RETURNING *`,
    [user_id, department_id]
  );
  return rows[0];
};

exports.getProgramById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM programs WHERE id = $1', [id]);
  return rows[0];
};

exports.getCourseById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [id]);
  return rows[0];
};
