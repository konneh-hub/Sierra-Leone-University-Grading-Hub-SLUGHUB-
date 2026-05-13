const universityService = require('./service');
const { APIResponseHandler } = require('../../src/gateway/apiGateway');

exports.createUniversity = async (req, res, next) => {
  try {
    const university = await universityService.createUniversity(req.body, req.user.id);
    return APIResponseHandler.success(res, 'University created successfully', university);
  } catch (error) {
    next(error);
  }
};

exports.updateUniversity = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const university = await universityService.updateUniversity(universityId, req.body, req.user.id);
    return APIResponseHandler.success(res, 'University updated successfully', university);
  } catch (error) {
    next(error);
  }
};

exports.deleteUniversity = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const university = await universityService.deleteUniversity(universityId, req.user.id);
    return APIResponseHandler.success(res, 'University deleted successfully', university);
  } catch (error) {
    next(error);
  }
};

exports.listUniversities = async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      search: req.query.search,
    };
    const universities = await universityService.getAllUniversities(filters);
    return APIResponseHandler.success(res, 'Universities retrieved successfully', universities, { count: universities.length });
  } catch (error) {
    next(error);
  }
};

exports.getUniversity = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const university = await universityService.getUniversityDetails(universityId);
    return APIResponseHandler.success(res, 'University details retrieved successfully', university);
  } catch (error) {
    next(error);
  }
};

exports.createUniversityAdmin = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const admin = await universityService.createUniversityAdminAccount({ universityId, adminData: req.body }, req.user.id);
    return APIResponseHandler.success(res, 'University admin created successfully', admin);
  } catch (error) {
    next(error);
  }
};

exports.assignAdmin = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const { userId } = req.body;
    const admin = await universityService.assignAdminToUniversity(universityId, userId, req.user.id);
    return APIResponseHandler.success(res, 'University admin assigned successfully', admin);
  } catch (error) {
    next(error);
  }
};

exports.resetAdminPassword = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const { password } = req.body;
    const user = await universityService.resetAdminPassword(adminId, password, req.user.id);
    return APIResponseHandler.success(res, 'Admin password reset successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.deactivateAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const user = await universityService.deactivateAdminAccount(adminId, req.user.id);
    return APIResponseHandler.success(res, 'Admin account deactivated successfully', user);
  } catch (error) {
    next(error);
  }
};
