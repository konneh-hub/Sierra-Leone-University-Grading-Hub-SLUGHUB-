const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

router.get('/', authenticate, authorizeRoles([ROLES.SYSTEM_ADMIN, ROLES.UNIVERSITY_ADMIN, ROLES.EXAM_OFFICER]), auditController.listActivities);

module.exports = router;
