exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  next();
};

exports.validateRegister = (req, res, next) => {
  const { email, password, role, tenantId } = req.body;
  if (!email || !password || !role || !tenantId) {
    return res.status(400).json({ error: 'Email, password, role, and tenantId are required.' });
  }
  next();
};
