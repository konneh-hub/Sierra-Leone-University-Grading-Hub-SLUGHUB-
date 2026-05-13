const cron = require('node-cron');
const billingService = require('../services/billingService');

// Automated billing cron jobs
class BillingCronJobs {
  constructor() {
    this.jobs = [];
  }

  // Start all billing cron jobs
  start() {
    console.log('Starting billing cron jobs...');

    // Daily job: Auto-renew subscriptions (runs at 2 AM daily)
    const autoRenewJob = cron.schedule('0 2 * * *', async () => {
      console.log('Running auto-renewal job...');
      try {
        await billingService.autoRenewSubscriptions();
        console.log('Auto-renewal job completed successfully');
      } catch (error) {
        console.error('Auto-renewal job failed:', error);
      }
    });

    // Daily job: Expire old subscriptions (runs at 3 AM daily)
    const expireJob = cron.schedule('0 3 * * *', async () => {
      console.log('Running subscription expiry job...');
      try {
        await billingService.expireOldSubscriptions();
        console.log('Subscription expiry job completed successfully');
      } catch (error) {
        console.error('Subscription expiry job failed:', error);
      }
    });

    // Daily job: Send billing notifications (runs at 4 AM daily)
    const notificationJob = cron.schedule('0 4 * * *', async () => {
      console.log('Running billing notification job...');
      try {
        await billingService.sendBillingNotifications();
        console.log('Billing notification job completed successfully');
      } catch (error) {
        console.error('Billing notification job failed:', error);
      }
    });

    // Daily job: Suspend unpaid subscriptions (runs at 5 AM daily)
    const suspendJob = cron.schedule('0 5 * * *', async () => {
      console.log('Running unpaid subscription suspension job...');
      try {
        await billingService.suspendUnpaidSubscriptions();
        console.log('Unpaid subscription suspension job completed successfully');
      } catch (error) {
        console.error('Unpaid subscription suspension job failed:', error);
      }
    });

    // Store job references for potential management
    this.jobs = [autoRenewJob, expireJob, notificationJob, suspendJob];

    console.log('All billing cron jobs started successfully');
  }

  // Stop all billing cron jobs
  stop() {
    console.log('Stopping billing cron jobs...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('All billing cron jobs stopped');
  }

  // Get status of cron jobs
  getStatus() {
    return {
      running: this.jobs.length > 0,
      jobCount: this.jobs.length,
      jobs: [
        { name: 'Auto-renewal', schedule: 'Daily at 2 AM' },
        { name: 'Subscription Expiry', schedule: 'Daily at 3 AM' },
        { name: 'Billing Notifications', schedule: 'Daily at 4 AM' },
        { name: 'Unpaid Suspension', schedule: 'Daily at 5 AM' },
      ]
    };
  }
}

module.exports = new BillingCronJobs();
