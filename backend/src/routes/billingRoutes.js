const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ============================================================
// SUBSCRIPTION PLANS ROUTES (SYSTEM ADMIN ONLY)
// ============================================================

// Create new subscription plan
router.post('/plans',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.createPlan
);

// Update existing plan
router.put('/plans/:planId',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.updatePlan
);

// Delete plan
router.delete('/plans/:planId',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.deletePlan
);

// List all plans
router.get('/plans',
  authenticate,
  billingController.listPlans
);

// List active plans only
router.get('/plans/active',
  authenticate,
  billingController.listActivePlans
);

// Get specific plan
router.get('/plans/:planId',
  authenticate,
  billingController.getPlan
);

// ============================================================
// UNIVERSITY SUBSCRIPTION ROUTES
// ============================================================

// Assign plan to university (system admin only)
router.post('/subscriptions/assign',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.assignToUniversity
);

// Get university subscription
router.get('/subscriptions/:universityId',
  authenticate,
  billingController.getSubscription
);

// Change university plan (system admin only)
router.post('/subscriptions/:universityId/change',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.changePlan
);

// Cancel subscription (system admin only)
router.post('/subscriptions/:subscriptionId/cancel',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.cancelSubscription
);

// ============================================================
// PAYMENT ROUTES
// ============================================================

// Create payment
router.post('/payments',
  authenticate,
  billingController.createPayment
);

// Verify payment (system admin or university admin)
router.post('/payments/:paymentId/verify',
  authenticate,
  authorizeRoles(['system_admin', 'university_admin']),
  billingController.verifyPayment
);

// Get payment history for university
router.get('/payments/:universityId',
  authenticate,
  billingController.getPaymentHistory
);

// Handle failed payment (system admin only)
router.post('/payments/:paymentId/fail',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.handleFailedPayment
);

// ============================================================
// INVOICE ROUTES
// ============================================================

// Generate invoice
router.post('/invoices',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.generateInvoice
);

// Get invoices for university
router.get('/invoices/:universityId',
  authenticate,
  billingController.getInvoices
);

// Mark invoice as paid (system admin only)
router.post('/invoices/:invoiceId/pay',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.markInvoicePaid
);

// ============================================================
// USAGE & LIMITS ROUTES
// ============================================================

// Get usage statistics for university
router.get('/usage/:universityId',
  authenticate,
  billingController.getUsageStats
);

// Check feature access for university
router.get('/features/:universityId/:featureName',
  authenticate,
  billingController.checkFeatureAccess
);

// Enable feature for plan (system admin only)
router.post('/plans/:planId/features',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.enableFeatureForPlan
);

// ============================================================
// SUBSCRIPTION STATUS ROUTES
// ============================================================

// Check subscription status for university
router.get('/status/:universityId',
  authenticate,
  billingController.checkSubscriptionStatus
);

// Activate subscription (system admin only)
router.post('/subscriptions/:subscriptionId/activate',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.activateSubscription
);

// Suspend subscription (system admin only)
router.post('/subscriptions/:subscriptionId/suspend',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.suspendSubscription
);

// Expire subscription (system admin only)
router.post('/subscriptions/:subscriptionId/expire',
  authenticate,
  authorizeRoles(['system_admin']),
  billingController.expireSubscription
);

module.exports = router;
