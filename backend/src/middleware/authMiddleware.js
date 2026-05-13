const { verifyToken } = require('../utils/jwt');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing authorization header', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      throw new AppError('Invalid token payload', 401);
    }

    const user = await userRepository.getUserById(payload.userId);
    if (!user) {
      throw new AppError('Unauthorized user', 401);
    }

    const roles = await userRepository.getUserRoles(user.id);
    req.user = {
      id: user.id,
      email: user.email,
      university_id: user.university_id,
      roles: roles.map((role) => role.name),
      is_system_admin: user.is_system_admin,
    };
    next();
  } catch (error) {
    next(new AppError(error.message || 'Unauthorized', 401));
  }
};
