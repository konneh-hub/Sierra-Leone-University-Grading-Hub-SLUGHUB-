const PlatformUserModel = require('./model');
const { NotFoundError } = require('../../src/utils/errors');

class PlatformUserRepository {
  static async getAllPlatformUsers(filters, limit, offset) {
    return PlatformUserModel.getAll(filters, limit, offset);
  }

  static async getPlatformUser(userId) {
    const user = await PlatformUserModel.getById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async getSystemAdmins() {
    return PlatformUserModel.getSystemAdmins();
  }

  static async updatePlatformUser(userId, updateData) {
    const user = await PlatformUserModel.update(userId, updateData);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async deactivateUser(userId) {
    const user = await PlatformUserModel.deactivate(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async activateUser(userId) {
    const user = await PlatformUserModel.activate(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  static async assignSystemAdmin(userId) {
    return this.updatePlatformUser(userId, { is_system_admin: true });
  }

  static async removeSystemAdmin(userId) {
    return this.updatePlatformUser(userId, { is_system_admin: false });
  }
}

module.exports = PlatformUserRepository;
