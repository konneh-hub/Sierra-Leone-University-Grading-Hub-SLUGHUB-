const multer = require('multer');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../gateway/apiGateway');
const jobQueueManager = require('../jobs/jobQueueManager');

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    // Ensure upload directory exists
    require('fs').mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV, Excel, and PDF files are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

class FileProcessingService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.processedDir = path.join(__dirname, '../../processed');
    this.exportsDir = path.join(__dirname, '../../exports');

    // Ensure directories exist
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [this.uploadDir, this.processedDir, this.exportsDir];
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        logger.error(`Failed to create directory: ${dir}`, { error: error.message });
      }
    }
  }

  // File upload handler
  getUploadMiddleware(fields = []) {
    if (fields.length === 0) {
      return upload.single('file');
    }
    return upload.fields(fields);
  }

  // CSV Parser
  async parseCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      const errors = [];

      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            // Basic validation and cleaning
            const cleanedData = this.cleanCSVRow(data);
            results.push(cleanedData);
          } catch (error) {
            errors.push({ row: results.length + 1, error: error.message, data });
          }
        })
        .on('end', () => {
          resolve({ data: results, errors });
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Excel Parser
  async parseExcel(filePath, sheetName = null) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      const results = {};
      const errors = {};

      for (const name of sheetNames) {
        if (sheetName && name !== sheetName) continue;

        const worksheet = workbook.Sheets[name];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Clean and validate data
        const cleanedData = [];
        const sheetErrors = [];

        jsonData.forEach((row, index) => {
          try {
            const cleanedRow = this.cleanExcelRow(row);
            cleanedData.push(cleanedRow);
          } catch (error) {
            sheetErrors.push({ row: index + 1, error: error.message, data: row });
          }
        });

        results[name] = cleanedData;
        if (sheetErrors.length > 0) {
          errors[name] = sheetErrors;
        }
      }

      return { data: results, errors };
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }

  // Clean CSV row data
  cleanCSVRow(row) {
    const cleaned = {};

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      const cleanValue = typeof value === 'string' ? value.trim() : value;

      // Basic data type conversion
      if (cleanValue === '') {
        cleaned[cleanKey] = null;
      } else if (!isNaN(cleanValue) && cleanValue !== '') {
        cleaned[cleanKey] = Number(cleanValue);
      } else if (cleanValue.toLowerCase() === 'true') {
        cleaned[cleanKey] = true;
      } else if (cleanValue.toLowerCase() === 'false') {
        cleaned[cleanKey] = false;
      } else {
        cleaned[cleanKey] = cleanValue;
      }
    }

    return cleaned;
  }

  // Clean Excel row data
  cleanExcelRow(row) {
    return this.cleanCSVRow(row);
  }

  // File validation engine
  async validateFile(filePath, fileType, entityType) {
    try {
      const stats = await fs.stat(filePath);
      const errors = [];

      // File size validation
      if (stats.size > 10 * 1024 * 1024) { // 10MB
        errors.push('File size exceeds 10MB limit');
      }

      // File type specific validation
      if (fileType === 'csv') {
        const result = await this.parseCSV(filePath);
        errors.push(...this.validateCSVData(result.data, entityType));
      } else if (fileType === 'excel') {
        const result = await this.parseExcel(filePath);
        for (const [sheetName, data] of Object.entries(result.data)) {
          errors.push(...this.validateExcelData(data, entityType, sheetName));
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        fileInfo: {
          size: stats.size,
          type: fileType,
          entityType
        }
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`File validation failed: ${error.message}`],
        fileInfo: null
      };
    }
  }

  // Validate CSV data based on entity type
  validateCSVData(data, entityType) {
    const errors = [];

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('CSV file is empty or invalid');
      return errors;
    }

    // Entity-specific validation
    switch (entityType) {
      case 'students':
        return this.validateStudentData(data);
      case 'lecturers':
        return this.validateLecturerData(data);
      case 'courses':
        return this.validateCourseData(data);
      case 'results':
        return this.validateResultData(data);
      default:
        errors.push(`Unknown entity type: ${entityType}`);
    }

    return errors;
  }

  // Validate Excel data
  validateExcelData(data, entityType, sheetName) {
    return this.validateCSVData(data, entityType);
  }

  // Student data validation
  validateStudentData(data) {
    const errors = [];
    const requiredFields = ['email', 'first_name', 'last_name', 'gender'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because of header and 0-based index

      // Check required fields
      for (const field of requiredFields) {
        if (!row[field]) {
          errors.push(`Row ${rowNum}: Missing required field '${field}'`);
        }
      }

      // Email validation
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${rowNum}: Invalid email format`);
      }

      // Gender validation
      if (row.gender && !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
        errors.push(`Row ${rowNum}: Gender must be male, female, or other`);
      }
    });

    return errors;
  }

  // Lecturer data validation
  validateLecturerData(data) {
    const errors = [];
    const requiredFields = ['email', 'first_name', 'last_name', 'gender', 'staff_number'];

    data.forEach((row, index) => {
      const rowNum = index + 2;

      for (const field of requiredFields) {
        if (!row[field]) {
          errors.push(`Row ${rowNum}: Missing required field '${field}'`);
        }
      }

      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push(`Row ${rowNum}: Invalid email format`);
      }
    });

    return errors;
  }

  // Course data validation
  validateCourseData(data) {
    const errors = [];
    const requiredFields = ['code', 'title', 'credit_unit'];

    data.forEach((row, index) => {
      const rowNum = index + 2;

      for (const field of requiredFields) {
        if (!row[field]) {
          errors.push(`Row ${rowNum}: Missing required field '${field}'`);
        }
      }

      if (row.credit_unit && (row.credit_unit < 1 || row.credit_unit > 6)) {
        errors.push(`Row ${rowNum}: Credit unit must be between 1 and 6`);
      }
    });

    return errors;
  }

  // Result data validation
  validateResultData(data) {
    const errors = [];
    const requiredFields = ['student_id', 'course_id', 'score'];

    data.forEach((row, index) => {
      const rowNum = index + 2;

      for (const field of requiredFields) {
        if (!row[field]) {
          errors.push(`Row ${rowNum}: Missing required field '${field}'`);
        }
      }

      if (row.score && (row.score < 0 || row.score > 100)) {
        errors.push(`Row ${rowNum}: Score must be between 0 and 100`);
      }
    });

    return errors;
  }

  // Process bulk import (async job)
  async processBulkImport(filePath, fileType, metadata) {
    try {
      logger.info('Starting bulk import processing', { filePath, fileType, metadata });

      // Parse file
      let parsedData;
      if (fileType === 'csv') {
        const result = await this.parseCSV(filePath);
        parsedData = result.data;
      } else if (fileType === 'excel') {
        const result = await this.parseExcel(filePath);
        // Use first sheet for single entity imports
        const sheetNames = Object.keys(result.data);
        parsedData = result.data[sheetNames[0]] || [];
      }

      // Import data based on entity type
      const { entityType, universityId, userId } = metadata;
      let importedCount = 0;
      let errors = [];

      switch (entityType) {
        case 'students':
          ({ importedCount, errors } = await this.importStudents(parsedData, universityId, userId));
          break;
        case 'lecturers':
          ({ importedCount, errors } = await this.importLecturers(parsedData, universityId, userId));
          break;
        case 'courses':
          ({ importedCount, errors } = await this.importCourses(parsedData, universityId, userId));
          break;
        case 'results':
          ({ importedCount, errors } = await this.importResults(parsedData, universityId, userId));
          break;
        default:
          throw new Error(`Unsupported entity type: ${entityType}`);
      }

      // Move file to processed directory
      await this.moveFileToProcessed(filePath);

      // Log results
      logger.info('Bulk import completed', {
        entityType,
        importedCount,
        errorCount: errors.length,
        filePath
      });

      return { importedCount, errors };

    } catch (error) {
      logger.error('Bulk import failed', { filePath, error: error.message });
      throw error;
    }
  }

  // Import students
  async importStudents(studentData, universityId, userId) {
    const accountService = require('../services/accountService');
    const imported = [];
    const errors = [];

    for (const student of studentData) {
      try {
        const result = await accountService.createStudentAccount({
          creator: { university_id: universityId, id: userId },
          studentData: {
            ...student,
            university_id: universityId
          }
        });
        imported.push(result);
      } catch (error) {
        errors.push({ data: student, error: error.message });
      }
    }

    return { importedCount: imported.length, errors };
  }

  // Import lecturers
  async importLecturers(lecturerData, universityId, userId) {
    const accountService = require('../services/accountService');
    const imported = [];
    const errors = [];

    for (const lecturer of lecturerData) {
      try {
        const result = await accountService.createStaffAccount({
          creator: { university_id: universityId, id: userId },
          staffData: {
            ...lecturer,
            role: 'lecturer',
            university_id: universityId
          }
        });
        imported.push(result);
      } catch (error) {
        errors.push({ data: lecturer, error: error.message });
      }
    }

    return { importedCount: imported.length, errors };
  }

  // Import courses
  async importCourses(courseData, universityId, userId) {
    const academicService = require('../services/academicService');
    const imported = [];
    const errors = [];

    for (const course of courseData) {
      try {
        const result = await academicService.createCourse({
          creator: { university_id: universityId, id: userId },
          university_id: universityId,
          program_id: course.program_id,
          department_id: course.department_id,
          ...course
        });
        imported.push(result);
      } catch (error) {
        errors.push({ data: course, error: error.message });
      }
    }

    return { importedCount: imported.length, errors };
  }

  // Import results
  async importResults(resultData, universityId, userId) {
    const resultService = require('../services/resultService');
    const imported = [];
    const errors = [];

    for (const result of resultData) {
      try {
        const resultRecord = await resultService.submitResult({
          lecturer: { university_id: universityId, id: userId },
          resultData: result
        });
        imported.push(resultRecord);
      } catch (error) {
        errors.push({ data: result, error: error.message });
      }
    }

    return { importedCount: imported.length, errors };
  }

  // Move file to processed directory
  async moveFileToProcessed(filePath) {
    const fileName = path.basename(filePath);
    const processedPath = path.join(this.processedDir, fileName);

    await fs.rename(filePath, processedPath);
    return processedPath;
  }

  // Export data to file
  async exportToFile(data, format, fileName, options = {}) {
    const exportPath = path.join(this.exportsDir, fileName);

    try {
      if (format === 'csv') {
        await this.exportToCSV(data, exportPath, options);
      } else if (format === 'excel') {
        await this.exportToExcel(data, exportPath, options);
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }

      return exportPath;
    } catch (error) {
      logger.error('Export failed', { fileName, format, error: error.message });
      throw error;
    }
  }

  // Export to CSV
  async exportToCSV(data, filePath, options) {
    const { delimiter = ',', headers = true } = options;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    let csvContent = '';

    // Add headers
    if (headers) {
      csvContent += Object.keys(data[0]).join(delimiter) + '\n';
    }

    // Add data rows
    for (const row of data) {
      const values = Object.values(row).map(value => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains delimiter or quotes
        if (stringValue.includes(delimiter) || stringValue.includes('"')) {
          return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
      });
      csvContent += values.join(delimiter) + '\n';
    }

    await fs.writeFile(filePath, csvContent, 'utf8');
  }

  // Export to Excel
  async exportToExcel(data, filePath, options) {
    const { sheetName = 'Sheet1' } = options;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, filePath);
  }

  // Clean up old files
  async cleanupOldFiles(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    const dirs = [this.uploadDir, this.processedDir, this.exportsDir];

    for (const dir of dirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            logger.info('Cleaned up old file', { filePath });
          }
        }
      } catch (error) {
        logger.error('Cleanup failed for directory', { dir, error: error.message });
      }
    }
  }
}

module.exports = new FileProcessingService();
