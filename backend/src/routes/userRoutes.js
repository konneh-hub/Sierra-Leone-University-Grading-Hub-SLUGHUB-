const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.get('/', authorizeRoles([ROLES.SYSTEM_ADMIN, ROLES.UNIVERSITY_ADMIN]), userController.listUsers);
router.get('/:id', userController.getUserById);
router.post('/', authorizeRoles([ROLES.SYSTEM_ADMIN, ROLES.UNIVERSITY_ADMIN]), userController.createUser);
router.put('/:id', authorizeRoles([ROLES.SYSTEM_ADMIN, ROLES.UNIVERSITY_ADMIN]), userController.updateUser);

module.exports = router;
