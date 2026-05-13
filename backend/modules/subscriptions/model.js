const pool = require('../../src/config/database');

class SubscriptionModel {
  static async create(subscriptionData) {
    const query = `
      INSERT INTO subscriptions (
        university_id, subscription_tier, status, start_date, renewal_date, 
        max_students, max_staff, features, price_per_month, auto_renew, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      subscriptionData.universityId,
      subscriptionData.subscriptionTier,
      subscriptionData.status || 'active',
      subscriptionData.startDate,
      subscriptionData.renewalDate,
      subscriptionData.maxStudents,
      subscriptionData.maxStaff,
      JSON.stringify(subscriptionData.features || {}),
      subscriptionData.pricePerMonth,
      subscriptionData.autoRenew !== false,
      subscriptionData.notes,
      subscriptionData.createdBy,
    ]);
    return result.rows[0];
  }

  static async getById(subscriptionId) {
    const query = 'SELECT * FROM subscriptions WHERE id = $1';
    const result = await pool.query(query, [subscriptionId]);
    return result.rows[0];
  }

  static async getByUniversityId(universityId) {
    const query = 'SELECT * FROM subscriptions WHERE university_id = $1 ORDER BY created_at DESC LIMIT 1';
    const result = await pool.query(query, [universityId]);
    return result.rows[0];
  }

  static async update(subscriptionId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(key === 'features' ? JSON.stringify(value) : value);
      paramCount++;
    }

    values.push(subscriptionId);
    const query = `UPDATE subscriptions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll(filters = {}) {
    let query = 'SELECT * FROM subscriptions WHERE 1=1';
    const values = [];

    if (filters.status) {
      values.push(filters.status);
      query += ` AND status = $${values.length}`;
    }
    if (filters.subscriptionTier) {
      values.push(filters.subscriptionTier);
      query += ` AND subscription_tier = $${values.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, values);
    return result.rows;
  }
}

module.exports = SubscriptionModel;
