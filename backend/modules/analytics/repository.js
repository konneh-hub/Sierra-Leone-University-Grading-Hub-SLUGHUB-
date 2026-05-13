const AnalyticsModel = require('./model');

class AnalyticsRepository {
  static async getUniversityMetrics(universityId, days = 30) {
    return AnalyticsModel.getUniversityMetrics(universityId, days);
  }

  static async getPlatformMetrics() {
    return AnalyticsModel.getPlatformMetrics();
  }

  static async getSubscriptionMetrics() {
    return AnalyticsModel.getSubscriptionMetrics();
  }

  static async getBillingMetrics(startDate, endDate) {
    return AnalyticsModel.getBillingMetrics(startDate, endDate);
  }

  static async getUserActivityMetrics(universityId, days = 7) {
    return AnalyticsModel.getUserActivityMetrics(universityId, days);
  }

  static async getPlatformActivityMetrics(days = 7) {
    return AnalyticsModel.getPlatformActivityMetrics(days);
  }

  static async getTopUniversitiesByMetric(metric = 'users', limit = 10) {
    return AnalyticsModel.getTopUniversitiesByMetric(metric, limit);
  }

  static async getChurnAnalysis(days = 30) {
    return AnalyticsModel.getChurnAnalysis(days);
  }
}

module.exports = AnalyticsRepository;
