const bcrypt = require('bcrypt');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5433/srms_db' });
  try {
    const email = 'admin@srms.com';
    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);
    
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, is_system_admin, status)
       VALUES ($1, $2, $3, $4, $5, true, 'active')
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [email, 'admin', passwordHash, 'Admin', 'User']
    );
    
    if (rows.length > 0) {
      console.log('Created system admin:', rows[0]);
    } else {
      console.log('System admin already exists');
    }
  } catch (err) {
    console.error('ERR', err.message);
  } finally {
    await pool.end();
  }
})();