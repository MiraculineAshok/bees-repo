-- Migration: Change from correct/incorrect to 1-10 scoring system
-- This changes the interview grading system from binary (correct/incorrect) to a 1-10 scale

-- Step 1: Modify interview_questions table
-- Drop the is_correct column and add correctness_score (1-10 scale)
ALTER TABLE interview_questions 
DROP COLUMN IF EXISTS is_correct;

ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS correctness_score INTEGER CHECK (correctness_score >= 1 AND correctness_score <= 10);

COMMENT ON COLUMN interview_questions.correctness_score IS 'Score from 1-10 indicating how well the question was answered';

-- Step 2: Modify question_bank table
-- Remove binary correct/incorrect counters
ALTER TABLE question_bank 
DROP COLUMN IF EXISTS times_answered_correctly,
DROP COLUMN IF EXISTS times_answered_incorrectly;

-- Add columns for score-based statistics
ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_score DECIMAL(4,2) DEFAULT 0.00;

COMMENT ON COLUMN question_bank.total_score IS 'Sum of all correctness_score values for this question';
COMMENT ON COLUMN question_bank.average_score IS 'Average score (total_score / times_asked)';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_interview_questions_score 
ON interview_questions(correctness_score) 
WHERE correctness_score IS NOT NULL;

-- Step 4: Create a function to calculate success rate from average score
-- Success rate = (average_score / 10) * 100
-- Example: average_score of 7.5 = 75% success rate
CREATE OR REPLACE FUNCTION calculate_success_rate(avg_score DECIMAL) 
RETURNS DECIMAL AS $$
BEGIN
    IF avg_score IS NULL OR avg_score = 0 THEN
        RETURN 0;
    END IF;
    RETURN ROUND((avg_score / 10.0) * 100, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_success_rate IS 'Converts average score (1-10) to success rate percentage (0-100)';

