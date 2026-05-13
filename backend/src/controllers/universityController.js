const accountService = require('../services/accountService');
const auditService = require('../services/auditService');

exports.createUniversity = async (req, res, next) => {
  try {
    const university = await accountService.createUniversity({ creator: req.user, universityData: req.body });
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: university.id,
      activity_type: 'create_university',
      activity_details: { university_name: university.name },
    });
    res.status(201).json({ university });
  } catch (error) {
    next(error);
  }
};

exports.createUniversityAdmin = async (req, res, next) => {
  try {
    const { universityId } = req.params;
    const result = await accountService.createUniversityAdmin({
      creator: req.user,
      university_id: universityId,
      adminData: req.body,
    });
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: universityId,
      activity_type: 'create_university_admin',
      activity_details: { created_user_id: result.adminUser.id },
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

exports.createStaffAccount = async (req, res, next) => {
  try {
    const user = await accountService.createStaffAccount({ creator: req.user, staffData: req.body });
    await auditService.logActivity({
      user_id: req.user.id,
      university_id: user.university_id,
      activity_type: 'create_staff_account',
      activity_details: { user_id: user.id, role: user.roles },
    });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.uploadStudentBulk = async (req, res, next) => {
  try {
    const result = await accountService.uploadStudentBulk({ creator: req.user, students: req.body.students });
    res.status(201).json({ result });
  } catch (error) {
    next(error);
  }
};

exports.uploadLecturerBulk = async (req, res, next) => {
  try {
    const result = await accountService.uploadLecturerBulk({ creator: req.user, lecturers: req.body.lecturers });
    res.status(201).json({ result });
  } catch (error) {
    next(error);
  }
};
