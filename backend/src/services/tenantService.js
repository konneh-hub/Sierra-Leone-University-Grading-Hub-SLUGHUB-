exports.createTenant = async (tenantData) => {
  // TODO: create tenant and link roles, departments, and initial users
  return { ...tenantData, id: 'tenant-placeholder' };
};

exports.listTenants = async () => {
  return [];
};
