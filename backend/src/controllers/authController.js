const authService = require('../services/authService');
const accountService = require('../services/accountService');
const auditService = require('../services/auditService');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await auditService.logActivity({
      user_id: result.user.id,
      university_id: result.user.university_id,
      activity_type: 'login',
      activity_details: { email, ip_address: req.ip },
    });

    res.json({ token: result.token, user: result.user });
  } catch (error) {
    next(error);
  }
};

exports.selfRegister = async (req, res, next) => {
  try {
    const { inviteToken, password, first_name, last_name, gender } = req.body;
    const user = await accountService.selfRegisterUser({
      inviteToken,
      password,
      first_name,
      last_name,
      gender,
    });

    await auditService.logActivity({
      user_id: user.id,
      university_id: user.university_id,
      activity_type: 'account_creation',
      activity_details: { email: user.email, method: 'self_register' },
    });

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.assignRole = async (req, res, next) => {
  try {
    const { userId, roleName } = req.body;
    const assignedBy = req.user.id;
    const role = await authService.assignRole({ userId, roleName, assignedBy });

    await auditService.trackUserActions({
      entity_table: 'users',
      entity_id: userId,
      action: 'role_assignment',
      performed_by: assignedBy,
      changes: { assignedRole: roleName },
    });

    res.json({ role });
  } catch (error) {
    next(error);
  }
};
