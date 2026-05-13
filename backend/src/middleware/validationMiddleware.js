const rulesEngine = require('../rules/rulesEngine');
const { logger } = require('../gateway/apiGateway');

// Validation middleware that uses the rules engine
exports.validateBusinessRules = (ruleType, options = {}) => {
  return async (req, res, next) => {
    try {
      const context = {
        universityId: req.user?.university_id,
        userId: req.user?.id,
        ...options.context
      };

      const data = {
        ...req.body,
        ...req.params,
        ...req.query,
        ...options.data
      };

      // Validate using rules engine
      const validation = await rulesEngine.validateBusinessRule(ruleType, data, context);

      if (!validation.isValid) {
        logger.warn('Business rule validation failed', {
          ruleType,
          errors: validation.errors,
          userId: req.user?.id,
          universityId: req.user?.university_id
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Add validation result to request for further processing
      req.validationResult = validation;

      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        logger.info('Business rule validation warnings', {
          ruleType,
          warnings: validation.warnings,
          userId: req.user?.id
        });
      }

      next();
    } catch (error) {
      logger.error('Business rule validation error', {
        ruleType,
        error: error.message,
        userId: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Validation processing failed',
        error: error.message
      });
    }
  };
};

// Specific validation middleware for common use cases
exports.validateResultSubmission = exports.validateBusinessRules('result_submission');

exports.validateCourseRegistration = exports.validateBusinessRules('course_registration');

exports.validateSubscriptionLimits = exports.validateBusinessRules('subscription_limits');

exports.validateUserAccess = exports.validateBusinessRules('user_access');

exports.validateFileUpload = exports.validateBusinessRules('file_upload');

exports.validateBulkOperation = exports.validateBusinessRules('bulk_operation');

exports.validateReportGeneration = exports.validateBusinessRules('report_generation');

// Middleware to enforce business rules before service calls
exports.enforceBusinessRules = (ruleType, options = {}) => {
  return async (req, res, next) => {
    try {
      const context = {
        universityId: req.user?.university_id,
        userId: req.user?.id,
        ...options.context
      };

      const data = {
        ...req.body,
        ...req.params,
        ...req.query,
        ...options.data
      };

      // Validate and enforce rules
      const validation = await rulesEngine.validateBusinessRule(ruleType, data, context);

      if (!validation.isValid) {
        logger.warn('Business rule enforcement failed', {
          ruleType,
          errors: validation.errors,
          userId: req.user?.id
        });

        return res.status(403).json({
          success: false,
          message: 'Business rule violation',
          errors: validation.errors
        });
      }

      // Store validation result
      req.businessRuleValidation = validation;

      next();
    } catch (error) {
      logger.error('Business rule enforcement error', {
        ruleType,
        error: error.message,
        userId: req.user?.id
      });

      return res.status(500).json({
        success: false,
        message: 'Business rule enforcement failed',
        error: error.message
      });
    }
  };
};</content>
<parameter name="filePath">c:\Users\DELL\Desktop\RESULT APP\backend\src\middleware\validationMiddleware.js