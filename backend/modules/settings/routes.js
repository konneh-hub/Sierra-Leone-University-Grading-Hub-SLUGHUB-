const express = require('express');
const router = express.Router();
const settingsController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

module.exports = router;
