-- Migration script to clean up duplicate interview sessions
-- This script removes duplicate "Face to Face for St Mary's School" sessions
-- keeping only the oldest one

-- First, let's see what we have
SELECT 
    id, 
    name, 
    description, 
    status, 
    created_by, 
    created_at,
    COUNT(*) OVER (PARTITION BY name) as duplicate_count
FROM interview_sessions 
WHERE name = 'Face to Face for St Mary''s School'
ORDER BY created_at;

-- Delete duplicate sessions, keeping only the oldest one
WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC) as rn
    FROM interview_sessions 
    WHERE name = 'Face to Face for St Mary''s School'
)
DELETE FROM interview_sessions 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Verify the cleanup
SELECT 
    id, 
    name, 
    description, 
    status, 
    created_by, 
    created_at
FROM interview_sessions 
WHERE name = 'Face to Face for St Mary''s School'
ORDER BY created_at;

-- Optional: Add a unique constraint to prevent future duplicates
-- (Uncomment if you want to enforce uniqueness at database level)
-- ALTER TABLE interview_sessions ADD CONSTRAINT unique_session_name UNIQUE (name);
