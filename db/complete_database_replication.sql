-- ============================================================================
-- COMPLETE DATABASE REPLICATION SCRIPT
-- ============================================================================
-- This script creates the complete database schema with all tables, indexes,
-- constraints, and seed data for the BEES application.
-- 
-- Usage: psql $DATABASE_URL -f db/complete_database_replication.sql
-- ============================================================================

-- ============================================================================
-- PART 1: CORE TABLES (No dependencies)
-- ============================================================================

-- Create authorized_users table (referenced by many tables)
CREATE TABLE IF NOT EXISTS authorized_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_superadmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL UNIQUE,
    short_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL UNIQUE,
    short_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create examination_mode table
CREATE TABLE IF NOT EXISTS examination_mode (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(255) NOT NULL UNIQUE,
    short_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    zeta_id VARCHAR(255) UNIQUE,
    school VARCHAR(255),
    location VARCHAR(255),
    session_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create question_bank table
CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT[],
    times_asked INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    average_score DECIMAL(4,2) DEFAULT 0.00,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table (legacy, may be dropped later)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    zoho_user_id VARCHAR(255),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PART 2: SESSION AND INTERVIEW TABLES
-- ============================================================================

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS interview_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    is_panel BOOLEAN DEFAULT FALSE,
    school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    examination_mode_id INTEGER REFERENCES examination_mode(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add session_id foreign key to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL;

-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    interviewer_id INTEGER NOT NULL REFERENCES authorized_users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL,
    interview_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress',
    verdict VARCHAR(50),
    overall_notes TEXT,
    meeting_url VARCHAR(500),
    meeting_recording_url VARCHAR(500),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview_questions table
CREATE TABLE IF NOT EXISTS interview_questions (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_rich_content TEXT,
    student_answer TEXT,
    answer_photo_url VARCHAR(500),
    question_order INTEGER DEFAULT 1,
    correctness_score INTEGER CHECK (correctness_score IS NULL OR (correctness_score >= 0 AND correctness_score <= 10)),
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create question_performance table
CREATE TABLE IF NOT EXISTS question_performance (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    is_correct BOOLEAN,
    answer_text TEXT,
    answer_photo_url TEXT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create session_panelists table
CREATE TABLE IF NOT EXISTS session_panelists (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES authorized_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id)
);

-- Create student_sessions junction table
CREATE TABLE IF NOT EXISTS student_sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    session_status VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id)
);

-- Create interviewer_favorites table
CREATE TABLE IF NOT EXISTS interviewer_favorites (
    id SERIAL PRIMARY KEY,
    interviewer_id INTEGER NOT NULL REFERENCES authorized_users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interviewer_id, question_id)
);

-- ============================================================================
-- PART 3: CONSOLIDATION TABLE
-- ============================================================================

-- Create interview_consolidation table
CREATE TABLE IF NOT EXISTS interview_consolidation (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    session_id INTEGER,
    student_name TEXT,
    student_email TEXT,
    zeta_id TEXT,
    session_name TEXT,
    interview_ids INTEGER[],
    interviewer_ids INTEGER[],
    interviewer_names TEXT[],
    verdicts TEXT[],
    interview_statuses TEXT[],
    status TEXT,
    last_interview_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, session_id)
);

-- ============================================================================
-- PART 4: AUDIT AND LOGGING TABLES
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    action_type VARCHAR(100) NOT NULL,
    action_name VARCHAR(255) NOT NULL,
    method VARCHAR(10),
    endpoint VARCHAR(500),
    request_headers JSONB,
    request_body JSONB,
    query_params JSONB,
    status_code INTEGER,
    response_body JSONB,
    response_headers JSONB,
    response_time_ms INTEGER,
    error_message TEXT,
    error_stack TEXT,
    error_code VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    correlation_id VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    success BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_action_type_check CHECK (action_type IN (
        'API_REQUEST', 'USER_ACTION', 'ERROR', 'LOGIN', 'LOGOUT', 
        'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'IMPORT'
    ))
);

-- ============================================================================
-- PART 5: EMAIL AND SMS TEMPLATES
-- ============================================================================

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    from_email VARCHAR(255) NOT NULL,
    to_emails TEXT NOT NULL,
    cc_emails TEXT,
    bcc_emails TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'drafted',
    error_message TEXT,
    consolidation_id INTEGER REFERENCES interview_consolidation(id) ON DELETE SET NULL,
    sent_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PART 6: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_zoho_id ON users(zoho_user_id);

-- Students table indexes
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
CREATE INDEX IF NOT EXISTS idx_students_zeta_id ON students(zeta_id);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_session_id ON students(session_id);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);
CREATE INDEX IF NOT EXISTS idx_students_location ON students(location);

-- Authorized users indexes
CREATE INDEX IF NOT EXISTS idx_authorized_users_email ON authorized_users(email);
CREATE INDEX IF NOT EXISTS idx_authorized_users_role ON authorized_users(role);
CREATE INDEX IF NOT EXISTS idx_authorized_users_created_at ON authorized_users(created_at DESC);

-- Question bank indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_question_bank_times_asked ON question_bank(times_asked);
CREATE INDEX IF NOT EXISTS idx_question_bank_favorite ON question_bank(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_question_bank_created_at ON question_bank(created_at DESC);

-- Interviews table indexes
CREATE INDEX IF NOT EXISTS idx_interviews_student_id ON interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_session_id ON interviews(session_id);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);
CREATE INDEX IF NOT EXISTS idx_interviews_verdict ON interviews(verdict);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_student_session ON interviews(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_interviews_student_session_created ON interviews(student_id, session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_created ON interviews(interviewer_id, created_at DESC);

-- Interview questions indexes
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_score ON interview_questions(correctness_score);
CREATE INDEX IF NOT EXISTS idx_interview_questions_locked_by ON interview_questions(locked_by);

-- Question performance indexes
CREATE INDEX IF NOT EXISTS idx_question_performance_question_id ON question_performance(question_id);
CREATE INDEX IF NOT EXISTS idx_question_performance_student_id ON question_performance(student_id);

-- Interview sessions indexes
CREATE INDEX IF NOT EXISTS idx_interview_sessions_name ON interview_sessions(name);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_location ON interview_sessions(location);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_school_id ON interview_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_location_id ON interview_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_examination_mode_id ON interview_sessions(examination_mode_id);

-- Session panelists indexes
CREATE INDEX IF NOT EXISTS idx_session_panelists_session_id ON session_panelists(session_id);
CREATE INDEX IF NOT EXISTS idx_session_panelists_user_id ON session_panelists(user_id);

-- Student sessions indexes
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_session_id ON student_sessions(session_id);

-- Consolidation table indexes
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_student ON interview_consolidation(student_id);
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_session ON interview_consolidation(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_status ON interview_consolidation(status);
CREATE INDEX IF NOT EXISTS idx_interview_consolidation_last_interview ON interview_consolidation(last_interview_at DESC);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint ON audit_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_errors ON audit_logs(created_at, error_message) 
WHERE success = false OR error_message IS NOT NULL;

-- Email templates indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);

-- SMS templates indexes
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_by ON sms_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_at ON sms_templates(created_at DESC);

-- Email logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_logs_consolidation_id ON email_logs(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

-- ============================================================================
-- PART 7: SEED DATA
-- ============================================================================

-- Insert default authorized users
INSERT INTO authorized_users (email, name, role, is_superadmin) 
VALUES 
    ('miraculine.j@zohocorp.com', 'Miraculine J', 'superadmin', TRUE),
    ('rajendran@zohocorp.com', 'Rajendran', 'admin', FALSE)
ON CONFLICT (email) DO NOTHING;

-- Insert schools with short codes
INSERT INTO schools (school_name, short_code) VALUES
    ('School of Business', 'SB'),
    ('School of Tech', 'ST'),
    ('School of Design', 'SD')
ON CONFLICT (school_name) DO UPDATE SET short_code = EXCLUDED.short_code;

-- Insert locations with short codes
INSERT INTO locations (location_name, short_code) VALUES
    ('Tenkasi', 'TK'),
    ('Tharuvai', 'TH'),
    ('Chennai', 'CH'),
    ('Kumbakonam', 'KK')
ON CONFLICT (location_name) DO UPDATE SET short_code = EXCLUDED.short_code;

-- Insert examination modes with short codes
INSERT INTO examination_mode (mode, short_code) VALUES
    ('Regular', 'RE'),
    ('Examless', 'EX'),
    ('Zestober', 'ZE'),
    ('Family Outreach', 'FO'),
    ('Outreach', 'OR')
ON CONFLICT (mode) DO UPDATE SET short_code = EXCLUDED.short_code;

-- ============================================================================
-- PART 8: FUNCTIONS AND VIEWS
-- ============================================================================

-- Function to calculate success rate from average score
CREATE OR REPLACE FUNCTION calculate_success_rate(avg_score DECIMAL) 
RETURNS DECIMAL AS $$
BEGIN
    IF avg_score IS NULL OR avg_score = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((avg_score / 10.0) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for audit logs summary
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT 
    DATE(created_at) as log_date,
    action_type,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(response_time_ms) as avg_response_time_ms,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM audit_logs 
GROUP BY DATE(created_at), action_type
ORDER BY log_date DESC, action_type;

-- ============================================================================
-- PART 9: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all user actions, API requests, and system events';
COMMENT ON COLUMN audit_logs.action_type IS 'Category of action: API_REQUEST, USER_ACTION, ERROR, etc.';
COMMENT ON COLUMN audit_logs.action_name IS 'Specific action name or API endpoint';
COMMENT ON COLUMN audit_logs.correlation_id IS 'Links related requests together';
COMMENT ON COLUMN audit_logs.response_time_ms IS 'API response time in milliseconds';
COMMENT ON COLUMN audit_logs.metadata IS 'Flexible JSON field for additional context';
COMMENT ON VIEW audit_logs_summary IS 'Daily summary of audit log activity by action type';
COMMENT ON COLUMN interview_questions.question_rich_content IS 'HTML content from rich text editor, may include images and formatting';
COMMENT ON COLUMN interview_questions.correctness_score IS 'Score from 0-10 indicating how well the question was answered';
COMMENT ON COLUMN question_bank.tags IS 'Array of hashtags for flexible question categorization';
COMMENT ON COLUMN question_bank.total_score IS 'Sum of all correctness_score values for this question';
COMMENT ON COLUMN question_bank.average_score IS 'Average score (total_score / times_asked)';
COMMENT ON FUNCTION calculate_success_rate IS 'Converts average score (1-10) to success rate percentage (0-100)';
COMMENT ON TABLE email_templates IS 'Stores email templates for sending notifications';
COMMENT ON TABLE sms_templates IS 'Stores SMS templates for sending text messages';
COMMENT ON TABLE email_logs IS 'Stores logs of all emails sent, failed, or drafted through the system';
COMMENT ON COLUMN email_logs.status IS 'Status of email: sent, failed, or drafted';

-- ============================================================================
-- PART 10: ANALYZE TABLES FOR QUERY OPTIMIZATION
-- ============================================================================

ANALYZE interviews;
ANALYZE interview_questions;
ANALYZE question_bank;
ANALYZE students;
ANALYZE interview_sessions;
ANALYZE authorized_users;
ANALYZE audit_logs;
ANALYZE interview_consolidation;
ANALYZE email_logs;
ANALYZE email_templates;
ANALYZE sms_templates;

-- ============================================================================
-- COMPLETE DATABASE REPLICATION SCRIPT FINISHED
-- ============================================================================
-- The database schema is now complete with all tables, indexes, constraints,
-- seed data, functions, and views.
-- ============================================================================

