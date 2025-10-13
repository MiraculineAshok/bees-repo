-- Comprehensive migration script to fix database issues
-- Run this script to clean up any data inconsistencies

-- 1. Clean up duplicate interview sessions
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

-- 2. Fix any NULL created_by values in interview_sessions
-- Set created_by to NULL for sessions that have invalid references
UPDATE interview_sessions 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
  AND created_by NOT IN (SELECT id FROM authorized_users);

-- 3. Ensure all interview_sessions have proper status
UPDATE interview_sessions 
SET status = 'active' 
WHERE status IS NULL OR status = '';

-- 4. Clean up any orphaned session_panelists records
DELETE FROM session_panelists 
WHERE session_id NOT IN (SELECT id FROM interview_sessions);

-- 5. Clean up any orphaned interview_questions records
DELETE FROM interview_questions 
WHERE interview_id NOT IN (SELECT id FROM interviews);

-- 6. Clean up any orphaned interviews records
DELETE FROM interviews 
WHERE student_id NOT IN (SELECT id FROM students)
   OR interviewer_id NOT IN (SELECT id FROM authorized_users)
   OR session_id NOT IN (SELECT id FROM interview_sessions);

-- 7. Verify the cleanup results
SELECT 'interview_sessions' as table_name, COUNT(*) as count FROM interview_sessions
UNION ALL
SELECT 'session_panelists', COUNT(*) FROM session_panelists
UNION ALL
SELECT 'interviews', COUNT(*) FROM interviews
UNION ALL
SELECT 'interview_questions', COUNT(*) FROM interview_questions
UNION ALL
SELECT 'students', COUNT(*) FROM students
UNION ALL
SELECT 'authorized_users', COUNT(*) FROM authorized_users;

-- 8. Show final state of interview sessions
SELECT 
    id, 
    name, 
    description, 
    status, 
    created_by, 
    created_at
FROM interview_sessions 
ORDER BY created_at;
