exports.createUser = async (userData) => {
  // TODO: create users with assigned tenant and role
  return { ...userData, id: 'user-placeholder' };
};

exports.listUsers = async (tenantId) => {
  return [];
};
