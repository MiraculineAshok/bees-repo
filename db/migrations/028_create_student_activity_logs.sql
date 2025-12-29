-- Create student_activity_logs table to track all actions for students per session
CREATE TABLE IF NOT EXISTS student_activity_logs (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'round_started', 'email_sent', 'interview_cancelled', 'interview_completed', 'verdict_given', 'status_updated', etc.
    activity_description TEXT NOT NULL, -- Human-readable description like "Round 1 started", "Email sent to student", etc.
    metadata JSONB, -- Additional data like email_id, interview_id, round_number, etc.
    performed_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_student_id ON student_activity_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_session_id ON student_activity_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_student_session ON student_activity_logs(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_activity_type ON student_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_student_activity_logs_created_at ON student_activity_logs(created_at DESC);

COMMENT ON TABLE student_activity_logs IS 'Tracks all activities/actions for students mapped to sessions';
COMMENT ON COLUMN student_activity_logs.activity_type IS 'Type of activity: round_started, email_sent, interview_cancelled, interview_completed, verdict_given, status_updated, etc.';
COMMENT ON COLUMN student_activity_logs.activity_description IS 'Human-readable description of the activity';
COMMENT ON COLUMN student_activity_logs.metadata IS 'Additional JSON data like email_id, interview_id, round_number, etc.';

