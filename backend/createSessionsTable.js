const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres123@localhost:5433/srms_db' });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token text NOT NULL UNIQUE,
        ip_address inet,
        user_agent text,
        status session_status NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        last_activity_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('user_sessions table created');
  } catch (err) {
    console.error('ERR', err.message);
  } finally {
    await pool.end();
  }
})();