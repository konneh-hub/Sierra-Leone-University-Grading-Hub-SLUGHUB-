const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.get('/', tenantController.listTenants);
router.post('/', tenantController.createTenant);

module.exports = router;
