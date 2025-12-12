-- Add meeting_recording_url field to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS meeting_recording_url VARCHAR(500);

-- Add comment to document the field
COMMENT ON COLUMN interviews.meeting_recording_url IS 'URL for the meeting recording (e.g., Zoom recording, Google Meet recording link)';

