const pool = require('../../src/config/database');

class BillingModel {
  static async create(billingData) {
    const query = `
      INSERT INTO billing (
        subscription_id, university_id, invoice_number, amount, currency, billing_date, 
        due_date, status, payment_method, paid_at, description, metadata, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const result = await pool.query(query, [
      billingData.subscriptionId,
      billingData.universityId,
      billingData.invoiceNumber,
      billingData.amount,
      billingData.currency || 'USD',
      billingData.billingDate,
      billingData.dueDate,
      billingData.status || 'pending',
      billingData.paymentMethod,
      billingData.paidAt || null,
      billingData.description,
      JSON.stringify(billingData.metadata || {}),
      billingData.createdBy,
    ]);
    return result.rows[0];
  }

  static async getById(billingId) {
    const query = 'SELECT * FROM billing WHERE id = $1';
    const result = await pool.query(query, [billingId]);
    return result.rows[0];
  }

  static async getByUniversityId(universityId, limit = 50, offset = 0) {
    const query = 'SELECT * FROM billing WHERE university_id = $1 ORDER BY billing_date DESC LIMIT $2 OFFSET $3';
    const result = await pool.query(query, [universityId, limit, offset]);
    return result.rows;
  }

  static async getBySubscriptionId(subscriptionId, limit = 50, offset = 0) {
    const query = 'SELECT * FROM billing WHERE subscription_id = $1 ORDER BY billing_date DESC LIMIT $2 OFFSET $3';
    const result = await pool.query(query, [subscriptionId, limit, offset]);
    return result.rows;
  }

  static async update(billingId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(key === 'metadata' ? JSON.stringify(value) : value);
      paramCount++;
    }

    values.push(billingId);
    const query = `UPDATE billing SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getAll(filters = {}, limit = 50, offset = 0) {
    let query = 'SELECT * FROM billing WHERE 1=1';
    const values = [limit, limit + offset];

    if (filters.status) {
      values.unshift(filters.status);
      query += ` AND status = $1`;
    }
    if (filters.universityId) {
      values.unshift(filters.universityId);
      query += ` AND university_id = $${values.length - 1}`;
    }

    query += ' ORDER BY billing_date DESC LIMIT $' + (values.length - 1) + ' OFFSET $' + values.length;
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async getUnpaidBills(daysOverdue = 0) {
    const query = `
      SELECT * FROM billing 
      WHERE status = 'pending' AND due_date < NOW() - INTERVAL '${daysOverdue} days'
      ORDER BY due_date ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = BillingModel;
