const auditService = require('../../src/services/auditService');

class LogsRepository {
  static async listActivityLogs(filters) {
    return auditService.listActivityLogs(filters);
  }
}

module.exports = LogsRepository;
