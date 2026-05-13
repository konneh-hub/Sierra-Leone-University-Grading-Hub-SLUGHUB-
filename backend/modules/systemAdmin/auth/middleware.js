const systemAdminAuthService = require('./service');
const AppError = require('../../../src/utils/appError');

exports.authenticateSystemAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing authorization header', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = await systemAdminAuthService.verifySystemAdminToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      roles: payload.roles,
      is_system_admin: payload.is_system_admin,
    };
    next();
  } catch (error) {
    next(error);
  }
};

exports.authorizeSystemAdmin = (req, res, next) => {
  if (!req.user?.is_system_admin) {
    return next(new AppError('Forbidden: system admin access required', 403));
  }
  next();
};
