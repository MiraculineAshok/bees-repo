-- Add rich content field for questions with images
-- This will store HTML content from the rich text editor

ALTER TABLE interview_questions 
ADD COLUMN IF NOT EXISTS question_rich_content TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN interview_questions.question_rich_content IS 'HTML content from rich text editor, may include images and formatting';

-- For backward compatibility, we'll keep question_text as the plain text version
-- question_rich_content will be the primary field if it contains data

