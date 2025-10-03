-- Comprehensive fix for all foreign key constraints to reference authorized_users instead of users
-- This migration ensures all tables properly reference the authorized_users table

-- 1. Fix interviewer_favorites table
ALTER TABLE interviewer_favorites DROP CONSTRAINT IF EXISTS interviewer_favorites_interviewer_id_fkey;
ALTER TABLE interviewer_favorites 
ADD CONSTRAINT interviewer_favorites_interviewer_id_fkey 
FOREIGN KEY (interviewer_id) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- 2. Fix session_panelists table
ALTER TABLE session_panelists DROP CONSTRAINT IF EXISTS session_panelists_user_id_fkey;
ALTER TABLE session_panelists 
ADD CONSTRAINT session_panelists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- 3. Fix interview_sessions table
ALTER TABLE interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_created_by_fkey;
ALTER TABLE interview_sessions 
ADD CONSTRAINT interview_sessions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- 4. Fix interviews table (if not already done)
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;
ALTER TABLE interviews 
ADD CONSTRAINT interviews_interviewer_id_fkey 
FOREIGN KEY (interviewer_id) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- Verify all constraints were updated correctly
SELECT 
    tc.table_name,
    tc.constraint_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'authorized_users'
ORDER BY tc.table_name, kcu.column_name;
