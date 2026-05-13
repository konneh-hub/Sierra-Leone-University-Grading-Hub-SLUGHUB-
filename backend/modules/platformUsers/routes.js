const express = require('express');
const router = express.Router();
const platformUserController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/', platformUserController.listPlatformUsers);
router.get('/system-admins', platformUserController.listSystemAdmins);
router.get('/:userId', platformUserController.getPlatformUser);
router.put('/:userId', platformUserController.updatePlatformUser);
router.put('/:userId/deactivate', platformUserController.deactivateUser);
router.put('/:userId/activate', platformUserController.activateUser);
router.put('/:userId/assign-system-admin', platformUserController.assignSystemAdmin);
router.put('/:userId/remove-system-admin', platformUserController.removeSystemAdmin);

module.exports = router;
