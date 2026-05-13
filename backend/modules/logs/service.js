const LogsRepository = require('./repository');

class LogsService {
  static async getPlatformLogs(filters = {}) {
    const query = {
      ...filters,
      limit: Number.isInteger(filters.limit) ? filters.limit : parseInt(filters.limit, 10),
    };

    if (!Number.isInteger(query.limit) || query.limit <= 0) {
      query.limit = 100;
    }

    return LogsRepository.listActivityLogs(query);
  }
}

module.exports = LogsService;
