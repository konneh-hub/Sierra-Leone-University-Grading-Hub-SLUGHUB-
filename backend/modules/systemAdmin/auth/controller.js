const systemAdminAuthService = require('./service');
const { APIResponseHandler } = require('../../../src/gateway/apiGateway');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await systemAdminAuthService.systemAdminLogin({ email, password, ipAddress, userAgent });
    return APIResponseHandler.success(res, 'System admin authenticated successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await systemAdminAuthService.systemAdminLogout(refreshToken);
    return APIResponseHandler.success(res, 'System admin logged out successfully', null);
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await systemAdminAuthService.refreshToken(refreshToken);
    return APIResponseHandler.success(res, 'Token refreshed successfully', result);
  } catch (error) {
    next(error);
  }
};

exports.verify = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const payload = await systemAdminAuthService.verifySystemAdminToken(token);
    return APIResponseHandler.success(res, 'Token is valid', { payload });
  } catch (error) {
    next(error);
  }
};
