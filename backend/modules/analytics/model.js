const pool = require('../../src/config/database');

class AnalyticsModel {
  static async getUniversityMetrics(universityId, days = 30) {
    const query = `
      SELECT
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as total_students,
        COUNT(DISTINCT CASE WHEN u.role = 'staff' THEN u.id END) as total_staff,
        COUNT(DISTINCT CASE WHEN u.created_at > NOW() - INTERVAL '${days} days' THEN u.id END) as new_users_last_days
      FROM users u
      WHERE u.university_id = $1
    `;
    const result = await pool.query(query, [universityId]);
    return result.rows[0];
  }

  static async getPlatformMetrics() {
    const query = `
      SELECT
        COUNT(DISTINCT id) as total_universities,
        COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_universities,
        COUNT(DISTINCT CASE WHEN status = 'suspended' THEN id END) as suspended_universities,
        COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN id END) as cancelled_universities
      FROM universities
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getSubscriptionMetrics() {
    const query = `
      SELECT
        COUNT(DISTINCT id) as total_subscriptions,
        COUNT(DISTINCT CASE WHEN status = 'active' THEN id END) as active_subscriptions,
        COUNT(DISTINCT CASE WHEN status = 'suspended' THEN id END) as suspended_subscriptions,
        COUNT(DISTINCT CASE WHEN status = 'cancelled' THEN id END) as cancelled_subscriptions,
        SUM(CASE WHEN status = 'active' THEN price_per_month ELSE 0 END) as monthly_recurring_revenue
      FROM subscriptions
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  static async getBillingMetrics(startDate, endDate) {
    const query = `
      SELECT
        COUNT(DISTINCT id) as total_invoices,
        SUM(amount) as total_billed,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
        SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed,
        COUNT(DISTINCT CASE WHEN status = 'paid' THEN id END) as paid_invoices
      FROM billing
      WHERE billing_date BETWEEN $1 AND $2
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows[0];
  }

  static async getUserActivityMetrics(universityId, days = 7) {
    const query = `
      SELECT
        DATE(created_at) as activity_date,
        COUNT(*) as activity_count,
        action as activity_type
      FROM audit_logs
      WHERE university_id = $1 AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at), action
      ORDER BY activity_date DESC
    `;
    const result = await pool.query(query, [universityId]);
    return result.rows;
  }

  static async getPlatformActivityMetrics(days = 7) {
    const query = `
      SELECT
        DATE(created_at) as activity_date,
        COUNT(*) as activity_count,
        action as activity_type
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at), action
      ORDER BY activity_date DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getTopUniversitiesByMetric(metric = 'users', limit = 10) {
    let query;
    if (metric === 'users') {
      query = `
        SELECT u.id, u.name, COUNT(DISTINCT us.id) as metric_value
        FROM universities u
        LEFT JOIN users us ON u.id = us.university_id
        GROUP BY u.id, u.name
        ORDER BY metric_value DESC
        LIMIT $1
      `;
    } else if (metric === 'billing') {
      query = `
        SELECT u.id, u.name, SUM(b.amount) as metric_value
        FROM universities u
        LEFT JOIN billing b ON u.id = b.university_id
        GROUP BY u.id, u.name
        ORDER BY metric_value DESC LIMIT $1
      `;
    }
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getChurnAnalysis(days = 30) {
    const query = `
      SELECT
        COUNT(DISTINCT CASE WHEN s.status = 'cancelled' AND s.updated_at > NOW() - INTERVAL '${days} days' THEN s.university_id END) as cancelled_universities,
        COUNT(DISTINCT CASE WHEN s.status = 'suspended' AND s.updated_at > NOW() - INTERVAL '${days} days' THEN s.university_id END) as suspended_universities,
        (SELECT COUNT(DISTINCT university_id) FROM subscriptions WHERE status IN ('cancelled', 'suspended')) as total_inactive_subscriptions
      FROM subscriptions s
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
}

module.exports = AnalyticsModel;
