-- Migration: Create student_sessions junction table for many-to-many relationship
-- This allows students to be mapped to multiple interview sessions

-- Create junction table for student-session mapping
CREATE TABLE IF NOT EXISTS student_sessions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id) -- Prevent duplicate mappings
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_student_sessions_student_id ON student_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_session_id ON student_sessions(session_id);

-- Add comment to document the table
COMMENT ON TABLE student_sessions IS 'Junction table mapping students to interview sessions. A student can be mapped to multiple sessions.';

