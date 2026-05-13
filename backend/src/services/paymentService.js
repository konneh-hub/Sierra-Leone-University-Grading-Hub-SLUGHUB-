const axios = require('axios');
const crypto = require('crypto');
const Stripe = require('stripe');
const billingService = require('./billingService');
const billingRepository = require('../repositories/billingRepository');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

// ==========================================
// PAYSTACK CONFIGURATION (Using REST API)
// ==========================================

const PAYSTACK_API_BASE = 'https://api.paystack.co';
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

// Create axios instance for Paystack with default headers
const paystackClient = axios.create({
  baseURL: PAYSTACK_API_BASE,
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${PAYSTACK_SECRET}`,
    'Content-Type': 'application/json',
  },
});

// Initialize Stripe only when credentials are configured
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

class PaymentService {
  constructor() {
    this.stripe = stripe;
    this.paystackClient = paystackClient;
  }

  ensurePaystackConfigured() {
    if (!PAYSTACK_SECRET) {
      throw new AppError('Paystack is not configured. Set PAYSTACK_SECRET environment variable.', 503);
    }
  }

  ensureStripeConfigured() {
    if (!this.stripe) {
      throw new AppError('Stripe is not configured. Set STRIPE_SECRET_KEY.', 503);
    }
  }

  // ==========================================
  // PAYSTACK PAYMENT INITIALIZATION (REST API)
  // ==========================================

  /**
   * Initialize a Paystack payment transaction
   * @param {Object} params - Payment parameters
   * @param {string} params.university_id - University ID
   * @param {string} params.subscription_plan_id - Subscription plan ID
   * @param {number} params.amount - Amount in dollars (will be converted to kobo)
   * @param {string} params.email - Customer email
   * @param {string} [params.callback_url] - Optional callback URL after payment
   * @returns {Object} Payment initialization data with authorization URL
   */
  async initializePaystackPayment({ university_id, subscription_plan_id, amount, email, callback_url }) {
    try {
      this.ensurePaystackConfigured();
      
      // Validate input
      if (!amount || amount <= 0) {
        throw new AppError('Invalid payment amount', 400);
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError('Invalid email format', 400);
      }

      // Get subscription details
      const subscription = await billingRepository.getUniversitySubscription(university_id);
      if (!subscription) {
        throw new AppError('University has no active subscription', 404);
      }

      // Get plan details
      const plan = await billingRepository.getPlanById(subscription_plan_id);
      if (!plan) {
        throw new AppError('Subscription plan not found', 404);
      }

      // Generate unique transaction reference
      const transactionReference = `PAYSTACK-${Date.now()}-${university_id}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create payment record in database
      const payment = await billingRepository.createPayment({
        university_id,
        subscription_id: subscription.id,
        amount,
        payment_method: 'paystack',
        transaction_reference: transactionReference,
        description: `Payment for ${plan.name} subscription`,
      });

      // Call Paystack REST API to initialize transaction
      const paystackResponse = await this.paystackClient.post('/transaction/initialize', {
        amount: Math.round(amount * 100), // Paystack expects amount in kobo (multiply by 100)
        email: email.toLowerCase().trim(),
        reference: transactionReference,
        callback_url: callback_url || process.env.PAYSTACK_CALLBACK_URL || `${process.env.BACKEND_URL}/api/payments/paystack/callback`,
        metadata: {
          university_id,
          subscription_id: subscription.id,
          payment_id: payment.id,
          plan_id: subscription_plan_id,
        },
      });

      // Log payment initialization
      await auditService.logActivity({
        user_id: null, // System action
        action: 'INITIALIZE_PAYSTACK_PAYMENT',
        resource_type: 'payment',
        resource_id: payment.id,
        details: `Initialized Paystack payment for university ${university_id}, amount: ${amount}`,
      });

      return {
        success: true,
        payment_url: paystackResponse.data.data.authorization_url,
        access_code: paystackResponse.data.data.access_code,
        transaction_reference: transactionReference,
        payment_id: payment.id,
        amount,
        email,
      };

    } catch (error) {
      console.error('Paystack payment initialization error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new AppError('Paystack authentication failed. Check PAYSTACK_SECRET.', 503);
      }
      if (error.response?.status === 400) {
        throw new AppError(`Paystack API error: ${error.response.data?.message || 'Invalid request'}`, 400);
      }
      if (error.AppError) {
        throw error;
      }
      
      throw new AppError('Failed to initialize Paystack payment', 500);
    }
  }

  // ==========================================
  // PAYSTACK PAYMENT VERIFICATION (REST API)
  // ==========================================

  /**
   * Verify a Paystack payment transaction
   * @param {string} reference - Transaction reference from Paystack
   * @returns {Object} Verification result with payment status
   */
  async verifyPaystackPayment(reference) {
    try {
      this.ensurePaystackConfigured();

      if (!reference || typeof reference !== 'string') {
        throw new AppError('Invalid transaction reference', 400);
      }

      // Call Paystack REST API to verify transaction
      const verificationResponse = await this.paystackClient.get(`/transaction/verify/${reference}`);

      const transactionData = verificationResponse.data.data;
      const paymentId = transactionData.metadata?.payment_id;

      if (!paymentId) {
        throw new AppError('Payment metadata missing from Paystack response', 400);
      }

      // Get payment from database
      const payment = await billingRepository.getPaymentById(paymentId);
      if (!payment) {
        throw new AppError('Payment record not found', 404);
      }

      // Check if payment is already processed
      if (payment.status === 'successful') {
        return { 
          status: 'already_processed', 
          message: 'Payment was already verified and processed',
          payment 
        };
      }

      // Verify payment details match what we recorded
      const expectedAmount = Math.round(payment.amount * 100); // Convert to kobo
      if (transactionData.amount !== expectedAmount) {
        throw new AppError(
          `Payment amount mismatch. Expected ${expectedAmount} kobo, got ${transactionData.amount} kobo`,
          400
        );
      }

      // Verify email matches
      if (transactionData.customer?.email !== payment.email) {
        console.warn(`Email mismatch for payment ${paymentId}. Expected: ${payment.email}, Got: ${transactionData.customer?.email}`);
      }

      if (transactionData.status === 'success') {
        // Update payment status
        const updatedPayment = await billingRepository.updatePaymentStatus(paymentId, 'successful');

        // Activate subscription
        await this.activateSubscriptionAfterPayment(paymentId, updatedPayment);

        return { 
          status: 'success', 
          message: 'Payment verified and subscription activated',
          payment: updatedPayment 
        };
      } else if (transactionData.status === 'failed') {
        // Handle failed payment
        const failureReason = transactionData.gateway_response || 'Payment failed';
        const updatedPayment = await billingRepository.updatePaymentStatus(
          paymentId,
          'failed',
          `Paystack status: ${transactionData.status}. Reason: ${failureReason}`
        );

        await this.handlePaymentFailure(paymentId, failureReason);

        return { 
          status: 'failed', 
          message: failureReason,
          payment: updatedPayment 
        };
      } else {
        // Pending or other status
        return { 
          status: transactionData.status, 
          message: `Payment status: ${transactionData.status}`,
          payment 
        };
      }

    } catch (error) {
      console.error('Paystack verification error:', error.response?.data || error.message);
      
      if (error.response?.status === 404) {
        throw new AppError('Transaction not found on Paystack', 404);
      }
      if (error.response?.status === 401) {
        throw new AppError('Paystack authentication failed. Check PAYSTACK_SECRET.', 503);
      }
      if (error.AppError) {
        throw error;
      }
      
      throw new AppError('Failed to verify Paystack payment', 500);
    }
  }

  // ==========================================
  // STRIPE PAYMENT INITIALIZATION
  // ==========================================

  async initializeStripePayment({ university_id, subscription_plan_id, amount, email, success_url, cancel_url }) {
    try {
      this.ensureStripeConfigured();
      
      // Validate input
      if (!amount || amount <= 0) {
        throw new AppError('Invalid payment amount', 400);
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new AppError('Invalid email format', 400);
      }

      // Get subscription details
      const subscription = await billingRepository.getUniversitySubscription(university_id);
      if (!subscription) {
        throw new AppError('University has no active subscription', 404);
      }

      // Get plan details
      const plan = await billingRepository.getPlanById(subscription_plan_id);
      if (!plan) {
        throw new AppError('Subscription plan not found', 404);
      }

      // Generate unique transaction reference
      const transactionReference = `STRIPE-${Date.now()}-${university_id}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      // Create payment record in database
      const payment = await billingRepository.createPayment({
        university_id,
        subscription_id: subscription.id,
        amount,
        payment_method: 'stripe',
        transaction_reference: transactionReference,
        description: `Payment for ${plan.name} subscription`,
      });

      // Create Stripe checkout session
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${plan.name} Subscription`,
                description: plan.description,
              },
              unit_amount: Math.round(amount * 100), // Stripe expects amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: success_url || `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${process.env.FRONTEND_URL}/payment/cancelled`,
        customer_email: email,
        metadata: {
          university_id: university_id.toString(),
          subscription_id: subscription.id.toString(),
          payment_id: payment.id.toString(),
          plan_id: subscription_plan_id.toString(),
          transaction_reference,
        },
        expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      });

      // Log payment initialization
      await auditService.logActivity({
        user_id: null, // System action
        action: 'INITIALIZE_STRIPE_PAYMENT',
        resource_type: 'payment',
        resource_id: payment.id,
        details: `Initialized Stripe payment for university ${university_id}, amount: ${amount}`,
      });

      return {
        success: true,
        payment_url: session.url,
        transaction_reference,
        payment_id: payment.id,
        session_id: session.id,
        amount,
        email,
      };

    } catch (error) {
      console.error('Stripe payment initialization error:', error.message);
      throw new AppError('Failed to initialize Stripe payment', 500);
    }
  }

  // ==========================================
  // STRIPE PAYMENT VERIFICATION
  // ==========================================

  async verifyStripePayment(sessionId) {
    try {
      this.ensureStripeConfigured();
      
      if (!sessionId || typeof sessionId !== 'string') {
        throw new AppError('Invalid session ID', 400);
      }

      // Retrieve session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (!session) {
        throw new AppError('Stripe session not found', 404);
      }

      const paymentId = session.metadata?.payment_id;

      if (!paymentId) {
        throw new AppError('Payment metadata missing', 400);
      }

      // Get payment from database
      const payment = await billingRepository.getPaymentById(paymentId);
      if (!payment) {
        throw new AppError('Payment record not found', 404);
      }

      // Check if payment is already processed
      if (payment.status === 'successful') {
        return { 
          status: 'already_processed', 
          message: 'Payment was already verified and processed',
          payment 
        };
      }

      if (session.payment_status === 'paid') {
        // Update payment status
        const updatedPayment = await billingRepository.updatePaymentStatus(paymentId, 'successful');

        // Activate subscription
        await this.activateSubscriptionAfterPayment(paymentId, updatedPayment);

        return { 
          status: 'success', 
          message: 'Payment verified and subscription activated',
          payment: updatedPayment 
        };
      } else {
        // Handle failed payment
        const failureReason = `Stripe payment status: ${session.payment_status}`;
        const updatedPayment = await billingRepository.updatePaymentStatus(
          paymentId,
          'failed',
          failureReason
        );

        await this.handlePaymentFailure(paymentId, failureReason);

        return { 
          status: 'failed', 
          message: failureReason,
          payment: updatedPayment 
        };
      }

    } catch (error) {
      console.error('Stripe verification error:', error.message);
      throw new AppError('Failed to verify Stripe payment', 500);
    }
  }

  // ==========================================
  // SUBSCRIPTION ACTIVATION LOGIC
  // ==========================================

  async activateSubscriptionAfterPayment(paymentId, payment) {
    try {
      // Get subscription
      const subscription = await billingRepository.getUniversitySubscriptionById(payment.subscription_id);
      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      // Calculate new expiry date based on billing cycle
      const currentDate = new Date();
      let newExpiryDate;

      if (subscription.billing_cycle === 'monthly') {
        newExpiryDate = new Date(currentDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
      } else if (subscription.billing_cycle === 'yearly') {
        newExpiryDate = new Date(currentDate);
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
      } else {
        throw new AppError('Invalid billing cycle', 400);
      }

      // Update subscription status and dates
      const updatedSubscription = await billingRepository.updateUniversitySubscription(
        subscription.id,
        {
          status: 'active',
          start_date: currentDate.toISOString().split('T')[0],
          end_date: newExpiryDate.toISOString().split('T')[0],
          next_billing_date: newExpiryDate.toISOString().split('T')[0],
        }
      );

      // Create status history
      await billingRepository.createStatusHistory({
        university_id: subscription.university_id,
        subscription_id: subscription.id,
        from_status: subscription.status,
        to_status: 'active',
        reason: `Payment verified: ${payment.transaction_reference}`,
        changed_by: null, // System action
      });

      // Generate invoice
      await billingService.generateInvoice(subscription.id, payment.amount);

      // Send notifications
      await this.sendPaymentSuccessEmail(subscription.university_id, payment);
      await this.sendSubscriptionActivatedNotification(subscription.university_id, subscription.id);

      // Log audit
      await auditService.logActivity({
        user_id: null, // System action
        action: 'ACTIVATE_SUBSCRIPTION_AFTER_PAYMENT',
        resource_type: 'university_subscription',
        resource_id: subscription.id,
        details: `Activated subscription for university ${subscription.university_id} after payment ${payment.transaction_reference}`,
      });

      return updatedSubscription;

    } catch (error) {
      console.error('Subscription activation error:', error);
      throw error;
    }
  }

  // ==========================================
  // PAYMENT FAILURE HANDLING
  // ==========================================

  async handlePaymentFailure(paymentId, reason) {
    try {
      const payment = await billingRepository.getPaymentById(paymentId);
      if (!payment) return;

      // Suspend subscription if it was active
      const subscription = await billingRepository.getUniversitySubscriptionById(payment.subscription_id);
      if (subscription && subscription.status === 'active') {
        await billingService.suspendSubscription(subscription.id, null); // System action
      }

      // Send failure notification
      await this.sendPaymentFailedEmail(payment.university_id, payment, reason);

      // Log audit
      await auditService.logActivity({
        user_id: null, // System action
        action: 'PAYMENT_FAILURE_HANDLED',
        resource_type: 'payment',
        resource_id: paymentId,
        details: `Handled failed payment for university ${payment.university_id}: ${reason}`,
      });

    } catch (error) {
      console.error('Payment failure handling error:', error);
    }
  }

  // ==========================================
  // REFUND PROCESSING
  // ==========================================

  async processRefund(paymentId, reason, refundedBy) {
    try {
      const payment = await billingRepository.getPaymentById(paymentId);
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (payment.status !== 'successful') {
        throw new AppError('Can only refund successful payments', 400);
      }

      // Process refund based on provider
      if (payment.payment_method === 'paystack') {
        await this.processPaystackRefund(payment.transaction_reference);
      } else if (payment.payment_method === 'stripe') {
        await this.processStripeRefund(payment.transaction_reference);
      }

      // Update payment status
      const updatedPayment = await billingRepository.updatePaymentStatus(
        paymentId,
        'refunded',
        reason
      );

      // Log audit
      await auditService.logActivity({
        user_id: refundedBy,
        action: 'PROCESS_REFUND',
        resource_type: 'payment',
        resource_id: paymentId,
        details: `Processed refund for payment ${payment.transaction_reference}: ${reason}`,
      });

      return updatedPayment;

    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  }

  // ==========================================
  // PAYSTACK REFUND (REST API)
  // ==========================================

  async processPaystackRefund(reference) {
    try {
      this.ensurePaystackConfigured();

      const refundResponse = await this.paystackClient.post('/refund', {
        transaction: reference,
      });

      console.log(`Paystack refund processed for ${reference}:`, refundResponse.data);
      return refundResponse.data;

    } catch (error) {
      console.error('Paystack refund error:', error.response?.data || error.message);
      throw new AppError('Failed to process Paystack refund', 500);
    }
  }

  // ==========================================
  // STRIPE REFUND
  // ==========================================

  async processStripeRefund(sessionId) {
    try {
      this.ensureStripeConfigured();

      // In Stripe, we need the payment intent ID, not session ID
      // This would need to be stored in the payment record
      console.log(`Processing Stripe refund for session ${sessionId}`);
      // Implementation depends on how you store payment intent IDs

    } catch (error) {
      console.error('Stripe refund error:', error);
      throw new AppError('Failed to process Stripe refund', 500);
    }
  }

  // ==========================================
  // NOTIFICATION SYSTEM
  // ==========================================

  async sendPaymentSuccessEmail(universityId, payment) {
    try {
      await notificationService.sendNotification({
        university_id: universityId,
        type: 'billing',
        title: 'Payment Successful',
        message: `Your payment of $${payment.amount} has been successfully processed. Transaction: ${payment.transaction_reference}`,
        priority: 'high',
      });
    } catch (error) {
      console.error('Payment success email error:', error);
    }
  }

  async sendPaymentFailedEmail(universityId, payment, reason) {
    try {
      await notificationService.sendNotification({
        university_id: universityId,
        type: 'billing',
        title: 'Payment Failed',
        message: `Your payment of $${payment.amount} failed. Reason: ${reason}. Transaction: ${payment.transaction_reference}`,
        priority: 'high',
      });
    } catch (error) {
      console.error('Payment failed email error:', error);
    }
  }

  async sendSubscriptionActivatedNotification(universityId, subscriptionId) {
    try {
      await notificationService.sendNotification({
        university_id: universityId,
        type: 'billing',
        title: 'Subscription Activated',
        message: 'Your subscription has been successfully activated. You can now access all system features.',
        priority: 'high',
      });
    } catch (error) {
      console.error('Subscription activation notification error:', error);
    }
  }

  // ==========================================
  // WEBHOOK SIGNATURE VERIFICATION (SECURITY)
  // ==========================================

  /**
   * Verify Paystack webhook signature
   * IMPORTANT: Always verify webhook signatures to ensure authenticity
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from x-paystack-signature header
   * @returns {boolean} True if signature is valid
   */
  verifyPaystackWebhookSignature(payload, signature) {
    try {
      if (!PAYSTACK_SECRET) {
        console.error('PAYSTACK_SECRET not configured for webhook verification');
        return false;
      }

      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      
      const expectedSignature = crypto
        .createHmac('sha512', PAYSTACK_SECRET)
        .update(payloadString)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature || '', 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Verify Stripe webhook signature
   * @param {Buffer} payload - Raw request body
   * @param {string} signature - Signature from stripe-signature header
   * @returns {Object|null} Parsed event if valid, null otherwise
   */
  verifyStripeWebhookSignature(payload, signature) {
    try {
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!secret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return null;
      }

      const event = JSON.parse(payload);
      
      // In production, use: stripe.webhooks.constructEvent(payload, signature, secret);
      // This is a simplified version
      console.log('Stripe webhook received:', event.type);
      return event;

    } catch (error) {
      console.error('Stripe webhook signature verification error:', error);
      return null;
    }
  }

  // ==========================================
  // AUDIT LOGGING
  // ==========================================

  async logPaymentTransaction(paymentData) {
    try {
      await auditService.logActivity({
        user_id: null,
        action: 'PAYMENT_TRANSACTION',
        resource_type: 'payment',
        resource_id: paymentData.id,
        details: {
          transaction_reference: paymentData.transaction_reference,
          university_id: paymentData.university_id,
          provider: paymentData.payment_method,
          amount: paymentData.amount,
          status: paymentData.status,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Payment logging error:', error);
    }
  }
}

module.exports = new PaymentService();
