const { hashPassword } = require('../../src/utils/hash');
const auditService = require('../../src/services/auditService');
const userRepository = require('../../src/repositories/userRepository');
const universityRepository = require('./repository');
const { ROLES } = require('../../src/config/roles');

exports.createUniversity = async (payload, creatorId) => {
  const university = await universityRepository.createUniversity(payload);
  await auditService.logActivity({
    user_id: creatorId,
    university_id: university.id,
    activity_type: 'university_create',
    activity_details: `Created university ${university.name}`,
  });
  return university;
};

exports.updateUniversity = async (id, payload, updaterId) => {
  const university = await universityRepository.updateUniversity(id, payload);
  await auditService.logActivity({
    user_id: updaterId,
    university_id: id,
    activity_type: 'university_update',
    activity_details: `Updated university ${id}`,
  });
  return university;
};

exports.deleteUniversity = async (id, deleterId) => {
  const university = await universityRepository.getUniversityById(id);
  if (!university) {
    throw new Error('University not found');
  }
  await universityRepository.deleteUniversity(id);
  await auditService.logActivity({
    user_id: deleterId,
    university_id: id,
    activity_type: 'university_delete',
    activity_details: `Deleted university ${university.name}`,
  });
  return university;
};

exports.getAllUniversities = async (filters) => {
  return universityRepository.getAllUniversities(filters);
};

exports.getUniversityDetails = async (id) => {
  return universityRepository.getUniversityById(id);
};

exports.createUniversityAdminAccount = async ({ universityId, adminData }, creatorId) => {
  const { email, username, password, first_name, last_name, gender } = adminData;
  const password_hash = await hashPassword(password);
  const admin = await userRepository.createUser({
    email,
    username,
    password_hash,
    first_name,
    last_name,
    gender,
    university_id: universityId,
    is_system_admin: false,
  });

  const role = await userRepository.getRoleByName(ROLES.UNIVERSITY_ADMIN) || await userRepository.createRole(ROLES.UNIVERSITY_ADMIN, 'University administrator');
  await userRepository.addUserRole(admin.id, role.id, creatorId);

  await auditService.logActivity({
    user_id: creatorId,
    university_id: universityId,
    activity_type: 'university_admin_create',
    activity_details: `Created university admin ${admin.email} for university ${universityId}`,
  });

  return admin;
};

exports.assignAdminToUniversity = async (universityId, userId, assignedBy) => {
  const admin = await universityRepository.assignAdminToUniversity({ universityId, userId, assignedBy });
  await auditService.logActivity({
    user_id: assignedBy,
    university_id: universityId,
    activity_type: 'admin_assign',
    activity_details: `Assigned user ${userId} as university admin for ${universityId}`,
  });
  return admin;
};

exports.resetAdminPassword = async (userId, newPassword, resetBy) => {
  const password_hash = await hashPassword(newPassword);
  const user = await universityRepository.updateUserPassword(userId, password_hash);
  await auditService.logActivity({
    user_id: resetBy,
    university_id: user.university_id,
    activity_type: 'admin_password_reset',
    activity_details: `Reset password for admin ${userId}`,
  });
  return user;
};

exports.deactivateAdminAccount = async (userId, deactivatedBy) => {
  const user = await universityRepository.deactivateUserAccount(userId);
  await auditService.logActivity({
    user_id: deactivatedBy,
    university_id: user.university_id,
    activity_type: 'admin_account_deactivate',
    activity_details: `Deactivated admin account ${userId}`,
  });
  return user;
};
