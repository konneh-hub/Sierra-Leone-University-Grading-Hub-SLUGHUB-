const express = require('express');
const router = express.Router();
const universityController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/', universityController.listUniversities);
router.post('/', universityController.createUniversity);
router.get('/:universityId', universityController.getUniversity);
router.put('/:universityId', universityController.updateUniversity);
router.delete('/:universityId', universityController.deleteUniversity);
router.post('/:universityId/admins', universityController.createUniversityAdmin);
router.post('/:universityId/admins/assign', universityController.assignAdmin);
router.put('/admins/:adminId/password', universityController.resetAdminPassword);
router.put('/admins/:adminId/deactivate', universityController.deactivateAdmin);

module.exports = router;
