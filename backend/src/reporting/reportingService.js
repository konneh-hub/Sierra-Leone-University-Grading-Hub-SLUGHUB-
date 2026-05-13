const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const { logger } = require('../gateway/apiGateway');

class ReportingService {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create reports directory', { error: error.message });
    }
  }

  // Main report generation method
  async generateReport(reportType, filters, format, userId) {
    try {
      logger.info('Generating report', { reportType, format, userId, filters });

      let reportData;
      let fileName;

      // Generate report data based on type
      switch (reportType) {
        case 'student_results':
          reportData = await this.generateStudentResultsReport(filters);
          fileName = `student_results_${Date.now()}`;
          break;
        case 'course_performance':
          reportData = await this.generateCoursePerformanceReport(filters);
          fileName = `course_performance_${Date.now()}`;
          break;
        case 'department_summary':
          reportData = await this.generateDepartmentSummaryReport(filters);
          fileName = `department_summary_${Date.now()}`;
          break;
        case 'academic_year_summary':
          reportData = await this.generateAcademicYearSummaryReport(filters);
          fileName = `academic_year_summary_${Date.now()}`;
          break;
        case 'billing_summary':
          reportData = await this.generateBillingSummaryReport(filters);
          fileName = `billing_summary_${Date.now()}`;
          break;
        case 'system_usage':
          reportData = await this.generateSystemUsageReport(filters);
          fileName = `system_usage_${Date.now()}`;
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }

      // Generate file based on format
      let filePath;
      if (format === 'pdf') {
        filePath = await this.generatePDFReport(reportData, fileName, reportType);
      } else if (format === 'excel') {
        filePath = await this.generateExcelReport(reportData, fileName, reportType);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      // Log report generation
      logger.info('Report generated successfully', {
        reportType,
        format,
        filePath,
        userId,
        recordCount: reportData.length
      });

      return {
        filePath,
        fileName: path.basename(filePath),
        recordCount: reportData.length,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Report generation failed', {
        reportType,
        format,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // Generate student results report
  async generateStudentResultsReport(filters) {
    const resultService = require('../services/resultService');

    const { studentId, semesterId, courseId, universityId } = filters;

    let results;
    if (studentId) {
      results = await resultService.getStudentResults(studentId, { semesterId, universityId });
    } else if (courseId) {
      results = await resultService.getCourseResults(courseId, { semesterId, universityId });
    } else {
      // Get all results for university
      results = await resultService.getUniversityResults(universityId, { semesterId });
    }

    return results.map(result => ({
      student_id: result.student_id,
      student_name: `${result.student?.first_name} ${result.student?.last_name}`,
      course_code: result.course?.code,
      course_title: result.course?.title,
      semester: result.semester?.name,
      score: result.score,
      grade: result.grade,
      grade_point: result.grade_point,
      credit_unit: result.course?.credit_unit,
      lecturer: `${result.lecturer?.first_name} ${result.lecturer?.last_name}`,
      submitted_at: result.created_at
    }));
  }

  // Generate course performance report
  async generateCoursePerformanceReport(filters) {
    const resultService = require('../services/resultService');

    const { courseId, semesterId, universityId } = filters;

    const courseResults = await resultService.getCourseResults(courseId, { semesterId, universityId });

    // Calculate statistics
    const stats = this.calculateCourseStatistics(courseResults);

    return {
      course_info: {
        code: courseResults[0]?.course?.code,
        title: courseResults[0]?.course?.title,
        credit_unit: courseResults[0]?.course?.credit_unit,
        lecturer: `${courseResults[0]?.lecturer?.first_name} ${courseResults[0]?.lecturer?.last_name}`,
        semester: courseResults[0]?.semester?.name
      },
      statistics: stats,
      results: courseResults.map(result => ({
        student_id: result.student_id,
        student_name: `${result.student?.first_name} ${result.student?.last_name}`,
        score: result.score,
        grade: result.grade,
        grade_point: result.grade_point
      }))
    };
  }

  // Generate department summary report
  async generateDepartmentSummaryReport(filters) {
    const academicService = require('../services/academicService');

    const { departmentId, semesterId, universityId } = filters;

    const departmentData = await academicService.getDepartmentSummary(departmentId, { semesterId, universityId });

    return departmentData.map(course => ({
      course_code: course.code,
      course_title: course.title,
      credit_unit: course.credit_unit,
      enrolled_students: course.enrolled_count,
      average_score: course.average_score?.toFixed(2),
      pass_rate: course.pass_rate?.toFixed(2) + '%',
      lecturer: `${course.lecturer?.first_name} ${course.lecturer?.last_name}`
    }));
  }

  // Generate academic year summary report
  async generateAcademicYearSummaryReport(filters) {
    const academicService = require('../services/academicService');

    const { academicYearId, universityId } = filters;

    const yearSummary = await academicService.getAcademicYearSummary(academicYearId, universityId);

    return {
      academic_year: yearSummary.academic_year?.name,
      total_students: yearSummary.total_students,
      total_courses: yearSummary.total_courses,
      total_results: yearSummary.total_results,
      average_gpa: yearSummary.average_gpa?.toFixed(2),
      departments: yearSummary.departments?.map(dept => ({
        name: dept.name,
        students: dept.student_count,
        courses: dept.course_count,
        average_gpa: dept.average_gpa?.toFixed(2)
      }))
    };
  }

  // Generate billing summary report
  async generateBillingSummaryReport(filters) {
    const billingService = require('../services/billingService');

    const { universityId, startDate, endDate, status } = filters;

    const billingData = await billingService.getBillingSummary(universityId, { startDate, endDate, status });

    return billingData.map(record => ({
      university_name: record.university?.name,
      subscription_plan: record.subscription?.plan_name,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      billing_date: record.billing_date,
      due_date: record.due_date,
      paid_at: record.paid_at
    }));
  }

  // Generate system usage report
  async generateSystemUsageReport(filters) {
    const accountService = require('../services/accountService');

    const { universityId, startDate, endDate } = filters;

    const usageData = await accountService.getSystemUsageStats(universityId, { startDate, endDate });

    return {
      period: { startDate, endDate },
      user_stats: {
        total_users: usageData.total_users,
        active_users: usageData.active_users,
        new_registrations: usageData.new_registrations
      },
      activity_stats: {
        total_results_submitted: usageData.total_results,
        total_reports_generated: usageData.total_reports,
        total_file_uploads: usageData.total_uploads
      },
      system_health: {
        average_response_time: usageData.avg_response_time + 'ms',
        error_rate: usageData.error_rate + '%',
        uptime_percentage: usageData.uptime_percentage + '%'
      }
    };
  }

  // Calculate course statistics
  calculateCourseStatistics(results) {
    if (!results || results.length === 0) {
      return {
        total_students: 0,
        average_score: 0,
        pass_rate: 0,
        grade_distribution: {}
      };
    }

    const scores = results.map(r => r.score).filter(s => s !== null);
    const totalStudents = results.length;
    const passedStudents = results.filter(r => r.score >= 40).length;

    const gradeDistribution = {};
    results.forEach(result => {
      const grade = result.grade || 'N/A';
      gradeDistribution[grade] = (gradeDistribution[grade] || 0) + 1;
    });

    return {
      total_students: totalStudents,
      average_score: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0,
      pass_rate: totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(2) : 0,
      grade_distribution: gradeDistribution
    };
  }

  // Generate PDF report
  async generatePDFReport(data, fileName, reportType) {
    const filePath = path.join(this.reportsDir, `${fileName}.pdf`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const stream = require('fs').createWriteStream(filePath);

      doc.pipe(stream);

      try {
        // Add header
        doc.fontSize(20).text(`${this.formatReportTitle(reportType)} Report`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Generate content based on report type
        this.generatePDFContent(doc, data, reportType);

        // Add footer
        doc.fontSize(8).text('Generated by SRMS - Student Result Management System', 50, doc.page.height - 50, {
          width: doc.page.width - 100,
          align: 'center'
        });

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate PDF content based on report type
  generatePDFContent(doc, data, reportType) {
    switch (reportType) {
      case 'student_results':
        this.generateStudentResultsPDF(doc, data);
        break;
      case 'course_performance':
        this.generateCoursePerformancePDF(doc, data);
        break;
      case 'department_summary':
        this.generateDepartmentSummaryPDF(doc, data);
        break;
      case 'academic_year_summary':
        this.generateAcademicYearSummaryPDF(doc, data);
        break;
      case 'billing_summary':
        this.generateBillingSummaryPDF(doc, data);
        break;
      case 'system_usage':
        this.generateSystemUsagePDF(doc, data);
        break;
      default:
        doc.text('Report content not available');
    }
  }

  // Generate student results PDF
  generateStudentResultsPDF(doc, data) {
    if (data.length === 0) {
      doc.text('No results found');
      return;
    }

    // Table headers
    const headers = ['Student ID', 'Name', 'Course', 'Score', 'Grade', 'Semester'];
    this.drawPDFTable(doc, headers, data.map(row => [
      row.student_id,
      row.student_name,
      `${row.course_code} - ${row.course_title}`,
      row.score?.toString() || 'N/A',
      row.grade || 'N/A',
      row.semester
    ]));
  }

  // Generate course performance PDF
  generateCoursePerformancePDF(doc, data) {
    // Course info
    doc.fontSize(14).text('Course Information', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Course: ${data.course_info.code} - ${data.course_info.title}`);
    doc.text(`Credit Unit: ${data.course_info.credit_unit}`);
    doc.text(`Lecturer: ${data.course_info.lecturer}`);
    doc.text(`Semester: ${data.course_info.semester}`);
    doc.moveDown();

    // Statistics
    doc.fontSize(14).text('Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Total Students: ${data.statistics.total_students}`);
    doc.text(`Average Score: ${data.statistics.average_score}`);
    doc.text(`Pass Rate: ${data.statistics.pass_rate}%`);
    doc.moveDown();

    // Grade distribution
    doc.fontSize(12).text('Grade Distribution', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    Object.entries(data.statistics.grade_distribution).forEach(([grade, count]) => {
      doc.text(`${grade}: ${count}`);
    });
    doc.moveDown(2);

    // Results table
    if (data.results && data.results.length > 0) {
      doc.fontSize(14).text('Student Results', { underline: true });
      doc.moveDown();
      const headers = ['Student ID', 'Name', 'Score', 'Grade'];
      this.drawPDFTable(doc, headers, data.results.map(row => [
        row.student_id,
        row.student_name,
        row.score?.toString() || 'N/A',
        row.grade || 'N/A'
      ]));
    }
  }

  // Generate department summary PDF
  generateDepartmentSummaryPDF(doc, data) {
    if (data.length === 0) {
      doc.text('No department data found');
      return;
    }

    const headers = ['Course Code', 'Title', 'Students', 'Avg Score', 'Pass Rate', 'Lecturer'];
    this.drawPDFTable(doc, headers, data.map(row => [
      row.course_code,
      row.course_title,
      row.enrolled_students?.toString() || '0',
      row.average_score || 'N/A',
      row.pass_rate || 'N/A',
      row.lecturer
    ]));
  }

  // Generate academic year summary PDF
  generateAcademicYearSummaryPDF(doc, data) {
    doc.fontSize(14).text('Academic Year Summary', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Academic Year: ${data.academic_year}`);
    doc.text(`Total Students: ${data.total_students}`);
    doc.text(`Total Courses: ${data.total_courses}`);
    doc.text(`Total Results: ${data.total_results}`);
    doc.text(`Average GPA: ${data.average_gpa}`);
    doc.moveDown(2);

    if (data.departments && data.departments.length > 0) {
      doc.fontSize(12).text('Department Breakdown', { underline: true });
      doc.moveDown();
      const headers = ['Department', 'Students', 'Courses', 'Avg GPA'];
      this.drawPDFTable(doc, headers, data.departments.map(dept => [
        dept.name,
        dept.students?.toString() || '0',
        dept.courses?.toString() || '0',
        dept.average_gpa || 'N/A'
      ]));
    }
  }

  // Generate billing summary PDF
  generateBillingSummaryPDF(doc, data) {
    if (data.length === 0) {
      doc.text('No billing data found');
      return;
    }

    const headers = ['University', 'Plan', 'Amount', 'Status', 'Billing Date', 'Due Date'];
    this.drawPDFTable(doc, headers, data.map(row => [
      row.university_name,
      row.subscription_plan,
      `${row.amount} ${row.currency}`,
      row.status,
      new Date(row.billing_date).toLocaleDateString(),
      new Date(row.due_date).toLocaleDateString()
    ]));
  }

  // Generate system usage PDF
  generateSystemUsagePDF(doc, data) {
    doc.fontSize(14).text('System Usage Report', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Period: ${data.period.startDate} to ${data.period.endDate}`);
    doc.moveDown();

    doc.fontSize(12).text('User Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Total Users: ${data.user_stats.total_users}`);
    doc.text(`Active Users: ${data.user_stats.active_users}`);
    doc.text(`New Registrations: ${data.user_stats.new_registrations}`);
    doc.moveDown();

    doc.fontSize(12).text('Activity Statistics', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Results Submitted: ${data.activity_stats.total_results_submitted}`);
    doc.text(`Reports Generated: ${data.activity_stats.total_reports_generated}`);
    doc.text(`File Uploads: ${data.activity_stats.total_file_uploads}`);
    doc.moveDown();

    doc.fontSize(12).text('System Health', { underline: true });
    doc.moveDown();
    doc.fontSize(10);
    doc.text(`Average Response Time: ${data.system_health.average_response_time}`);
    doc.text(`Error Rate: ${data.system_health.error_rate}`);
    doc.text(`Uptime: ${data.system_health.uptime_percentage}`);
  }

  // Draw table in PDF
  drawPDFTable(doc, headers, rows) {
    const tableTop = doc.y;
    const colWidth = (doc.page.width - 100) / headers.length;

    // Draw headers
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, 50 + (i * colWidth), tableTop, { width: colWidth, align: 'left' });
    });

    doc.moveDown();

    // Draw rows
    doc.font('Helvetica');
    rows.forEach(row => {
      if (doc.y > doc.page.height - 100) {
        doc.addPage();
      }

      row.forEach((cell, i) => {
        const cellText = cell?.toString() || '';
        doc.text(cellText, 50 + (i * colWidth), doc.y, { width: colWidth, align: 'left' });
      });

      doc.moveDown();
    });
  }

  // Generate Excel report
  async generateExcelReport(data, fileName, reportType) {
    const filePath = path.join(this.reportsDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();

    // Create worksheet
    const worksheet = workbook.addWorksheet(this.formatReportTitle(reportType));

    // Style for headers
    const headerStyle = {
      font: { bold: true, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    };

    // Generate content based on report type
    this.generateExcelContent(worksheet, data, reportType, headerStyle);

    // Save workbook
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  // Generate Excel content based on report type
  generateExcelContent(worksheet, data, reportType, headerStyle) {
    switch (reportType) {
      case 'student_results':
        this.generateStudentResultsExcel(worksheet, data, headerStyle);
        break;
      case 'course_performance':
        this.generateCoursePerformanceExcel(worksheet, data, headerStyle);
        break;
      case 'department_summary':
        this.generateDepartmentSummaryExcel(worksheet, data, headerStyle);
        break;
      case 'academic_year_summary':
        this.generateAcademicYearSummaryExcel(worksheet, data, headerStyle);
        break;
      case 'billing_summary':
        this.generateBillingSummaryExcel(worksheet, data, headerStyle);
        break;
      case 'system_usage':
        this.generateSystemUsageExcel(worksheet, data, headerStyle);
        break;
      default:
        worksheet.addRow(['Report content not available']);
    }
  }

  // Generate student results Excel
  generateStudentResultsExcel(worksheet, data, headerStyle) {
    const headers = ['Student ID', 'Name', 'Course Code', 'Course Title', 'Score', 'Grade', 'Grade Point', 'Credit Unit', 'Semester', 'Lecturer', 'Submitted At'];

    // Add headers
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.style = headerStyle;
    });

    // Add data
    data.forEach(row => {
      worksheet.addRow([
        row.student_id,
        row.student_name,
        row.course_code,
        row.course_title,
        row.score,
        row.grade,
        row.grade_point,
        row.credit_unit,
        row.semester,
        row.lecturer,
        row.submitted_at
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });
  }

  // Generate course performance Excel
  generateCoursePerformanceExcel(worksheet, data, headerStyle) {
    // Course info section
    worksheet.addRow(['Course Information']);
    worksheet.addRow(['Course Code', data.course_info.code]);
    worksheet.addRow(['Course Title', data.course_info.title]);
    worksheet.addRow(['Credit Unit', data.course_info.credit_unit]);
    worksheet.addRow(['Lecturer', data.course_info.lecturer]);
    worksheet.addRow(['Semester', data.course_info.semester]);
    worksheet.addRow([]); // Empty row

    // Statistics section
    worksheet.addRow(['Statistics']);
    worksheet.addRow(['Total Students', data.statistics.total_students]);
    worksheet.addRow(['Average Score', data.statistics.average_score]);
    worksheet.addRow(['Pass Rate', data.statistics.pass_rate + '%']);
    worksheet.addRow([]); // Empty row

    // Grade distribution
    worksheet.addRow(['Grade Distribution']);
    Object.entries(data.statistics.grade_distribution).forEach(([grade, count]) => {
      worksheet.addRow([grade, count]);
    });
    worksheet.addRow([]); // Empty row

    // Results section
    if (data.results && data.results.length > 0) {
      worksheet.addRow(['Student Results']);
      const headers = ['Student ID', 'Name', 'Score', 'Grade'];
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell(cell => {
        cell.style = headerStyle;
      });

      data.results.forEach(result => {
        worksheet.addRow([
          result.student_id,
          result.student_name,
          result.score,
          result.grade
        ]);
      });
    }
  }

  // Generate department summary Excel
  generateDepartmentSummaryExcel(worksheet, data, headerStyle) {
    const headers = ['Course Code', 'Title', 'Credit Unit', 'Enrolled Students', 'Average Score', 'Pass Rate', 'Lecturer'];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.style = headerStyle;
    });

    data.forEach(row => {
      worksheet.addRow([
        row.course_code,
        row.course_title,
        row.credit_unit,
        row.enrolled_students,
        row.average_score,
        row.pass_rate,
        row.lecturer
      ]);
    });
  }

  // Generate academic year summary Excel
  generateAcademicYearSummaryExcel(worksheet, data, headerStyle) {
    worksheet.addRow(['Academic Year Summary']);
    worksheet.addRow(['Academic Year', data.academic_year]);
    worksheet.addRow(['Total Students', data.total_students]);
    worksheet.addRow(['Total Courses', data.total_courses]);
    worksheet.addRow(['Total Results', data.total_results]);
    worksheet.addRow(['Average GPA', data.average_gpa]);
    worksheet.addRow([]); // Empty row

    if (data.departments && data.departments.length > 0) {
      worksheet.addRow(['Department Breakdown']);
      const headers = ['Department', 'Students', 'Courses', 'Average GPA'];
      const headerRow = worksheet.addRow(headers);
      headerRow.eachCell(cell => {
        cell.style = headerStyle;
      });

      data.departments.forEach(dept => {
        worksheet.addRow([
          dept.name,
          dept.students,
          dept.courses,
          dept.average_gpa
        ]);
      });
    }
  }

  // Generate billing summary Excel
  generateBillingSummaryExcel(worksheet, data, headerStyle) {
    const headers = ['University', 'Plan', 'Amount', 'Currency', 'Status', 'Billing Date', 'Due Date', 'Paid At'];

    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.style = headerStyle;
    });

    data.forEach(row => {
      worksheet.addRow([
        row.university_name,
        row.subscription_plan,
        row.amount,
        row.currency,
        row.status,
        row.billing_date,
        row.due_date,
        row.paid_at
      ]);
    });
  }

  // Generate system usage Excel
  generateSystemUsageExcel(worksheet, data, headerStyle) {
    worksheet.addRow(['System Usage Report']);
    worksheet.addRow(['Period Start', data.period.startDate]);
    worksheet.addRow(['Period End', data.period.endDate]);
    worksheet.addRow([]); // Empty row

    worksheet.addRow(['User Statistics']);
    worksheet.addRow(['Total Users', data.user_stats.total_users]);
    worksheet.addRow(['Active Users', data.user_stats.active_users]);
    worksheet.addRow(['New Registrations', data.user_stats.new_registrations]);
    worksheet.addRow([]); // Empty row

    worksheet.addRow(['Activity Statistics']);
    worksheet.addRow(['Results Submitted', data.activity_stats.total_results_submitted]);
    worksheet.addRow(['Reports Generated', data.activity_stats.total_reports_generated]);
    worksheet.addRow(['File Uploads', data.activity_stats.total_file_uploads]);
    worksheet.addRow([]); // Empty row

    worksheet.addRow(['System Health']);
    worksheet.addRow(['Average Response Time', data.system_health.average_response_time]);
    worksheet.addRow(['Error Rate', data.system_health.error_rate]);
    worksheet.addRow(['Uptime', data.system_health.uptime_percentage]);
  }

  // Format report title
  formatReportTitle(reportType) {
    const titles = {
      student_results: 'Student Results',
      course_performance: 'Course Performance',
      department_summary: 'Department Summary',
      academic_year_summary: 'Academic Year Summary',
      billing_summary: 'Billing Summary',
      system_usage: 'System Usage'
    };
    return titles[reportType] || 'Report';
  }

  // Clean up old reports
  async cleanupOldReports(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    try {
      const files = await fs.readdir(this.reportsDir);
      for (const file of files) {
        const filePath = path.join(this.reportsDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          logger.info('Cleaned up old report', { filePath });
        }
      }
    } catch (error) {
      logger.error('Report cleanup failed', { error: error.message });
    }
  }
}

module.exports = new ReportingService();
