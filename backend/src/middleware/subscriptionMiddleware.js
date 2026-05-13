const billingService = require('../services/billingService');
const AppError = require('../utils/appError');

// Middleware to check subscription status and enforce limits
const checkSubscriptionMiddleware = async (req, res, next) => {
  try {
    // Get user from request (set by authMiddleware)
    const user = req.user;
    if (!user || !user.university_id) {
      return next(new AppError('User not authenticated or not associated with a university', 401));
    }

    const universityId = user.university_id;

    // Check subscription status
    const subscriptionStatus = await billingService.checkSubscriptionStatus(universityId);

    // Block if subscription is not active
    if (subscriptionStatus.status !== 'active' && subscriptionStatus.status !== 'trial') {
      return next(new AppError(
        `Subscription is ${subscriptionStatus.status}. ${subscriptionStatus.details}`,
        403
      ));
    }

    // Determine resource type from URL and method
    let resourceType = null;
    const url = req.originalUrl.toLowerCase();
    const method = req.method;

    if (url.includes('/students') && (method === 'POST' || method === 'PUT')) {
      resourceType = 'student';
    } else if (url.includes('/lecturers') && (method === 'POST' || method === 'PUT')) {
      resourceType = 'lecturer';
    } else if (url.includes('/courses') && (method === 'POST' || method === 'PUT')) {
      resourceType = 'course';
    } else if ((url.includes('/users') || url.includes('/staff')) && (method === 'POST' || method === 'PUT')) {
      // Check if it's an admin user creation
      if (req.body.role === 'university_admin' || req.body.role === 'exam_officer' ||
          req.body.role === 'dean' || req.body.role === 'hod') {
        resourceType = 'admin_user';
      }
    }

    // Enforce plan limits for resource creation
    if (resourceType) {
      await billingService.enforcePlanLimits(universityId, resourceType);
    }

    // Add subscription info to request for controllers to use
    req.subscription = subscriptionStatus;

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware to check specific feature access
const checkFeatureAccess = (featureName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user || !user.university_id) {
        return next(new AppError('User not authenticated or not associated with a university', 401));
      }

      const hasAccess = await billingService.checkFeatureAccess(user.university_id, featureName);
      if (!hasAccess) {
        return next(new AppError(`Feature '${featureName}' is not available in your current plan`, 403));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Middleware to track usage after successful operations
const trackUsage = (resourceType) => {
  return async (req, res, next) => {
    // Store original send method
    const originalSend = res.send;

    // Override send method to track usage after successful response
    res.send = function(data) {
      // Only track on successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const user = req.user;
        if (user && user.university_id) {
          // Track usage asynchronously (don't wait for it)
          billingService.trackUsage(user.university_id, resourceType).catch(err => {
            console.error('Failed to track usage:', err);
          });
        }
      }

      // Call original send method
      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  checkSubscriptionMiddleware,
  checkFeatureAccess,
  trackUsage,
};
