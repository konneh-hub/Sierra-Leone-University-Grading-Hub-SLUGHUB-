const { APIResponseHandler } = require('../../src/gateway/apiGateway');
const SettingsService = require('./service');

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await SettingsService.getSettings();
    return APIResponseHandler.success(res, 'Settings loaded successfully', settings);
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    const settings = await SettingsService.updateSettings(updates);
    return APIResponseHandler.success(res, 'Settings updated successfully', settings);
  } catch (error) {
    next(error);
  }
};
