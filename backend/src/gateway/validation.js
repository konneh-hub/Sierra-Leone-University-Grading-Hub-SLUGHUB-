const { body, param, query, validationResult } = require('express-validator');
const { APIResponseHandler } = require('./apiGateway');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return APIResponseHandler.error(
      res,
      'Validation failed',
      400,
      errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    );
  }
  next();
};

// Auth validation rules
const authValidation = {
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    handleValidationErrors
  ],

  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
    body('first_name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters'),
    body('last_name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters'),
    body('gender')
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    handleValidationErrors
  ]
};

// University validation rules
const universityValidation = {
  createUniversity: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('University name must be between 2 and 100 characters'),
    body('code')
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('University code must be between 2 and 10 characters')
      .isAlphanumeric()
      .withMessage('University code must contain only letters and numbers'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address must not exceed 255 characters'),
    handleValidationErrors
  ],

  updateUniversity: [
    param('universityId')
      .isUUID()
      .withMessage('Valid university ID is required'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('University name must be between 2 and 100 characters'),
    body('address')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Address must not exceed 255 characters'),
    handleValidationErrors
  ]
};

// Academic validation rules
const academicValidation = {
  createFaculty: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Faculty name must be between 2 and 100 characters'),
    body('code')
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('Faculty code must be between 2 and 10 characters'),
    handleValidationErrors
  ],

  createDepartment: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Department name must be between 2 and 100 characters'),
    body('code')
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('Department code must be between 2 and 10 characters'),
    param('facultyId')
      .isUUID()
      .withMessage('Valid faculty ID is required'),
    handleValidationErrors
  ],

  createProgram: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Program name must be between 2 and 100 characters'),
    body('code')
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('Program code must be between 2 and 10 characters'),
    body('program_type')
      .isIn(['certificate', 'diploma', 'degree', 'postgraduate', 'master', 'phd'])
      .withMessage('Invalid program type'),
    body('duration_years')
      .isInt({ min: 1, max: 7 })
      .withMessage('Duration must be between 1 and 7 years'),
    param('departmentId')
      .isUUID()
      .withMessage('Valid department ID is required'),
    handleValidationErrors
  ],

  createCourse: [
    body('title')
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Course title must be between 2 and 200 characters'),
    body('code')
      .trim()
      .isLength({ min: 2, max: 20 })
      .withMessage('Course code must be between 2 and 20 characters'),
    body('credit_unit')
      .isInt({ min: 1, max: 6 })
      .withMessage('Credit unit must be between 1 and 6'),
    param('programId')
      .isUUID()
      .withMessage('Valid program ID is required'),
    param('departmentId')
      .isUUID()
      .withMessage('Valid department ID is required'),
    handleValidationErrors
  ]
};

// Result validation rules
const resultValidation = {
  submitResult: [
    body('student_id')
      .isUUID()
      .withMessage('Valid student ID is required'),
    body('course_id')
      .isUUID()
      .withMessage('Valid course ID is required'),
    body('score')
      .isFloat({ min: 0, max: 100 })
      .withMessage('Score must be between 0 and 100'),
    body('grade')
      .optional()
      .isString()
      .isLength({ max: 2 })
      .withMessage('Grade must be a valid letter grade'),
    handleValidationErrors
  ],

  reviewResult: [
    param('resultId')
      .isUUID()
      .withMessage('Valid result ID is required'),
    body('status')
      .isIn(['approved', 'rejected', 'revision_required'])
      .withMessage('Invalid review status'),
    body('comments')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Comments must not exceed 500 characters'),
    handleValidationErrors
  ]
};

// Billing validation rules
const billingValidation = {
  createPlan: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Plan name must be between 2 and 100 characters'),
    body('billing_cycle')
      .isIn(['monthly', 'yearly'])
      .withMessage('Billing cycle must be monthly or yearly'),
    body('price_monthly')
      .isFloat({ min: 0 })
      .withMessage('Monthly price must be a positive number'),
    body('price_yearly')
      .isFloat({ min: 0 })
      .withMessage('Yearly price must be a positive number'),
    handleValidationErrors
  ],

  createPayment: [
    body('universityId')
      .isUUID()
      .withMessage('Valid university ID is required'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0'),
    body('paymentMethod')
      .isIn(['card', 'bank_transfer', 'mobile_money'])
      .withMessage('Invalid payment method'),
    handleValidationErrors
  ]
};

// Report validation rules
const reportValidation = {
  generateReport: [
    body('reportType')
      .isIn(['student_performance', 'department_performance', 'faculty_summary', 'university_analytics', 'result_statistics', 'gpa_report', 'billing_report'])
      .withMessage('Invalid report type'),
    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),
    body('format')
      .isIn(['pdf', 'excel', 'json'])
      .withMessage('Format must be pdf, excel, or json'),
    handleValidationErrors
  ]
};

// File upload validation
const fileValidation = {
  bulkUpload: [
    body('entityType')
      .isIn(['students', 'lecturers', 'courses', 'results'])
      .withMessage('Invalid entity type for bulk upload'),
    // File validation is handled by multer middleware
    handleValidationErrors
  ]
};

module.exports = {
  authValidation,
  universityValidation,
  academicValidation,
  resultValidation,
  billingValidation,
  reportValidation,
  fileValidation,
  handleValidationErrors
};
