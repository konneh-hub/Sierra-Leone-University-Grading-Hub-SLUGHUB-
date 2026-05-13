const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

const authRoutes = require('./src/routes/authRoutes');
const universityRoutes = require('./src/routes/universityRoutes');
const academicRoutes = require('./src/routes/academicRoutes');
const enrollmentRoutes = require('./src/routes/enrollmentRoutes');
const resultRoutes = require('./src/routes/resultRoutes');
const transcriptRoutes = require('./src/routes/transcriptRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const { errorHandler } = require('./src/middleware/errorHandler');
const { checkSubscriptionMiddleware } = require('./src/middleware/subscriptionMiddleware');
const billingCronJobs = require('./src/cron/billingJobs');

// Infrastructure Layer Imports
const { createAPIGateway, requestLogger, routeGuard, globalErrorHandler, logger } = require('./src/gateway/apiGateway');
const jobQueueManager = require('./src/jobs/jobQueueManager');
const fileProcessingService = require('./src/file-processing/fileProcessingService');
const reportingService = require('./src/reporting/reportingService');
const rulesEngine = require('./src/rules/rulesEngine');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize API Gateway
const apiGateway = createAPIGateway();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json()); // For regular JSON requests
app.use(express.urlencoded({ extended: true })); // For form data

// API Gateway Middleware
app.use(requestLogger);

// Auth routes (no subscription check needed)
app.use('/api/auth', authRoutes);

// Webhook routes (raw body parsing, no auth)
app.use('/api/webhooks', webhookRoutes);

// Payment routes (authentication required)
app.use('/api/payments', paymentRoutes);

// Billing routes (subscription management)
app.use('/api/billing', billingRoutes);

// File processing routes (with file upload middleware)
const fileRoutes = require('./src/routes/fileRoutes');
app.use('/api/files', checkSubscriptionMiddleware, fileRoutes);

// Reporting routes
const reportRoutes = require('./src/routes/reportRoutes');
app.use('/api/reports', checkSubscriptionMiddleware, reportRoutes);

// Academic routes with subscription enforcement
app.use('/api/universities', checkSubscriptionMiddleware, universityRoutes);
app.use('/api/academics', checkSubscriptionMiddleware, academicRoutes);
app.use('/api/enrollments', checkSubscriptionMiddleware, enrollmentRoutes);
app.use('/api/results', checkSubscriptionMiddleware, resultRoutes);
app.use('/api/transcripts', checkSubscriptionMiddleware, transcriptRoutes);

// Notification and audit routes (may need subscription check depending on business rules)
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);

// System admin platform APIs
const systemAdminRoutes = require('./modules/systemAdmin/routes');
app.use('/api/system-admin', systemAdminRoutes);

// System admin dashboard routes
const systemAdminDashboardRoutes = require('./routes/systemAdminDashboard');
app.use('/system-admin', systemAdminDashboardRoutes);

// Serve system admin dashboard static assets
app.use('/system-admin', express.static(path.join(__dirname, 'public/system-admin')));

// Global error handler from API Gateway
app.use(globalErrorHandler);

// Start infrastructure services
async function initializeInfrastructure() {
  try {
    // Start job queue manager
    logger.info('Initializing job queue manager...');
    // Job queues are initialized when the module is loaded

    // Start cleanup jobs
    setInterval(() => {
      fileProcessingService.cleanupOldFiles();
      reportingService.cleanupOldReports();
    }, 24 * 60 * 60 * 1000); // Daily cleanup

    logger.info('Infrastructure services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize infrastructure services', { error: error.message });
    process.exit(1);
  }
}

// Start billing cron jobs
billingCronJobs.start();

// Initialize infrastructure
initializeInfrastructure();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  billingCronJobs.stop();
  await jobQueueManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  billingCronJobs.stop();
  await jobQueueManager.shutdown();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
  console.log('Billing cron jobs are active');
  console.log('Payment gateway integration is active');
  console.log('API Gateway is active');
  console.log('Background job system is active');
  console.log('File processing system is active');
  console.log('Reporting engine is active');
  console.log('Validation & business rule engine is active');
});

