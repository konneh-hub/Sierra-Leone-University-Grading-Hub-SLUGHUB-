const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5432/srms_db' });
  try {
    const { rows } = await pool.query('SELECT 1');
    console.log('OK', rows);
  } catch (err) {
    console.error('ERR', err.message);
  } finally {
    await pool.end();
  }
})();
