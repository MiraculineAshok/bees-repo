-- Migration: Add lock functionality to interview_questions table
-- This allows interviewers to mark questions as private/locked

ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS locked_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_questions_locked_by ON interview_questions(locked_by);

