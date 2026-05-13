const pool = require('../config/database');

exports.createUniversity = async ({ code, name, address, logo }) => {
  const { rows } = await pool.query(
    `INSERT INTO universities (code, name, address, logo, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'active', now(), now())
     RETURNING *`,
    [code, name, address, logo || null]
  );
  return rows[0];
};

exports.getUniversityById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM universities WHERE id = $1', [id]);
  return rows[0];
};

exports.getUniversityByCode = async (code) => {
  const { rows } = await pool.query('SELECT * FROM universities WHERE code = $1', [code]);
  return rows[0];
};

exports.listUniversities = async () => {
  const { rows } = await pool.query('SELECT * FROM universities ORDER BY name');
  return rows;
};
