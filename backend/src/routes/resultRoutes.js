const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.get('/', authorizeRoles([ROLES.SYSTEM_ADMIN, ROLES.UNIVERSITY_ADMIN, ROLES.EXAM_OFFICER, ROLES.DEAN, ROLES.HOD, ROLES.LECTURER, ROLES.STUDENT]), resultController.listResults);
router.post('/', authorizeRoles([ROLES.EXAM_OFFICER, ROLES.LECTURER]), resultController.createResult);
router.put('/:id', authorizeRoles([ROLES.EXAM_OFFICER, ROLES.LECTURER]), resultController.updateResult);
router.get('/student/:studentId', authorizeRoles([ROLES.STUDENT, ROLES.LECTURER, ROLES.HOD, ROLES.DEAN, ROLES.EXAM_OFFICER]), resultController.getResultsForStudent);
router.post('/:resultId/submit', authorizeRoles([ROLES.LECTURER, ROLES.EXAM_OFFICER]), resultController.submit);
router.post('/:resultId/verify', authorizeRoles([ROLES.HOD]), resultController.verify);
router.post('/:resultId/review', authorizeRoles([ROLES.DEAN]), resultController.review);
router.post('/:resultId/approve', authorizeRoles([ROLES.EXAM_OFFICER]), resultController.approve);
router.post('/:resultId/publish', authorizeRoles([ROLES.EXAM_OFFICER]), resultController.publish);
router.post('/:resultId/reject', authorizeRoles([ROLES.EXAM_OFFICER, ROLES.HOD, ROLES.DEAN]), resultController.reject);
router.post('/:resultId/resubmit', authorizeRoles([ROLES.LECTURER]), resultController.resubmit);

module.exports = router;
