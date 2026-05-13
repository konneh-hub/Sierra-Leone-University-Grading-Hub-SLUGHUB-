const pool = require('../../../src/config/database');
const SettingsRepository = require('../../settings/repository');

class SystemAdminDashboardRepository {
  static async getUniversitySummary() {
    const summaryQuery = `
      SELECT
        COUNT(*) AS total_universities,
        COUNT(*) FILTER (WHERE status = 'active') AS active_universities,
        COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_universities
      FROM universities
    `;
    const recentQuery = `
      SELECT id, name, code, address, logo, status, created_at
      FROM universities
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const [{ rows: [summary] }, { rows: recent }] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(recentQuery),
    ]);
    return { summary, recent }; 
  }

  static async getAdminAccountsSummary() {
    const summaryQuery = `
      SELECT
        COUNT(DISTINCT u.id) AS total_admins,
        COUNT(DISTINCT CASE WHEN u.status = 'active' THEN u.id END) AS active_admins,
        COUNT(DISTINCT CASE WHEN u.status <> 'active' THEN u.id END) AS inactive_admins
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name = 'university_admin'
    `;
    const recentQuery = `
      SELECT u.id, u.email, u.username, u.first_name, u.last_name, u.status, u.university_id, un.name AS university_name, u.created_at
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      LEFT JOIN universities un ON un.id = u.university_id
      WHERE r.name = 'university_admin'
      ORDER BY u.created_at DESC
      LIMIT 20
    `;
    const [{ rows: [summary] }, { rows: recent }] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(recentQuery),
    ]);
    return { summary, recent };
  }

  static async getSubscriptionsSummary() {
    const summaryQuery = `
      SELECT
        COUNT(*) AS total_subscriptions,
        COUNT(*) FILTER (WHERE status = 'active') AS active_subscriptions,
        COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_subscriptions,
        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_subscriptions,
        SUM(price_per_month) FILTER (WHERE status = 'active') AS monthly_recurring_revenue
      FROM subscriptions
    `;
    const recentQuery = `
      SELECT s.id, s.university_id, u.name AS university_name, s.status, s.price_per_month, s.billing_cycle, s.renewal_date, s.created_at
      FROM subscriptions s
      LEFT JOIN universities u ON u.id = s.university_id
      ORDER BY s.created_at DESC
      LIMIT 20
    `;
    const [{ rows: [summary] }, { rows: recent }] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(recentQuery),
    ]);
    return { summary, recent };
  }

  static async getBillingSummary() {
    const summaryQuery = `
      SELECT
        COUNT(*) AS total_invoices,
        COALESCE(SUM(amount), 0) AS total_amount,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS total_paid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
        COALESCE(SUM(amount) FILTER (WHERE status = 'failed'), 0) AS total_failed
      FROM billing
    `;
    const recentQuery = `
      SELECT id, invoice_number, university_id, subscription_id, amount, currency, status, billing_date, due_date, payment_method, created_at
      FROM billing
      ORDER BY billing_date DESC
      LIMIT 20
    `;
    const [{ rows: [summary] }, { rows: recent }] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(recentQuery),
    ]);
    return { summary, recent };
  }

  static async getUsersSummary() {
    const summaryQuery = `
      SELECT
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE status = 'active') AS active_users,
        COUNT(*) FILTER (WHERE status = 'deactivated') AS deactivated_users,
        COUNT(*) FILTER (WHERE is_system_admin) AS system_admins
      FROM users
    `;
    const roleCountsQuery = `
      SELECT r.name AS role_name, COUNT(u.id) AS role_count
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id
      GROUP BY r.name
      ORDER BY role_count DESC
    `;
    const [{ rows: [summary] }, { rows: roleCounts }] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(roleCountsQuery),
    ]);
    return { summary, roleCounts };
  }

  static async getLogsSummary() {
    const summaryQuery = `
      SELECT
        COUNT(*) AS total_logs,
        COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days') AS logs_last_7_days
      FROM activity_logs
    `;
    const activityBreakdownQuery = `
      SELECT activity_type, COUNT(*) AS count
      FROM activity_logs
      WHERE occurred_at >= NOW() - INTERVAL '7 days'
      GROUP BY activity_type
      ORDER BY count DESC
    `;
    const recentQuery = `
      SELECT id, user_id, university_id, activity_type, activity_details, occurred_at
      FROM activity_logs
      ORDER BY occurred_at DESC
      LIMIT 20
    `;
    const [{ rows: [summary] }, { rows: typeBreakdown }, { rows: recent }] = await Promise.all([
      pool.query(summaryQuery),
      pool.query(activityBreakdownQuery),
      pool.query(recentQuery),
    ]);
    return { summary, typeBreakdown, recent };
  }

  static async getSettingsSummary() {
    const settings = await SettingsRepository.getSettings();
    return { settings: settings || {} };
  }
}

module.exports = SystemAdminDashboardRepository;
