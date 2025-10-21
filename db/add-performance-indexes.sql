-- Performance Optimization: Add indexes for frequently queried columns
-- This will significantly improve query performance for large datasets

-- Interviews table indexes
CREATE INDEX IF NOT EXISTS idx_interviews_student_id ON interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_session_id ON interviews(session_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_verdict ON interviews(verdict);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_student_session ON interviews(student_id, session_id);

-- Interview questions indexes
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_question_id ON interview_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_score ON interview_questions(correctness_score);

-- Question bank indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_question_bank_times_asked ON question_bank(times_asked);
CREATE INDEX IF NOT EXISTS idx_question_bank_favorite ON question_bank(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank(created_at DESC);

-- Students table indexes
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_zeta_id ON students(zeta_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);
CREATE INDEX IF NOT EXISTS idx_students_location ON students(location);

-- Interview sessions indexes
CREATE INDEX IF NOT EXISTS idx_interview_sessions_name ON interview_sessions(name);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_location ON interview_sessions(location);

-- Session panelists indexes
CREATE INDEX IF NOT EXISTS idx_session_panelists_session_id ON session_panelists(session_id);
CREATE INDEX IF NOT EXISTS idx_session_panelists_user_id ON session_panelists(user_id);

-- Authorized users indexes
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_authorized_users_role ON authorized_users(role);
CREATE INDEX IF NOT EXISTS idx_authorized_users_created_at ON authorized_users(created_at DESC);

-- Audit logs indexes (for efficient filtering and pagination)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);

-- Consolidation table indexes (already added in consolidate.js, but ensuring)
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_student ON interview_consolidation(student_id);
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_session ON interview_consolidation(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_status ON interview_consolidation(status);
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_last_interview ON interview_consolidation(last_interview_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_interviews_student_session_created ON interviews(student_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_created ON interviews(interviewer_id, created_at DESC);

ANALYZE interviews;
ANALYZE interview_questions;
ANALYZE question_bank;
ANALYZE students;
ANALYZE interview_sessions;
ANALYZE authorized_users;
ANALYZE audit_logs;
ANALYZE interview_consolidation;

