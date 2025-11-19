-- Migration: Add session_id column to students table for mapping to interview sessions
-- This allows students to be assigned to specific interview sessions during creation or bulk import

-- Add session_id column (nullable, so students can exist without being assigned to a session)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES interview_sessions(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_students_session_id ON students(session_id);

-- Add comment to document the column
COMMENT ON COLUMN students.session_id IS 'References the interview session this student is assigned to. Can be set during student creation or bulk import.';

