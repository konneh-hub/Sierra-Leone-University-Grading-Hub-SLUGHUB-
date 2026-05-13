const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

// ==========================================
// PAYMENT INITIALIZATION ENDPOINTS
// ==========================================

// Initialize Paystack payment
router.post('/paystack/initialize',
  authenticate,
  authorizeRoles(['university_admin']),
  async (req, res, next) => {
    try {
      const { subscription_plan_id, amount, email, callback_url } = req.body;
      const university_id = req.user.university_id;

      const paymentData = await paymentService.initializePaystackPayment({
        university_id,
        subscription_plan_id,
        amount,
        email,
        callback_url,
      });

      res.json({
        success: true,
        message: 'Paystack payment initialized successfully',
        data: paymentData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Initialize Stripe payment
router.post('/stripe/initialize',
  authenticate,
  authorizeRoles(['university_admin']),
  async (req, res, next) => {
    try {
      const { subscription_plan_id, amount, email, success_url, cancel_url } = req.body;
      const university_id = req.user.university_id;

      const paymentData = await paymentService.initializeStripePayment({
        university_id,
        subscription_plan_id,
        amount,
        email,
        success_url,
        cancel_url,
      });

      res.json({
        success: true,
        message: 'Stripe payment initialized successfully',
        data: paymentData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PAYMENT VERIFICATION ENDPOINTS (Manual verification)
// ==========================================

// Manually verify Paystack payment
router.post('/paystack/verify/:reference',
  authenticate,
  authorizeRoles(['system_admin', 'university_admin']),
  async (req, res, next) => {
    try {
      const { reference } = req.params;
      const verification = await paymentService.verifyPaystackPayment(reference);

      res.json({
        success: true,
        message: 'Paystack payment verification completed',
        data: verification,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Manually verify Stripe payment
router.post('/stripe/verify/:sessionId',
  authenticate,
  authorizeRoles(['system_admin', 'university_admin']),
  async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const verification = await paymentService.verifyStripePayment(sessionId);

      res.json({
        success: true,
        message: 'Stripe payment verification completed',
        data: verification,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// REFUND ENDPOINTS
// ==========================================

// Process refund
router.post('/refund/:paymentId',
  authenticate,
  authorizeRoles(['system_admin']),
  async (req, res, next) => {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const refund = await paymentService.processRefund(paymentId, reason, req.user.id);

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: refund,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==========================================
// PAYMENT CALLBACK ENDPOINTS (For frontend redirects)
// ==========================================

// Paystack callback handler
router.get('/paystack/callback',
  async (req, res) => {
    try {
      const { reference } = req.query;

      if (!reference) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?reason=missing_reference`);
      }

      // Verify payment
      const verification = await paymentService.verifyPaystackPayment(reference);

      if (verification.status === 'success') {
        res.redirect(`${process.env.FRONTEND_URL}/payment/success?reference=${reference}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed?reference=${reference}&reason=${verification.payment.failed_reason || 'verification_failed'}`);
      }
    } catch (error) {
      console.error('Paystack callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error?reason=callback_error`);
    }
  }
);

// Stripe success callback
router.get('/stripe/success',
  async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.redirect(`${process.env.FRONTEND_URL}/payment/error?reason=missing_session_id`);
      }

      // Verify payment
      const verification = await paymentService.verifyStripePayment(session_id);

      if (verification.status === 'success') {
        res.redirect(`${process.env.FRONTEND_URL}/payment/success?session_id=${session_id}`);
      } else {
        res.redirect(`${process.env.FRONTEND_URL}/payment/failed?session_id=${session_id}&reason=verification_failed`);
      }
    } catch (error) {
      console.error('Stripe success callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/payment/error?reason=callback_error`);
    }
  }
);

// Stripe cancel callback
router.get('/stripe/cancel',
  async (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/payment/cancelled`);
  }
);

module.exports = router;
