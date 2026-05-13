const express = require('express');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/api-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Rate limiting configurations
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      data: null,
      meta: { retryAfter: Math.ceil(windowMs / 1000) }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const userRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each user to 100 requests per windowMs
  'Too many requests from this user, please try again later.'
);

const universityRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  500, // limit each university to 500 requests per windowMs
  'Too many requests from this university, please try again later.'
);

// API Response Handler
class APIResponseHandler {
  static success(res, message = 'Success', data = null, meta = {}) {
    const response = {
      success: true,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    // Log successful responses
    logger.info('API Response', {
      status: 200,
      message,
      userId: res.locals?.user?.id,
      universityId: res.locals?.user?.university_id,
      path: res.req?.originalUrl,
      method: res.req?.method
    });

    return res.json(response);
  }

  static error(res, message = 'Error', statusCode = 500, data = null, meta = {}) {
    const response = {
      success: false,
      message,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };

    // Log error responses
    logger.error('API Error Response', {
      status: statusCode,
      message,
      userId: res.locals?.user?.id,
      universityId: res.locals?.user?.university_id,
      path: res.req?.originalUrl,
      method: res.req?.method,
      stack: res.locals?.error?.stack
    });

    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Created successfully', data = null, meta = {}) {
    return this.success(res, message, data, { ...meta, statusCode: 201 });
  }

  static noContent(res, message = 'No content', meta = {}) {
    return res.status(204).json({
      success: true,
      message,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    });
  }
}

// Request Logger Middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log incoming request
  logger.info('API Request', {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    universityId: req.user?.university_id,
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    query: JSON.stringify(req.query)
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('API Request Completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      universityId: req.user?.university_id
    });
  });

  next();
};

// Route Guard Middleware
const routeGuard = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return APIResponseHandler.error(res, 'Authentication required', 401);
      }

      // Check if user has required roles
      if (allowedRoles.length > 0) {
        const userRoles = req.user.roles || [];
        const hasRequiredRole = allowedRoles.some(role =>
          userRoles.includes(role) || req.user.is_system_admin
        );

        if (!hasRequiredRole) {
          return APIResponseHandler.error(res, 'Insufficient permissions', 403);
        }
      }

      // Check if user belongs to a university (except system admins)
      if (!req.user.is_system_admin && !req.user.university_id) {
        return APIResponseHandler.error(res, 'User not associated with a university', 403);
      }

      next();
    } catch (error) {
      logger.error('Route Guard Error', { error: error.message, stack: error.stack });
      return APIResponseHandler.error(res, 'Authorization error', 500);
    }
  };
};

// Global Error Handler
const globalErrorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Global Error Handler', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    universityId: req.user?.university_id,
    body: req.body,
    query: req.query
  });

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return APIResponseHandler.error(res, 'Validation error', 400, err.errors);
  }

  if (err.name === 'UnauthorizedError') {
    return APIResponseHandler.error(res, 'Unauthorized', 401);
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    return APIResponseHandler.error(res, 'Duplicate entry', 409);
  }

  if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    return APIResponseHandler.error(res, 'Invalid reference', 400);
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return APIResponseHandler.error(res, message, statusCode);
};

// API Gateway Router
const createAPIGateway = () => {
  const router = express.Router();

  // Apply global middleware
  router.use(requestLogger);

  // Apply rate limiting
  router.use('/auth', userRateLimit);
  router.use('/admin', universityRateLimit);
  router.use('/university', universityRateLimit);
  router.use('/academic', universityRateLimit);
  router.use('/results', universityRateLimit);
  router.use('/billing', universityRateLimit);
  router.use('/reports', universityRateLimit);

  // Health check endpoint
  router.get('/health', (req, res) => {
    APIResponseHandler.success(res, 'API Gateway is healthy', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: 'v1'
    });
  });

  return router;
};

module.exports = {
  APIResponseHandler,
  requestLogger,
  routeGuard,
  globalErrorHandler,
  createAPIGateway,
  logger,
  userRateLimit,
  universityRateLimit
};
