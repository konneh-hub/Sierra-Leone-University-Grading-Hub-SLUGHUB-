const express = require('express');
const router = express.Router();
const enrollmentController = require('../controllers/enrollmentController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/', authenticate, authorizeRoles(['system_admin', 'university_admin', 'exam_officer']), enrollmentController.enrollStudent);

module.exports = router;
