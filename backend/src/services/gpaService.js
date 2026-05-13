const pool = require('../config/database');
const AppError = require('../utils/appError');

exports.calculateGPA = async (student_id, semester_id) => {
  const { rows } = await pool.query(
    `SELECT ri.credit_unit, ri.grade_point
     FROM result_items ri
     JOIN results r ON r.id = ri.result_id
     WHERE ri.student_id = $1
       AND r.semester_id = $2
       AND r.current_status = 'published'
       AND ri.status IN ('approved', 'published', 'corrected')`,
    [student_id, semester_id]
  );

  if (!rows.length) {
    throw new AppError('No approved published results found for student in this semester', 404);
  }

  const totalCredits = rows.reduce((sum, row) => sum + Number(row.credit_unit), 0);
  const totalPoints = rows.reduce((sum, row) => sum + Number(row.credit_unit) * Number(row.grade_point), 0);
  if (totalCredits <= 0) {
    throw new AppError('Invalid credit unit data for GPA calculation', 500);
  }

  const gpa = Number((totalPoints / totalCredits).toFixed(4));
  const record = await pool.query(
    `INSERT INTO gpa_records (student_id, university_id, academic_session_id, semester_id, total_credit_units, total_grade_points, gpa, calculated_at)
     SELECT s.id, s.university_id, r.academic_session_id, r.semester_id, $1, $2, $3, now()
     FROM students s
     JOIN results r ON r.semester_id = $2
     WHERE s.id = $4
     LIMIT 1
     ON CONFLICT (student_id, academic_session_id, semester_id)
     DO UPDATE SET total_credit_units = EXCLUDED.total_credit_units,
                   total_grade_points = EXCLUDED.total_grade_points,
                   gpa = EXCLUDED.gpa,
                   calculated_at = now()
     RETURNING *`,
    [totalCredits, totalPoints, gpa, student_id]
  );

  return { gpa, totalCredits, totalPoints, record: record.rows[0] };
};

exports.calculateCGPA = async (student_id) => {
  const gpas = await pool.query('SELECT gpa FROM gpa_records WHERE student_id = $1 ORDER BY academic_session_id', [student_id]);
  if (!gpas.rows.length) {
    throw new AppError('No GPA records available for this student', 404);
  }

  const sumGpa = gpas.rows.reduce((sum, row) => sum + Number(row.gpa), 0);
  const cgpa = Number((sumGpa / gpas.rows.length).toFixed(4));
  const latestSession = gpas.rows[gpas.rows.length - 1];
  const { rows } = await pool.query(
    `INSERT INTO cgpa_records (student_id, university_id, as_of_academic_session_id, total_credit_units, total_grade_points, cgpa, calculated_at)
     SELECT s.id, s.university_id, g.academic_session_id, SUM(gr.total_credit_units), SUM(gr.total_grade_points), $1, now()
     FROM students s
     JOIN gpa_records gr ON gr.student_id = s.id
     JOIN academic_sessions g ON g.id = gr.academic_session_id
     WHERE s.id = $2
     GROUP BY s.id, s.university_id, g.id
     ORDER BY g.id DESC
     LIMIT 1
     ON CONFLICT (student_id, as_of_academic_session_id)
     DO UPDATE SET total_credit_units = EXCLUDED.total_credit_units,
                   total_grade_points = EXCLUDED.total_grade_points,
                   cgpa = EXCLUDED.cgpa,
                   calculated_at = now()
     RETURNING *`,
    [cgpa, student_id]
  );

  return { cgpa, record: rows[0] };
};

exports.calculateStudentGPA = async (studentId, semesterId) => {
  return await this.calculateGPA(studentId, semesterId);
};

exports.calculateStudentCGPA = async (studentId) => {
  return await this.calculateCGPA(studentId);
};
