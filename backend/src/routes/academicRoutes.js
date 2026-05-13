const express = require('express');
const router = express.Router();
const academicController = require('../controllers/academicController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/faculties', authenticate, authorizeRoles(['system_admin', 'university_admin']), academicController.createFaculty);
router.post('/departments', authenticate, authorizeRoles(['system_admin', 'university_admin']), academicController.createDepartment);
router.post('/programs', authenticate, authorizeRoles(['system_admin', 'university_admin']), academicController.createProgram);
router.post('/courses', authenticate, authorizeRoles(['system_admin', 'university_admin']), academicController.createCourse);
router.post('/departments/:departmentId/assign-hod', authenticate, authorizeRoles(['system_admin', 'university_admin']), academicController.assignHOD);
router.post('/faculties/:facultyId/assign-dean', authenticate, authorizeRoles(['system_admin', 'university_admin']), academicController.assignDean);

module.exports = router;
