const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const reportingService = require('../reporting/reportingService');
const rulesEngine = require('../rules/rulesEngine');
const jobQueueManager = require('../jobs/jobQueueManager');
const { APIResponseHandler: apiResponseHandler } = require('../gateway/apiGateway');

// Apply authentication to all routes
router.use(authenticate);

// Generate report endpoint
router.post('/generate', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const { reportType, filters = {}, format = 'pdf' } = req.body;
    const userId = req.user.id;
    const universityId = req.user.university_id;

    // Validate report generation
    const reportValidation = await rulesEngine.validateBusinessRule('report_generation', {
      reportType,
      filters
    }, { universityId, userId });

    if (!reportValidation.isValid) {
      return apiResponseHandler.error(res, reportValidation.errors.join(', '), 403);
    }

    // Add to job queue for processing
    const job = await jobQueueManager.addJob('reportGenerationQueue', 'generate_report', {
      reportType,
      filters: { ...filters, universityId },
      format,
      userId
    });

    apiResponseHandler.success(res, {
      message: 'Report generation started',
      jobId: job.id,
      reportType,
      format
    });

  } catch (error) {
    apiResponseHandler.error(res, 'Report generation failed: ' + error.message, 500);
  }
});

// Get report job status
router.get('/job/:jobId', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const { jobId } = req.params;

    const queue = jobQueueManager.queues.reportGenerationQueue;
    const job = await queue.getJob(jobId);

    if (!job) {
      return apiResponseHandler.error(res, 'Report job not found', 404);
    }

    const state = await job.getState();
    const result = {
      id: job.id,
      name: job.name,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      state
    };

    // If completed, include download URL
    if (state === 'completed' && job.returnvalue) {
      result.downloadUrl = `/api/reports/download/${job.returnvalue.fileName}`;
      result.fileName = job.returnvalue.fileName;
      result.recordCount = job.returnvalue.recordCount;
    }

    apiResponseHandler.success(res, result);

  } catch (error) {
    apiResponseHandler.error(res, 'Failed to get report status: ' + error.message, 500);
  }
});

// Download report file
router.get('/download/:fileName', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const { fileName } = req.params;
    const userId = req.user.id;

    // Security check: ensure user can access this report
    // This would typically involve checking if the user generated the report
    // or if they have permission to access it

    const filePath = path.join(reportingService.reportsDir, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return apiResponseHandler.error(res, 'Report file not found', 404);
    }

    // Set appropriate headers based on file type
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';

    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    apiResponseHandler.error(res, 'Download failed: ' + error.message, 500);
  }
});

// Get available report types
router.get('/types', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const userRole = req.user.role;
    const universityId = req.user.university_id;

    const reportTypes = {
      student_results: {
        name: 'Student Results Report',
        description: 'Detailed results for students with grades and GPA',
        roles: ['admin', 'lecturer'],
        formats: ['pdf', 'excel']
      },
      course_performance: {
        name: 'Course Performance Report',
        description: 'Performance analysis for courses including statistics',
        roles: ['admin', 'lecturer'],
        formats: ['pdf', 'excel']
      },
      department_summary: {
        name: 'Department Summary Report',
        description: 'Summary of department performance and statistics',
        roles: ['admin'],
        formats: ['pdf', 'excel']
      },
      academic_year_summary: {
        name: 'Academic Year Summary',
        description: 'Comprehensive summary of academic year performance',
        roles: ['admin'],
        formats: ['pdf', 'excel']
      },
      billing_summary: {
        name: 'Billing Summary Report',
        description: 'Billing and subscription summary',
        roles: ['admin'],
        formats: ['pdf', 'excel']
      },
      system_usage: {
        name: 'System Usage Report',
        description: 'System usage statistics and analytics',
        roles: ['admin'],
        formats: ['pdf', 'excel']
      }
    };

    // Filter based on user role
    const availableReports = Object.entries(reportTypes)
      .filter(([key, config]) => config.roles.includes(userRole))
      .reduce((acc, [key, config]) => {
        acc[key] = config;
        return acc;
      }, {});

    apiResponseHandler.success(res, availableReports);

  } catch (error) {
    apiResponseHandler.error(res, 'Failed to get report types: ' + error.message, 500);
  }
});

// Get user's recent reports
router.get('/recent', authorizeRoles('admin', 'lecturer'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const queue = jobQueueManager.queues.reportGenerationQueue;

    // Get completed jobs for this user (this is a simplified version)
    // In a real implementation, you'd want to store report metadata in a database
    const jobs = await queue.getJobs(['completed'], 0, limit);

    const recentReports = jobs
      .filter(job => job.data.userId === userId)
      .map(job => ({
        jobId: job.id,
        reportType: job.data.reportType,
        format: job.data.format,
        completedAt: job.finishedOn,
        fileName: job.returnvalue?.fileName,
        recordCount: job.returnvalue?.recordCount,
        downloadUrl: job.returnvalue?.fileName ? `/api/reports/download/${job.returnvalue.fileName}` : null
      }));

    apiResponseHandler.success(res, recentReports);

  } catch (error) {
    apiResponseHandler.error(res, 'Failed to get recent reports: ' + error.message, 500);
  }
});

// Clean old reports
router.post('/cleanup', authorizeRoles('admin'), async (req, res) => {
  try {
    const { daysOld = 30 } = req.body;

    await reportingService.cleanupOldReports(daysOld);
    apiResponseHandler.success(res, { message: 'Report cleanup completed' });

  } catch (error) {
    apiResponseHandler.error(res, 'Report cleanup failed: ' + error.message, 500);
  }
});

module.exports = router;