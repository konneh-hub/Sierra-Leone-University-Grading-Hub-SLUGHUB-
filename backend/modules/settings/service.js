const SettingsRepository = require('./repository');
const { BadRequestError } = require('../../src/utils/errors');

const defaultSettings = {
  platformName: 'SRMS SaaS Admin',
  supportEmail: 'support@slughub.com',
  defaultLanguage: 'en',
  registrationEnabled: true,
};

class SettingsService {
  static async getSettings() {
    const settings = await SettingsRepository.getSettings();
    return {
      ...defaultSettings,
      ...(settings || {}),
    };
  }

  static async updateSettings(updates) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      throw new BadRequestError('Settings updates must be an object');
    }

    const updatedSettings = await SettingsRepository.upsertSettings(updates);
    return {
      ...defaultSettings,
      ...(updatedSettings || {}),
    };
  }
}

module.exports = SettingsService;
