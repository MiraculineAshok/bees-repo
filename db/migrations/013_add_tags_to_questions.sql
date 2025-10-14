-- Add tags field to question_bank for hashtag-based categorization
-- This replaces the single category approach with flexible multi-tag support

ALTER TABLE question_bank 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add index for better tag search performance
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN (tags);

-- Add comment to explain the column
COMMENT ON COLUMN question_bank.tags IS 'Array of hashtags for flexible question categorization';

-- Optional: Migrate existing categories to tags (if category column exists)
-- UPDATE question_bank 
-- SET tags = ARRAY[category]
-- WHERE category IS NOT NULL AND category != '' AND tags IS NULL;

