# Paystack Payment Integration Guide

This guide explains how to use the new Paystack REST API integration for handling payments in your Express backend without the vulnerable `paystack-node` SDK.

## Overview

The new payment system uses:
- **Axios** for HTTP requests to Paystack API
- **Direct REST API calls** (no SDK)
- **HMAC-SHA512** webhook signature verification
- **Production-ready error handling** and security practices

## Environment Variables

Add these to your `.env` file:

```env
# Paystack Configuration (Required)
PAYSTACK_SECRET=pk_live_your_paystack_secret_key_here  # Your Paystack secret key from dashboard
PAYSTACK_CALLBACK_URL=http://localhost:3000/payment/success  # Frontend callback after payment

# Stripe Configuration (Optional)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Server Configuration
BACKEND_URL=http://localhost:4000  # Your backend URL for webhooks
FRONTEND_URL=http://localhost:3000  # Your frontend URL
```

## Quick Start

### 1. Initialize a Payment (in your controller)

```javascript
const paymentService = require('../services/paymentService');

exports.initiatePayment = async (req, res, next) => {
  try {
    const { subscription_plan_id, amount, email, callback_url } = req.body;
    const university_id = req.user.university_id; // From authenticated user

    // Initialize payment via Paystack
    const paymentData = await paymentService.initializePaystackPayment({
      university_id,
      subscription_plan_id,
      amount,              // Amount in dollars
      email,              // Customer email
      callback_url,       // Optional: custom callback URL
    });

    res.json({
      success: true,
      message: 'Payment initialized successfully',
      data: paymentData,
      // Returns: {
      //   success: true,
      //   payment_url: 'https://checkout.paystack.com/...',
      //   access_code: 'access_code_here',
      //   transaction_reference: 'PAYSTACK-...',
      //   payment_id: 123,
      //   amount: 99.99,
      //   email: 'user@example.com'
      // }
    });

  } catch (error) {
    next(error);
  }
};
```

### 2. Verify a Payment (Manual verification)

```javascript
exports.verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.params; // Transaction reference from Paystack

    // Verify payment with Paystack API
    const verification = await paymentService.verifyPaystackPayment(reference);

    res.json({
      success: true,
      message: 'Payment verified',
      data: verification,
      // Returns: {
      //   status: 'success' | 'failed' | 'already_processed',
      //   message: 'Payment verified and subscription activated',
      //   payment: { id, amount, status, transaction_reference, ... }
      // }
    });

  } catch (error) {
    next(error);
  }
};
```

### 3. Webhook Endpoint for Charge Success

```javascript
// In your routes (e.g., src/routes/webhookRoutes.js)
router.post('/paystack', webhookController.handlePaystackWebhook);

// In your webhook controller
exports.handlePaystackWebhook = async (req, res) => {
  try {
    // SECURITY: Verify signature before processing
    const payload = req.rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-paystack-signature'];

    if (!paymentService.verifyPaystackWebhookSignature(payload, signature)) {
      console.error('Invalid Paystack webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const event = req.body.event;
    const data = req.body.data;

    console.log(`Paystack webhook received: ${event}`);

    switch (event) {
      case 'charge.success':
        // Payment was successful
        const reference = data.reference;
        const verification = await paymentService.verifyPaystackPayment(reference);
        console.log(`Payment ${reference} verified:`, verification);
        break;

      case 'charge.failed':
        // Payment failed
        console.log('Paystack charge failed:', data);
        // Handle failed payment...
        break;

      default:
        console.log(`Unhandled Paystack event: ${event}`);
    }

    // Always return 200 to acknowledge receipt (Paystack requirement)
    res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 even on error to prevent retries
    res.status(200).json({ status: 'error' });
  }
};
```

## Frontend Integration

### 1. Send User to Payment Page

```javascript
// Frontend code (React example)
async function initiatePayment() {
  const response = await fetch('/api/payments/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription_plan_id: planId,
      amount: 99.99,
      email: userEmail,
    }),
  });

  const { data } = await response.json();
  
  // Redirect user to Paystack payment page
  window.location.href = data.payment_url;
}
```

### 2. Handle Payment Callback

```javascript
// Paystack redirects user back to: /payment/success?reference=PAYSTACK-...

function PaymentCallback() {
  const { reference } = useSearchParams();

  useEffect(() => {
    if (reference) {
      // Verify payment on backend
      fetch(`/api/payments/paystack/verify/${reference}`, {
        method: 'POST',
      })
        .then(res => res.json())
        .then(data => {
          if (data.data.status === 'success') {
            console.log('Payment successful!');
            // Redirect to success page
          }
        });
    }
  }, [reference]);

  return <div>Processing payment...</div>;
}
```

## API Endpoints

### Initialize Payment

```http
POST /api/payments/paystack/initialize
Authorization: Bearer <jwt_token>

{
  "subscription_plan_id": "plan_id_123",
  "amount": 99.99,
  "email": "user@example.com",
  "callback_url": "https://your-frontend.com/payment/success"
}

Response:
{
  "success": true,
  "message": "Paystack payment initialized successfully",
  "data": {
    "success": true,
    "payment_url": "https://checkout.paystack.com/...",
    "access_code": "access_code_here",
    "transaction_reference": "PAYSTACK-...",
    "payment_id": 123,
    "amount": 99.99,
    "email": "user@example.com"
  }
}
```

### Verify Payment

```http
POST /api/payments/paystack/verify/:reference
Authorization: Bearer <jwt_token>

Response:
{
  "success": true,
  "message": "Paystack payment verification completed",
  "data": {
    "status": "success",
    "message": "Payment verified and subscription activated",
    "payment": {
      "id": 123,
      "amount": 99.99,
      "status": "successful",
      "transaction_reference": "PAYSTACK-...",
      "university_id": "uni_123"
    }
  }
}
```

### Webhook

```http
POST /api/webhooks/paystack
x-paystack-signature: <signature>

Body:
{
  "event": "charge.success",
  "data": {
    "id": 1234567,
    "reference": "PAYSTACK-...",
    "amount": 9999,
    "status": "success",
    "customer": {
      "email": "user@example.com"
    },
    "metadata": {
      "payment_id": 123,
      "university_id": "uni_123"
    }
  }
}
```

## Payment Flow Diagram

```
1. User clicks "Pay" button
   ↓
2. Frontend calls POST /api/payments/paystack/initialize
   ↓
3. Backend creates payment record in database
   ↓
4. Backend calls Paystack REST API /transaction/initialize
   ↓
5. Paystack returns authorization_url
   ↓
6. Frontend redirects user to Paystack checkout page
   ↓
7. User completes payment on Paystack
   ↓
8A. Paystack sends webhook to POST /api/webhooks/paystack
   ↓
8B. Webhook controller verifies signature and calls verifyPaystackPayment()
   ↓
9. Backend verifies payment with Paystack REST API
   ↓
10. If successful:
    - Update payment status to 'successful'
    - Activate user's subscription
    - Send notification email
    ↓
11. Paystack redirects user back to callback_url
    ↓
12. Frontend calls POST /api/payments/paystack/verify/:reference
    ↓
13. Backend returns verification result
    ↓
14. Frontend displays success/error message
```

## Security Best Practices

### 1. Always Verify Webhook Signatures

```javascript
// ❌ DON'T: Trust webhook data without verification
const event = req.body.event;

// ✅ DO: Always verify signature first
if (!paymentService.verifyPaystackWebhookSignature(payload, signature)) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### 2. Validate on Backend, Not Frontend

```javascript
// ❌ DON'T: Trust frontend amount
const { amount } = req.body; // Could be manipulated!

// ✅ DO: Fetch plan details from database
const plan = await billingRepository.getPlanById(subscription_plan_id);
const amount = plan.price; // Use database value, not user input
```

### 3. Idempotent Verification

```javascript
// ❌ DON'T: Process payment multiple times
if (transactionData.status === 'success') {
  await billingRepository.updatePaymentStatus(paymentId, 'successful');
}

// ✅ DO: Check if already processed
if (payment.status === 'successful') {
  return { status: 'already_processed', message: '...' };
}
```

### 4. Use HTTPS in Production

```env
# Development
PAYSTACK_CALLBACK_URL=http://localhost:3000/payment/success

# Production (MUST be HTTPS)
PAYSTACK_CALLBACK_URL=https://yourdomain.com/payment/success
```

### 5. Rate Limiting on Payment Endpoints

```javascript
const rateLimit = require('express-rate-limit');

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many payment requests, please try again later',
});

router.post('/paystack/initialize', paymentLimiter, authenticate, controller.initiatePayment);
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Paystack is not configured` | `PAYSTACK_SECRET` not set | Add to `.env` |
| `Paystack authentication failed` | Invalid or expired secret key | Update `PAYSTACK_SECRET` |
| `Payment amount mismatch` | Frontend sent wrong amount | Always use database plan price |
| `Invalid signature` | Webhook signature verification failed | Ensure raw body is used, not parsed JSON |
| `Transaction not found` | Invalid reference code | Check reference from Paystack |

### Error Response Format

```json
{
  "success": false,
  "message": "Failed to initialize Paystack payment",
  "error": {
    "code": "PAYMENT_ERROR",
    "details": "..."
  }
}
```

## Testing

### Test Payment Reference

Use Paystack test credentials from your dashboard:

```javascript
// Test successful payment
const reference = 'PAYSTACK-1234567890';

// Verify it
const result = await paymentService.verifyPaystackPayment(reference);
```

### Mock Webhook Test

```javascript
const crypto = require('crypto');
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET;

const payload = JSON.stringify({
  event: 'charge.success',
  data: {
    reference: 'PAYSTACK-test-ref',
    amount: 9999,
    status: 'success',
  },
});

const signature = crypto
  .createHmac('sha512', PAYSTACK_SECRET)
  .update(payload)
  .digest('hex');

// Send POST request with signature header
fetch('/api/webhooks/paystack', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-paystack-signature': signature,
  },
  body: payload,
});
```

## Troubleshooting

### Webhook Not Triggered

1. Check Paystack dashboard → API Keys → Webhook section
2. Verify webhook URL is publicly accessible
3. Ensure it's HTTPS in production
4. Check Paystack logs for failures

### Signature Verification Fails

1. Ensure you're using the **raw request body**, not parsed JSON
2. Middleware order matters:
   ```javascript
   // ✅ Correct order
   app.use(express.raw({ type: 'application/json' })); // Before parsing
   app.use('/webhooks', webhookRoutes);
   app.use(express.json());
   ```

### Payment Status Not Updating

1. Check database for payment record
2. Verify webhook is being called
3. Check logs for verification errors
4. Ensure database connection is working

## Migration from paystack-node

If you were using the old `paystack-node` SDK:

### Old Code
```javascript
const Paystack = require('paystack-node');
const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY);

const response = await paystack.initializeTransaction({
  amount: 9999,
  email: 'user@example.com',
});
```

### New Code
```javascript
const paymentService = require('../services/paymentService');

const response = await paymentService.initializePaystackPayment({
  university_id,
  subscription_plan_id,
  amount: 99.99, // Now in dollars, not kobo
  email: 'user@example.com',
});
```

## Additional Resources

- [Paystack API Documentation](https://paystack.com/docs/api)
- [Paystack Webhook Events](https://paystack.com/docs/webhooks/events)
- [Paystack Test Cards](https://paystack.com/docs/test-keys)

## Support

For issues:
1. Check logs in `backend/logs/`
2. Verify `.env` variables are set
3. Test with Paystack test credentials first
4. Check Paystack webhook delivery logs
