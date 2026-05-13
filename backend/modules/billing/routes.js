const express = require('express');
const router = express.Router();
const billingController = require('./controller');
const { authenticateSystemAdmin, authorizeSystemAdmin } = require('../systemAdmin/auth/middleware');

router.use(authenticateSystemAdmin, authorizeSystemAdmin);

router.get('/', billingController.listBillings);
router.post('/:universityId/:subscriptionId', billingController.createBilling);
router.get('/details/:billingId', billingController.getBilling);
router.get('/university/:universityId', billingController.getUniversityBillings);
router.get('/subscription/:subscriptionId', billingController.getSubscriptionBillings);
router.put('/:billingId', billingController.updateBilling);
router.post('/:billingId/payment', billingController.recordPayment);
router.post('/:billingId/payment-failed', billingController.recordFailedPayment);
router.get('/unpaid/list', billingController.getUnpaidBills);
router.get('/university/:universityId/report', billingController.generateBillingReport);

module.exports = router;
