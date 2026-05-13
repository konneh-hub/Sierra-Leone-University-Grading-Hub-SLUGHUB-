const BillingRepository = require('./repository');
const SubscriptionService = require('../subscriptions/service');
const { BadRequestError } = require('../../src/utils/errors');
const auditService = require('../../src/services/auditService');

class BillingService {
  static async createBilling(universityId, subscriptionId, billingData, systemAdminId) {
    if (!billingData.amount || !billingData.billingDate || !billingData.dueDate) {
      throw new BadRequestError('Missing required billing data');
    }

    const invoiceNumber = await BillingRepository.generateInvoiceNumber();
    const billing = await BillingRepository.createBilling({
      subscriptionId,
      universityId,
      invoiceNumber,
      ...billingData,
      createdBy: systemAdminId,
    });

    await auditService.log({
      userId: systemAdminId,
      action: 'billing_created',
      module: 'billing',
      entityId: billing.id,
      details: { invoiceNumber, amount: billing.amount },
      changes: billing,
    });

    return billing;
  }

  static async getBilling(billingId) {
    return BillingRepository.getBilling(billingId);
  }

  static async getUniversityBillings(universityId, limit = 50, offset = 0) {
    return BillingRepository.getUniversityBillings(universityId, limit, offset);
  }

  static async getSubscriptionBillings(subscriptionId, limit = 50, offset = 0) {
    return BillingRepository.getSubscriptionBillings(subscriptionId, limit, offset);
  }

  static async updateBilling(billingId, updateData, systemAdminId) {
    const oldBilling = await BillingRepository.getBilling(billingId);
    const updatedBilling = await BillingRepository.updateBilling(billingId, updateData);

    await auditService.log({
      userId: systemAdminId,
      action: 'billing_updated',
      module: 'billing',
      entityId: billingId,
      details: { changes: updateData },
      changes: { before: oldBilling, after: updatedBilling },
    });

    return updatedBilling;
  }

  static async getAllBillings(filters = {}, limit = 50, offset = 0) {
    return BillingRepository.getAllBillings(filters, limit, offset);
  }

  static async recordPayment(billingId, paymentMethod, systemAdminId) {
    const billing = await BillingRepository.markAsPaid(billingId, paymentMethod);

    await auditService.log({
      userId: systemAdminId,
      action: 'billing_paid',
      module: 'billing',
      entityId: billingId,
      details: { paymentMethod },
      changes: { status: 'paid' },
    });

    return billing;
  }

  static async recordFailedPayment(billingId, reason, systemAdminId) {
    const billing = await BillingRepository.markAsFailed(billingId, reason);

    await auditService.log({
      userId: systemAdminId,
      action: 'billing_failed',
      module: 'billing',
      entityId: billingId,
      details: { reason },
      changes: { status: 'failed' },
    });

    return billing;
  }

  static async getUnpaidBills(daysOverdue = 0) {
    return BillingRepository.getUnpaidBills(daysOverdue);
  }

  static async generateBillingReport(universityId, startDate, endDate) {
    const billings = await BillingRepository.getAllBillings(
      { universityId },
      1000,
      0
    );

    const filtered = billings.filter(b => {
      const billingDate = new Date(b.billing_date);
      return billingDate >= new Date(startDate) && billingDate <= new Date(endDate);
    });

    const report = {
      universityId,
      period: { start: startDate, end: endDate },
      totalBillings: filtered.length,
      totalAmount: filtered.reduce((sum, b) => sum + parseFloat(b.amount), 0),
      paidAmount: filtered
        .filter(b => b.status === 'paid')
        .reduce((sum, b) => sum + parseFloat(b.amount), 0),
      pendingAmount: filtered
        .filter(b => b.status === 'pending')
        .reduce((sum, b) => sum + parseFloat(b.amount), 0),
      failedAmount: filtered
        .filter(b => b.status === 'failed')
        .reduce((sum, b) => sum + parseFloat(b.amount), 0),
      statusBreakdown: {
        paid: filtered.filter(b => b.status === 'paid').length,
        pending: filtered.filter(b => b.status === 'pending').length,
        failed: filtered.filter(b => b.status === 'failed').length,
      },
      billings: filtered,
    };

    return report;
  }
}

module.exports = BillingService;
