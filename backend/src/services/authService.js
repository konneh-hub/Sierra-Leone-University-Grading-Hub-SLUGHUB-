const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/appError');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { signToken, verifyToken } = require('../utils/jwt');
const { ROLES } = require('../config/roles');

const ensureRole = async (roleName) => {
  let role = await userRepository.getRoleByName(roleName);
  if (!role) {
    role = await userRepository.createRole(roleName, `${roleName} role`);
  }
  return role;
};

exports.registerUser = async ({ email, username, password, first_name, last_name, gender, university_id, roleName, createdBy }) => {
  const existingUser = await userRepository.getUserByEmail(email);
  if (existingUser) {
    throw new AppError('Duplicate email address', 409);
  }

  const password_hash = await hashPassword(password);
  const user = await userRepository.createUser({
    email,
    username,
    password_hash,
    first_name,
    last_name,
    gender,
    university_id,
    is_system_admin: roleName === ROLES.SYSTEM_ADMIN,
  });

  const role = await ensureRole(roleName);
  await userRepository.addUserRole(user.id, role.id, createdBy);
  return user;
};

exports.loginUser = async ({ email, password, ipAddress, userAgent }) => {
  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.password_hash) {
    throw new AppError('Password login not enabled for this account', 401);
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const tokenPayload = { userId: user.id, universityId: user.university_id };
  const jwtToken = signToken(tokenPayload);
  const sessionToken = crypto.randomUUID();
  await userRepository.createSession({
    user_id: user.id,
    session_token: sessionToken,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return {
    token: jwtToken,
    user,
  };
};

exports.verifyJWT = (token) => {
  try {
    return verifyToken(token);
  } catch (error) {
    throw new AppError('Invalid token', 401);
  }
};

exports.assignRole = async ({ userId, roleName, assignedBy }) => {
  const role = await ensureRole(roleName);
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  await userRepository.addUserRole(userId, role.id, assignedBy);
  return role;
};

exports.checkPermission = async (userId, permissionName) => {
  const permissions = await userRepository.getPermissionsForUser(userId);
  return permissions.some((permission) => permission.name === permissionName);
};

exports.getRolesForUser = async (userId) => {
  return userRepository.getUserRoles(userId);
};
