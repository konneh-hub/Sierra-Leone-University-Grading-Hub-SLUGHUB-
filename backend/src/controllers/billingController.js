const billingService = require('../services/billingService');

// ============================================================
// SUBSCRIPTION PLANS CONTROLLER (SYSTEM ADMIN ONLY)
// ============================================================

exports.createPlan = async (req, res, next) => {
  try {
    const plan = await billingService.createSubscriptionPlan(req.body, req.user.id);
    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await billingService.updateSubscriptionPlan(planId, req.body, req.user.id);
    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    await billingService.deleteSubscriptionPlan(planId, req.user.id);
    res.json({
      success: true,
      message: 'Subscription plan deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.listPlans = async (req, res, next) => {
  try {
    const plans = await billingService.getAllPlans();
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

exports.listActivePlans = async (req, res, next) => {
  try {
    const plans = await billingService.getActivePlans();
    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const plan = await billingService.getPlanById(planId);
    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// UNIVERSITY SUBSCRIPTION CONTROLLER
// ============================================================

exports.assignToUniversity = async (req, res, next) => {
  try {
    const { universityId, planId, billingCycle } = req.body;
    const subscription = await billingService.assignPlanToUniversity(
      universityId,
      planId,
      billingCycle,
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: 'Subscription assigned to university successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

exports.getSubscription = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const subscription = await billingService.getUniversitySubscription(universityId);
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePlan = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const { newPlanId } = req.body;
    const subscription = await billingService.changeUniversityPlan(
      universityId,
      newPlanId,
      req.user.id
    );
    res.json({
      success: true,
      message: 'Subscription plan changed successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await billingService.cancelSubscription(subscriptionId, req.user.id);
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// PAYMENT CONTROLLER
// ============================================================

exports.createPayment = async (req, res, next) => {
  try {
    const { universityId, amount, paymentMethod, description } = req.body;
    const payment = await billingService.createPayment(
      universityId,
      amount,
      paymentMethod,
      description,
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { transactionReference } = req.body;
    const payment = await billingService.verifyPayment(
      paymentId,
      transactionReference,
      req.user.id
    );
    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const payments = await billingService.getPaymentHistory(universityId);
    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

exports.handleFailedPayment = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    const payment = await billingService.handleFailedPayment(paymentId, reason, req.user.id);
    res.json({
      success: true,
      message: 'Failed payment handled successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// INVOICE CONTROLLER
// ============================================================

exports.generateInvoice = async (req, res, next) => {
  try {
    const { subscriptionId, amount, dueDate } = req.body;
    const invoice = await billingService.generateInvoice(subscriptionId, amount, dueDate);
    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvoices = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const invoices = await billingService.getInvoicesByUniversity(universityId);
    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

exports.markInvoicePaid = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { amountPaid } = req.body;
    const invoice = await billingService.markInvoiceAsPaid(invoiceId, amountPaid, req.user.id);
    res.json({
      success: true,
      message: 'Invoice marked as paid successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// USAGE & LIMITS CONTROLLER
// ============================================================

exports.getUsageStats = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const usageStats = await billingService.getUsageStats(universityId);
    res.json({
      success: true,
      data: usageStats,
    });
  } catch (error) {
    next(error);
  }
};

exports.checkFeatureAccess = async (req, res, next) => {
  try {
    const { universityId, featureName } = req.params;
    const hasAccess = await billingService.checkFeatureAccess(universityId, featureName);
    res.json({
      success: true,
      data: {
        feature: featureName,
        has_access: hasAccess,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.enableFeatureForPlan = async (req, res, next) => {
  try {
    const { planId } = req.params;
    const { featureName } = req.body;
    await billingService.enableFeatureForPlan(planId, featureName, req.user.id);
    res.json({
      success: true,
      message: `Feature ${featureName} enabled for plan successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// SUBSCRIPTION STATUS CONTROLLER
// ============================================================

exports.checkSubscriptionStatus = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const status = await billingService.checkSubscriptionStatus(universityId);
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

exports.activateSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await billingService.activateSubscription(subscriptionId, req.user.id);
    res.json({
      success: true,
      message: 'Subscription activated successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

exports.suspendSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await billingService.suspendSubscription(subscriptionId, req.user.id);
    res.json({
      success: true,
      message: 'Subscription suspended successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};

exports.expireSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await billingService.expireSubscription(subscriptionId, req.user.id);
    res.json({
      success: true,
      message: 'Subscription expired successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
};
