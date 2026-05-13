const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');

exports.sendNotification = async (req, res, next) => {
  try {
    const notification = await notificationService.sendNotification({
      creator: req.user,
      ...req.body,
    });
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: notification.university_id,
      activity_type: 'send_notification',
      activity_details: { notification_id: notification.id },
    });
    res.status(201).json({ notification });
  } catch (error) {
    next(error);
  }
};

exports.notifyRoleUsers = async (req, res, next) => {
  try {
    const result = await notificationService.notifyRoleUsers({ creator: req.user, ...req.body });
    res.status(201).json({ result });
  } catch (error) {
    next(error);
  }
};

exports.notifyCourseStudents = async (req, res, next) => {
  try {
    const result = await notificationService.notifyStudentsByCourse({ creator: req.user, ...req.body });
    res.status(201).json({ result });
  } catch (error) {
    next(error);
  }
};
