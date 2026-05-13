const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const credentialSets = [
  'postgresql://username:password@localhost:5432/srms_db',
  'postgresql://postgres:postgres@localhost:5432/srms_db',
  'postgresql://postgres:password@localhost:5432/srms_db',
  'postgresql://postgres:admin@localhost:5432/srms_db',
  'postgresql://postgres:root@localhost:5432/srms_db',
  'postgresql://postgres:123456@localhost:5432/srms_db',
  'postgresql://postgres:@localhost:5432/srms_db',
  'postgresql://admin:admin@localhost:5432/srms_db',
  'postgresql://app:app@localhost:5432/srms_db',
];

async function createSystemAdminAccount() {
  let workingUri = null;

  console.log('Attempting to connect to PostgreSQL database...\n');

  // Find working connection
  for (const uri of credentialSets) {
    try {
      const pool = new Pool({
        connectionString: uri,
        idleTimeoutMillis: 500,
        connectionTimeoutMillis: 1000,
      });

      await pool.query('SELECT 1');
      workingUri = uri;
      console.log('✓ Connected successfully with:', uri);
      await pool.end();
      break;
    } catch (err) {
      // Continue to next credential set
    }
  }

  if (!workingUri) {
    console.error(
      '\n❌ Could not connect to PostgreSQL with any default credentials.'
    );
    console.error(
      'Please verify PostgreSQL is running and check the credentials in .env'
    );
    process.exit(1);
  }

  // Use working connection to create account
  const pool = new Pool({ connectionString: workingUri });

  try {
    const email = 'slughub@edu.com';
    const username = 'slughub';
    const firstName = 'Slug';
    const lastName = 'Hub';
    const password = 'SLUGHUB@26';

    // Check if user already exists
    const { rows: existing } = await pool.query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existing.length > 0) {
      console.log(
        `\n✓ System admin account already exists: ${existing[0].email} (ID: ${existing[0].id})`
      );
      await pool.end();
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, gender, university_id, is_system_admin, status)
       VALUES ($1, $2, $3, $4, $5, NULL, NULL, true, 'active')
       RETURNING id, email, is_system_admin`,
      [email, username, passwordHash, firstName, lastName]
    );

    const user = rows[0];
    console.log(
      `\n✅ System admin account created successfully!\n   ID: ${user.id}\n   Email: ${user.email}\n   System Admin: ${user.is_system_admin}`
    );
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n🔐 You can now log in at: http://localhost:4000/system-admin/login');

    await pool.end();
  } catch (err) {
    console.error('\n❌ Error creating system admin account:', err.message);
    console.error(err);
    await pool.end();
    process.exit(1);
  }
}

createSystemAdminAccount();
