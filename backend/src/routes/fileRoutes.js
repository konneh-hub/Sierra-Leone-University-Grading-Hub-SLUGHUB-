const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const fileProcessingService = require('../file-processing/fileProcessingService');
const rulesEngine = require('../rules/rulesEngine');
const jobQueueManager = require('../jobs/jobQueueManager');
const { APIResponseHandler: apiResponseHandler } = require('../gateway/apiGateway');

// Apply authentication to all routes
router.use(authenticate);

// File upload endpoint
router.post('/upload', authorizeRoles('admin', 'lecturer'), fileProcessingService.getUploadMiddleware(), async (req, res) => {
  try {
    if (!req.file) {
      return apiResponseHandler.error(res, 'No file uploaded', 400);
    }

    const { entityType, universityId } = req.body;
    const userId = req.user.id;

    // Validate file upload
    const fileValidation = await rulesEngine.validateBusinessRule('file_upload', {
      fileSize: req.file.size,
      fileType: req.file.mimetype.split('/')[1],
      entityType
    }, { universityId });

    if (!fileValidation.isValid) {
      return apiResponseHandler.error(res, fileValidation.errors.join(', '), 400);
    }

    // Process file based on entity type
    const filePath = req.file.path;
    const fileType = req.file.mimetype.split('/')[1];

    // Validate file content
    const contentValidation = await fileProcessingService.validateFile(filePath, fileType, entityType);
    if (!contentValidation.isValid) {
      return apiResponseHandler.error(res, contentValidation.errors.join(', '), 400);
    }

    // Add to job queue for processing
    const job = await jobQueueManager.addJob('fileProcessingQueue', 'bulk_import', {
      filePath,
      fileType,
      metadata: { entityType, universityId, userId }
    });

    apiResponseHandler.success(res, {
      message: 'File uploaded successfully. Processing started.',
      jobId: job.id,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    apiResponseHandler.error(res, 'File upload failed: ' + error.message, 500);
  }
});

// Bulk export endpoint
router.post('/export', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const { entityType, format = 'csv', filters = {} } = req.body;
    const userId = req.user.id;
    const universityId = req.user.university_id;

    // Validate user access
    const accessValidation = await rulesEngine.validateBusinessRule('user_access', {
      userId,
      resource: 'exports',
      action: 'create'
    }, { universityId });

    if (!accessValidation.isValid) {
      return apiResponseHandler.error(res, accessValidation.errors.join(', '), 403);
    }

    // Generate export data based on entity type
    let exportData;
    const fileName = `${entityType}_export_${Date.now()}`;

    switch (entityType) {
      case 'students':
        const accountService = require('../services/accountService');
        exportData = await accountService.getStudentsForExport(universityId, filters);
        break;
      case 'lecturers':
        const accountService2 = require('../services/accountService');
        exportData = await accountService2.getLecturersForExport(universityId, filters);
        break;
      case 'courses':
        const academicService = require('../services/academicService');
        exportData = await academicService.getCoursesForExport(universityId, filters);
        break;
      case 'results':
        const resultService = require('../services/resultService');
        exportData = await resultService.getResultsForExport(universityId, filters);
        break;
      default:
        return apiResponseHandler.error(res, 'Invalid entity type for export', 400);
    }

    // Add to job queue for processing
    const job = await jobQueueManager.addJob('fileProcessingQueue', 'export_data', {
      data: exportData,
      format,
      fileName,
      metadata: { entityType, universityId, userId }
    });

    apiResponseHandler.success(res, {
      message: 'Export job queued successfully',
      jobId: job.id,
      entityType,
      format,
      estimatedRecords: exportData.length
    });

  } catch (error) {
    apiResponseHandler.error(res, 'Export failed: ' + error.message, 500);
  }
});

// Get job status
router.get('/job/:jobId', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    // Get job status from all queues
    const queues = ['resultProcessingQueue', 'fileProcessingQueue'];
    let jobStatus = null;

    for (const queueName of queues) {
      try {
        const queue = jobQueueManager.queues[queueName];
        const job = await queue.getJob(jobId);
        if (job) {
          jobStatus = {
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress,
            attemptsMade: job.attemptsMade,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue,
            state: await job.getState()
          };
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!jobStatus) {
      return apiResponseHandler.error(res, 'Job not found', 404);
    }

    apiResponseHandler.success(res, jobStatus);

  } catch (error) {
    apiResponseHandler.error(res, 'Failed to get job status: ' + error.message, 500);
  }
});

// Get queue statistics
router.get('/queues/stats', authorizeRoles('admin'), async (req, res) => {
  try {
    const stats = await jobQueueManager.getAllQueueStats();
    apiResponseHandler.success(res, stats);
  } catch (error) {
    apiResponseHandler.error(res, 'Failed to get queue stats: ' + error.message, 500);
  }
});

// Retry failed job
router.post('/job/:jobId/retry', authorizeRoles('admin'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { queueName } = req.body;

    await jobQueueManager.retryJob(queueName, jobId);
    apiResponseHandler.success(res, { message: 'Job retry initiated' });

  } catch (error) {
    apiResponseHandler.error(res, 'Failed to retry job: ' + error.message, 500);
  }
});

// Clean old files
router.post('/cleanup', authorizeRoles('admin'), async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

    await fileProcessingService.cleanupOldFiles(daysOld);
    apiResponseHandler.success(res, { message: 'Cleanup completed' });

  } catch (error) {
    apiResponseHandler.error(res, 'Cleanup failed: ' + error.message, 500);
  }
});

module.exports = router;