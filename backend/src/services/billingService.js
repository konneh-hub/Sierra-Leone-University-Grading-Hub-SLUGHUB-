const billingRepository = require('../repositories/billingRepository');
const paymentService = require('./paymentService');
const auditService = require('./auditService');
const notificationService = require('./notificationService');
const AppError = require('../utils/appError');

// ============================================================
// SUBSCRIPTION PLANS MANAGEMENT (SYSTEM ADMIN ONLY)
// ============================================================

exports.createSubscriptionPlan = async (planData, createdBy) => {
  // Validate required fields
  const requiredFields = ['name', 'billing_cycle', 'price_monthly', 'price_yearly'];
  for (const field of requiredFields) {
    if (!planData[field]) {
      throw new AppError(`Missing required field: ${field}`, 400);
    }
  }

  // Validate billing cycle
  if (!['monthly', 'yearly'].includes(planData.billing_cycle)) {
    throw new AppError('Invalid billing cycle. Must be monthly or yearly', 400);
  }

  // Validate prices
  if (planData.price_monthly < 0 || planData.price_yearly < 0) {
    throw new AppError('Prices cannot be negative', 400);
  }

  // Validate limits
  const limits = ['max_students', 'max_lecturers', 'max_courses', 'max_admin_users'];
  for (const limit of limits) {
    if (planData[limit] !== null && planData[limit] < 0) {
      throw new AppError(`${limit} cannot be negative`, 400);
    }
  }

  const plan = await billingRepository.createSubscriptionPlan(planData);

  // Log audit
  await auditService.logActivity({
    user_id: createdBy,
    action: 'CREATE_SUBSCRIPTION_PLAN',
    resource_type: 'subscription_plan',
    resource_id: plan.id,
    details: `Created subscription plan: ${plan.name}`,
  });

  return plan;
};

exports.updateSubscriptionPlan = async (planId, updates, updatedBy) => {
  // Check if plan exists
  const existingPlan = await billingRepository.getPlanById(planId);
  if (!existingPlan) {
    throw new AppError('Subscription plan not found', 404);
  }

  // Validate billing cycle if provided
  if (updates.billing_cycle && !['monthly', 'yearly'].includes(updates.billing_cycle)) {
    throw new AppError('Invalid billing cycle. Must be monthly or yearly', 400);
  }

  // Validate prices if provided
  if (updates.price_monthly !== undefined && updates.price_monthly < 0) {
    throw new AppError('Monthly price cannot be negative', 400);
  }
  if (updates.price_yearly !== undefined && updates.price_yearly < 0) {
    throw new AppError('Yearly price cannot be negative', 400);
  }

  const updatedPlan = await billingRepository.updateSubscriptionPlan(planId, updates);

  // Log audit
  await auditService.logActivity({
    user_id: updatedBy,
    action: 'UPDATE_SUBSCRIPTION_PLAN',
    resource_type: 'subscription_plan',
    resource_id: planId,
    details: `Updated subscription plan: ${updatedPlan.name}`,
  });

  return updatedPlan;
};

exports.deleteSubscriptionPlan = async (planId, deletedBy) => {
  // Check if plan exists
  const existingPlan = await billingRepository.getPlanById(planId);
  if (!existingPlan) {
    throw new AppError('Subscription plan not found', 404);
  }

  // Check if plan is being used by any university
  const { rows } = await billingRepository.pool.query(
    'SELECT COUNT(*) as count FROM university_subscriptions WHERE plan_id = $1',
    [planId]
  );
  if (parseInt(rows[0].count) > 0) {
    throw new AppError('Cannot delete plan that is currently assigned to universities', 400);
  }

  await billingRepository.deleteSubscriptionPlan(planId);

  // Log audit
  await auditService.logActivity({
    user_id: deletedBy,
    action: 'DELETE_SUBSCRIPTION_PLAN',
    resource_type: 'subscription_plan',
    resource_id: planId,
    details: `Deleted subscription plan: ${existingPlan.name}`,
  });
};

exports.getAllPlans = async () => {
  return await billingRepository.getAllPlans();
};

exports.getActivePlans = async () => {
  return await billingRepository.getActivePlans();
};

exports.getPlanById = async (planId) => {
  const plan = await billingRepository.getPlanById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', 404);
  }
  return plan;
};

// ============================================================
// UNIVERSITY SUBSCRIPTION MANAGEMENT
// ============================================================

exports.assignPlanToUniversity = async (universityId, planId, billingCycle, assignedBy) => {
  // Check if university already has an active subscription
  const existingSubscription = await billingRepository.getUniversitySubscription(universityId);
  if (existingSubscription && existingSubscription.status !== 'expired' && existingSubscription.status !== 'cancelled') {
    throw new AppError('University already has an active subscription', 400);
  }

  // Check if plan exists and is active
  const plan = await billingRepository.getPlanById(planId);
  if (!plan || !plan.is_active) {
    throw new AppError('Subscription plan not found or inactive', 404);
  }

  // Validate billing cycle matches plan
  if (billingCycle !== plan.billing_cycle) {
    throw new AppError(`Billing cycle must match plan cycle: ${plan.billing_cycle}`, 400);
  }

  const subscription = await billingRepository.createUniversitySubscription({
    university_id: universityId,
    plan_id: planId,
    billing_cycle: billingCycle,
  });

  // Create usage tracking
  await billingRepository.createUsageTracking(universityId, subscription.id);

  // Log audit
  await auditService.logActivity({
    user_id: assignedBy,
    action: 'ASSIGN_SUBSCRIPTION_PLAN',
    resource_type: 'university_subscription',
    resource_id: subscription.id,
    details: `Assigned plan ${plan.name} to university ${universityId}`,
  });

  return subscription;
};

exports.changeUniversityPlan = async (universityId, newPlanId, changedBy) => {
  // Get current subscription
  const currentSubscription = await billingRepository.getUniversitySubscription(universityId);
  if (!currentSubscription) {
    throw new AppError('University has no active subscription', 404);
  }

  // Check if new plan exists and is active
  const newPlan = await billingRepository.getPlanById(newPlanId);
  if (!newPlan || !newPlan.is_active) {
    throw new AppError('New subscription plan not found or inactive', 404);
  }

  // Update subscription
  const updatedSubscription = await billingRepository.updateUniversitySubscription(
    currentSubscription.id,
    { plan_id: newPlanId }
  );

  // Log audit
  await auditService.logActivity({
    user_id: changedBy,
    action: 'CHANGE_SUBSCRIPTION_PLAN',
    resource_type: 'university_subscription',
    resource_id: currentSubscription.id,
    details: `Changed plan from ${currentSubscription.name} to ${newPlan.name} for university ${universityId}`,
  });

  return updatedSubscription;
};

exports.getUniversitySubscription = async (universityId) => {
  const subscription = await billingRepository.getUniversitySubscription(universityId);
  if (!subscription) {
    throw new AppError('University has no subscription', 404);
  }
  return subscription;
};

exports.cancelSubscription = async (subscriptionId, cancelledBy) => {
  // Get subscription
  const subscription = await billingRepository.getUniversitySubscriptionById(subscriptionId);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  // Update status
  const updatedSubscription = await billingRepository.updateUniversitySubscription(
    subscriptionId,
    { status: 'cancelled', auto_renew: false }
  );

  // Create status history
  await billingRepository.createStatusHistory({
    university_id: subscription.university_id,
    subscription_id: subscriptionId,
    from_status: subscription.status,
    to_status: 'cancelled',
    reason: 'Manually cancelled by admin',
    changed_by: cancelledBy,
  });

  // Send notification
  await this.sendBillingNotification(
    subscription.university_id,
    subscriptionId,
    'subscription_cancelled',
    'Your subscription has been cancelled by the system administrator.'
  );

  // Log audit
  await auditService.logActivity({
    user_id: cancelledBy,
    action: 'CANCEL_SUBSCRIPTION',
    resource_type: 'university_subscription',
    resource_id: subscriptionId,
    details: `Cancelled subscription for university ${subscription.university_id}`,
  });

  return updatedSubscription;
};

// ============================================================
// PAYMENT SYSTEM LOGIC
// ============================================================

exports.createPayment = async (universityId, amount, paymentMethod, description, createdBy) => {
  // Get university subscription
  const subscription = await billingRepository.getUniversitySubscription(universityId);
  if (!subscription) {
    throw new AppError('University has no active subscription', 404);
  }

  // Generate transaction reference
  const transactionReference = `PAY-${Date.now()}-${universityId}`;

  const payment = await billingRepository.createPayment({
    university_id: universityId,
    subscription_id: subscription.id,
    amount,
    payment_method: paymentMethod,
    transaction_reference: transactionReference,
    description,
  });

  // Log audit
  await auditService.logActivity({
    user_id: createdBy,
    action: 'CREATE_PAYMENT',
    resource_type: 'payment',
    resource_id: payment.id,
    details: `Created payment of ${amount} for university ${universityId}`,
  });

  return payment;
};

exports.verifyPayment = async (paymentId, transactionReference, verifiedBy) => {
  // Get payment
  const payment = await billingRepository.getPaymentById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  if (payment.status !== 'pending') {
    throw new AppError('Payment is not in pending status', 400);
  }

  // Use payment service to verify payment
  const verificationResult = await paymentService.verifyPayment(
    payment.transaction_reference,
    payment.payment_method
  );

  if (!verificationResult.success) {
    throw new AppError(`Payment verification failed: ${verificationResult.message}`, 400);
  }

  // Update payment status to successful
  const updatedPayment = await billingRepository.updatePaymentStatus(paymentId, 'successful');

  // Get subscription and activate it
  const subscription = await billingRepository.getUniversitySubscriptionById(payment.subscription_id);
  if (subscription.status === 'trial' || subscription.status === 'suspended') {
    await this.activateSubscription(subscription.id, verifiedBy);
  }

  // Generate invoice if needed
  await this.generateInvoice(subscription.id, payment.amount);

  // Send notification
  await this.sendBillingNotification(
    payment.university_id,
    payment.subscription_id,
    'payment_successful',
    `Payment of ${payment.amount} has been successfully processed.`
  );

  // Log audit
  await auditService.logActivity({
    user_id: verifiedBy,
    action: 'VERIFY_PAYMENT',
    resource_type: 'payment',
    resource_id: paymentId,
    details: `Verified payment ${transactionReference} for university ${payment.university_id}`,
  });

  return updatedPayment;
};

exports.handleFailedPayment = async (paymentId, reason, handledBy) => {
  // Get payment
  const payment = await billingRepository.getPaymentById(paymentId);
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  // Update payment status to failed
  const updatedPayment = await billingRepository.updatePaymentStatus(paymentId, 'failed', reason);

  // Suspend subscription
  const subscription = await billingRepository.getUniversitySubscriptionById(payment.subscription_id);
  if (subscription.status === 'active') {
    await this.suspendSubscription(subscription.id, handledBy);
  }

  // Send notification
  await this.sendBillingNotification(
    payment.university_id,
    payment.subscription_id,
    'payment_failed',
    `Payment failed: ${reason}. Your subscription has been suspended.`
  );

  // Log audit
  await auditService.logActivity({
    user_id: handledBy,
    action: 'HANDLE_FAILED_PAYMENT',
    resource_type: 'payment',
    resource_id: paymentId,
    details: `Handled failed payment for university ${payment.university_id}: ${reason}`,
  });

  return updatedPayment;
};

exports.getPaymentHistory = async (universityId) => {
  return await billingRepository.getPaymentHistory(universityId);
};

// ============================================================
// INVOICE SYSTEM
// ============================================================

exports.generateInvoice = async (subscriptionId, amount, dueDate = null) => {
  // Get subscription
  const subscription = await billingRepository.getUniversitySubscriptionById(subscriptionId);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now()}-${subscription.university_id}`;

  // Set due date (default 30 days from now)
  const defaultDueDate = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000))
    .toISOString()
    .split('T')[0];
  const finalDueDate = dueDate || defaultDueDate;

  const invoice = await billingRepository.createInvoice({
    university_id: subscription.university_id,
    subscription_id: subscriptionId,
    amount_due: amount,
    due_date: finalDueDate,
    invoice_number: invoiceNumber,
  });

  return invoice;
};

exports.getInvoicesByUniversity = async (universityId) => {
  return await billingRepository.getInvoicesByUniversity(universityId);
};

exports.markInvoiceAsPaid = async (invoiceId, amountPaid, markedBy) => {
  // Get invoice
  const invoice = await billingRepository.getInvoiceById(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (invoice.status === 'paid') {
    throw new AppError('Invoice is already paid', 400);
  }

  const updatedInvoice = await billingRepository.markInvoiceAsPaid(invoiceId, amountPaid);

  // Log audit
  await auditService.logActivity({
    user_id: markedBy,
    action: 'MARK_INVOICE_PAID',
    resource_type: 'invoice',
    resource_id: invoiceId,
    details: `Marked invoice ${invoice.invoice_number} as paid`,
  });

  return updatedInvoice;
};

// ============================================================
// USAGE LIMIT TRACKING & ENFORCEMENT
// ============================================================

exports.trackUsage = async (universityId, resourceType) => {
  // Get usage tracking
  const usage = await billingRepository.getUsageTracking(universityId);
  if (!usage) {
    throw new AppError('Usage tracking not found for university', 404);
  }

  // Increment appropriate counter
  switch (resourceType) {
    case 'student':
      await billingRepository.incrementStudentCount(universityId);
      break;
    case 'lecturer':
      await billingRepository.incrementLecturerCount(universityId);
      break;
    case 'course':
      await billingRepository.incrementCourseCount(universityId);
      break;
    case 'admin_user':
      await billingRepository.incrementAdminUserCount(universityId);
      break;
    default:
      throw new AppError('Invalid resource type', 400);
  }
};

exports.getUsageStats = async (universityId) => {
  // Get usage tracking
  const usage = await billingRepository.getUsageTracking(universityId);
  if (!usage) {
    throw new AppError('Usage tracking not found for university', 404);
  }

  // Get plan limits
  const subscription = await billingRepository.getUniversitySubscription(universityId);
  if (!subscription) {
    throw new AppError('No active subscription found', 404);
  }

  return {
    current_usage: {
      students: usage.total_students,
      lecturers: usage.total_lecturers,
      courses: usage.total_courses,
      admin_users: usage.total_admin_users,
    },
    plan_limits: {
      students: subscription.max_students,
      lecturers: subscription.max_lecturers,
      courses: subscription.max_courses,
      admin_users: subscription.max_admin_users,
    },
    last_updated: usage.last_updated_at,
  };
};

exports.enforcePlanLimits = async (universityId, resourceType) => {
  const usageStats = await this.getUsageStats(universityId);

  const currentCount = usageStats.current_usage[resourceType + 's']; // students, lecturers, etc.
  const limit = usageStats.plan_limits[resourceType + 's'];

  // If limit is null, unlimited
  if (limit !== null && currentCount >= limit) {
    throw new AppError(
      `Plan limit exceeded for ${resourceType}s. Current: ${currentCount}, Limit: ${limit}`,
      403
    );
  }
};

// ============================================================
// FEATURE ACCESS CONTROL
// ============================================================

exports.checkFeatureAccess = async (universityId, featureName) => {
  return await billingRepository.hasFeatureAccess(universityId, featureName);
};

exports.enableFeatureForPlan = async (planId, featureName, enabledBy) => {
  // Check if plan exists
  const plan = await billingRepository.getPlanById(planId);
  if (!plan) {
    throw new AppError('Subscription plan not found', 404);
  }

  await billingRepository.addFeatureToplan(planId, featureName, true);

  // Log audit
  await auditService.logActivity({
    user_id: enabledBy,
    action: 'ENABLE_FEATURE_FOR_PLAN',
    resource_type: 'feature_access',
    resource_id: planId,
    details: `Enabled feature ${featureName} for plan ${plan.name}`,
  });
};

// ============================================================
// SUBSCRIPTION STATUS MANAGEMENT
// ============================================================

exports.checkSubscriptionStatus = async (universityId) => {
  const subscription = await billingRepository.getUniversitySubscription(universityId);
  if (!subscription) {
    return { status: 'none', details: 'No subscription found' };
  }

  const now = new Date();
  const endDate = new Date(subscription.end_date);

  let status = subscription.status;
  let details = '';

  if (status === 'active' && endDate < now) {
    status = 'expired';
    await this.expireSubscription(subscription.id, null); // Auto-expire
  }

  switch (status) {
    case 'trial':
      details = `Trial ends on ${subscription.end_date}`;
      break;
    case 'active':
      details = `Active until ${subscription.end_date}`;
      break;
    case 'expired':
      details = `Expired on ${subscription.end_date}`;
      break;
    case 'suspended':
      details = 'Subscription suspended due to payment issues';
      break;
    case 'cancelled':
      details = 'Subscription cancelled';
      break;
  }

  return {
    status,
    details,
    plan_name: subscription.name,
    billing_cycle: subscription.billing_cycle,
    end_date: subscription.end_date,
  };
};

exports.activateSubscription = async (subscriptionId, activatedBy) => {
  // Get subscription
  const subscription = await billingRepository.getUniversitySubscriptionById(subscriptionId);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  const oldStatus = subscription.status;

  // Update status
  const updatedSubscription = await billingRepository.updateUniversitySubscription(
    subscriptionId,
    { status: 'active' }
  );

  // Create status history
  await billingRepository.createStatusHistory({
    university_id: subscription.university_id,
    subscription_id: subscriptionId,
    from_status: oldStatus,
    to_status: 'active',
    reason: 'Payment verified',
    changed_by: activatedBy,
  });

  return updatedSubscription;
};

exports.suspendSubscription = async (subscriptionId, suspendedBy) => {
  // Get subscription
  const subscription = await billingRepository.getUniversitySubscriptionById(subscriptionId);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  const oldStatus = subscription.status;

  // Update status
  const updatedSubscription = await billingRepository.updateUniversitySubscription(
    subscriptionId,
    { status: 'suspended' }
  );

  // Create status history
  await billingRepository.createStatusHistory({
    university_id: subscription.university_id,
    subscription_id: subscriptionId,
    from_status: oldStatus,
    to_status: 'suspended',
    reason: 'Payment failed',
    changed_by: suspendedBy,
  });

  return updatedSubscription;
};

exports.expireSubscription = async (subscriptionId, expiredBy) => {
  // Get subscription
  const subscription = await billingRepository.getUniversitySubscriptionById(subscriptionId);
  if (!subscription) {
    throw new AppError('Subscription not found', 404);
  }

  const oldStatus = subscription.status;

  // Update status
  const updatedSubscription = await billingRepository.updateUniversitySubscription(
    subscriptionId,
    { status: 'expired' }
  );

  // Create status history
  await billingRepository.createStatusHistory({
    university_id: subscription.university_id,
    subscription_id: subscriptionId,
    from_status: oldStatus,
    to_status: 'expired',
    reason: 'Subscription end date reached',
    changed_by: expiredBy,
  });

  return updatedSubscription;
};

// ============================================================
// BILLING NOTIFICATIONS
// ============================================================

exports.sendBillingNotification = async (universityId, subscriptionId, type, message) => {
  // Implementation for sending billing notifications
  // This would integrate with notification service
  console.log(`Sending ${type} notification to university ${universityId}: ${message}`);
};

// ============================================================
// BACKGROUND JOB METHODS
// ============================================================

exports.checkExpiredSubscriptions = async () => {
  const expiredSubscriptions = await billingRepository.getExpiredSubscriptions();

  for (const subscription of expiredSubscriptions) {
    await this.expireSubscription(subscription.id, null); // System action
  }

  return { processed: expiredSubscriptions.length };
};

exports.retryFailedPayment = async (paymentId) => {
  const payment = await billingRepository.getPaymentById(paymentId);
  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  if (payment.status !== 'failed') {
    throw new Error(`Payment ${paymentId} is not in failed status`);
  }

  // Attempt to retry payment through payment service
  const retryResult = await paymentService.retryPayment(paymentId);

  return retryResult;
};

exports.generatePendingInvoices = async () => {
  const pendingSubscriptions = await billingRepository.getPendingInvoices();

  const generated = [];
  for (const subscription of pendingSubscriptions) {
    const invoice = await this.generateInvoice(subscription.id, subscription.amount);
    generated.push(invoice);
  }

  return { generated: generated.length };
};

exports.getUniversityStudentCount = async (universityId) => {
  const result = await billingRepository.pool.query(
    'SELECT COUNT(*) as count FROM students WHERE university_id = $1 AND status = $2',
    [universityId, 'active']
  );
  return parseInt(result.rows[0].count);
};

exports.getUniversityLecturerCount = async (universityId) => {
  const result = await billingRepository.pool.query(
    'SELECT COUNT(*) as count FROM lecturers WHERE university_id = $1 AND status = $2',
    [universityId, 'active']
  );
  return parseInt(result.rows[0].count);
};

exports.getUniversityStorageUsage = async (universityId) => {
  // This would calculate actual storage usage
  // For now, return a placeholder
  return 0; // Bytes
};

exports.getBillingSummary = async (universityId, filters = {}) => {
  const { startDate, endDate, status } = filters;

  let query = `
    SELECT
      u.name as university_name,
      sp.name as subscription_plan,
      p.amount,
      p.currency,
      p.status,
      p.billing_date,
      p.due_date,
      p.paid_at
    FROM payments p
    JOIN university_subscriptions us ON us.id = p.subscription_id
    JOIN subscription_plans sp ON sp.id = us.plan_id
    JOIN universities u ON u.id = us.university_id
    WHERE us.university_id = $1
  `;

  const params = [universityId];
  let paramIndex = 2;

  if (startDate) {
    query += ` AND p.billing_date >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND p.billing_date <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (status) {
    query += ` AND p.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  query += ' ORDER BY p.billing_date DESC';

  const result = await billingRepository.pool.query(query, params);
  return result.rows;
};

exports.sendBillingNotification = async (universityId, subscriptionId, type, message) => {
  // Create notification record
  const notification = await billingRepository.createBillingNotification({
    university_id: universityId,
    subscription_id: subscriptionId,
    notification_type: type,
    message,
  });

  // Send via notification service (email/webhook)
  await notificationService.sendNotification({
    university_id: universityId,
    type: 'billing',
    title: `Billing Notification: ${type.replace('_', ' ').toUpperCase()}`,
    message,
    priority: 'high',
  });

  return notification;
};

// ============================================================
// AUTOMATED BILLING LOGIC (FOR CRON JOBS)
// ============================================================

exports.autoRenewSubscriptions = async () => {
  const expiringSubscriptions = await billingRepository.getExpiringSubscriptions(1); // 1 day before

  for (const subscription of expiringSubscriptions) {
    if (!subscription.auto_renew) continue;

    // Calculate renewal amount
    const amount = subscription.billing_cycle === 'monthly'
      ? subscription.price_monthly
      : subscription.price_yearly;

    // Create payment record
    const payment = await this.createPayment(
      subscription.university_id,
      amount,
      'auto_renewal',
      `Auto-renewal for ${subscription.billing_cycle} subscription`,
      null // system user
    );

    // Use payment service to initialize payment (this will handle the actual payment processing)
    try {
      const paymentResult = await paymentService.initializePayment(
        subscription.university_id,
        amount,
        'auto_renewal',
        `Auto-renewal for ${subscription.billing_cycle} subscription`,
        subscription.billing_cycle
      );

      if (paymentResult.success) {
        // Update next billing date
        const nextBillingDate = new Date(subscription.next_billing_date);
        if (subscription.billing_cycle === 'monthly') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        await billingRepository.updateUniversitySubscription(subscription.id, {
          next_billing_date: nextBillingDate.toISOString().split('T')[0],
        });
      } else {
        // Handle failed auto-renewal
        await this.sendBillingNotification(
          subscription.university_id,
          subscription.id,
          'auto_renewal_failed',
          'Auto-renewal failed. Please update your payment method or renew manually.'
        );
      }
    } catch (error) {
      console.error('Auto-renewal error:', error);
      // Continue with other subscriptions
    }
  }
};

exports.expireOldSubscriptions = async () => {
  const expiredSubscriptions = await billingRepository.getExpiredSubscriptions();

  for (const subscription of expiredSubscriptions) {
    await this.expireSubscription(subscription.id, null); // system user

    // Send notification
    await this.sendBillingNotification(
      subscription.university_id,
      subscription.id,
      'subscription_expired',
      'Your subscription has expired. Please renew to continue using the system.'
    );
  }
};

exports.sendBillingNotifications = async () => {
  const unsentNotifications = await billingRepository.getUnsentNotifications();

  for (const notification of unsentNotifications) {
    // Send via email/webhook (implementation depends on notification service)
    // For now, just mark as sent
    await billingRepository.markNotificationAsSent(notification.id);
  }
};

exports.suspendUnpaidSubscriptions = async () => {
  const overdueInvoices = await billingRepository.getOverdueInvoices();

  for (const invoice of overdueInvoices) {
    // Check if unpaid for more than 30 days
    const dueDate = new Date(invoice.due_date);
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));

    if (dueDate < thirtyDaysAgo) {
      const subscription = await billingRepository.getUniversitySubscriptionById(invoice.subscription_id);
      if (subscription.status === 'active') {
        await this.suspendSubscription(subscription.id, null); // system user

        await this.sendBillingNotification(
          subscription.university_id,
          subscription.id,
          'subscription_suspended',
          'Your subscription has been suspended due to overdue payment. Please settle your invoice to reactivate.'
        );
      }
    }
  }
};
