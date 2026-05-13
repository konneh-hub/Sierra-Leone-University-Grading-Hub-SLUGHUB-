const paymentService = require('../services/paymentService');
const billingService = require('../services/billingService');
const auditService = require('../services/auditService');

// ==========================================
// PAYSTACK WEBHOOK CONTROLLER
// ==========================================

exports.handlePaystackWebhook = async (req, res) => {
  try {
    // Get raw body for signature verification (important for webhooks)
    const payload = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-paystack-signature'];

    // Verify webhook signature - SECURITY: Always verify webhooks
    if (!paymentService.verifyPaystackWebhookSignature(payload, signature)) {
      console.error('Invalid Paystack webhook signature');
      return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }

    const event = payload.event;
    const data = payload.data;

    console.log(`Paystack webhook received: ${event}`);

    // Handle different event types
    switch (event) {
      case 'charge.success':
        await handlePaystackChargeSuccess(data);
        break;

      case 'charge.failed':
        await handlePaystackChargeFailed(data);
        break;

      case 'transfer.success':
        // Handle transfer success if needed
        console.log('Paystack transfer success:', data);
        break;

      case 'transfer.failed':
        // Handle transfer failure if needed
        console.log('Paystack transfer failed:', data);
        break;

      default:
        console.log(`Unhandled Paystack event: ${event}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Paystack webhook error:', error);
    // Still return 200 to prevent retries for processing errors
    res.status(200).json({ status: 'error', message: error.message });
  }
};

// ==========================================
// STRIPE WEBHOOK CONTROLLER
// ==========================================

exports.handleStripeWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['stripe-signature'];
    const timestamp = req.headers['stripe-timestamp'];

    // Verify webhook signature
    if (!paymentService.verifyStripeWebhookSignature(payload, signature, timestamp)) {
      console.error('Invalid Stripe webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = payload;
    const eventType = event.type;
    const data = event.data.object;

    console.log(`Stripe webhook received: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'checkout.session.completed':
        await handleStripeCheckoutCompleted(data);
        break;

      case 'payment_intent.payment_failed':
        await handleStripePaymentFailed(data);
        break;

      case 'invoice.payment_succeeded':
        await handleStripeInvoicePaid(data);
        break;

      case 'invoice.payment_failed':
        await handleStripeInvoiceFailed(data);
        break;

      case 'customer.subscription.updated':
        await handleStripeSubscriptionUpdated(data);
        break;

      case 'customer.subscription.deleted':
        await handleStripeSubscriptionCancelled(data);
        break;

      default:
        console.log(`Unhandled Stripe event: ${eventType}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    // Still return 200 to prevent retries for processing errors
    res.status(200).json({ status: 'error', message: error.message });
  }
};

// ==========================================
// PAYSTACK EVENT HANDLERS
// ==========================================

async function handlePaystackChargeSuccess(data) {
  try {
    const reference = data.reference;
    const paymentId = data.metadata?.payment_id;

    if (!paymentId) {
      console.error('Paystack charge success: Missing payment_id in metadata');
      return;
    }

    // Verify payment with Paystack API
    const verification = await paymentService.verifyPaystackPayment(reference);

    if (verification.status === 'success') {
      console.log(`Paystack payment verified and processed: ${reference}`);

      // Log successful payment
      await auditService.logActivity({
        user_id: null, // System action
        action: 'PAYSTACK_WEBHOOK_CHARGE_SUCCESS',
        resource_type: 'payment',
        resource_id: paymentId,
        details: `Paystack charge success webhook processed for reference: ${reference}`,
      });
    }

  } catch (error) {
    console.error('Paystack charge success handler error:', error);
  }
}

async function handlePaystackChargeFailed(data) {
  try {
    const reference = data.reference;
    const paymentId = data.metadata?.payment_id;

    if (!paymentId) {
      console.error('Paystack charge failed: Missing payment_id in metadata');
      return;
    }

    // Handle failed payment
    await paymentService.handlePaymentFailure(
      paymentId,
      `Paystack charge failed: ${data.gateway_response || 'Unknown reason'}`
    );

    console.log(`Paystack payment failure processed: ${reference}`);

    // Log failed payment
    await auditService.logActivity({
      user_id: null, // System action
      action: 'PAYSTACK_WEBHOOK_CHARGE_FAILED',
      resource_type: 'payment',
      resource_id: paymentId,
      details: `Paystack charge failed webhook processed for reference: ${reference}`,
    });

  } catch (error) {
    console.error('Paystack charge failed handler error:', error);
  }
}

// ==========================================
// STRIPE EVENT HANDLERS
// ==========================================

async function handleStripeCheckoutCompleted(session) {
  try {
    const sessionId = session.id;
    const paymentId = session.metadata?.payment_id;

    if (!paymentId) {
      console.error('Stripe checkout completed: Missing payment_id in metadata');
      return;
    }

    // Verify payment with Stripe API
    const verification = await paymentService.verifyStripePayment(sessionId);

    if (verification.status === 'success') {
      console.log(`Stripe checkout verified and processed: ${sessionId}`);

      // Log successful payment
      await auditService.logActivity({
        user_id: null, // System action
        action: 'STRIPE_WEBHOOK_CHECKOUT_COMPLETED',
        resource_type: 'payment',
        resource_id: paymentId,
        details: `Stripe checkout completed webhook processed for session: ${sessionId}`,
      });
    }

  } catch (error) {
    console.error('Stripe checkout completed handler error:', error);
  }
}

async function handleStripePaymentFailed(paymentIntent) {
  try {
    const paymentId = paymentIntent.metadata?.payment_id;

    if (!paymentId) {
      console.error('Stripe payment failed: Missing payment_id in metadata');
      return;
    }

    // Handle failed payment
    await paymentService.handlePaymentFailure(
      paymentId,
      `Stripe payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown reason'}`
    );

    console.log(`Stripe payment failure processed: ${paymentIntent.id}`);

    // Log failed payment
    await auditService.logActivity({
      user_id: null, // System action
      action: 'STRIPE_WEBHOOK_PAYMENT_FAILED',
      resource_type: 'payment',
      resource_id: paymentId,
      details: `Stripe payment failed webhook processed for payment intent: ${paymentIntent.id}`,
    });

  } catch (error) {
    console.error('Stripe payment failed handler error:', error);
  }
}

async function handleStripeInvoicePaid(invoice) {
  try {
    // Handle recurring payment success
    console.log(`Stripe invoice paid: ${invoice.id}, amount: ${invoice.amount_paid / 100}`);

    // This could trigger subscription renewal logic
    // For now, just log it
    await auditService.logActivity({
      user_id: null, // System action
      action: 'STRIPE_WEBHOOK_INVOICE_PAID',
      resource_type: 'invoice',
      resource_id: null,
      details: `Stripe invoice paid webhook processed: ${invoice.id}`,
    });

  } catch (error) {
    console.error('Stripe invoice paid handler error:', error);
  }
}

async function handleStripeInvoiceFailed(invoice) {
  try {
    console.log(`Stripe invoice failed: ${invoice.id}`);

    // This could trigger subscription suspension
    await auditService.logActivity({
      user_id: null, // System action
      action: 'STRIPE_WEBHOOK_INVOICE_FAILED',
      resource_type: 'invoice',
      resource_id: null,
      details: `Stripe invoice failed webhook processed: ${invoice.id}`,
    });

  } catch (error) {
    console.error('Stripe invoice failed handler error:', error);
  }
}

async function handleStripeSubscriptionUpdated(subscription) {
  try {
    console.log(`Stripe subscription updated: ${subscription.id}, status: ${subscription.status}`);

    // Handle subscription status changes
    await auditService.logActivity({
      user_id: null, // System action
      action: 'STRIPE_WEBHOOK_SUBSCRIPTION_UPDATED',
      resource_type: 'subscription',
      resource_id: null,
      details: `Stripe subscription updated webhook processed: ${subscription.id}, status: ${subscription.status}`,
    });

  } catch (error) {
    console.error('Stripe subscription updated handler error:', error);
  }
}

async function handleStripeSubscriptionCancelled(subscription) {
  try {
    console.log(`Stripe subscription cancelled: ${subscription.id}`);

    // Handle subscription cancellation
    await auditService.logActivity({
      user_id: null, // System action
      action: 'STRIPE_WEBHOOK_SUBSCRIPTION_CANCELLED',
      resource_type: 'subscription',
      resource_id: null,
      details: `Stripe subscription cancelled webhook processed: ${subscription.id}`,
    });

  } catch (error) {
    console.error('Stripe subscription cancelled handler error:', error);
  }
}
