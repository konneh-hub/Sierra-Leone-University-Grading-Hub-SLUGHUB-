module.exports = {
  ROLES: {
    SYSTEM_ADMIN: 'system_admin',
    UNIVERSITY_ADMIN: 'university_admin',
    EXAM_OFFICER: 'exam_officer',
    DEAN: 'dean',
    HOD: 'hod',
    LECTURER: 'lecturer',
    STUDENT: 'student',
  },
  ROLE_GROUPS: {
    ADMIN: ['system_admin', 'university_admin'],
    ACADEMIC: ['dean', 'hod', 'lecturer'],
    SUPPORT: ['exam_officer'],
    USER: ['student'],
  },
};
