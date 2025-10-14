-- Cleanup script for "Face to Face for St Mary's School" session
-- This script removes the unwanted session that was being created automatically

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

-- Check if any interviews are using this session
SELECT 
    i.id as interview_id,
    i.student_id,
    i.session_id,
    s.name as session_name
FROM interviews i
JOIN interview_sessions s ON i.session_id = s.id
WHERE s.name = 'Face to Face for St Mary''s School';

-- Delete the session (this will also delete any interviews linked to it due to CASCADE)
-- WARNING: This will delete all interviews associated with this session
DELETE FROM interview_sessions 
WHERE name = 'Face to Face for St Mary''s School';

-- Verify the cleanup
SELECT 
    id, 
    name, 
    description, 
    status, 
    created_by, 
    created_at
FROM interview_sessions 
WHERE name = 'Face to Face for St Mary''s School';

-- Show remaining sessions
SELECT 
    id, 
    name, 
    description, 
    status, 
    created_by, 
    created_at
FROM interview_sessions 
ORDER BY created_at;
