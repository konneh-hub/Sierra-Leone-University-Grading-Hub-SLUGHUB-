const express = require('express');
const router = express.Router();
const subscriptionController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/', subscriptionController.listSubscriptions);
router.post('/:universityId', subscriptionController.createSubscription);
router.get('/details/:subscriptionId', subscriptionController.getSubscription);
router.get('/university/:universityId', subscriptionController.getUniversitySubscription);
router.put('/:subscriptionId', subscriptionController.updateSubscription);
router.post('/:subscriptionId/renew', subscriptionController.renewSubscription);
router.post('/:subscriptionId/suspend', subscriptionController.suspendSubscription);
router.post('/:subscriptionId/cancel', subscriptionController.cancelSubscription);
router.get('/university/:universityId/status', subscriptionController.checkSubscriptionStatus);

module.exports = router;
