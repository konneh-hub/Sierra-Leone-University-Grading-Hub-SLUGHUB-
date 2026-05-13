const enrollmentService = require('../services/enrollmentService');
const auditService = require('../services/auditService');

exports.enrollStudent = async (req, res, next) => {
  try {
    const enrollment = await enrollmentService.enrollStudentInCourse(req.body);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: enrollment.university_id,
      activity_type: 'enroll_student',
      activity_details: { student_id: enrollment.student_id, course_id: enrollment.course_id },
    });
    res.status(201).json({ enrollment });
  } catch (error) {
    next(error);
  }
};
