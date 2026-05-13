const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AppError = require('../../../src/utils/appError');
const authRepository = require('./repository');
const { SYSTEM_ADMIN_TOKEN_PAYLOAD } = require('./model');

const SYSTEM_ADMIN_JWT_SECRET = process.env.SYSTEM_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'system_admin_secret';
const SYSTEM_ADMIN_JWT_EXPIRES_IN = process.env.SYSTEM_ADMIN_JWT_EXPIRES_IN || '15m';

const signSystemAdminToken = (payload) => {
  return jwt.sign(payload, SYSTEM_ADMIN_JWT_SECRET, { expiresIn: SYSTEM_ADMIN_JWT_EXPIRES_IN });
};

exports.systemAdminLogin = async ({ email, password, ipAddress, userAgent }) => {
  const user = await authRepository.getSystemAdminByEmail(email);
  if (!user) {
    throw new AppError('Invalid system admin credentials', 401);
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new AppError('Invalid system admin credentials', 401);
  }

  const payload = {
    userId: user.id,
    email: user.email,
    roles: user.is_system_admin ? ['system_admin'] : [],
    is_system_admin: true,
  };

  const token = signSystemAdminToken(payload);
  const refreshToken = crypto.randomUUID();

  await authRepository.createSystemAdminSession({
    user_id: user.id,
    session_token: refreshToken,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return {
    token,
    refreshToken,
    expiresIn: SYSTEM_ADMIN_JWT_EXPIRES_IN,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: payload.roles,
      is_system_admin: true,
    }
  };
};

exports.systemAdminLogout = async (refreshToken) => {
  const session = await authRepository.getSessionByToken(refreshToken);
  if (!session) {
    throw new AppError('Invalid refresh token', 401);
  }
  await authRepository.revokeSession(refreshToken);
  return { success: true };
};

exports.refreshToken = async (refreshToken) => {
  const session = await authRepository.getSessionByToken(refreshToken);
  if (!session) {
    throw new AppError('Invalid refresh token', 401);
  }

  const user = await authRepository.getSystemAdminById(session.user_id);
  if (!user) {
    throw new AppError('System admin account not found', 401);
  }

  const payload = {
    userId: user.id,
    email: user.email,
    roles: ['system_admin'],
    is_system_admin: true,
  };

  await authRepository.updateSessionActivity(refreshToken);

  return {
    token: signSystemAdminToken(payload),
    refreshToken,
    expiresIn: SYSTEM_ADMIN_JWT_EXPIRES_IN,
  };
};

exports.verifySystemAdminToken = async (token) => {
  try {
    const payload = jwt.verify(token, SYSTEM_ADMIN_JWT_SECRET);
    if (!payload || !payload.is_system_admin) {
      throw new AppError('Invalid system admin token', 401);
    }
    return payload;
  } catch (error) {
    throw new AppError(error.message || 'Invalid system admin token', 401);
  }
};
