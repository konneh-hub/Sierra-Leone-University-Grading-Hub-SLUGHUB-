const { ROLES } = require('../config/roles');

module.exports = [
  { name: ROLES.SYSTEM_ADMIN, description: 'Platform-level administrator with full control.' },
  { name: ROLES.UNIVERSITY_ADMIN, description: 'University admin that manages a tenant university.' },
  { name: ROLES.EXAM_OFFICER, description: 'Exam officer who manages result entry and approval.' },
  { name: ROLES.DEAN, description: 'Dean with academic oversight privileges.' },
  { name: ROLES.HOD, description: 'Head of Department with departmental access.' },
  { name: ROLES.LECTURER, description: 'Lecturer responsible for course results.' },
  { name: ROLES.STUDENT, description: 'Student who views their own result records.' },
];
