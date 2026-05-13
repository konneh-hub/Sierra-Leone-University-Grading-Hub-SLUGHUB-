const BillingService = require('./service');
const { APIResponseHandler } = require('../../src/gateway/apiGateway');

exports.createBilling = async (req, res, next) => {
  try {
    const { universityId, subscriptionId } = req.params;
    const billing = await BillingService.createBilling(universityId, subscriptionId, req.body, req.user.id);
    return APIResponseHandler.success(res, 'Billing record created successfully', billing);
  } catch (error) {
    next(error);
  }
};

exports.getBilling = async (req, res, next) => {
  try {
    const { billingId } = req.params;
    const billing = await BillingService.getBilling(billingId);
    return APIResponseHandler.success(res, 'Billing record retrieved successfully', billing);
  } catch (error) {
    next(error);
  }
};

exports.getUniversityBillings = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const billings = await BillingService.getUniversityBillings(universityId, limit, offset);
    return APIResponseHandler.success(res, 'University billings retrieved successfully', billings, { count: billings.length });
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptionBillings = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const billings = await BillingService.getSubscriptionBillings(subscriptionId, limit, offset);
    return APIResponseHandler.success(res, 'Subscription billings retrieved successfully', billings, { count: billings.length });
  } catch (error) {
    next(error);
  }
};

exports.updateBilling = async (req, res, next) => {
  try {
    const { billingId } = req.params;
    const billing = await BillingService.updateBilling(billingId, req.body, req.user.id);
    return APIResponseHandler.success(res, 'Billing record updated successfully', billing);
  } catch (error) {
    next(error);
  }
};

exports.listBillings = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      universityId: req.query.universityId,
    };
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const billings = await BillingService.getAllBillings(filters, limit, offset);
    return APIResponseHandler.success(res, 'Billings retrieved successfully', billings, { count: billings.length });
  } catch (error) {
    next(error);
  }
};

exports.recordPayment = async (req, res, next) => {
  try {
    const { billingId } = req.params;
    const { paymentMethod } = req.body;
    const billing = await BillingService.recordPayment(billingId, paymentMethod, req.user.id);
    return APIResponseHandler.success(res, 'Payment recorded successfully', billing);
  } catch (error) {
    next(error);
  }
};

exports.recordFailedPayment = async (req, res, next) => {
  try {
    const { billingId } = req.params;
    const { reason } = req.body;
    const billing = await BillingService.recordFailedPayment(billingId, reason, req.user.id);
    return APIResponseHandler.success(res, 'Failed payment recorded successfully', billing);
  } catch (error) {
    next(error);
  }
};

exports.getUnpaidBills = async (req, res, next) => {
  try {
    const daysOverdue = parseInt(req.query.daysOverdue) || 0;
    const bills = await BillingService.getUnpaidBills(daysOverdue);
    return APIResponseHandler.success(res, 'Unpaid bills retrieved successfully', bills, { count: bills.length });
  } catch (error) {
    next(error);
  }
};

exports.generateBillingReport = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const { startDate, endDate } = req.query;
    const report = await BillingService.generateBillingReport(universityId, startDate, endDate);
    return APIResponseHandler.success(res, 'Billing report generated successfully', report);
  } catch (error) {
    next(error);
  }
};
