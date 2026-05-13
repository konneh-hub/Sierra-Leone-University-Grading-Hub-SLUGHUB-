-- PostgreSQL schema for Multi-University Student Result Management System

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended', 'deactivated', 'invited');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE registration_status AS ENUM ('pending', 'completed', 'cancelled');
CREATE TYPE token_type AS ENUM ('email_verification', 'password_reset');
CREATE TYPE session_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE university_status AS ENUM ('active', 'inactive');
CREATE TYPE semester_status AS ENUM ('planned', 'active', 'completed');
CREATE TYPE person_type AS ENUM ('student', 'lecturer', 'staff');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'dropped', 'withdrawn');
CREATE TYPE course_registration_status AS ENUM ('registered', 'cancelled');
CREATE TYPE result_status AS ENUM ('draft', 'submitted', 'verified', 'reviewed', 'approved', 'published', 'corrected', 'rejected');
CREATE TYPE workflow_step_key AS ENUM ('draft', 'submitted', 'verified', 'reviewed', 'approved', 'published', 'corrected');
CREATE TYPE transcript_status AS ENUM ('requested', 'approved', 'generated', 'delivered', 'rejected');
CREATE TYPE report_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE activity_type AS ENUM ('login', 'result_update', 'approval', 'role_change', 'account_creation', 'registration', 'grade_calculation');
CREATE TYPE notification_type AS ENUM ('system', 'workflow', 'academic', 'audit');
CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE export_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE gender AS ENUM ('male', 'female', 'other');
CREATE TYPE grade_letter AS ENUM ('A', 'B', 'C', 'D', 'E', 'F');
CREATE TYPE grade_system AS ENUM ('4.0', '5.0');
CREATE TYPE academic_level AS ENUM ('year1', 'year2', 'year3', 'year4', 'year5');
CREATE TYPE program_type AS ENUM ('certificate', 'diploma', 'degree', 'postgraduate', 'master', 'phd');

-- UNIVERSITY STRUCTURE (Create first to avoid foreign key issues)
CREATE TABLE universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  logo text,
  status university_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code),
  CHECK (ends_at > starts_at)
);

CREATE TABLE semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  status semester_status NOT NULL DEFAULT 'planned',
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code),
  CHECK (ends_at > starts_at)
);

CREATE TABLE faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES faculties(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  program_type program_type NOT NULL,
  duration_years integer NOT NULL CHECK (duration_years > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

-- AUTH + ACCOUNT SYSTEM
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
  email text NOT NULL UNIQUE,
  username text UNIQUE,
  password_hash text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  gender gender,
  status user_status NOT NULL DEFAULT 'pending',
  is_system_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);

CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  status session_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now()
);

-- UNIVERSITY STRUCTURE
CREATE TABLE universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  logo text,
  status university_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE faculties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES faculties(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  program_type program_type NOT NULL,
  duration_years integer NOT NULL CHECK (duration_years > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  code text NOT NULL,
  title text NOT NULL,
  credit_unit numeric(4,2) NOT NULL CHECK (credit_unit > 0),
  semester_id uuid REFERENCES semesters(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, code)
);

-- STAFF & STUDENT SYSTEM
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  program_id uuid REFERENCES programs(id) ON DELETE SET NULL,
  matric_number text,
  academic_level academic_level NOT NULL DEFAULT 'year1',
  enrollment_year integer NOT NULL CHECK (enrollment_year > 1900),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, matric_number)
);

CREATE TABLE lecturers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  staff_number text NOT NULL,
  hire_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, staff_number)
);

CREATE TABLE staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  role_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ENROLLMENT SYSTEM
CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  status enrollment_status NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_session_id, semester_id)
);

CREATE TABLE course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  status course_registration_status NOT NULL DEFAULT 'registered',
  registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, academic_session_id, semester_id)
);

-- RESULT SYSTEM
CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lecturer_id uuid NOT NULL REFERENCES lecturers(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  current_status result_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, academic_session_id, semester_id, lecturer_id)
);

CREATE TABLE result_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ca_score numeric(5,2) NOT NULL CHECK (ca_score >= 0 AND ca_score <= 100),
  exam_score numeric(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 100),
  total_score numeric(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade grade_letter NOT NULL,
  grade_point numeric(3,2) NOT NULL CHECK (grade_point >= 0),
  credit_unit numeric(4,2) NOT NULL CHECK (credit_unit > 0),
  status result_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, student_id, course_id)
);

CREATE TABLE result_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_item_id uuid NOT NULL REFERENCES result_items(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ca_score numeric(5,2) NOT NULL CHECK (ca_score >= 0 AND ca_score <= 100),
  exam_score numeric(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 100),
  total_score numeric(5,2) GENERATED ALWAYS AS (ca_score + exam_score) STORED,
  grade grade_letter NOT NULL,
  grade_point numeric(3,2) NOT NULL CHECK (grade_point >= 0),
  credit_unit numeric(4,2) NOT NULL CHECK (credit_unit > 0),
  status result_status NOT NULL DEFAULT 'draft',
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- RESULT WORKFLOW SYSTEM
CREATE TABLE result_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id, name)
);

CREATE TABLE result_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES result_workflows(id) ON DELETE CASCADE,
  step_key workflow_step_key NOT NULL,
  display_name text NOT NULL,
  sequence smallint NOT NULL CHECK (sequence > 0),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  UNIQUE (workflow_id, step_key),
  UNIQUE (workflow_id, sequence)
);

CREATE TABLE result_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  comment text,
  status result_status NOT NULL DEFAULT 'submitted'
);

CREATE TABLE result_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_submission_id uuid NOT NULL REFERENCES result_submissions(id) ON DELETE CASCADE,
  reviewed_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  comment text,
  status result_status NOT NULL CHECK (status IN ('verified', 'reviewed', 'approved', 'rejected'))
);

CREATE TABLE result_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_review_id uuid NOT NULL REFERENCES result_reviews(id) ON DELETE CASCADE,
  published_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  status result_status NOT NULL DEFAULT 'published'
);

CREATE TABLE result_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_publication_id uuid NOT NULL REFERENCES result_publications(id) ON DELETE CASCADE,
  corrected_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  corrected_at timestamptz NOT NULL DEFAULT now(),
  correction_reason text NOT NULL,
  status result_status NOT NULL DEFAULT 'corrected'
);

CREATE TABLE result_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES results(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  from_status result_status NOT NULL,
  to_status result_status NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  comment text
);

-- GPA / CGPA SYSTEM
CREATE TABLE grade_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  grade_system grade_system NOT NULL,
  grade_letter grade_letter NOT NULL,
  min_score numeric(5,2) NOT NULL CHECK (min_score >= 0 AND min_score <= 100),
  max_score numeric(5,2) NOT NULL CHECK (max_score >= 0 AND max_score <= 100),
  grade_point numeric(3,2) NOT NULL CHECK (grade_point >= 0),
  UNIQUE (university_id, grade_letter),
  CHECK (max_score >= min_score)
);

CREATE TABLE gpa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  total_credit_units numeric(8,2) NOT NULL CHECK (total_credit_units > 0),
  total_grade_points numeric(12,4) NOT NULL CHECK (total_grade_points >= 0),
  gpa numeric(5,4) NOT NULL CHECK (gpa >= 0),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, academic_session_id, semester_id)
);

CREATE TABLE cgpa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  as_of_academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  total_credit_units numeric(10,2) NOT NULL CHECK (total_credit_units > 0),
  total_grade_points numeric(14,4) NOT NULL CHECK (total_grade_points >= 0),
  cgpa numeric(5,4) NOT NULL CHECK (cgpa >= 0),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, as_of_academic_session_id)
);

-- TRANSCRIPT SYSTEM
CREATE TABLE transcript_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  status transcript_status NOT NULL DEFAULT 'requested',
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  remarks text
);

CREATE TABLE transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_request_id uuid NOT NULL REFERENCES transcript_requests(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  request_date timestamptz NOT NULL DEFAULT now(),
  generated_at timestamptz,
  status transcript_status NOT NULL DEFAULT 'generated',
  gpa numeric(5,4) NOT NULL CHECK (gpa >= 0),
  cgpa numeric(5,4) NOT NULL CHECK (cgpa >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transcript_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_session_id uuid NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
  grade grade_letter NOT NULL,
  grade_point numeric(3,2) NOT NULL CHECK (grade_point >= 0),
  credit_unit numeric(4,2) NOT NULL CHECK (credit_unit > 0),
  total_score numeric(5,2) NOT NULL CHECK (total_score >= 0 AND total_score <= 200)
);

-- NOTIFICATION SYSTEM
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status notification_status NOT NULL DEFAULT 'unread',
  delivered_at timestamptz,
  read_at timestamptz,
  UNIQUE (notification_id, user_id)
);

-- REPORTING SYSTEM
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb,
  requested_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  status report_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  exported_by uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  export_format text NOT NULL,
  file_path text,
  status export_status NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- AUDIT SYSTEM
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
  activity_type activity_type NOT NULL,
  activity_details jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{"platformName":"SRMS SaaS Admin","supportEmail":"support@slughub.com","defaultLanguage":"en","registrationEnabled":true}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE audit_trails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  performed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  changes jsonb
);

-- INDEXES
CREATE INDEX idx_users_university_id ON users(university_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_account_invites_university_id ON account_invites(university_id);
CREATE INDEX idx_account_registrations_user_id ON account_registrations(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_faculties_university_id ON faculties(university_id);
CREATE INDEX idx_departments_university_id ON departments(university_id);
CREATE INDEX idx_programs_university_id ON programs(university_id);
CREATE INDEX idx_courses_university_id ON courses(university_id);
CREATE INDEX idx_academic_sessions_university_id ON academic_sessions(university_id);
CREATE INDEX idx_semesters_university_id ON semesters(university_id);
CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_university_id ON students(university_id);
CREATE INDEX idx_lecturers_user_id ON lecturers(user_id);
CREATE INDEX idx_lecturers_university_id ON lecturers(university_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_course_registrations_student_id ON course_registrations(student_id);
CREATE INDEX idx_course_registrations_course_id ON course_registrations(course_id);
CREATE INDEX idx_results_university_id ON results(university_id);
CREATE INDEX idx_results_course_id ON results(course_id);
CREATE INDEX idx_results_lecturer_id ON results(lecturer_id);
CREATE INDEX idx_result_items_student_id ON result_items(student_id);
CREATE INDEX idx_result_items_course_id ON result_items(course_id);
CREATE INDEX idx_result_entries_student_id ON result_entries(student_id);
CREATE INDEX idx_result_entries_course_id ON result_entries(course_id);
CREATE INDEX idx_result_status_logs_result_id ON result_status_logs(result_id);
CREATE INDEX idx_gpa_records_student_id ON gpa_records(student_id);
CREATE INDEX idx_cgpa_records_student_id ON cgpa_records(student_id);
CREATE INDEX idx_transcript_requests_student_id ON transcript_requests(student_id);
CREATE INDEX idx_transcripts_student_id ON transcripts(student_id);
CREATE INDEX idx_transcript_courses_transcript_id ON transcript_courses(transcript_id);
CREATE INDEX idx_notifications_university_id ON notifications(university_id);
CREATE INDEX idx_notification_recipients_user_id ON notification_recipients(user_id);
CREATE INDEX idx_reports_university_id ON reports(university_id);
CREATE INDEX idx_report_exports_report_id ON report_exports(report_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_audit_trails_entity ON audit_trails(entity_table, entity_id);

-- FUNCTION: ROLE CHECK
CREATE OR REPLACE FUNCTION fn_user_has_role(_user_id uuid, _role_name text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND r.name = _role_name
  );
$$;

-- FUNCTION: GET MAX GRADE SCALE
CREATE OR REPLACE FUNCTION fn_grade_for_score(_university_id uuid, _score numeric)
RETURNS grade_letter LANGUAGE plpgsql STABLE AS $$
DECLARE
  g grade_letter;
BEGIN
  SELECT grade_letter INTO g
  FROM grade_scales
  WHERE university_id = _university_id
    AND _score >= min_score
    AND _score <= max_score
  ORDER BY grade_point DESC
  LIMIT 1;

  IF g IS NULL THEN
    RAISE EXCEPTION 'No grade mapping found for score % in university %', _score, _university_id;
  END IF;
  RETURN g;
END;
$$;

CREATE OR REPLACE FUNCTION fn_grade_point_for_score(_university_id uuid, _score numeric)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE
  gp numeric;
BEGIN
  SELECT grade_point INTO gp
  FROM grade_scales
  WHERE university_id = _university_id
    AND _score >= min_score
    AND _score <= max_score
  ORDER BY grade_point DESC
  LIMIT 1;

  IF gp IS NULL THEN
    RAISE EXCEPTION 'No grade point mapping found for score % in university %', _score, _university_id;
  END IF;
  RETURN gp;
END;
$$;

-- TRIGGER: AUTO-GRADE COMPUTATION ON RESULT ITEMS
CREATE OR REPLACE FUNCTION trg_compute_grade_point_and_unit()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  uni_id uuid;
  total numeric(5,2);
BEGIN
  SELECT university_id INTO uni_id FROM courses WHERE id = NEW.course_id;
  IF uni_id IS NULL THEN
    RAISE EXCEPTION 'Course does not belong to a registered university';
  END IF;
  total := NEW.ca_score + NEW.exam_score;
  NEW.total_score := total;
  NEW.grade := fn_grade_for_score(uni_id, total);
  NEW.grade_point := fn_grade_point_for_score(uni_id, total);
  SELECT credit_unit INTO NEW.credit_unit FROM courses WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_before_insert_result_items
BEFORE INSERT ON result_items
FOR EACH ROW EXECUTE FUNCTION trg_compute_grade_point_and_unit();

CREATE TRIGGER trg_before_update_result_items
BEFORE UPDATE OF ca_score, exam_score, course_id ON result_items
FOR EACH ROW EXECUTE FUNCTION trg_compute_grade_point_and_unit();

-- FUNCTION: ENSURE RESULT WORKFLOW TRANSITIONS
CREATE OR REPLACE FUNCTION fn_enforce_result_workflow() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_status result_status;
  required_role text;
BEGIN
  IF TG_ARGV[0] = 'submission' THEN
    SELECT current_status INTO current_status FROM results WHERE id = NEW.result_id;
    IF current_status <> 'draft' THEN
      RAISE EXCEPTION 'Result must be in draft state to submit';
    END IF;
    IF NOT fn_user_has_role(NEW.submitted_by, 'lecturer') THEN
      RAISE EXCEPTION 'Only lecturers can submit draft results';
    END IF;
    UPDATE results SET current_status = 'submitted', updated_at = now() WHERE id = NEW.result_id;
    INSERT INTO result_status_logs(result_id, changed_by, from_status, to_status, comment)
      VALUES (NEW.result_id, NEW.submitted_by, current_status, 'submitted', NEW.comment);
  ELSIF TG_ARGV[0] = 'review' THEN
    SELECT rs.status INTO current_status FROM result_submissions rs WHERE rs.id = NEW.result_submission_id;
    IF current_status NOT IN ('submitted', 'verified', 'reviewed') THEN
      RAISE EXCEPTION 'Submission must be submitted, verified, or reviewed to progress';
    END IF;
    IF NEW.status = 'verified' THEN
      IF NOT fn_user_has_role(NEW.reviewed_by, 'hod') THEN
        RAISE EXCEPTION 'Only HOD can verify results';
      END IF;
    ELSIF NEW.status = 'reviewed' THEN
      IF NOT fn_user_has_role(NEW.reviewed_by, 'dean') THEN
        RAISE EXCEPTION 'Only Dean can review results';
      END IF;
    ELSIF NEW.status = 'approved' THEN
      IF NOT fn_user_has_role(NEW.reviewed_by, 'exam_officer') THEN
        RAISE EXCEPTION 'Only Exam Officer can approve results';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid review status transition';
    END IF;
    UPDATE results SET current_status = NEW.status, updated_at = now() WHERE id = (SELECT result_id FROM result_submissions WHERE id = NEW.result_submission_id);
    INSERT INTO result_status_logs(result_id, changed_by, from_status, to_status, comment)
      VALUES ((SELECT result_id FROM result_submissions WHERE id = NEW.result_submission_id), NEW.reviewed_by, current_status, NEW.status, NEW.comment);
  ELSIF TG_ARGV[0] = 'publication' THEN
    SELECT status INTO current_status FROM result_reviews WHERE id = NEW.result_review_id;
    IF current_status <> 'approved' THEN
      RAISE EXCEPTION 'Result review must be approved before publication';
    END IF;
    IF NOT fn_user_has_role(NEW.published_by, 'exam_officer') THEN
      RAISE EXCEPTION 'Only Exam Officer can publish results';
    END IF;
    UPDATE results SET current_status = 'published', updated_at = now() WHERE id = (SELECT result_id FROM result_submissions WHERE id = (SELECT result_submission_id FROM result_reviews WHERE id = NEW.result_review_id));
    INSERT INTO result_status_logs(result_id, changed_by, from_status, to_status, comment)
      VALUES ((SELECT result_id FROM result_submissions WHERE id = (SELECT result_submission_id FROM result_reviews WHERE id = NEW.result_review_id)), NEW.published_by, current_status, 'published', NULL);
  ELSIF TG_ARGV[0] = 'correction' THEN
    SELECT status INTO current_status FROM result_publications WHERE id = NEW.result_publication_id;
    IF current_status <> 'published' THEN
      RAISE EXCEPTION 'Only published results may be corrected';
    END IF;
    IF NOT fn_user_has_role(NEW.corrected_by, 'lecturer') AND NOT fn_user_has_role(NEW.corrected_by, 'exam_officer') THEN
      RAISE EXCEPTION 'Only Lecturer or Exam Officer can correct published results';
    END IF;
    UPDATE results SET current_status = 'corrected', updated_at = now() WHERE id = (SELECT result_id FROM result_submissions WHERE id = (SELECT result_submission_id FROM result_reviews WHERE id = (SELECT result_review_id FROM result_publications WHERE id = NEW.result_publication_id)));
    INSERT INTO result_status_logs(result_id, changed_by, from_status, to_status, comment)
      VALUES ((SELECT result_id FROM result_submissions WHERE id = (SELECT result_submission_id FROM result_reviews WHERE id = (SELECT result_review_id FROM result_publications WHERE id = NEW.result_publication_id))), NEW.corrected_by, current_status, 'corrected', NEW.correction_reason);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_after_insert_result_submissions
AFTER INSERT ON result_submissions
FOR EACH ROW EXECUTE FUNCTION fn_enforce_result_workflow('submission');

CREATE TRIGGER trg_after_insert_result_reviews
AFTER INSERT ON result_reviews
FOR EACH ROW EXECUTE FUNCTION fn_enforce_result_workflow('review');

CREATE TRIGGER trg_after_insert_result_publications
AFTER INSERT ON result_publications
FOR EACH ROW EXECUTE FUNCTION fn_enforce_result_workflow('publication');

CREATE TRIGGER trg_after_insert_result_corrections
AFTER INSERT ON result_corrections
FOR EACH ROW EXECUTE FUNCTION fn_enforce_result_workflow('correction');

-- GPA / CGPA CALCULATION FUNCTIONS
CREATE OR REPLACE FUNCTION fn_calculate_gpa(_student_id uuid, _semester_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rec record;
  total_credit numeric := 0;
  total_points numeric := 0;
  computed_gpa numeric;
  uni_id uuid;
  session_id uuid;
BEGIN
  SELECT university_id, academic_session_id INTO uni_id, session_id FROM enrollments e
  JOIN students s ON s.id = e.student_id
  WHERE e.student_id = _student_id AND e.semester_id = _semester_id
  LIMIT 1;

  IF uni_id IS NULL THEN
    RAISE EXCEPTION 'Student is not enrolled in semester %', _semester_id;
  END IF;

  FOR rec IN
    SELECT ri.credit_unit, ri.grade_point
    FROM result_items ri
    JOIN results r ON r.id = ri.result_id
    WHERE ri.student_id = _student_id
      AND ri.status IN ('approved', 'published', 'corrected')
      AND r.semester_id = _semester_id
      AND r.academic_session_id = session_id
  LOOP
    total_credit := total_credit + rec.credit_unit;
    total_points := total_points + (rec.credit_unit * rec.grade_point);
  END LOOP;

  IF total_credit = 0 THEN
    DELETE FROM gpa_records WHERE student_id = _student_id AND semester_id = _semester_id;
    RETURN;
  END IF;

  computed_gpa := total_points / total_credit;
  INSERT INTO gpa_records (student_id, university_id, academic_session_id, semester_id, total_credit_units, total_grade_points, gpa, calculated_at)
  VALUES (_student_id, uni_id, session_id, _semester_id, total_credit, total_points, computed_gpa, now())
  ON CONFLICT (student_id, academic_session_id, semester_id) DO UPDATE
  SET total_credit_units = EXCLUDED.total_credit_units,
      total_grade_points = EXCLUDED.total_grade_points,
      gpa = EXCLUDED.gpa,
      calculated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION fn_calculate_cgpa(_student_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  rec record;
  total_credit numeric := 0;
  total_points numeric := 0;
  computed_cgpa numeric;
  uni_id uuid;
  session_id uuid;
BEGIN
  SELECT university_id, academic_session_id INTO uni_id, session_id
  FROM gpa_records
  WHERE student_id = _student_id
  ORDER BY academic_session_id DESC
  LIMIT 1;

  FOR rec IN
    SELECT total_credit_units, total_grade_points FROM gpa_records
    WHERE student_id = _student_id
  LOOP
    total_credit := total_credit + rec.total_credit_units;
    total_points := total_points + rec.total_grade_points;
  END LOOP;

  IF total_credit = 0 THEN
    DELETE FROM cgpa_records WHERE student_id = _student_id;
    RETURN;
  END IF;

  computed_cgpa := total_points / total_credit;
  INSERT INTO cgpa_records (student_id, university_id, as_of_academic_session_id, total_credit_units, total_grade_points, cgpa, calculated_at)
  VALUES (_student_id, uni_id, session_id, total_credit, total_points, computed_cgpa, now())
  ON CONFLICT (student_id, as_of_academic_session_id) DO UPDATE
  SET university_id = EXCLUDED.university_id,
      total_credit_units = EXCLUDED.total_credit_units,
      total_grade_points = EXCLUDED.total_grade_points,
      cgpa = EXCLUDED.cgpa,
      calculated_at = now();
END;
$$;

-- TRIGGER: RECALCULATE GPA/CGPA AFTER RESULT ITEM STATUS CHANGES
CREATE OR REPLACE FUNCTION trg_after_result_item_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM fn_calculate_gpa(NEW.student_id, (SELECT semester_id FROM results WHERE id = NEW.result_id));
  PERFORM fn_calculate_cgpa(NEW.student_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_after_update_result_items_status
AFTER UPDATE OF status ON result_items
FOR EACH ROW EXECUTE FUNCTION trg_after_result_item_status_change();

CREATE TRIGGER trg_after_insert_result_items_compute_gpa
AFTER INSERT ON result_items
FOR EACH ROW EXECUTE FUNCTION trg_after_result_item_status_change();

-- TRIGGER: ENSURE RESULT ITEM STATUS NOT PUBLISHED BEFORE APPROVAL
CREATE OR REPLACE FUNCTION trg_validate_result_item_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' THEN
    PERFORM 1 FROM results r WHERE r.id = NEW.result_id AND r.current_status = 'published';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Result item cannot be published until the result has been approved and published';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_result_item_status
BEFORE UPDATE ON result_items
FOR EACH ROW EXECUTE FUNCTION trg_validate_result_item_status_change();

-- TRANSCRIPT TRIGGER
CREATE OR REPLACE FUNCTION trg_populate_transcript_courses()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO transcript_courses (transcript_id, course_id, student_id, academic_session_id, semester_id, grade, grade_point, credit_unit, total_score)
  SELECT NEW.id, ri.course_id, ri.student_id, r.academic_session_id, r.semester_id, ri.grade, ri.grade_point, ri.credit_unit, ri.total_score
  FROM result_items ri
  JOIN results r ON r.id = ri.result_id
  WHERE ri.student_id = NEW.student_id
    AND r.current_status = 'published';
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_after_insert_transcripts
AFTER INSERT ON transcripts
FOR EACH ROW EXECUTE FUNCTION trg_populate_transcript_courses();

-- AUDIT TRIGGERS
CREATE OR REPLACE FUNCTION trg_audit_user_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_trails (entity_table, entity_id, action, performed_by, changes)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP, NULL, row_to_json(NEW));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION trg_audit_user_changes();

CREATE OR REPLACE FUNCTION trg_log_activity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO activity_logs (user_id, university_id, activity_type, activity_details, occurred_at)
  VALUES (NEW.user_id, NEW.university_id, 'registration', row_to_json(NEW), now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_registration_activity
AFTER INSERT ON account_registrations
FOR EACH ROW EXECUTE FUNCTION trg_log_activity();

-- CONSTRAINTS ON RESULTS AND WORKFLOW COHERENCE
ALTER TABLE results
  ADD CONSTRAINT chk_results_status_valid CHECK (current_status IN ('draft', 'submitted', 'verified', 'reviewed', 'approved', 'published', 'corrected', 'rejected'));

ALTER TABLE result_submissions
  ADD CONSTRAINT chk_submission_status CHECK (status = 'submitted');

ALTER TABLE result_publications
  ADD CONSTRAINT chk_publication_status CHECK (status = 'published');

ALTER TABLE result_corrections
  ADD CONSTRAINT chk_correction_status CHECK (status = 'corrected');

-- ENFORCE STUDENT/LECTURER SELF REGISTRATION TOKEN RELATION
ALTER TABLE account_invites
  ADD CONSTRAINT chk_invite_email_nonempty CHECK (char_length(email) > 0);

-- ============================================================
-- SUBSCRIPTION & BILLING SYSTEM
-- ============================================================

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expired', 'suspended', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'successful', 'failed', 'refunded');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'overdue', 'paid', 'cancelled');
CREATE TYPE billing_cycle AS ENUM ('monthly', 'yearly');

-- SUBSCRIPTION PLANS
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  billing_cycle billing_cycle NOT NULL,
  price_monthly numeric(10,2),
  price_yearly numeric(10,2),
  max_students integer NOT NULL CHECK (max_students > 0),
  max_lecturers integer NOT NULL CHECK (max_lecturers > 0),
  max_courses integer NOT NULL CHECK (max_courses > 0),
  max_admin_users integer NOT NULL CHECK (max_admin_users > 0),
  feature_flags jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);

-- UNIVERSITY SUBSCRIPTIONS
CREATE TABLE university_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL UNIQUE REFERENCES universities(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status subscription_status NOT NULL DEFAULT 'trial',
  start_date date NOT NULL,
  end_date date NOT NULL,
  auto_renew boolean NOT NULL DEFAULT true,
  billing_cycle billing_cycle NOT NULL,
  next_billing_date date,
  trial_days integer DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);

CREATE INDEX idx_university_subscriptions_status ON university_subscriptions(status);
CREATE INDEX idx_university_subscriptions_next_billing ON university_subscriptions(next_billing_date);

-- USAGE TRACKING
CREATE TABLE usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES university_subscriptions(id) ON DELETE CASCADE,
  total_students integer NOT NULL DEFAULT 0,
  total_lecturers integer NOT NULL DEFAULT 0,
  total_courses integer NOT NULL DEFAULT 0,
  total_admin_users integer NOT NULL DEFAULT 0,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (university_id)
);

CREATE INDEX idx_usage_tracking_university ON usage_tracking(university_id);

-- PAYMENTS
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES university_subscriptions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  transaction_reference text NOT NULL UNIQUE,
  status payment_status NOT NULL DEFAULT 'pending',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  failed_reason text
);

CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_university ON payments(university_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);

-- INVOICES
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES university_subscriptions(id) ON DELETE CASCADE,
  amount_due numeric(12,2) NOT NULL CHECK (amount_due > 0),
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status invoice_status NOT NULL DEFAULT 'issued',
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_university ON invoices(university_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- FEATURE ACCESS
CREATE TABLE feature_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_name)
);

CREATE INDEX idx_feature_access_plan ON feature_access(plan_id);

-- SUBSCRIPTION STATUS HISTORY
CREATE TABLE subscription_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES university_subscriptions(id) ON DELETE CASCADE,
  from_status subscription_status,
  to_status subscription_status NOT NULL,
  reason text,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_status_history_university ON subscription_status_history(university_id);
CREATE INDEX idx_subscription_status_history_changed_at ON subscription_status_history(changed_at);

-- BILLING NOTIFICATIONS
CREATE TABLE billing_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES university_subscriptions(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  message text NOT NULL,
  is_sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_billing_notifications_university ON billing_notifications(university_id);
CREATE INDEX idx_billing_notifications_sent ON billing_notifications(is_sent);

-- ============================================================
-- FUNCTIONS FOR BILLING SYSTEM
-- ============================================================

-- FUNCTION: CHECK IF UNIVERSITY HAS ACTIVE SUBSCRIPTION
CREATE OR REPLACE FUNCTION fn_is_university_subscribed(_university_id uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  has_active_subscription boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM university_subscriptions
    WHERE university_id = _university_id
      AND status IN ('active', 'trial')
      AND end_date >= CURRENT_DATE
  ) INTO has_active_subscription;
  RETURN has_active_subscription;
END;
$$;

-- FUNCTION: GET SUBSCRIPTION PLAN LIMITS
CREATE OR REPLACE FUNCTION fn_get_plan_limits(_plan_id uuid)
RETURNS TABLE (
  max_students integer,
  max_lecturers integer,
  max_courses integer,
  max_admin_users integer
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT
    sp.max_students,
    sp.max_lecturers,
    sp.max_courses,
    sp.max_admin_users
  FROM subscription_plans sp
  WHERE sp.id = _plan_id;
END;
$$;

-- FUNCTION: CHECK PLAN LIMIT BEFORE OPERATION
CREATE OR REPLACE FUNCTION fn_check_plan_limit(_university_id uuid, _resource_type text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  current_limit integer;
  max_limit integer;
  plan_id uuid;
BEGIN
  SELECT us.plan_id INTO plan_id
  FROM university_subscriptions us
  WHERE us.university_id = _university_id
    AND us.status IN ('active', 'trial')
    AND us.end_date >= CURRENT_DATE;

  IF plan_id IS NULL THEN
    RETURN false;
  END IF;

  CASE _resource_type
    WHEN 'student' THEN
      SELECT ut.total_students INTO current_limit FROM usage_tracking ut WHERE ut.university_id = _university_id;
      SELECT sp.max_students INTO max_limit FROM subscription_plans sp WHERE sp.id = plan_id;
    WHEN 'lecturer' THEN
      SELECT ut.total_lecturers INTO current_limit FROM usage_tracking ut WHERE ut.university_id = _university_id;
      SELECT sp.max_lecturers INTO max_limit FROM subscription_plans sp WHERE sp.id = plan_id;
    WHEN 'course' THEN
      SELECT ut.total_courses INTO current_limit FROM usage_tracking ut WHERE ut.university_id = _university_id;
      SELECT sp.max_courses INTO max_limit FROM subscription_plans sp WHERE sp.id = plan_id;
    WHEN 'admin_user' THEN
      SELECT ut.total_admin_users INTO current_limit FROM usage_tracking ut WHERE ut.university_id = _university_id;
      SELECT sp.max_admin_users INTO max_limit FROM subscription_plans sp WHERE sp.id = plan_id;
    ELSE
      RETURN true;
  END CASE;

  RETURN (current_limit IS NULL OR current_limit < max_limit);
END;
$$;

-- TRIGGER: UPDATE SUBSCRIPTION STATUS WHEN END DATE PASSES
CREATE OR REPLACE FUNCTION trg_check_subscription_expiry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.end_date < CURRENT_DATE AND NEW.status NOT IN ('expired', 'cancelled', 'suspended') THEN
    NEW.status := 'expired';
    INSERT INTO subscription_status_history (university_id, subscription_id, from_status, to_status, reason)
    VALUES (NEW.university_id, NEW.id, OLD.status, 'expired', 'Subscription period ended');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_before_update_university_subscriptions
BEFORE UPDATE ON university_subscriptions
FOR EACH ROW EXECUTE FUNCTION trg_check_subscription_expiry();

-- END OF SCHEMA
