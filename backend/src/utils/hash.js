const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

exports.hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

exports.verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};
