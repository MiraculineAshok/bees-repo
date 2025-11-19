-- Migration: Add session_status column to student_sessions table
-- This column tracks the interview round status for each student-session combination

-- Add session_status column
ALTER TABLE student_sessions 
ADD COLUMN IF NOT EXISTS session_status VARCHAR(50) DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN student_sessions.session_status IS 'Tracks interview round status (e.g., "round 1 started", "round 1 ended", "round 2 started", etc.)';

