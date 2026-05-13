const SubscriptionRepository = require('./repository');
const { BadRequestError } = require('../../src/utils/errors');
const auditService = require('../../src/services/auditService');

class SubscriptionService {
  static async createSubscription(universityId, subscriptionData, systemAdminId) {
    if (!subscriptionData.subscriptionTier || !subscriptionData.startDate || !subscriptionData.renewalDate) {
      throw new BadRequestError('Missing required subscription data');
    }

    const subscription = await SubscriptionRepository.createSubscription({
      universityId,
      ...subscriptionData,
      createdBy: systemAdminId,
    });

    await auditService.log({
      userId: systemAdminId,
      action: 'subscription_created',
      module: 'subscriptions',
      entityId: subscription.id,
      details: { subscriptionTier: subscription.subscription_tier, universityId },
      changes: subscription,
    });

    return subscription;
  }

  static async getSubscription(subscriptionId) {
    return SubscriptionRepository.getSubscription(subscriptionId);
  }

  static async getUniversitySubscription(universityId) {
    return SubscriptionRepository.getUniversitySubscription(universityId);
  }

  static async updateSubscription(subscriptionId, updateData, systemAdminId) {
    const oldSubscription = await SubscriptionRepository.getSubscription(subscriptionId);
    const updatedSubscription = await SubscriptionRepository.updateSubscription(subscriptionId, updateData);

    await auditService.log({
      userId: systemAdminId,
      action: 'subscription_updated',
      module: 'subscriptions',
      entityId: subscriptionId,
      details: { changes: updateData },
      changes: { before: oldSubscription, after: updatedSubscription },
    });

    return updatedSubscription;
  }

  static async getAllSubscriptions(filters) {
    return SubscriptionRepository.getAllSubscriptions(filters);
  }

  static async renewSubscription(subscriptionId, systemAdminId) {
    const newRenewalDate = new Date();
    newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);

    const subscription = await SubscriptionRepository.renewSubscription(subscriptionId, newRenewalDate);

    await auditService.log({
      userId: systemAdminId,
      action: 'subscription_renewed',
      module: 'subscriptions',
      entityId: subscriptionId,
      details: { newRenewalDate },
      changes: subscription,
    });

    return subscription;
  }

  static async suspendSubscription(subscriptionId, reason, systemAdminId) {
    const subscription = await SubscriptionRepository.suspendSubscription(subscriptionId, reason);

    await auditService.log({
      userId: systemAdminId,
      action: 'subscription_suspended',
      module: 'subscriptions',
      entityId: subscriptionId,
      details: { reason },
      changes: subscription,
    });

    return subscription;
  }

  static async cancelSubscription(subscriptionId, reason, systemAdminId) {
    const subscription = await SubscriptionRepository.cancelSubscription(subscriptionId, reason);

    await auditService.log({
      userId: systemAdminId,
      action: 'subscription_cancelled',
      module: 'subscriptions',
      entityId: subscriptionId,
      details: { reason },
      changes: subscription,
    });

    return subscription;
  }

  static async checkSubscriptionStatus(universityId) {
    const subscription = await SubscriptionRepository.getUniversitySubscription(universityId);
    const now = new Date();
    const renewalDate = new Date(subscription.renewal_date);

    if (subscription.status === 'active' && renewalDate < now) {
      await SubscriptionRepository.suspendSubscription(
        subscription.id,
        'Subscription renewal date passed'
      );
      return { status: 'expired', subscription };
    }

    return { status: subscription.status, subscription };
  }
}

module.exports = SubscriptionService;
