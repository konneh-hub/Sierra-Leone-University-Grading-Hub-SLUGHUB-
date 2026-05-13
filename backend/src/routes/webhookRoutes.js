const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// ==========================================
// WEBHOOK ENDPOINTS (No authentication - external services)
// ==========================================

// Paystack webhook endpoint
router.post('/paystack',
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  webhookController.handlePaystackWebhook
);

// Stripe webhook endpoint
router.post('/stripe',
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  webhookController.handleStripeWebhook
);

module.exports = router;
