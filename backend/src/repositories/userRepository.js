const pool = require('../config/database');

exports.getUserById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
};

exports.getUserByEmail = async (email) => {
  const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return rows[0];
};

exports.createUser = async (user) => {
  const { email, username, password_hash, first_name, last_name, gender, university_id, is_system_admin } = user;
  const { rows } = await pool.query(
    `INSERT INTO users (email, username, password_hash, first_name, last_name, gender, university_id, is_system_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [email, username || null, password_hash, first_name, last_name, gender, university_id, is_system_admin || false]
  );
  return rows[0];
};

exports.getRoleByName = async (name) => {
  const { rows } = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
  return rows[0];
};

exports.getRoleById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  return rows[0];
};

exports.getUserRoles = async (userId) => {
  const { rows } = await pool.query(
    `SELECT r.* FROM roles r
     JOIN user_roles ur ON ur.role_id = r.id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows;
};

exports.addUserRole = async (userId, roleId, assignedBy) => {
  await pool.query(
    `INSERT INTO user_roles (user_id, role_id, assigned_by, assigned_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, roleId, assignedBy]
  );
};

exports.createRole = async (name, description) => {
  const { rows } = await pool.query(
    `INSERT INTO roles (name, description) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
     RETURNING *`,
    [name, description]
  );
  return rows[0];
};

exports.getPermissionByName = async (name) => {
  const { rows } = await pool.query('SELECT * FROM permissions WHERE name = $1', [name]);
  return rows[0];
};

exports.createPermission = async (name, description) => {
  const { rows } = await pool.query(
    `INSERT INTO permissions (name, description) VALUES ($1, $2)
     ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
     RETURNING *`,
    [name, description]
  );
  return rows[0];
};

exports.assignPermissionToRole = async (roleId, permissionId) => {
  await pool.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ($1, $2)
     ON CONFLICT (role_id, permission_id) DO NOTHING`,
    [roleId, permissionId]
  );
};

exports.getPermissionsForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN user_roles ur ON ur.role_id = rp.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows;
};

exports.createInvite = async (invite) => {
  const { university_id, inviter_id, email, role_id, token, expires_at } = invite;
  const { rows } = await pool.query(
    `INSERT INTO account_invites (university_id, inviter_id, email, role_id, token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [university_id, inviter_id, email, role_id, token, expires_at]
  );
  return rows[0];
};

exports.getInviteByToken = async (token) => {
  const { rows } = await pool.query('SELECT * FROM account_invites WHERE token = $1', [token]);
  return rows[0];
};

exports.updateInviteStatus = async (id, status) => {
  const { rows } = await pool.query(
    'UPDATE account_invites SET status = $1, accepted_at = now() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return rows[0];
};

exports.createRegistration = async (registration) => {
  const { invite_id, user_id, registration_status } = registration;
  const { rows } = await pool.query(
    `INSERT INTO account_registrations (invite_id, user_id, registration_status, registered_at)
     VALUES ($1, $2, $3, now())
     RETURNING *`,
    [invite_id, user_id, registration_status]
  );
  return rows[0];
};

exports.createSession = async (session) => {
  const { user_id, session_token, ip_address, user_agent } = session;
  const { rows } = await pool.query(
    `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, status, created_at, last_activity_at)
     VALUES ($1, $2, $3, $4, 'active', now(), now()) RETURNING *`,
    [user_id, session_token, ip_address, user_agent]
  );
  return rows[0];
};

exports.getUsersByRole = async (roleName, universityId) => {
  const { rows } = await pool.query(
    `SELECT u.* FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE r.name = $1
       AND ($2::uuid IS NULL OR u.university_id = $2)`,
    [roleName, universityId || null]
  );
  return rows;
};

exports.getActiveStudentsByCourse = async (courseId, semesterId, sessionId) => {
  const { rows } = await pool.query(
    `SELECT s.* FROM students s
     JOIN course_registrations cr ON cr.student_id = s.id
     WHERE cr.course_id = $1
       AND cr.semester_id = $2
       AND cr.academic_session_id = $3
       AND cr.status = 'registered'`,
    [courseId, semesterId, sessionId]
  );
  return rows;
};
