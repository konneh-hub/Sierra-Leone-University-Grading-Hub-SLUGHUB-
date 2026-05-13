const AppError = require('../utils/appError');

exports.authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    const userRoles = req.user?.roles || [];
    const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const hasRole = allowed.some((role) => userRoles.includes(role));
    if (!hasRole) {
      return next(new AppError('Forbidden: insufficient permissions', 403));
    }
    next();
  };
};
