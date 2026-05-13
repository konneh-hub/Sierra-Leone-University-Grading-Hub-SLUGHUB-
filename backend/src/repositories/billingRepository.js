const pool = require('../config/database');

// ============================================================
// SUBSCRIPTION PLANS
// ============================================================

exports.createSubscriptionPlan = async ({
  name,
  description,
  billing_cycle,
  price_monthly,
  price_yearly,
  max_students,
  max_lecturers,
  max_courses,
  max_admin_users,
  feature_flags,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO subscription_plans (
      name, description, billing_cycle, price_monthly, price_yearly,
      max_students, max_lecturers, max_courses, max_admin_users,
      feature_flags, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
     RETURNING *`,
    [
      name,
      description,
      billing_cycle,
      price_monthly,
      price_yearly,
      max_students,
      max_lecturers,
      max_courses,
      max_admin_users,
      JSON.stringify(feature_flags || {}),
    ]
  );
  return rows[0];
};

exports.updateSubscriptionPlan = async (planId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = $${paramCount++}`);
    if (key === 'feature_flags') {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
  });

  fields.push('updated_at = now()');
  values.push(planId);

  const { rows } = await pool.query(
    `UPDATE subscription_plans SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return rows[0];
};

exports.deleteSubscriptionPlan = async (planId) => {
  await pool.query('DELETE FROM subscription_plans WHERE id = $1', [planId]);
};

exports.getAllPlans = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_plans ORDER BY created_at DESC`
  );
  return rows;
};

exports.getActivePlans = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_plans WHERE is_active = true ORDER BY created_at DESC`
  );
  return rows;
};

exports.getPlanById = async (planId) => {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_plans WHERE id = $1`,
    [planId]
  );
  return rows[0];
};

// ============================================================
// UNIVERSITY SUBSCRIPTIONS
// ============================================================

exports.createUniversitySubscription = async ({
  university_id,
  plan_id,
  billing_cycle,
  trial_days = 14,
}) => {
  const start_date = new Date().toISOString().split('T')[0];
  const end_date = new Date(Date.now() + (trial_days * 24 * 60 * 60 * 1000))
    .toISOString()
    .split('T')[0];
  const next_billing_date = end_date;

  const { rows } = await pool.query(
    `INSERT INTO university_subscriptions (
      university_id, plan_id, status, start_date, end_date,
      auto_renew, billing_cycle, next_billing_date, trial_days
    ) VALUES ($1, $2, 'trial', $3, $4, true, $5, $6, $7)
     RETURNING *`,
    [university_id, plan_id, start_date, end_date, billing_cycle, next_billing_date, trial_days]
  );
  return rows[0];
};

exports.getUniversitySubscription = async (universityId) => {
  const { rows } = await pool.query(
    `SELECT us.*, sp.* FROM university_subscriptions us
     JOIN subscription_plans sp ON sp.id = us.plan_id
     WHERE us.university_id = $1
     LIMIT 1`,
    [universityId]
  );
  return rows[0];
};

exports.updateUniversitySubscription = async (subscriptionId, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = $${paramCount++}`);
    values.push(value);
  });

  fields.push('updated_at = now()');
  values.push(subscriptionId);

  const { rows } = await pool.query(
    `UPDATE university_subscriptions SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  );
  return rows[0];
};

exports.getUniversitySubscriptionById = async (subscriptionId) => {
  const { rows } = await pool.query(
    `SELECT * FROM university_subscriptions WHERE id = $1`,
    [subscriptionId]
  );
  return rows[0];
};

exports.getExpiredSubscriptions = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM university_subscriptions
     WHERE status != 'expired' AND end_date < CURRENT_DATE`
  );
  return rows;
};

exports.getExpiringSubscriptions = async (daysBeforeExpiry = 7) => {
  const { rows } = await pool.query(
    `SELECT * FROM university_subscriptions
     WHERE status IN ('active', 'trial')
       AND end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysBeforeExpiry} days'
       AND auto_renew = true`
  );
  return rows;
};

// ============================================================
// USAGE TRACKING
// ============================================================

exports.createUsageTracking = async (universityId, subscriptionId) => {
  const { rows } = await pool.query(
    `INSERT INTO usage_tracking (university_id, subscription_id)
     VALUES ($1, $2) RETURNING *`,
    [universityId, subscriptionId]
  );
  return rows[0];
};

exports.getUsageTracking = async (universityId) => {
  const { rows } = await pool.query(
    `SELECT * FROM usage_tracking WHERE university_id = $1`,
    [universityId]
  );
  return rows[0];
};

exports.incrementStudentCount = async (universityId) => {
  const { rows } = await pool.query(
    `UPDATE usage_tracking
     SET total_students = total_students + 1, last_updated_at = now()
     WHERE university_id = $1
     RETURNING *`,
    [universityId]
  );
  return rows[0];
};

exports.incrementLecturerCount = async (universityId) => {
  const { rows } = await pool.query(
    `UPDATE usage_tracking
     SET total_lecturers = total_lecturers + 1, last_updated_at = now()
     WHERE university_id = $1
     RETURNING *`,
    [universityId]
  );
  return rows[0];
};

exports.incrementCourseCount = async (universityId) => {
  const { rows } = await pool.query(
    `UPDATE usage_tracking
     SET total_courses = total_courses + 1, last_updated_at = now()
     WHERE university_id = $1
     RETURNING *`,
    [universityId]
  );
  return rows[0];
};

exports.incrementAdminUserCount = async (universityId) => {
  const { rows } = await pool.query(
    `UPDATE usage_tracking
     SET total_admin_users = total_admin_users + 1, last_updated_at = now()
     WHERE university_id = $1
     RETURNING *`,
    [universityId]
  );
  return rows[0];
};

exports.decrementStudentCount = async (universityId) => {
  const { rows } = await pool.query(
    `UPDATE usage_tracking
     SET total_students = GREATEST(0, total_students - 1), last_updated_at = now()
     WHERE university_id = $1
     RETURNING *`,
    [universityId]
  );
  return rows[0];
};

// ============================================================
// PAYMENTS
// ============================================================

exports.createPayment = async ({
  university_id,
  subscription_id,
  amount,
  payment_method,
  transaction_reference,
  description,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO payments (
      university_id, subscription_id, amount, payment_method,
      transaction_reference, status, description
    ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     RETURNING *`,
    [
      university_id,
      subscription_id,
      amount,
      payment_method,
      transaction_reference,
      description,
    ]
  );
  return rows[0];
};

exports.getPaymentById = async (paymentId) => {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE id = $1`,
    [paymentId]
  );
  return rows[0];
};

exports.updatePaymentStatus = async (paymentId, status, failedReason = null) => {
  const { rows } = await pool.query(
    `UPDATE payments
     SET status = $1, processed_at = now(), failed_reason = $2
     WHERE id = $3
     RETURNING *`,
    [status, failedReason, paymentId]
  );
  return rows[0];
};

exports.getPaymentHistory = async (universityId) => {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE university_id = $1 ORDER BY created_at DESC`,
    [universityId]
  );
  return rows;
};

exports.getUnsuccessfulPayments = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM payments WHERE status IN ('pending', 'failed')`
  );
  return rows;
};

// ============================================================
// INVOICES
// ============================================================

exports.createInvoice = async ({
  university_id,
  subscription_id,
  amount_due,
  due_date,
  invoice_number,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO invoices (
      invoice_number, university_id, subscription_id,
      amount_due, due_date, status
    ) VALUES ($1, $2, $3, $4, $5, 'issued')
     RETURNING *`,
    [invoice_number, university_id, subscription_id, amount_due, due_date]
  );
  return rows[0];
};

exports.getInvoicesByUniversity = async (universityId) => {
  const { rows } = await pool.query(
    `SELECT * FROM invoices WHERE university_id = $1 ORDER BY issued_at DESC`,
    [universityId]
  );
  return rows;
};

exports.getInvoiceById = async (invoiceId) => {
  const { rows } = await pool.query(
    `SELECT * FROM invoices WHERE id = $1`,
    [invoiceId]
  );
  return rows[0];
};

exports.markInvoiceAsPaid = async (invoiceId, amountPaid) => {
  const { rows } = await pool.query(
    `UPDATE invoices
     SET status = 'paid', amount_paid = $1, paid_at = now()
     WHERE id = $2
     RETURNING *`,
    [amountPaid, invoiceId]
  );
  return rows[0];
};

exports.getOverdueInvoices = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM invoices WHERE due_date < CURRENT_DATE AND status != 'paid'`
  );
  return rows;
};

// ============================================================
// FEATURE ACCESS
// ============================================================

exports.addFeatureToplan = async (planId, featureName, isEnabled = true) => {
  const { rows } = await pool.query(
    `INSERT INTO feature_access (plan_id, feature_name, is_enabled)
     VALUES ($1, $2, $3)
     ON CONFLICT (plan_id, feature_name) DO UPDATE
     SET is_enabled = EXCLUDED.is_enabled
     RETURNING *`,
    [planId, featureName, isEnabled]
  );
  return rows[0];
};

exports.getFeaturesForPlan = async (planId) => {
  const { rows } = await pool.query(
    `SELECT * FROM feature_access WHERE plan_id = $1`,
    [planId]
  );
  return rows;
};

exports.hasFeatureAccess = async (universityId, featureName) => {
  const { rows } = await pool.query(
    `SELECT EXISTS(
      SELECT 1 FROM feature_access fa
      JOIN subscription_plans sp ON sp.id = fa.plan_id
      JOIN university_subscriptions us ON us.plan_id = sp.id
      WHERE us.university_id = $1
        AND fa.feature_name = $2
        AND fa.is_enabled = true
        AND us.status IN ('active', 'trial')
        AND us.end_date >= CURRENT_DATE
    ) as has_access`,
    [universityId, featureName]
  );
  return rows[0].has_access;
};

// ============================================================
// SUBSCRIPTION STATUS HISTORY
// ============================================================

exports.createStatusHistory = async ({
  university_id,
  subscription_id,
  from_status,
  to_status,
  reason,
  changed_by,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO subscription_status_history (
      university_id, subscription_id, from_status, to_status, reason, changed_by
    ) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [university_id, subscription_id, from_status, to_status, reason, changed_by]
  );
  return rows[0];
};

exports.getStatusHistory = async (subscriptionId) => {
  const { rows } = await pool.query(
    `SELECT * FROM subscription_status_history WHERE subscription_id = $1
     ORDER BY changed_at DESC`,
    [subscriptionId]
  );
  return rows;
};

// ============================================================
// BILLING NOTIFICATIONS
// ============================================================

exports.createBillingNotification = async ({
  university_id,
  subscription_id,
  notification_type,
  message,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO billing_notifications (
      university_id, subscription_id, notification_type, message
    ) VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [university_id, subscription_id, notification_type, message]
  );
  return rows[0];
};

exports.markNotificationAsSent = async (notificationId) => {
  const { rows } = await pool.query(
    `UPDATE billing_notifications
     SET is_sent = true, sent_at = now()
     WHERE id = $1
     RETURNING *`,
    [notificationId]
  );
  return rows[0];
};

exports.getUnsentNotifications = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM billing_notifications WHERE is_sent = false
     ORDER BY created_at ASC`
  );
  return rows;
};
