const express = require('express');
const router = express.Router();
const analyticsController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/university/:universityId', analyticsController.getUniversityDashboard);
router.get('/platform/dashboard', analyticsController.getPlatformDashboard);
router.get('/billing/analytics', analyticsController.getBillingAnalytics);
router.get('/churn/analytics', analyticsController.getChurnAnalytics);
router.get('/revenue/analytics', analyticsController.getRevenueAnalytics);
router.get('/comprehensive/analytics', analyticsController.getComprehensiveAnalytics);

module.exports = router;
