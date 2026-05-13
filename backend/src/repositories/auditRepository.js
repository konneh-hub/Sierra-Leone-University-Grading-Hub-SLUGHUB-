const pool = require('../config/database');

exports.logActivity = async ({ user_id, university_id, activity_type, activity_details }) => {
  const { rows } = await pool.query(
    `INSERT INTO activity_logs (user_id, university_id, activity_type, activity_details, occurred_at)
     VALUES ($1, $2, $3, $4, now()) RETURNING *`,
    [user_id, university_id, activity_type, activity_details]
  );
  return rows[0];
};

exports.createAuditTrail = async ({ entity_table, entity_id, action, performed_by, changes }) => {
  const { rows } = await pool.query(
    `INSERT INTO audit_trails (entity_table, entity_id, action, performed_by, performed_at, changes)
     VALUES ($1, $2, $3, $4, now(), $5) RETURNING *`,
    [entity_table, entity_id, action, performed_by, changes]
  );
  return rows[0];
};

exports.listActivityLogs = async ({ university_id, user_id, activity_type, since, until, limit = 100 }) => {
  const conditions = [];
  const values = [];

  if (university_id) {
    values.push(university_id);
    conditions.push(`university_id = $${values.length}`);
  }

  if (user_id) {
    values.push(user_id);
    conditions.push(`user_id = $${values.length}`);
  }

  if (activity_type) {
    values.push(activity_type);
    conditions.push(`activity_type = $${values.length}`);
  }

  if (since) {
    values.push(since);
    conditions.push(`occurred_at >= $${values.length}`);
  }

  if (until) {
    values.push(until);
    conditions.push(`occurred_at <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit);
  const { rows } = await pool.query(
    `SELECT * FROM activity_logs ${whereClause} ORDER BY occurred_at DESC LIMIT $${values.length}`,
    values
  );
  return rows;
};
