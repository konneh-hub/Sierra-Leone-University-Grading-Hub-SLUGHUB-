const AppError = require('../utils/appError');
const billingService = require('./billingService');
const universityRepository = require('../repositories/universityRepository');
const academicRepository = require('../repositories/academicRepository');
const profileRepository = require('../repositories/profileRepository');

exports.createFaculty = async ({ creator, university_id, code, name }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can create faculties', 403);
  }
  const university = await universityRepository.getUniversityById(university_id);
  if (!university) {
    throw new AppError('University not found', 404);
  }
  return academicRepository.createFaculty({ university_id, code, name });
};

exports.createDepartment = async ({ creator, university_id, faculty_id, code, name }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can create departments', 403);
  }
  const university = await universityRepository.getUniversityById(university_id);
  if (!university) {
    throw new AppError('University not found', 404);
  }
  const faculty = await academicRepository.getFacultyById(faculty_id);
  if (!faculty || faculty.university_id !== university_id) {
    throw new AppError('Faculty does not belong to the university', 400);
  }
  return academicRepository.createDepartment({ university_id, faculty_id, code, name });
};

exports.createProgram = async ({ creator, university_id, department_id, code, name, program_type, duration_years }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can create programs', 403);
  }
  const department = await academicRepository.getDepartmentById(department_id);
  if (!department || department.university_id !== university_id) {
    throw new AppError('Department does not belong to the university', 400);
  }
  return academicRepository.createProgram({ university_id, department_id, code, name, program_type, duration_years });
};

exports.createCourse = async ({ creator, university_id, program_id, department_id, code, title, credit_unit, semester_id }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can create courses', 403);
  }

  // Check plan limits before creating course
  await billingService.enforcePlanLimits(creator.university_id, 'course');

  const program = await academicRepository.getProgramById(program_id);
  if (!program || program.university_id !== university_id) {
    throw new AppError('Program does not belong to the university', 400);
  }
  const department = await academicRepository.getDepartmentById(department_id);
  if (!department || department.university_id !== university_id) {
    throw new AppError('Department does not belong to the university', 400);
  }
  const course = await academicRepository.createCourse({ university_id, program_id, department_id, code, title, credit_unit, semester_id });

  // Track usage after successful creation
  await billingService.trackUsage(creator.university_id, 'course');

  return course;
};

exports.assignHOD = async ({ creator, department_id, hod_user_id }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can assign HODs', 403);
  }
  const staff = await profileRepository.getLecturerByUserId(hod_user_id);
  if (!staff) {
    throw new AppError('HOD lecturer account not found', 404);
  }
  if (staff.university_id !== creator.university_id) {
    throw new AppError('HOD must belong to the same university', 400);
  }
  return academicRepository.assignHODProfile(hod_user_id, department_id);
};

exports.assignDean = async ({ creator, department_id, dean_user_id }) => {
  if (!creator.roles.includes('university_admin')) {
    throw new AppError('Only university admins can assign deans', 403);
  }
  const staff = await profileRepository.getLecturerByUserId(dean_user_id);
  if (!staff) {
    throw new AppError('Dean lecturer account not found', 404);
  }
  if (staff.university_id !== creator.university_id) {
    throw new AppError('Dean must belong to the same university', 400);
  }
  return academicRepository.assignDeanProfile(dean_user_id, department_id);
};
