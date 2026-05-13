exports.listTenants = (req, res) => {
  res.status(200).json({ tenants: [], message: 'List tenants endpoint placeholder' });
};

exports.createTenant = (req, res) => {
  res.status(201).json({ tenant: req.body, message: 'Create tenant endpoint placeholder' });
};
