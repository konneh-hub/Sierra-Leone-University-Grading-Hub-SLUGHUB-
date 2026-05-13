const express = require('express');
const router = express.Router();
const logsController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/', logsController.getPlatformLogs);

module.exports = router;
