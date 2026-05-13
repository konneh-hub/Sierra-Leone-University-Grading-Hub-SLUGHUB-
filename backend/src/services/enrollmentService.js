const AppError = require('../utils/appError');
const enrollmentRepository = require('../repositories/enrollmentRepository');
const academicRepository = require('../repositories/academicRepository');
const profileRepository = require('../repositories/profileRepository');

exports.enrollStudentInCourse = async ({ creator, student_id, course_id, academic_session_id, semester_id }) => {
  if (!creator.roles.includes('university_admin') && !creator.roles.includes('exam_officer')) {
    throw new AppError('Only university admins and exam officers can enroll students', 403);
  }

  const student = await profileRepository.getStudentById(student_id);
  if (!student) {
    throw new AppError('Student not found', 404);
  }

  const course = await enrollmentRepository.getCourseById(course_id);
  if (!course || course.university_id !== creator.university_id) {
    throw new AppError('Course not found in the university', 404);
  }

  const session = await enrollmentRepository.getAcademicSessionById(academic_session_id);
  if (!session || session.university_id !== creator.university_id) {
    throw new AppError('Academic session not found', 404);
  }

  const semester = await enrollmentRepository.getSemesterById(semester_id);
  if (!semester || semester.university_id !== creator.university_id) {
    throw new AppError('Semester not found', 404);
  }

  if (student.program_id !== course.program_id) {
    throw new AppError('Student must belong to the same program as the course', 400);
  }

  if (course.semester_id !== semester_id) {
    throw new AppError('Course is not assigned to the requested semester', 400);
  }

  const existingRegistration = await enrollmentRepository.getCourseRegistration({
    student_id,
    course_id,
    academic_session_id,
    semester_id,
  });
  if (existingRegistration) {
    throw new AppError('Student is already enrolled in this course for the session', 409);
  }

  const enrollment = await enrollmentRepository.getEnrollment({
    student_id,
    academic_session_id,
    semester_id,
  });
  if (!enrollment) {
    await enrollmentRepository.createCourseRegistration({
      student_id,
      course_id,
      academic_session_id,
      semester_id,
    });
    return { message: 'Enrollment created and course registration completed' };
  }

  return enrollmentRepository.createCourseRegistration({
    student_id,
    course_id,
    academic_session_id,
    semester_id,
  });
};
