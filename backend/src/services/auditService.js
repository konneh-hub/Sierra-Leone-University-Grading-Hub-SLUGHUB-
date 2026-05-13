const auditRepository = require('../repositories/auditRepository');

exports.logActivity = async ({ user_id, university_id, activity_type, activity_details }) => {
  return auditRepository.logActivity({ user_id, university_id, activity_type, activity_details });
};
exports.listActivityLogs = async (filters) => {
  return auditRepository.listActivityLogs(filters);
};
exports.trackUserActions = async ({ entity_table, entity_id, action, performed_by, changes }) => {
  return auditRepository.createAuditTrail({ entity_table, entity_id, action, performed_by, changes });
};

exports.trackResultChanges = async ({ result_id, user_id, action, changes }) => {
  return auditRepository.createAuditTrail({ entity_table: 'results', entity_id: result_id, action, performed_by: user_id, changes });
};
