const { ROLES } = require('../config/roles');

module.exports = {
  PERMISSIONS: {
    CREATE_UNIVERSITY: 'create_university',
    MANAGE_USERS: 'manage_users',
    MANAGE_ACADEMIC_STRUCTURE: 'manage_academic_structure',
    MANAGE_ENROLLMENTS: 'manage_enrollments',
    MANAGE_RESULTS: 'manage_results',
    PUBLISH_RESULTS: 'publish_results',
    GENERATE_TRANSCRIPTS: 'generate_transcripts',
    SEND_NOTIFICATIONS: 'send_notifications',
    VIEW_AUDIT_LOGS: 'view_audit_logs',
  },
  ROLE_PERMISSIONS: {
    [ROLES.SYSTEM_ADMIN]: ['create_university', 'manage_users', 'send_notifications', 'view_audit_logs'],
    [ROLES.UNIVERSITY_ADMIN]: ['manage_users', 'manage_academic_structure', 'manage_enrollments', 'send_notifications'],
    [ROLES.HOD]: ['manage_results'],
    [ROLES.DEAN]: ['manage_results'],
    [ROLES.EXAM_OFFICER]: ['manage_results', 'publish_results', 'generate_transcripts'],
    [ROLES.LECTURER]: ['manage_results'],
    [ROLES.STUDENT]: []
  }
};
