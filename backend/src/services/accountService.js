const crypto = require('crypto');
const AppError = require('../utils/appError');
const authService = require('./authService');
const billingService = require('./billingService');
const universityRepository = require('../repositories/universityRepository');
const userRepository = require('../repositories/userRepository');
const profileRepository = require('../repositories/profileRepository');

exports.createUniversity = async ({ creator, universityData }) => {
  if (!creator.is_system_admin) {
    throw new AppError('Only system admins can create universities', 403);
  }

  const existingUniversity = await universityRepository.getUniversityByCode(universityData.code);
  if (existingUniversity) {
    throw new AppError('University code already exists', 409);
  }

  return universityRepository.createUniversity(universityData);
};

exports.createUniversityAdmin = async ({ creator, university_id, adminData }) => {
  if (!creator.is_system_admin) {
    throw new AppError('Only system admins can create university administrators', 403);
  }

  const university = await universityRepository.getUniversityById(university_id);
  if (!university) {
    throw new AppError('University not found', 404);
  }

  const existingUser = await userRepository.getUserByEmail(adminData.email);
  if (existingUser) {
    throw new AppError('Email already exists', 409);
  }

  const adminUser = await authService.registerUser({
    email: adminData.email,
    password: adminData.password,
    first_name: adminData.first_name,
    last_name: adminData.last_name,
    gender: adminData.gender,
    university_id: university.id,
    roleName: 'university_admin',
    createdBy: creator.id,
  });

  return { university, adminUser };
};

exports.createStaffAccount = async ({ creator, staffData }) => {
  if (!creator.roles.includes('university_admin') && !creator.is_system_admin) {
    throw new AppError('Only university admins can create staff accounts', 403);
  }

  const existingUser = await userRepository.getUserByEmail(staffData.email);
  if (existingUser) {
    throw new AppError('Staff email already exists', 409);
  }

  // Check plan limits for admin users
  const adminRoles = ['university_admin', 'exam_officer', 'dean', 'hod'];
  if (adminRoles.includes(staffData.role)) {
    await billingService.enforcePlanLimits(creator.university_id, 'admin_user');
  }

  const user = await authService.registerUser({
    email: staffData.email,
    password: staffData.password,
    first_name: staffData.first_name,
    last_name: staffData.last_name,
    gender: staffData.gender,
    university_id: creator.university_id,
    roleName: staffData.role,
    createdBy: creator.id,
  });

  await profileRepository.createStaffProfile({
    user_id: user.id,
    university_id: creator.university_id,
    department_id: staffData.department_id || null,
    role_description: staffData.role,
  });

  // Track usage for admin users after successful creation
  if (adminRoles.includes(staffData.role)) {
    await billingService.trackUsage(creator.university_id, 'admin_user');
  }

  return user;
};

exports.uploadStudentBulk = async ({ creator, students }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can upload student data', 403);
  }

  const created = [];
  for (const student of students) {
    const existingUser = await userRepository.getUserByEmail(student.email);
    if (existingUser) {
      continue;
    }

    // Check plan limits before creating student
    await billingService.enforcePlanLimits(creator.university_id, 'student');

    const password = student.password || crypto.randomBytes(8).toString('hex');
    const user = await authService.registerUser({
      email: student.email,
      password,
      first_name: student.first_name,
      last_name: student.last_name,
      gender: student.gender,
      university_id: creator.university_id,
      roleName: 'student',
      createdBy: creator.id,
    });

    await profileRepository.createStudentProfile({
      user_id: user.id,
      university_id: creator.university_id,
      department_id: student.department_id,
      program_id: student.program_id,
      matric_number: student.matric_number || null,
      academic_level: student.academic_level || 'year1',
      enrollment_year: student.enrollment_year,
    });

    // Track usage after successful creation
    await billingService.trackUsage(creator.university_id, 'student');

    created.push(user);
  }

  return created;
};

exports.uploadLecturerBulk = async ({ creator, lecturers }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can upload lecturer data', 403);
  }

  const created = [];
  for (const lecturer of lecturers) {
    const existingUser = await userRepository.getUserByEmail(lecturer.email);
    const existingLecturer = await profileRepository.getLecturerByStaffNumber(creator.university_id, lecturer.staff_number);
    if (existingUser || existingLecturer) {
      continue;
    }

    // Check plan limits before creating lecturer
    await billingService.enforcePlanLimits(creator.university_id, 'lecturer');

    const password = lecturer.password || crypto.randomBytes(8).toString('hex');
    const user = await authService.registerUser({
      email: lecturer.email,
      password,
      first_name: lecturer.first_name,
      last_name: lecturer.last_name,
      gender: lecturer.gender,
      university_id: creator.university_id,
      roleName: 'lecturer',
      createdBy: creator.id,
    });

    await profileRepository.createLecturerProfile({
      user_id: user.id,
      university_id: creator.university_id,
      department_id: lecturer.department_id,
      staff_number: lecturer.staff_number,
      hire_date: lecturer.hire_date,
    });

    // Track usage after successful creation
    await billingService.trackUsage(creator.university_id, 'lecturer');

    created.push(user);
  }

  return created;
};

exports.generateInviteToken = async ({ creator, email, roleName, expiresAt }) => {
  if (!creator.roles.includes('university_admin') && !creator.is_system_admin) {
    throw new AppError('Only admins can generate invite tokens', 403);
  }

  const existingUser = await userRepository.getUserByEmail(email);
  if (existingUser) {
    throw new AppError('Email already exists', 409);
  }

  const role = await userRepository.getRoleByName(roleName);
  if (!role) {
    throw new AppError('Invalid role for invite', 400);
  }

  const token = crypto.randomBytes(24).toString('hex');
  const invite = await userRepository.createInvite({
    university_id: creator.university_id,
    inviter_id: creator.id,
    email,
    role_id: role.id,
    token,
    expires_at: expiresAt,
  });

  return invite;
};

exports.selfRegisterUser = async ({ inviteToken, password, first_name, last_name, gender }) => {
  const invite = await userRepository.getInviteByToken(inviteToken);
  if (!invite) {
    throw new AppError('Invalid invite token', 400);
  }
  if (invite.status !== 'pending') {
    throw new AppError('Invite token no longer valid', 400);
  }
  if (new Date() > invite.expires_at) {
    throw new AppError('Invite token has expired', 400);
  }

  const existingUser = await userRepository.getUserByEmail(invite.email);
  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const role = await userRepository.getRoleById(invite.role_id);
  if (!role) {
    throw new AppError('Invite role is invalid', 400);
  }

  const user = await authService.registerUser({
    email: invite.email,
    password,
    first_name,
    last_name,
    gender,
    university_id: invite.university_id,
    roleName: role.name,
    createdBy: invite.inviter_id,
  });

  await userRepository.updateInviteStatus(invite.id, 'accepted');
  await userRepository.createRegistration({
    invite_id: invite.id,
    user_id: user.id,
    registration_status: 'completed',
  });

  return user;
};
