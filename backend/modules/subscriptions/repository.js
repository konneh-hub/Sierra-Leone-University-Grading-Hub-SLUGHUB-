const SubscriptionModel = require('./model');
const { BadRequestError, NotFoundError } = require('../../src/utils/errors');
const auditService = require('../../src/services/auditService');

class SubscriptionRepository {
  static async createSubscription(subscriptionData) {
    return SubscriptionModel.create(subscriptionData);
  }

  static async getSubscription(subscriptionId) {
    const subscription = await SubscriptionModel.getById(subscriptionId);
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }
    return subscription;
  }

  static async getUniversitySubscription(universityId) {
    const subscription = await SubscriptionModel.getByUniversityId(universityId);
    if (!subscription) {
      throw new NotFoundError('No active subscription found for this university');
    }
    return subscription;
  }

  static async updateSubscription(subscriptionId, updateData) {
    const subscription = await SubscriptionModel.update(subscriptionId, updateData);
    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }
    return subscription;
  }

  static async getAllSubscriptions(filters) {
    return SubscriptionModel.getAll(filters);
  }

  static async renewSubscription(subscriptionId, newRenewalDate) {
    const subscription = await this.updateSubscription(subscriptionId, {
      status: 'active',
      renewal_date: newRenewalDate,
      updated_at: new Date(),
    });
    return subscription;
  }

  static async suspendSubscription(subscriptionId, reason) {
    return this.updateSubscription(subscriptionId, {
      status: 'suspended',
      updated_at: new Date(),
      notes: reason,
    });
  }

  static async cancelSubscription(subscriptionId, reason) {
    return this.updateSubscription(subscriptionId, {
      status: 'cancelled',
      updated_at: new Date(),
      notes: reason,
    });
  }
}

module.exports = SubscriptionRepository;
