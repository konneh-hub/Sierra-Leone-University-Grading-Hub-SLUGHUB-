const SubscriptionService = require('./service');
const { APIResponseHandler } = require('../../src/gateway/apiGateway');

exports.createSubscription = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const subscription = await SubscriptionService.createSubscription(universityId, req.body, req.user.id);
    return APIResponseHandler.success(res, 'Subscription created successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.getSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await SubscriptionService.getSubscription(subscriptionId);
    return APIResponseHandler.success(res, 'Subscription retrieved successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.getUniversitySubscription = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const subscription = await SubscriptionService.getUniversitySubscription(universityId);
    return APIResponseHandler.success(res, 'University subscription retrieved successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.updateSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await SubscriptionService.updateSubscription(subscriptionId, req.body, req.user.id);
    return APIResponseHandler.success(res, 'Subscription updated successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.listSubscriptions = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      subscriptionTier: req.query.tier,
    };
    const subscriptions = await SubscriptionService.getAllSubscriptions(filters);
    return APIResponseHandler.success(res, 'Subscriptions retrieved successfully', subscriptions, { count: subscriptions.length });
  } catch (error) {
    next(error);
  }
};

exports.renewSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await SubscriptionService.renewSubscription(subscriptionId, req.user.id);
    return APIResponseHandler.success(res, 'Subscription renewed successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.suspendSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const subscription = await SubscriptionService.suspendSubscription(subscriptionId, reason, req.user.id);
    return APIResponseHandler.success(res, 'Subscription suspended successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.cancelSubscription = async (req, res, next) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const subscription = await SubscriptionService.cancelSubscription(subscriptionId, reason, req.user.id);
    return APIResponseHandler.success(res, 'Subscription cancelled successfully', subscription);
  } catch (error) {
    next(error);
  }
};

exports.checkSubscriptionStatus = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const result = await SubscriptionService.checkSubscriptionStatus(universityId);
    return APIResponseHandler.success(res, 'Subscription status checked', result);
  } catch (error) {
    next(error);
  }
};
