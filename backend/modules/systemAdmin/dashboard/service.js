const SystemAdminDashboardRepository = require('./repository');
const AnalyticsService = require('../../analytics/service');

class SystemAdminDashboardService {
  static async getOverview() {
    const [universities, adminAccounts, subscriptions, billing, users, logs, settings, analytics] = await Promise.all([
      SystemAdminDashboardRepository.getUniversitySummary(),
      SystemAdminDashboardRepository.getAdminAccountsSummary(),
      SystemAdminDashboardRepository.getSubscriptionsSummary(),
      SystemAdminDashboardRepository.getBillingSummary(),
      SystemAdminDashboardRepository.getUsersSummary(),
      SystemAdminDashboardRepository.getLogsSummary(),
      SystemAdminDashboardRepository.getSettingsSummary(),
      AnalyticsService.getPlatformDashboard(),
    ]);

    return {
      universities,
      adminAccounts,
      subscriptions,
      billing,
      users,
      logs,
      settings,
      analytics,
      generated_at: new Date().toISOString(),
    };
  }

  static async getUniversitiesPage() {
    return SystemAdminDashboardRepository.getUniversitySummary();
  }

  static async getAdminAccountsPage() {
    return SystemAdminDashboardRepository.getAdminAccountsSummary();
  }

  static async getSubscriptionsPage() {
    return SystemAdminDashboardRepository.getSubscriptionsSummary();
  }

  static async getBillingPage() {
    return SystemAdminDashboardRepository.getBillingSummary();
  }

  static async getAnalyticsPage() {
    return AnalyticsService.getPlatformDashboard();
  }

  static async getUsersPage() {
    return SystemAdminDashboardRepository.getUsersSummary();
  }

  static async getLogsPage() {
    return SystemAdminDashboardRepository.getLogsSummary();
  }

  static async getSettingsPage() {
    return SystemAdminDashboardRepository.getSettingsSummary();
  }

  static async getPlatformMetrics() {
    return AnalyticsService.getPlatformDashboard();
  }

  static async getBillingSnapshot(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    return AnalyticsService.getBillingAnalytics(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }

  static async getChurnSnapshot(days = 30) {
    return AnalyticsService.getChurnAnalytics(days);
  }

  static async getTopUniversities(metric = 'users', limit = 10) {
    const dashboard = await AnalyticsService.getPlatformDashboard();
    return {
      top_by_users: dashboard.top_universities.by_users,
      top_by_billing: dashboard.top_universities.by_billing,
    };
  }
}

module.exports = SystemAdminDashboardService;
