const { logger } = require('../gateway/apiGateway');

class RulesEngine {
  constructor() {
    this.businessRules = {
      academic: {
        maxCoursesPerSemester: 6,
        minCreditUnitsPerSemester: 12,
        maxCreditUnitsPerSemester: 24,
        passingGradeThreshold: 40,
        gradeScale: {
          'A': { min: 70, max: 100, points: 5.0 },
          'B': { min: 60, max: 69, points: 4.0 },
          'C': { min: 50, max: 59, points: 3.0 },
          'D': { min: 45, max: 49, points: 2.0 },
          'E': { min: 40, max: 44, points: 1.0 },
          'F': { min: 0, max: 39, points: 0.0 }
        },
        maxRetakeAttempts: 3,
        resultSubmissionDeadline: 30, // days after semester end
        minimumGPAForGraduation: 1.0
      },
      subscription: {
        free: {
          maxStudents: 100,
          maxLecturers: 10,
          maxStorageGB: 1,
          features: ['basic_results', 'basic_reports']
        },
        basic: {
          maxStudents: 1000,
          maxLecturers: 50,
          maxStorageGB: 10,
          features: ['basic_results', 'basic_reports', 'file_upload', 'email_notifications']
        },
        premium: {
          maxStudents: 5000,
          maxLecturers: 200,
          maxStorageGB: 50,
          features: ['all_basic', 'advanced_reports', 'api_access', 'priority_support', 'bulk_operations']
        },
        enterprise: {
          maxStudents: -1, // unlimited
          maxLecturers: -1,
          maxStorageGB: 500,
          features: ['all_premium', 'custom_integrations', 'dedicated_support', 'white_labeling']
        }
      },
      system: {
        maxFileSizeMB: 10,
        allowedFileTypes: ['csv', 'xlsx', 'pdf'],
        maxBulkImportRecords: 10000,
        sessionTimeoutMinutes: 60,
        maxLoginAttempts: 5,
        passwordMinLength: 8,
        rateLimits: {
          api: { windowMs: 15 * 60 * 1000, max: 100 }, // 15 minutes, 100 requests
          auth: { windowMs: 15 * 60 * 1000, max: 5 },   // 15 minutes, 5 login attempts
          fileUpload: { windowMs: 60 * 60 * 1000, max: 10 } // 1 hour, 10 uploads
        }
      }
    };
  }

  // Business Rule Engine
  async validateBusinessRule(ruleType, data, context = {}) {
    try {
      logger.info('Validating business rule', { ruleType, context: Object.keys(context) });

      switch (ruleType) {
        case 'result_submission':
          return await this.validateResultSubmission(data, context);
        case 'course_registration':
          return await this.validateCourseRegistration(data, context);
        case 'subscription_limits':
          return await this.validateSubscriptionLimits(data, context);
        case 'user_access':
          return await this.validateUserAccess(data, context);
        case 'file_upload':
          return await this.validateFileUpload(data, context);
        case 'bulk_operation':
          return await this.validateBulkOperation(data, context);
        case 'report_generation':
          return await this.validateReportGeneration(data, context);
        default:
          throw new Error(`Unknown business rule type: ${ruleType}`);
      }
    } catch (error) {
      logger.error('Business rule validation failed', {
        ruleType,
        error: error.message,
        data: JSON.stringify(data).substring(0, 200)
      });
      throw error;
    }
  }

  // Validate result submission
  async validateResultSubmission(resultData, context) {
    const errors = [];
    const warnings = [];

    const { score, courseId, studentId, lecturerId, semesterId } = resultData;
    const { universityId } = context;

    // Basic validation
    if (!score || score < 0 || score > 100) {
      errors.push('Score must be between 0 and 100');
    }

    if (!courseId || !studentId || !lecturerId) {
      errors.push('Course, student, and lecturer are required');
    }

    // Check if lecturer teaches the course
    if (courseId && lecturerId) {
      const academicService = require('../services/academicService');
      const canTeach = await academicService.canLecturerTeachCourse(lecturerId, courseId, universityId);
      if (!canTeach) {
        errors.push('Lecturer is not assigned to teach this course');
      }
    }

    // Check if student is enrolled in the course
    if (courseId && studentId) {
      const academicService = require('../services/academicService');
      const isEnrolled = await academicService.isStudentEnrolledInCourse(studentId, courseId, semesterId);
      if (!isEnrolled) {
        errors.push('Student is not enrolled in this course for the semester');
      }
    }

    // Check submission deadline
    if (semesterId) {
      const academicService = require('../services/academicService');
      const semester = await academicService.getSemester(semesterId);
      if (semester && semester.end_date) {
        const deadline = new Date(semester.end_date);
        deadline.setDate(deadline.getDate() + this.businessRules.academic.resultSubmissionDeadline);

        if (new Date() > deadline) {
          warnings.push('Result submission is past the recommended deadline');
        }
      }
    }

    // Check for existing result
    if (courseId && studentId && semesterId) {
      const resultService = require('../services/resultService');
      const existingResult = await resultService.getResultByStudentCourseSemester(studentId, courseId, semesterId);
      if (existingResult) {
        warnings.push('A result already exists for this student-course-semester combination');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate course registration
  async validateCourseRegistration(registrationData, context) {
    const errors = [];
    const warnings = [];

    const { studentId, courseIds, semesterId } = registrationData;
    const { universityId } = context;

    if (!studentId || !courseIds || !Array.isArray(courseIds)) {
      errors.push('Student ID and course IDs array are required');
      return { isValid: false, errors, warnings };
    }

    // Check course limit
    if (courseIds.length > this.businessRules.academic.maxCoursesPerSemester) {
      errors.push(`Cannot register for more than ${this.businessRules.academic.maxCoursesPerSemester} courses per semester`);
    }

    // Calculate total credit units
    const academicService = require('../services/academicService');
    let totalCredits = 0;

    for (const courseId of courseIds) {
      const course = await academicService.getCourse(courseId);
      if (!course) {
        errors.push(`Course ${courseId} does not exist`);
        continue;
      }

      totalCredits += course.credit_unit || 0;

      // Check prerequisites
      if (course.prerequisites && course.prerequisites.length > 0) {
        for (const prereqId of course.prerequisites) {
          const hasCompleted = await academicService.hasStudentCompletedCourse(studentId, prereqId);
          if (!hasCompleted) {
            errors.push(`Prerequisite course ${prereqId} not completed for ${course.code}`);
          }
        }
      }
    }

    // Check credit unit limits
    if (totalCredits < this.businessRules.academic.minCreditUnitsPerSemester) {
      warnings.push(`Total credit units (${totalCredits}) is below minimum (${this.businessRules.academic.minCreditUnitsPerSemester})`);
    }

    if (totalCredits > this.businessRules.academic.maxCreditUnitsPerSemester) {
      errors.push(`Total credit units (${totalCredits}) exceeds maximum (${this.businessRules.academic.maxCreditUnitsPerSemester})`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate subscription limits
  async validateSubscriptionLimits(data, context) {
    const errors = [];
    const warnings = [];

    const { universityId, operation } = context;
    const billingService = require('../services/billingService');

    const subscription = await billingService.getUniversitySubscription(universityId);
    if (!subscription) {
      errors.push('No active subscription found');
      return { isValid: false, errors, warnings };
    }

    const planLimits = this.businessRules.subscription[subscription.plan_name.toLowerCase()];
    if (!planLimits) {
      errors.push('Invalid subscription plan');
      return { isValid: false, errors, warnings };
    }

    // Check limits based on operation
    switch (operation) {
      case 'create_student':
        const studentCount = await billingService.getUniversityStudentCount(universityId);
        if (planLimits.maxStudents !== -1 && studentCount >= planLimits.maxStudents) {
          errors.push(`Student limit (${planLimits.maxStudents}) reached for ${subscription.plan_name} plan`);
        }
        break;

      case 'create_lecturer':
        const lecturerCount = await billingService.getUniversityLecturerCount(universityId);
        if (planLimits.maxLecturers !== -1 && lecturerCount >= planLimits.maxLecturers) {
          errors.push(`Lecturer limit (${planLimits.maxLecturers}) reached for ${subscription.plan_name} plan`);
        }
        break;

      case 'file_upload':
        // Storage limit check would be implemented here
        break;

      case 'bulk_import':
        if (!planLimits.features.includes('bulk_operations')) {
          errors.push('Bulk operations not available in current plan');
        }
        break;
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate user access
  async validateUserAccess(data, context) {
    const errors = [];
    const warnings = [];

    const { userId, resource, action } = data;
    const { universityId } = context;

    const accountService = require('../services/accountService');
    const user = await accountService.getUserById(userId);

    if (!user) {
      errors.push('User not found');
      return { isValid: false, errors, warnings };
    }

    // Check if user belongs to the university
    if (user.university_id !== universityId) {
      errors.push('User does not belong to this university');
    }

    // Role-based access control
    const permissions = this.getRolePermissions(user.role);

    if (!permissions[resource] || !permissions[resource].includes(action)) {
      errors.push(`User role '${user.role}' does not have permission to ${action} ${resource}`);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate file upload
  async validateFileUpload(fileData, context) {
    const errors = [];
    const warnings = [];

    const { fileSize, fileType, entityType } = fileData;
    const { universityId } = context;

    // File size validation
    if (fileSize > this.businessRules.system.maxFileSizeMB * 1024 * 1024) {
      errors.push(`File size exceeds maximum limit of ${this.businessRules.system.maxFileSizeMB}MB`);
    }

    // File type validation
    if (!this.businessRules.system.allowedFileTypes.includes(fileType.toLowerCase())) {
      errors.push(`File type '${fileType}' is not allowed. Allowed types: ${this.businessRules.system.allowedFileTypes.join(', ')}`);
    }

    // Subscription-based validation
    const validation = await this.validateBusinessRule('subscription_limits', {}, {
      universityId,
      operation: 'file_upload'
    });

    if (!validation.isValid) {
      errors.push(...validation.errors);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate bulk operation
  async validateBulkOperation(operationData, context) {
    const errors = [];
    const warnings = [];

    const { recordCount, operationType } = operationData;
    const { universityId } = context;

    // Record count validation
    if (recordCount > this.businessRules.system.maxBulkImportRecords) {
      errors.push(`Bulk operation exceeds maximum record limit of ${this.businessRules.system.maxBulkImportRecords}`);
    }

    // Subscription validation
    const validation = await this.validateBusinessRule('subscription_limits', {}, {
      universityId,
      operation: 'bulk_import'
    });

    if (!validation.isValid) {
      errors.push(...validation.errors);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Validate report generation
  async validateReportGeneration(reportData, context) {
    const errors = [];
    const warnings = [];

    const { reportType, filters } = reportData;
    const { universityId, userId } = context;

    // Check user permissions for report type
    const accountService = require('../services/accountService');
    const user = await accountService.getUserById(userId);

    const reportPermissions = {
      student_results: ['student', 'lecturer', 'admin'],
      course_performance: ['lecturer', 'admin'],
      department_summary: ['admin'],
      academic_year_summary: ['admin'],
      billing_summary: ['admin'],
      system_usage: ['admin']
    };

    if (!reportPermissions[reportType] || !reportPermissions[reportType].includes(user.role)) {
      errors.push(`User role '${user.role}' cannot generate ${reportType} reports`);
    }

    // Validate filters based on user role
    if (user.role === 'lecturer' && filters.universityId && filters.universityId !== universityId) {
      errors.push('Lecturers can only generate reports for their own university');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  // Academic Rule Validator
  async validateAcademicRule(ruleName, data) {
    const errors = [];

    switch (ruleName) {
      case 'grade_calculation':
        return this.validateGradeCalculation(data);
      case 'gpa_calculation':
        return this.validateGPACalculation(data);
      case 'graduation_eligibility':
        return this.validateGraduationEligibility(data);
      case 'retake_policy':
        return this.validateRetakePolicy(data);
      default:
        errors.push(`Unknown academic rule: ${ruleName}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate grade calculation
  validateGradeCalculation(data) {
    const errors = [];
    const { score } = data;

    if (typeof score !== 'number' || score < 0 || score > 100) {
      errors.push('Score must be a number between 0 and 100');
      return { isValid: false, errors };
    }

    let grade = 'F';
    let gradePoint = 0;

    for (const [gradeLetter, range] of Object.entries(this.businessRules.academic.gradeScale)) {
      if (score >= range.min && score <= range.max) {
        grade = gradeLetter;
        gradePoint = range.points;
        break;
      }
    }

    return {
      isValid: true,
      errors: [],
      result: { grade, gradePoint, passed: grade !== 'F' }
    };
  }

  // Validate GPA calculation
  validateGPACalculation(data) {
    const errors = [];
    const { results } = data;

    if (!Array.isArray(results) || results.length === 0) {
      errors.push('Results array is required for GPA calculation');
      return { isValid: false, errors };
    }

    let totalPoints = 0;
    let totalCredits = 0;

    for (const result of results) {
      if (!result.grade_point || !result.credit_unit) {
        errors.push('Grade point and credit unit are required for each result');
        continue;
      }

      totalPoints += result.grade_point * result.credit_unit;
      totalCredits += result.credit_unit;
    }

    if (totalCredits === 0) {
      errors.push('Total credit units cannot be zero');
      return { isValid: false, errors };
    }

    const gpa = totalPoints / totalCredits;

    return {
      isValid: errors.length === 0,
      errors,
      result: { gpa: Math.round(gpa * 100) / 100, totalCredits }
    };
  }

  // Validate graduation eligibility
  validateGraduationEligibility(data) {
    const errors = [];
    const warnings = [];
    const { studentId, programId } = data;

    // This would typically involve checking:
    // 1. Minimum GPA requirement
    // 2. Required courses completed
    // 3. Total credit units earned
    // 4. Any outstanding fees

    const minGPA = this.businessRules.academic.minimumGPAForGraduation;

    // Placeholder logic - would integrate with actual services
    const academicService = require('../services/academicService');

    return {
      isValid: true, // Would be determined by actual checks
      errors,
      warnings,
      result: { eligible: true, minGPA }
    };
  }

  // Validate retake policy
  validateRetakePolicy(data) {
    const errors = [];
    const { courseId, studentId, currentAttempts } = data;

    const maxAttempts = this.businessRules.academic.maxRetakeAttempts;

    if (currentAttempts >= maxAttempts) {
      errors.push(`Maximum retake attempts (${maxAttempts}) exceeded for this course`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      result: { allowed: errors.length === 0, remainingAttempts: maxAttempts - currentAttempts }
    };
  }

  // Subscription Rule Validator
  async validateSubscriptionRule(ruleName, data, context) {
    const errors = [];

    switch (ruleName) {
      case 'feature_access':
        return await this.validateFeatureAccess(data, context);
      case 'quota_check':
        return await this.validateQuotaCheck(data, context);
      case 'billing_cycle':
        return await this.validateBillingCycle(data, context);
      default:
        errors.push(`Unknown subscription rule: ${ruleName}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate feature access
  async validateFeatureAccess(data, context) {
    const errors = [];
    const { feature } = data;
    const { universityId } = context;

    const billingService = require('../services/billingService');
    const subscription = await billingService.getUniversitySubscription(universityId);

    if (!subscription) {
      errors.push('No active subscription found');
      return { isValid: false, errors };
    }

    const planFeatures = this.businessRules.subscription[subscription.plan_name.toLowerCase()]?.features || [];

    if (!planFeatures.includes(feature) && !planFeatures.includes('all_' + feature.split('_')[0])) {
      errors.push(`Feature '${feature}' is not available in ${subscription.plan_name} plan`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Validate quota check
  async validateQuotaCheck(data, context) {
    const errors = [];
    const { resourceType } = data;
    const { universityId } = context;

    const billingService = require('../services/billingService');
    const subscription = await billingService.getUniversitySubscription(universityId);

    if (!subscription) {
      errors.push('No active subscription found');
      return { isValid: false, errors };
    }

    const planLimits = this.businessRules.subscription[subscription.plan_name.toLowerCase()];

    // Check current usage against limits
    let currentUsage = 0;
    let limit = 0;

    switch (resourceType) {
      case 'students':
        currentUsage = await billingService.getUniversityStudentCount(universityId);
        limit = planLimits.maxStudents;
        break;
      case 'lecturers':
        currentUsage = await billingService.getUniversityLecturerCount(universityId);
        limit = planLimits.maxLecturers;
        break;
      case 'storage':
        currentUsage = await billingService.getUniversityStorageUsage(universityId);
        limit = planLimits.maxStorageGB * 1024 * 1024 * 1024; // Convert to bytes
        break;
    }

    if (limit !== -1 && currentUsage >= limit) {
      errors.push(`${resourceType} quota exceeded. Current: ${currentUsage}, Limit: ${limit}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      result: { currentUsage, limit, remaining: limit === -1 ? -1 : limit - currentUsage }
    };
  }

  // Validate billing cycle
  async validateBillingCycle(data, context) {
    const errors = [];
    const { universityId } = context;

    const billingService = require('../services/billingService');
    const subscription = await billingService.getUniversitySubscription(universityId);

    if (!subscription) {
      errors.push('No active subscription found');
      return { isValid: false, errors };
    }

    const now = new Date();
    const endDate = new Date(subscription.end_date);

    if (now > endDate) {
      errors.push('Subscription has expired');
    }

    return {
      isValid: errors.length === 0,
      errors,
      result: {
        daysRemaining: Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)),
        isExpired: now > endDate
      }
    };
  }

  // Get role permissions
  getRolePermissions(role) {
    const permissions = {
      admin: {
        universities: ['create', 'read', 'update', 'delete'],
        users: ['create', 'read', 'update', 'delete'],
        courses: ['create', 'read', 'update', 'delete'],
        results: ['create', 'read', 'update', 'delete'],
        reports: ['create', 'read', 'update', 'delete'],
        billing: ['create', 'read', 'update', 'delete'],
        system: ['read', 'update']
      },
      lecturer: {
        courses: ['read', 'update'],
        results: ['create', 'read', 'update'],
        reports: ['create', 'read'],
        students: ['read']
      },
      student: {
        results: ['read'],
        courses: ['read'],
        profile: ['read', 'update']
      }
    };

    return permissions[role] || {};
  }

  // Update business rules (admin only)
  updateBusinessRules(category, rules) {
    if (this.businessRules[category]) {
      this.businessRules[category] = { ...this.businessRules[category], ...rules };
      logger.info('Business rules updated', { category, rules: Object.keys(rules) });
      return true;
    }
    return false;
  }

  // Get business rules
  getBusinessRules(category = null) {
    if (category) {
      return this.businessRules[category] || null;
    }
    return this.businessRules;
  }
}

module.exports = new RulesEngine();
