const SystemAdminDashboardService = require('./service');
const { APIResponseHandler } = require('../../../src/gateway/apiGateway');

const wrap = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res);
    return APIResponseHandler.success(res, 'System admin dashboard data retrieved successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.getOverview = wrap(async () => SystemAdminDashboardService.getOverview());
exports.getUniversitiesPage = wrap(async () => SystemAdminDashboardService.getUniversitiesPage());
exports.getAdminAccountsPage = wrap(async () => SystemAdminDashboardService.getAdminAccountsPage());
exports.getSubscriptionsPage = wrap(async () => SystemAdminDashboardService.getSubscriptionsPage());
exports.getBillingPage = wrap(async () => SystemAdminDashboardService.getBillingPage());
exports.getAnalyticsPage = wrap(async () => SystemAdminDashboardService.getAnalyticsPage());
exports.getUsersPage = wrap(async () => SystemAdminDashboardService.getUsersPage());
exports.getLogsPage = wrap(async () => SystemAdminDashboardService.getLogsPage());
exports.getSettingsPage = wrap(async () => SystemAdminDashboardService.getSettingsPage());
exports.getPlatformMetrics = wrap(async () => SystemAdminDashboardService.getPlatformMetrics());
exports.getBillingSnapshot = wrap(async (req) => {
  const days = parseInt(req.query.days, 10) || 30;
  return SystemAdminDashboardService.getBillingSnapshot(days);
});
exports.getChurnSnapshot = wrap(async (req) => {
  const days = parseInt(req.query.days, 10) || 30;
  return SystemAdminDashboardService.getChurnSnapshot(days);
});
exports.getTopUniversities = wrap(async () => SystemAdminDashboardService.getTopUniversities());
