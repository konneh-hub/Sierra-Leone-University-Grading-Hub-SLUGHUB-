const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function createAdmin() {
  const pool = new Pool({
    connectionString: 'postgresql://postgres:postgres123@postgres:5432/srms_db'
  });

  try {
    const email = 'slughub@edu.com';
    const password = 'SLUGHUB@26';

    // Check if user exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existing.length > 0) {
      console.log('System admin account already exists');
      return;
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, is_system_admin, status)
       VALUES ($1, $2, $3, $4, $5, true, 'active')
       RETURNING id, email`,
      [email, 'slughub', passwordHash, 'Slug', 'Hub']
    );

    console.log('System admin account created successfully!');
    console.log('Email: slughub@edu.com');
    console.log('Password: SLUGHUB@26');

  } catch (err) {
    console.error('Error creating admin:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();