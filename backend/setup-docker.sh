#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! docker-compose exec -T postgres pg_isready -U postgres -d srms_db; do
  echo "PostgreSQL is not ready yet. Waiting..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Wait for Redis to be ready
echo "Waiting for Redis to be ready..."
while ! docker-compose exec -T redis redis-cli ping | grep -q PONG; do
  echo "Redis is not ready yet. Waiting..."
  sleep 2
done

echo "Redis is ready!"

# Run database initialization
echo "Initializing database..."
docker-compose exec -T postgres psql -U postgres -d srms_db -f /docker-entrypoint-initdb.d/01-schema.sql

# Create system admin account
echo "Creating system admin account..."
docker-compose exec -T backend node -e "
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
      'SELECT id FROM users WHERE LOWER(email) = LOWER(\$1)',
      [email]
    );

    if (existing.length > 0) {
      console.log('System admin account already exists');
      return;
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      \`INSERT INTO users (email, username, password_hash, first_name, last_name, is_system_admin, status)
       VALUES (\$1, \$2, \$3, \$4, \$5, true, 'active')
       RETURNING id, email\`,
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
"

echo "Setup complete!"
echo ""
echo "Application is running at: http://localhost:4000"
echo "System Admin Login: http://localhost:4000/system-admin/login"
echo "Credentials: slughub@edu.com / SLUGHUB@26"