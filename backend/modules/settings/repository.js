const pool = require('../../src/config/database');

const SETTINGS_ROW_ID = '00000000-0000-0000-0000-000000000001';

class SettingsRepository {
  static async getSettings() {
    const { rows } = await pool.query(
      `SELECT settings FROM platform_settings WHERE id = $1`,
      [SETTINGS_ROW_ID]
    );

    return rows[0] ? rows[0].settings : null;
  }

  static async upsertSettings(updates) {
    const { rows } = await pool.query(
      `INSERT INTO platform_settings (id, settings)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE
       SET settings = platform_settings.settings || EXCLUDED.settings,
           updated_at = now()
       RETURNING settings`,
      [SETTINGS_ROW_ID, updates]
    );

    return rows[0].settings;
  }
}

module.exports = SettingsRepository;
