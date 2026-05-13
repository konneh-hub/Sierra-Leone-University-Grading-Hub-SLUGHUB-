const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/login', authController.login);
router.post('/self-register', authController.selfRegister);
router.post('/assign-role', authenticate, authorizeRoles(['system_admin']), authController.assignRole);

module.exports = router;
