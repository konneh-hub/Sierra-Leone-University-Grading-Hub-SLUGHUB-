const userRepository = require('../repositories/userRepository');
const notificationRepository = require('../repositories/notificationRepository');
const AppError = require('../utils/appError');

exports.sendNotification = async ({ creator, university_id, type, title, body, expires_at }) => {
  if (!creator.roles.includes('university_admin') && !creator.roles.includes('system_admin') && !creator.roles.includes('exam_officer')) {
    throw new AppError('Unauthorized to send notifications', 403);
  }

  const notification = await notificationRepository.createNotification({
    university_id,
    type,
    title,
    body,
    expires_at,
  });
  return notification;
};

exports.notifyRoleUsers = async ({ creator, university_id, roleName, notificationId }) => {
  if (!creator.roles.includes('university_admin') && !creator.roles.includes('system_admin')) {
    throw new AppError('Unauthorized to notify by role', 403);
  }
  const users = await userRepository.getUsersByRole(roleName, university_id);
  const recipients = [];
  for (const user of users) {
    recipients.push(await notificationRepository.createNotificationRecipient({ notification_id: notificationId, user_id: user.id }));
  }
  return recipients;
};

exports.notifyStudentsByCourse = async ({ creator, course_id, semester_id, academic_session_id, notificationId }) => {
  if (!creator.roles.includes('university_admin') && !creator.roles.includes('exam_officer')) {
    throw new AppError('Unauthorized to notify course students', 403);
  }
  const students = await userRepository.getActiveStudentsByCourse(course_id, semester_id, academic_session_id);
  const recipients = [];
  for (const student of students) {
    recipients.push(await notificationRepository.createNotificationRecipient({ notification_id: notificationId, user_id: student.user_id }));
  }
  return recipients;
};

exports.sendBulkNotification = async (type, notifications) => {
  const results = [];

  for (const notification of notifications) {
    try {
      // Create notification
      const createdNotification = await notificationRepository.createNotification({
        university_id: null, // System notification
        type: type,
        title: notification.title,
        body: notification.message,
        expires_at: null,
      });

      // Create recipient
      await notificationRepository.createNotificationRecipient({
        notification_id: createdNotification.id,
        user_id: notification.userId,
      });

      results.push({
        notificationId: createdNotification.id,
        userId: notification.userId,
        success: true
      });
    } catch (error) {
      results.push({
        userId: notification.userId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
};
