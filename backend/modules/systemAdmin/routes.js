const express = require('express');
const router = express.Router();

const authRoutes = require('./auth/routes');
const dashboardRoutes = require('./dashboard/routes');
const universityRoutes = require('../universities/routes');
const subscriptionRoutes = require('../subscriptions/routes');
const billingRoutes = require('../billing/routes');
const analyticsRoutes = require('../analytics/routes');
const platformUsersRoutes = require('../platformUsers/routes');
const logsRoutes = require('../logs/routes');
const settingsRoutes = require('../settings/routes');

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/universities', universityRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/billing', billingRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/platform-users', platformUsersRoutes);
router.use('/logs', logsRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
