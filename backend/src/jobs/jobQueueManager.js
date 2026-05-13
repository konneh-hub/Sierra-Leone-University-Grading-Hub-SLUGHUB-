const { Queue, Worker } = require('bullmq');
const Redis = require('redis');
const { logger } = require('../gateway/apiGateway');

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
};

// Create Redis client
const redisClient = Redis.createClient(redisConfig);

// Test Redis connection
async function testRedisConnection() {
  try {
    await redisClient.connect();
    await redisClient.ping();
    return true;
  } catch (error) {
    logger.warn('Redis connection failed:', {
      message: error.message || String(error),
      stack: error.stack,
      error,
    });
    return false;
  } finally {
    try {
      await redisClient.disconnect();
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}

// Job Queues
class JobQueueManager {
  constructor() {
    this.queues = {};
    this.workers = {};
    this.redisAvailable = false;

    this.initialize();
  }

  async initialize() {
    try {
      this.redisAvailable = await testRedisConnection();
      if (this.redisAvailable) {
        this.initializeQueues();
        this.initializeWorkers();
        logger.info('Job queue system initialized successfully');
      } else {
        logger.warn('Job queue system disabled - Redis not available');
      }
    } catch (error) {
      logger.error('Failed to initialize job queues:', { error: error.message });
      logger.warn('Job queue system will not be available');
    }
  }

  // Initialize all job queues
  initializeQueues() {
    const queueNames = [
      'resultProcessingQueue',
      'gpaCalculationQueue',
      'cgpaUpdateQueue',
      'notificationQueue',
      'billingQueue',
      'reportGenerationQueue',
      'fileProcessingQueue'
    ];

    queueNames.forEach(queueName => {
      this.queues[queueName] = new Queue(queueName, {
        connection: redisConfig,
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 100,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      logger.info(`Initialized queue: ${queueName}`);
    });
  }

  // Initialize workers for each queue
  initializeWorkers() {
    // Result Processing Worker
    this.workers.resultProcessingQueue = new Worker('resultProcessingQueue', this.processResultJob.bind(this), {
      connection: redisConfig,
      concurrency: 5,
    });

    // GPA Calculation Worker
    this.workers.gpaCalculationQueue = new Worker('gpaCalculationQueue', this.processGPACalculation.bind(this), {
      connection: redisConfig,
      concurrency: 3,
    });

    // CGPA Update Worker
    this.workers.cgpaUpdateQueue = new Worker('cgpaUpdateQueue', this.processCGPAUpdate.bind(this), {
      connection: redisConfig,
      concurrency: 3,
    });

    // Notification Worker
    this.workers.notificationQueue = new Worker('notificationQueue', this.processNotification.bind(this), {
      connection: redisConfig,
      concurrency: 10,
    });

    // Billing Worker
    this.workers.billingQueue = new Worker('billingQueue', this.processBillingJob.bind(this), {
      connection: redisConfig,
      concurrency: 2,
    });

    // Report Generation Worker
    this.workers.reportGenerationQueue = new Worker('reportGenerationQueue', this.processReportGeneration.bind(this), {
      connection: redisConfig,
      concurrency: 2,
    });

    // File Processing Worker
    this.workers.fileProcessingQueue = new Worker('fileProcessingQueue', this.processFileJob.bind(this), {
      connection: redisConfig,
      concurrency: 3,
    });

    // Attach event listeners to all workers
    Object.keys(this.workers).forEach(queueName => {
      const worker = this.workers[queueName];

      worker.on('completed', (job) => {
        logger.info(`Job completed: ${queueName} - ${job.id}`, {
          jobId: job.id,
          data: job.data,
          duration: Date.now() - job.processedOn
        });
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job failed: ${queueName} - ${job.id}`, {
          jobId: job.id,
          data: job.data,
          error: err.message,
          stack: err.stack,
          attemptsMade: job.attemptsMade,
          attemptsRemaining: job.opts.attempts - job.attemptsMade
        });
      });

      worker.on('stalled', (jobId) => {
        logger.warn(`Job stalled: ${queueName} - ${jobId}`);
      });
    });

    logger.info('All job workers initialized');
  }

  // Add job to queue
  async addJob(queueName, jobName, data, options = {}) {
    if (!this.redisAvailable) {
      logger.warn(`Cannot add job to ${queueName} - Redis not available`);
      return null;
    }

    try {
      if (!this.queues[queueName]) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      const job = await this.queues[queueName].add(jobName, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        ...options
      });

      logger.info(`Job added to queue: ${queueName}`, {
        jobId: job.id,
        jobName,
        data: JSON.stringify(data).substring(0, 200)
      });

      return job;
    } catch (error) {
      logger.error(`Failed to add job to queue: ${queueName}`, {
        jobName,
        data,
        error: error.message
      });
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats(queueName) {
    if (!this.redisAvailable) {
      return { status: 'disabled', message: 'Redis not available' };
    }

    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues[queueName];
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length
    };
  }

  // Get all queue statistics
  async getAllQueueStats() {
    const stats = {};
    for (const queueName of Object.keys(this.queues)) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    return stats;
  }

  // Retry failed job
  async retryJob(queueName, jobId) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const job = await this.queues[queueName].getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    logger.info(`Job retried: ${queueName} - ${jobId}`);
  }

  // Clean old jobs
  async cleanOldJobs(queueName, grace = 24 * 60 * 60 * 1000) {
    if (!this.queues[queueName]) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const queue = this.queues[queueName];
    const completed = await queue.clean(grace, 100, 'completed');
    const failed = await queue.clean(grace, 50, 'failed');

    logger.info(`Cleaned old jobs: ${queueName}`, {
      completed: completed.length,
      failed: failed.length
    });

    return { completed: completed.length, failed: failed.length };
  }

  // Graceful shutdown
  async shutdown() {
    logger.info('Shutting down job queues...');

    // Close all workers
    for (const worker of Object.values(this.workers)) {
      await worker.close();
    }

    // Close all queues
    for (const queue of Object.values(this.queues)) {
      await queue.close();
    }

    // Close Redis client
    await redisClient.quit();

    logger.info('Job queues shutdown complete');
  }

  // Job processors (to be implemented with actual business logic)
  async processResultJob(job) {
    const { resultId, action } = job.data;
    logger.info(`Processing result job: ${resultId} - ${action}`);

    // Import services dynamically to avoid circular dependencies
    const resultService = require('../services/resultService');

    switch (action) {
      case 'calculate_gpa':
        await resultService.calculateGPAForResult(resultId);
        break;
      case 'update_cgpa':
        await resultService.updateCGPAForStudent(job.data.studentId);
        break;
      case 'send_notifications':
        await resultService.sendResultNotifications(resultId);
        break;
      default:
        throw new Error(`Unknown result action: ${action}`);
    }
  }

  async processGPACalculation(job) {
    const { studentId, semesterId } = job.data;
    logger.info(`Processing GPA calculation: ${studentId} - ${semesterId}`);

    const gpaService = require('../services/gpaService');
    await gpaService.calculateStudentGPA(studentId, semesterId);
  }

  async processCGPAUpdate(job) {
    const { studentId } = job.data;
    logger.info(`Processing CGPA update: ${studentId}`);

    const gpaService = require('../services/gpaService');
    await gpaService.calculateStudentCGPA(studentId);
  }

  async processNotification(job) {
    const { type, recipients, data } = job.data;
    logger.info(`Processing notification: ${type} - ${recipients.length} recipients`);

    const notificationService = require('../services/notificationService');
    await notificationService.sendBulkNotification(type, recipients, data);
  }

  async processBillingJob(job) {
    const { type, data } = job.data;
    logger.info(`Processing billing job: ${type}`);

    const billingService = require('../services/billingService');

    switch (type) {
      case 'subscription_expiry_check':
        await billingService.checkExpiredSubscriptions();
        break;
      case 'payment_retry':
        await billingService.retryFailedPayment(data.paymentId);
        break;
      case 'invoice_generation':
        await billingService.generatePendingInvoices();
        break;
      default:
        throw new Error(`Unknown billing job type: ${type}`);
    }
  }

  async processReportGeneration(job) {
    const { reportType, filters, format, userId } = job.data;
    logger.info(`Processing report generation: ${reportType} - ${format}`);

    const reportingService = require('../reporting/reportingService');
    await reportingService.generateReport(reportType, filters, format, userId);
  }

  async processFileJob(job) {
    const { filePath, fileType, action, metadata } = job.data;
    logger.info(`Processing file job: ${fileType} - ${action}`);

    const fileProcessingService = require('../file-processing/fileProcessingService');

    switch (action) {
      case 'bulk_import':
        await fileProcessingService.processBulkImport(filePath, fileType, metadata);
        break;
      case 'export_data':
        await fileProcessingService.processExport(filePath, fileType, metadata);
        break;
      default:
        throw new Error(`Unknown file action: ${action}`);
    }
  }
}

// Create singleton instance
const jobQueueManager = new JobQueueManager();

module.exports = jobQueueManager;
