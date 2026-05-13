module.exports = {
  SYSTEM_ADMIN_AUTH_FIELDS: [
    'email',
    'password',
    'first_name',
    'last_name',
    'gender'
  ],
  SYSTEM_ADMIN_TOKEN_PAYLOAD: ['userId', 'email', 'roles', 'is_system_admin'],
};
