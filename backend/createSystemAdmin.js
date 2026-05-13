const bcrypt = require('bcrypt');
const userRepository = require('./src/repositories/userRepository');

(async () => {
  try {
    const email = 'slughub@edu.com';
    const existing = await userRepository.getUserByEmail(email);
    if (existing) {
      console.log('EXISTS', existing.id, existing.email);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash('SLUGHUB@26', 10);
    const user = await userRepository.createUser({
      email,
      username: 'slughub',
      password_hash: passwordHash,
      first_name: 'Slug',
      last_name: 'Hub',
      gender: null,
      university_id: null,
      is_system_admin: true,
    });

    console.log('CREATED', user.id, user.email, 'is_system_admin=', user.is_system_admin);
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err.message || err);
    process.exit(1);
  }
})();
