const AnalyticsRepository = require('./repository');
const { BadRequestError } = require('../../src/utils/errors');

class AnalyticsService {
  static async getUniversityDashboard(universityId, days = 30) {
    const metrics = await AnalyticsRepository.getUniversityMetrics(universityId, days);
    const activity = await AnalyticsRepository.getUserActivityMetrics(universityId, days);

    return {
      university_id: universityId,
      metrics,
      activity,
      period_days: days,
    };
  }

  static async getPlatformDashboard() {
    const platformMetrics = await AnalyticsRepository.getPlatformMetrics();
    const subscriptionMetrics = await AnalyticsRepository.getSubscriptionMetrics();
    const platformActivity = await AnalyticsRepository.getPlatformActivityMetrics(7);
    const topUniversitiesUsers = await AnalyticsRepository.getTopUniversitiesByMetric('users', 10);
    const topUniversitiesBilling = await AnalyticsRepository.getTopUniversitiesByMetric('billing', 10);

    return {
      platform_metrics: platformMetrics,
      subscription_metrics: subscriptionMetrics,
      activity: platformActivity,
      top_universities: {
        by_users: topUniversitiesUsers,
        by_billing: topUniversitiesBilling,
      },
    };
  }

  static async getBillingAnalytics(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new BadRequestError('Start date and end date are required');
    }

    const metrics = await AnalyticsRepository.getBillingMetrics(startDate, endDate);
    const conversionRate = metrics.paid_invoices > 0 
      ? (metrics.paid_invoices / metrics.total_invoices * 100).toFixed(2) 
      : 0;

    return {
      period: { start: startDate, end: endDate },
      metrics,
      conversion_rate: conversionRate,
      collection_efficiency: metrics.total_billed > 0 
        ? (metrics.total_paid / metrics.total_billed * 100).toFixed(2) 
        : 0,
    };
  }

  static async getChurnAnalytics(days = 30) {
    const churnData = await AnalyticsRepository.getChurnAnalysis(days);
    const platformMetrics = await AnalyticsRepository.getPlatformMetrics();

    return {
      period_days: days,
      churn_data: churnData,
      churn_rate: platformMetrics.active_universities > 0
        ? ((churnData.cancelled_universities / platformMetrics.active_universities) * 100).toFixed(2)
        : 0,
      suspension_rate: platformMetrics.active_universities > 0
        ? ((churnData.suspended_universities / platformMetrics.active_universities) * 100).toFixed(2)
        : 0,
    };
  }

  static async getRevenueAnalytics() {
    const lastMonthStart = new Date();
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    
    const billingMetrics = await AnalyticsRepository.getBillingMetrics(
      lastMonthStart,
      new Date()
    );
    const subscriptionMetrics = await AnalyticsRepository.getSubscriptionMetrics();

    return {
      mrr: subscriptionMetrics.monthly_recurring_revenue || 0,
      monthly_billing: billingMetrics.total_billed || 0,
      monthly_collected: billingMetrics.total_paid || 0,
      monthly_outstanding: billingMetrics.total_pending || 0,
      collection_rate: billingMetrics.total_billed > 0
        ? (billingMetrics.total_paid / billingMetrics.total_billed * 100).toFixed(2)
        : 0,
    };
  }

  static async getComprehensiveAnalytics() {
    const platformDashboard = await this.getPlatformDashboard();
    const churnAnalytics = await this.getChurnAnalytics();
    const revenueAnalytics = await this.getRevenueAnalytics();

    return {
      dashboard: platformDashboard,
      churn: churnAnalytics,
      revenue: revenueAnalytics,
      generated_at: new Date(),
    };
  }
}

module.exports = AnalyticsService;
