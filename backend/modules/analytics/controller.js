const AnalyticsService = require('./service');
const { APIResponseHandler } = require('../../src/gateway/apiGateway');

exports.getUniversityDashboard = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const days = parseInt(req.query.days) || 30;
    const dashboard = await AnalyticsService.getUniversityDashboard(universityId, days);
    return APIResponseHandler.success(res, 'University dashboard retrieved successfully', dashboard);
  } catch (error) {
    next(error);
  }
};

exports.getPlatformDashboard = async (req, res, next) => {
  try {
    const dashboard = await AnalyticsService.getPlatformDashboard();
    return APIResponseHandler.success(res, 'Platform dashboard retrieved successfully', dashboard);
  } catch (error) {
    next(error);
  }
};

exports.getBillingAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const analytics = await AnalyticsService.getBillingAnalytics(startDate, endDate);
    return APIResponseHandler.success(res, 'Billing analytics retrieved successfully', analytics);
  } catch (error) {
    next(error);
  }
};

exports.getChurnAnalytics = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const analytics = await AnalyticsService.getChurnAnalytics(days);
    return APIResponseHandler.success(res, 'Churn analytics retrieved successfully', analytics);
  } catch (error) {
    next(error);
  }
};

exports.getRevenueAnalytics = async (req, res, next) => {
  try {
    const analytics = await AnalyticsService.getRevenueAnalytics();
    return APIResponseHandler.success(res, 'Revenue analytics retrieved successfully', analytics);
  } catch (error) {
    next(error);
  }
};

exports.getComprehensiveAnalytics = async (req, res, next) => {
  try {
    const analytics = await AnalyticsService.getComprehensiveAnalytics();
    return APIResponseHandler.success(res, 'Comprehensive analytics retrieved successfully', analytics);
  } catch (error) {
    next(error);
  }
};
