const PlatformUserService = require('./service');
const { APIResponseHandler } = require('../../src/gateway/apiGateway');

exports.listPlatformUsers = async (req, res, next) => {
  try {
    const filters = {
      role: req.query.role,
      status: req.query.status,
      search: req.query.search,
    };
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const users = await PlatformUserService.listPlatformUsers(filters, limit, offset);
    return APIResponseHandler.success(res, 'Platform users retrieved successfully', users, { count: users.length });
  } catch (error) {
    next(error);
  }
};

exports.getPlatformUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await PlatformUserService.getPlatformUser(userId);
    return APIResponseHandler.success(res, 'Platform user retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.listSystemAdmins = async (req, res, next) => {
  try {
    const users = await PlatformUserService.listSystemAdmins();
    return APIResponseHandler.success(res, 'System admins retrieved successfully', users, { count: users.length });
  } catch (error) {
    next(error);
  }
};

exports.updatePlatformUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await PlatformUserService.updatePlatformUser(userId, req.body, req.user.id);
    return APIResponseHandler.success(res, 'Platform user updated successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await PlatformUserService.deactivateUser(userId, req.user.id);
    return APIResponseHandler.success(res, 'Platform user deactivated successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await PlatformUserService.activateUser(userId, req.user.id);
    return APIResponseHandler.success(res, 'Platform user activated successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.assignSystemAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await PlatformUserService.assignSystemAdmin(userId, req.user.id);
    return APIResponseHandler.success(res, 'System admin assigned successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.removeSystemAdmin = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await PlatformUserService.removeSystemAdmin(userId, req.user.id);
    return APIResponseHandler.success(res, 'System admin removed successfully', user);
  } catch (error) {
    next(error);
  }
};
