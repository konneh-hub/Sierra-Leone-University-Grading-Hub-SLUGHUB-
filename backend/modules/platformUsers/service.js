const PlatformUserRepository = require('./repository');
const auditService = require('../../src/services/auditService');

class PlatformUserService {
  static async listPlatformUsers(filters, limit = 50, offset = 0) {
    return PlatformUserRepository.getAllPlatformUsers(filters, limit, offset);
  }

  static async getPlatformUser(userId) {
    return PlatformUserRepository.getPlatformUser(userId);
  }

  static async listSystemAdmins() {
    return PlatformUserRepository.getSystemAdmins();
  }

  static async updatePlatformUser(userId, updateData, systemAdminId) {
    const user = await PlatformUserRepository.updatePlatformUser(userId, updateData);
    await auditService.log({
      userId: systemAdminId,
      action: 'platform_user_updated',
      module: 'platformUsers',
      entityId: userId,
      details: updateData,
      changes: user,
    });
    return user;
  }

  static async deactivateUser(userId, systemAdminId) {
    const user = await PlatformUserRepository.deactivateUser(userId);
    await auditService.log({
      userId: systemAdminId,
      action: 'platform_user_deactivated',
      module: 'platformUsers',
      entityId: userId,
      details: { reason: 'deactivated by system admin' },
      changes: user,
    });
    return user;
  }

  static async activateUser(userId, systemAdminId) {
    const user = await PlatformUserRepository.activateUser(userId);
    await auditService.log({
      userId: systemAdminId,
      action: 'platform_user_activated',
      module: 'platformUsers',
      entityId: userId,
      details: { reason: 'reactivated by system admin' },
      changes: user,
    });
    return user;
  }

  static async assignSystemAdmin(userId, systemAdminId) {
    const user = await PlatformUserRepository.assignSystemAdmin(userId);
    await auditService.log({
      userId: systemAdminId,
      action: 'system_admin_assigned',
      module: 'platformUsers',
      entityId: userId,
      details: { assignedBy: systemAdminId },
      changes: user,
    });
    return user;
  }

  static async removeSystemAdmin(userId, systemAdminId) {
    const user = await PlatformUserRepository.removeSystemAdmin(userId);
    await auditService.log({
      userId: systemAdminId,
      action: 'system_admin_removed',
      module: 'platformUsers',
      entityId: userId,
      details: { removedBy: systemAdminId },
      changes: user,
    });
    return user;
  }
}

module.exports = PlatformUserService;
