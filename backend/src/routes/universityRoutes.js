const express = require('express');
const router = express.Router();
const universityController = require('../controllers/universityController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/', authenticate, authorizeRoles(['system_admin']), universityController.createUniversity);
router.post('/:universityId/admins', authenticate, authorizeRoles(['system_admin']), universityController.createUniversityAdmin);
router.post('/staff', authenticate, authorizeRoles(['university_admin']), universityController.createStaffAccount);
router.post('/students/bulk', authenticate, authorizeRoles(['university_admin']), universityController.uploadStudentBulk);
router.post('/lecturers/bulk', authenticate, authorizeRoles(['university_admin']), universityController.uploadLecturerBulk);

module.exports = router;
