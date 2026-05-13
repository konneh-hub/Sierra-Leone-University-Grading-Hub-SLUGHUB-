const { APIResponseHandler } = require('../../src/gateway/apiGateway');
const LogsService = require('./service');

exports.getPlatformLogs = async (req, res, next) => {
  try {
    const logs = await LogsService.getPlatformLogs(req.query);
    return APIResponseHandler.success(res, 'Platform logs retrieved successfully', logs, { count: logs.length });
  } catch (error) {
    next(error);
  }
};
