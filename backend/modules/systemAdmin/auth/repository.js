const pool = require('../../../src/config/database');
const userRepository = require('../../../src/repositories/userRepository');

exports.getSystemAdminByEmail = async (email) => {
  const user = await userRepository.getUserByEmail(email);
  return user && user.is_system_admin ? user : null;
};

exports.getSystemAdminById = async (id) => {
  const user = await userRepository.getUserById(id);
  return user && user.is_system_admin ? user : null;
};

exports.createSystemAdminSession = async (session) => {
  return userRepository.createSession(session);
};

exports.getSessionByToken = async (token) => {
  const { rows } = await pool.query(
    `SELECT * FROM user_sessions WHERE session_token = $1 AND status = 'active' LIMIT 1`,
    [token]
  );
  return rows[0];
};

exports.revokeSession = async (token) => {
  const { rows } = await pool.query(
    `UPDATE user_sessions SET status = 'logged_out', last_activity_at = now() WHERE session_token = $1 RETURNING *`,
    [token]
  );
  return rows[0];
};

exports.updateSessionActivity = async (token) => {
  await pool.query(
    `UPDATE user_sessions SET last_activity_at = now() WHERE session_token = $1`,
    [token]
  );
};
