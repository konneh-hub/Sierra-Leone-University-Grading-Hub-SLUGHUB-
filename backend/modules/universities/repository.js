const pool = require('../../src/config/database');
const userRepository = require('../../src/repositories/userRepository');

exports.createUniversity = async (university) => {
  const { name, code, country, city, address, website, contact_email, contact_phone, status, logo } = university;
  const { rows } = await pool.query(
    `INSERT INTO universities (name, code, country, city, address, website, contact_email, contact_phone, status, logo, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()) RETURNING *`,
    [name, code, country, city, address, website, contact_email, contact_phone, status || 'active', logo || null]
  );
  return rows[0];
};

exports.updateUniversity = async (id, updates) => {
  const fields = [];
  const values = [];
  let idx = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (['name', 'code', 'country', 'city', 'address', 'website', 'contact_email', 'contact_phone', 'status', 'logo'].includes(key)) {
      fields.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
  });

  if (fields.length === 0) return this.getUniversityById(id);

  const query = `UPDATE universities SET ${fields.join(', ')}, updated_at = now() WHERE id = $${idx} RETURNING *`;
  values.push(id);
  const { rows } = await pool.query(query, values);
  return rows[0];
};

exports.deleteUniversity = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM universities WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
};

exports.getAllUniversities = async (filters = {}) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (filters.status) {
    conditions.push(`status = $${idx++}`);
    values.push(filters.status);
  }

  if (filters.search) {
    conditions.push(`(LOWER(name) LIKE $${idx} OR LOWER(code) LIKE $${idx})`);
    values.push(`%${filters.search.toLowerCase()}%`);
    idx += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT * FROM universities ${whereClause} ORDER BY created_at DESC`,
    values
  );
  return rows;
};

exports.getUniversityById = async (id) => {
  const { rows } = await pool.query('SELECT * FROM universities WHERE id = $1', [id]);
  return rows[0];
};

exports.assignAdminToUniversity = async ({ universityId, userId, assignedBy }) => {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  await pool.query(
    'UPDATE users SET university_id = $1 WHERE id = $2',
    [universityId, userId]
  );

  const role = await userRepository.getRoleByName('university_admin');
  if (!role) {
    throw new Error('University admin role is missing');
  }

  await userRepository.addUserRole(userId, role.id, assignedBy);
  return userRepository.getUserById(userId);
};

exports.updateUserPassword = async (userId, passwordHash) => {
  const { rows } = await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2 RETURNING *',
    [passwordHash, userId]
  );
  return rows[0];
};

exports.deactivateUserAccount = async (userId) => {
  const { rows } = await pool.query(
    `UPDATE users SET status = 'inactive', updated_at = now() WHERE id = $1 RETURNING *`,
    [userId]
  );
  return rows[0];
};
