const pool = require('../../src/config/database');

class PlatformUserModel {
  static async getAll(filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT id, email, name, role, is_system_admin, status, created_at FROM users WHERE 1=1';
    const values = [];

    if (filters.role) {
      values.push(filters.role);
      query += ` AND role = $${values.length}`;
    }
    if (filters.status) {
      values.push(filters.status);
      query += ` AND status = $${values.length}`;
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      query += ` AND (email ILIKE $${values.length} OR name ILIKE $${values.length})`;
      values.push(`%${filters.search}%`);
    }

    values.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getById(userId) {
    const query = `
      SELECT id, email, name, role, is_system_admin, status, university_id, created_at, updated_at
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  static async getSystemAdmins() {
    const query = `
      SELECT id, email, name, role, is_system_admin, status, created_at
      FROM users
      WHERE is_system_admin = true
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(userId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(userId);
    const query = `
      UPDATE users
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, email, name, role, is_system_admin, status, created_at, updated_at
    `;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async deactivate(userId) {
    return this.update(userId, { status: 'inactive' });
  }

  static async activate(userId) {
    return this.update(userId, { status: 'active' });
  }
}

module.exports = PlatformUserModel;
