const express = require('express');
const router = express.Router();
const systemAdminAuthController = require('./controller');

router.post('/login', systemAdminAuthController.login);
router.post('/logout', systemAdminAuthController.logout);
router.post('/refresh', systemAdminAuthController.refresh);
router.get('/verify', systemAdminAuthController.verify);

module.exports = router;
