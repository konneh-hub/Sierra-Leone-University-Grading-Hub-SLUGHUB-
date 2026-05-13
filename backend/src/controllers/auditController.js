const auditService = require('../services/auditService');

exports.listActivities = async (req, res, next) => {
  try {
    const activities = await auditService.listActivityLogs(req.query);
    res.json({ activities });
  } catch (error) {
    next(error);
  }
};
