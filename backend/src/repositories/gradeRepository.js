const pool = require('../config/database');

exports.getGradeScale = async (university_id) => {
  const { rows } = await pool.query(
    `SELECT * FROM grade_scales WHERE university_id = $1 ORDER BY min_score DESC`,
    [university_id]
  );
  return rows;
};

exports.getGradeMapping = async (university_id, score) => {
  const { rows } = await pool.query(
    `SELECT * FROM grade_scales
     WHERE university_id = $1 AND $2 >= min_score AND $2 <= max_score
     ORDER BY grade_point DESC LIMIT 1`,
    [university_id, score]
  );
  return rows[0];
};
