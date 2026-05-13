module.exports = {
  TENANT_HEADER: 'x-tenant-id',
  DEFAULT_TENANT: process.env.DEFAULT_TENANT || 'default_university',
  TENANT_ROLES: [
    'system_admin',
    'university_admin',
    'exam_officer',
    'dean',
    'hod',
    'lecturer',
    'student',
  ],
};
