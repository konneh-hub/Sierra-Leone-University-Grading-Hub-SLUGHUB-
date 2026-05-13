const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.post('/', authorizeRoles([ROLES.UNIVERSITY_ADMIN, ROLES.EXAM_OFFICER]), notificationController.sendNotification);
router.post('/role', authorizeRoles([ROLES.UNIVERSITY_ADMIN, ROLES.EXAM_OFFICER]), notificationController.notifyRoleUsers);
router.post('/course', authorizeRoles([ROLES.UNIVERSITY_ADMIN, ROLES.EXAM_OFFICER]), notificationController.notifyCourseStudents);

module.exports = router;
