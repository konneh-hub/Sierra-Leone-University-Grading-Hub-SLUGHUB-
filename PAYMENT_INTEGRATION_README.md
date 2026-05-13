# Payment Gateway Integration - SRMS

This document outlines the complete payment gateway integration for the Student Result Management System (SRMS) using Paystack and Stripe.

## Overview

The payment system provides:
- **Paystack Integration**: Nigerian payment processing with mobile money support
- **Stripe Integration**: International card payments
- **Webhook Security**: Signature verification to prevent fake payments
- **Subscription Management**: Automatic activation and renewal
- **Transaction Logging**: Complete audit trail of all payments

## Setup Instructions

### 1. Environment Variables

Copy the `.env` file and update the following variables:

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_actual_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_actual_paystack_public_key
PAYSTACK_CALLBACK_URL=http://localhost:4000/api/payments/paystack/callback

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_actual_stripe_webhook_secret

# Webhook URLs (for dashboard configuration)
PAYSTACK_WEBHOOK_URL=http://localhost:4000/api/webhooks/paystack
STRIPE_WEBHOOK_URL=http://localhost:4000/api/webhooks/stripe
```

### 2. Paystack Setup

1. **Create Account**: Sign up at [paystack.com](https://paystack.com)
2. **Get API Keys**: Go to Settings > API Keys & Webhooks
3. **Configure Webhook**:
   - URL: `http://yourdomain.com/api/webhooks/paystack`
   - Events: `charge.success`, `charge.failed`
4. **Update .env**: Add your secret and public keys

### 3. Stripe Setup

1. **Create Account**: Sign up at [stripe.com](https://stripe.com)
2. **Get API Keys**: Go to Developers > API Keys
3. **Configure Webhook**:
   - Go to Developers > Webhooks
   - Add endpoint: `http://yourdomain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`
4. **Update .env**: Add your secret key and webhook secret

### 4. Database Setup

Ensure your PostgreSQL database has the required tables:
- `payments`
- `university_subscriptions`
- `invoices`
- `billing_notifications`
- `audit_logs`

## API Endpoints

### Payment Initialization

#### Paystack Payment
```http
POST /api/payments/paystack/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "universityId": 1,
  "amount": 50000,
  "billingCycle": "monthly",
  "description": "Monthly subscription payment"
}
```

#### Stripe Payment
```http
POST /api/payments/stripe/initialize
Authorization: Bearer <token>
Content-Type: application/json

{
  "universityId": 1,
  "amount": 50000,
  "billingCycle": "monthly",
  "description": "Monthly subscription payment"
}
```

### Payment Verification

#### Manual Verification
```http
POST /api/payments/verify/:paymentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "transactionReference": "PAY-123456789-1"
}
```

### Refund Processing
```http
POST /api/payments/refund/:paymentId
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 25000,
  "reason": "Customer request"
}
```

## Webhook Endpoints

### Paystack Webhooks
```http
POST /api/webhooks/paystack
X-Paystack-Signature: <signature>
Content-Type: application/json

{
  "event": "charge.success",
  "data": {
    "reference": "PAY-123456789-1",
    "status": "success",
    "amount": 50000
  }
}
```

### Stripe Webhooks
```http
POST /api/webhooks/stripe
Stripe-Signature: <signature>
Content-Type: application/json

{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "payment_status": "paid",
      "metadata": {
        "transactionReference": "PAY-123456789-1"
      }
    }
  }
}
```

## Security Features

### Webhook Signature Verification
- Paystack: Uses SHA512 HMAC with secret key
- Stripe: Uses webhook secret for signature validation
- Prevents fake payment notifications

### Transaction Validation
- Server-side payment verification
- Idempotent processing (prevents duplicate charges)
- Amount validation against subscription plans

### Audit Logging
- All payment events logged
- Transaction references tracked
- Failed payment attempts recorded

## Testing

### Paystack Test Cards
- Success: `4084084084084081` (any future expiry, any CVV)
- Failure: `4084084084084082` (any future expiry, any CVV)

### Stripe Test Cards
- Success: `4242424242424242` (any future expiry, any CVV)
- Failure: `4000000000000002` (any future expiry, any CVV)

## Production Deployment

1. **Update Environment Variables**:
   - Use live API keys
   - Update webhook URLs to production domain
   - Set `NODE_ENV=production`

2. **Configure Webhooks**:
   - Update webhook URLs in Paystack/Stripe dashboards
   - Test webhook delivery

3. **SSL Certificate**:
   - Ensure HTTPS for webhook endpoints
   - Paystack/Stripe require HTTPS in production

4. **Monitoring**:
   - Monitor webhook logs
   - Set up alerts for failed payments
   - Track subscription activation rates

## Troubleshooting

### Common Issues

1. **Webhook Signature Verification Fails**:
   - Check webhook secret in .env
   - Ensure raw body parsing (no JSON middleware)

2. **Payment Not Activating Subscription**:
   - Verify transaction reference matches
   - Check payment status in database
   - Review webhook logs

3. **CORS Errors**:
   - Update FRONTEND_URL in .env
   - Check CORS configuration in index.js

### Logs to Check

- Application logs for payment initialization
- Webhook controller logs for event processing
- Database audit logs for transaction history
- Paystack/Stripe dashboard for payment status

## Support

For issues with:
- **Paystack**: Check [paystack.com/docs](https://paystack.com/docs)
- **Stripe**: Check [stripe.com/docs](https://stripe.com/docs)
- **Integration**: Review application logs and database records