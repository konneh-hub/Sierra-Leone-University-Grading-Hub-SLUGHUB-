const pool = require('../config/database');

exports.createNotification = async ({ university_id, type, title, body, expires_at }) => {
  const { rows } = await pool.query(
    `INSERT INTO notifications (university_id, type, title, body, created_at, expires_at)
     VALUES ($1, $2, $3, $4, now(), $5) RETURNING *`,
    [university_id, type, title, body, expires_at]
  );
  return rows[0];
};

exports.createNotificationRecipient = async ({ notification_id, user_id }) => {
  const { rows } = await pool.query(
    `INSERT INTO notification_recipients (notification_id, user_id, status, delivered_at)
     VALUES ($1, $2, 'unread', now()) RETURNING *`,
    [notification_id, user_id]
  );
  return rows[0];
};
