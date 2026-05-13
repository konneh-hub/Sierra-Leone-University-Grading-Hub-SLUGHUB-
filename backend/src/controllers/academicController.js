const academicService = require('../services/academicService');
const auditService = require('../services/auditService');

exports.createFaculty = async (req, res, next) => {
  try {
    const faculty = await academicService.createFaculty(req.body);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: faculty.university_id,
      activity_type: 'create_faculty',
      activity_details: { faculty_id: faculty.id },
    });
    res.status(201).json({ faculty });
  } catch (error) {
    next(error);
  }
};

exports.createDepartment = async (req, res, next) => {
  try {
    const department = await academicService.createDepartment(req.body);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: department.university_id,
      activity_type: 'create_department',
      activity_details: { department_id: department.id },
    });
    res.status(201).json({ department });
  } catch (error) {
    next(error);
  }
};

exports.createProgram = async (req, res, next) => {
  try {
    const program = await academicService.createProgram(req.body);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: program.university_id,
      activity_type: 'create_program',
      activity_details: { program_id: program.id },
    });
    res.status(201).json({ program });
  } catch (error) {
    next(error);
  }
};

exports.createCourse = async (req, res, next) => {
  try {
    const course = await academicService.createCourse(req.body);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: course.university_id,
      activity_type: 'create_course',
      activity_details: { course_id: course.id },
    });
    res.status(201).json({ course });
  } catch (error) {
    next(error);
  }
};

exports.assignHOD = async (req, res, next) => {
  try {
    const { departmentId } = req.params;
    const result = await academicService.assignHOD(departmentId, req.body.hod_id);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'assign_hod',
      activity_details: { department_id: departmentId, hod_id: req.body.hod_id },
    });
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};

exports.assignDean = async (req, res, next) => {
  try {
    const { facultyId } = req.params;
    const result = await academicService.assignDean(facultyId, req.body.dean_id);
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: result.university_id,
      activity_type: 'assign_dean',
      activity_details: { faculty_id: facultyId, dean_id: req.body.dean_id },
    });
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};
