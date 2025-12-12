-- Add meeting_url field to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS meeting_url VARCHAR(500);

-- Add comment to document the field
COMMENT ON COLUMN interviews.meeting_url IS 'URL for the interview meeting (e.g., Zoom, Google Meet, Teams link)';

