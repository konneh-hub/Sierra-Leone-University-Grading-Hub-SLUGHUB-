const express = require('express');
const router = express.Router();
const transcriptController = require('../controllers/transcriptController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.post('/', authorizeRoles([ROLES.EXAM_OFFICER]), transcriptController.generateTranscript);
router.get('/history/:studentId', authorizeRoles([ROLES.STUDENT, ROLES.EXAM_OFFICER, ROLES.UNIVERSITY_ADMIN]), transcriptController.fetchAcademicHistory);
router.get('/cgpa/:studentId', authorizeRoles([ROLES.STUDENT, ROLES.EXAM_OFFICER, ROLES.UNIVERSITY_ADMIN]), transcriptController.computeFinalCGPA);

module.exports = router;
