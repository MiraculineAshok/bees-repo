-- Migration: Add question correctness tracking
-- Description: Adds columns to track correct/incorrect answers and statistics

-- Add correctness column to interview_questions table
ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN DEFAULT NULL;

-- Add correctness statistics columns to question_bank table
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS times_answered_correctly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_answered_incorrectly INTEGER DEFAULT 0;

-- Create index for better performance on correctness queries
CREATE INDEX IF NOT EXISTS idx_interview_questions_is_correct ON interview_questions(is_correct);
CREATE INDEX IF NOT EXISTS idx_question_bank_correctness ON question_bank(times_answered_correctly, times_answered_incorrectly);

-- Update existing questions to have default values
UPDATE question_bank 
SET times_answered_correctly = 0, times_answered_incorrectly = 0 
WHERE times_answered_correctly IS NULL OR times_answered_incorrectly IS NULL;
