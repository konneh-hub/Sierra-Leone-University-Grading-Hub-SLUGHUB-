const BillingModel = require('./model');
const { BadRequestError, NotFoundError } = require('../../src/utils/errors');

class BillingRepository {
  static async createBilling(billingData) {
    return BillingModel.create(billingData);
  }

  static async getBilling(billingId) {
    const billing = await BillingModel.getById(billingId);
    if (!billing) {
      throw new NotFoundError('Billing record not found');
    }
    return billing;
  }

  static async getUniversityBillings(universityId, limit, offset) {
    return BillingModel.getByUniversityId(universityId, limit, offset);
  }

  static async getSubscriptionBillings(subscriptionId, limit, offset) {
    return BillingModel.getBySubscriptionId(subscriptionId, limit, offset);
  }

  static async updateBilling(billingId, updateData) {
    const billing = await BillingModel.update(billingId, updateData);
    if (!billing) {
      throw new NotFoundError('Billing record not found');
    }
    return billing;
  }

  static async getAllBillings(filters, limit, offset) {
    return BillingModel.getAll(filters, limit, offset);
  }

  static async markAsPaid(billingId, paymentMethod = null) {
    return this.updateBilling(billingId, {
      status: 'paid',
      paid_at: new Date(),
      payment_method: paymentMethod,
    });
  }

  static async markAsFailed(billingId, reason = null) {
    return this.updateBilling(billingId, {
      status: 'failed',
      notes: reason,
    });
  }

  static async getUnpaidBills(daysOverdue = 0) {
    return BillingModel.getUnpaidBills(daysOverdue);
  }

  static async generateInvoiceNumber() {
    const date = new Date();
    const timestamp = date.getTime();
    return `INV-${date.getFullYear()}-${timestamp}`;
  }
}

module.exports = BillingRepository;
