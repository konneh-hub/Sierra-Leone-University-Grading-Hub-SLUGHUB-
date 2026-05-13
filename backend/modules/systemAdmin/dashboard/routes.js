const express = require('express');
const router = express.Router();
const dashboardController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../auth/middleware');

// router.use(authenticateSystemAdmin, authorizeSystemAdmin); // Temporarily disabled for demo

router.get('/overview', dashboardController.getOverview);
router.get('/universities', dashboardController.getUniversitiesPage);
router.get('/admin-accounts', dashboardController.getAdminAccountsPage);
router.get('/subscriptions', dashboardController.getSubscriptionsPage);
router.get('/billing', dashboardController.getBillingPage);
router.get('/analytics', dashboardController.getAnalyticsPage);
router.get('/users', dashboardController.getUsersPage);
router.get('/logs', dashboardController.getLogsPage);
router.get('/settings', dashboardController.getSettingsPage);
router.get('/platform-metrics', dashboardController.getPlatformMetrics);
router.get('/billing-snapshot', dashboardController.getBillingSnapshot);
router.get('/churn-snapshot', dashboardController.getChurnSnapshot);
router.get('/top-universities', dashboardController.getTopUniversities);

module.exports = router;
