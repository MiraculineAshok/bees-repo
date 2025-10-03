-- Database Schema Update Script for Neon Console
-- Run this script in the Neon SQL Editor to update the production database

-- 1. Update foreign key constraint for interviewer_id in interviews table
-- This changes the reference from users table to authorized_users table

-- First, drop the existing foreign key constraint
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;

-- Add the new foreign key constraint pointing to authorized_users
ALTER TABLE interviews 
ADD CONSTRAINT interviews_interviewer_id_fkey 
FOREIGN KEY (interviewer_id) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- 2. Verify the changes
SELECT 
    tc.constraint_name, 
    tc.table_name, 
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
AND tc.table_name='interviews'
AND kcu.column_name='interviewer_id';

-- 3. Check if authorized_users table has the required data
SELECT id, name, email, role FROM authorized_users ORDER BY id;

-- 4. Check current interviews data
SELECT 
    i.id, 
    i.interviewer_id, 
    i.student_id, 
    i.status,
    au.name as interviewer_name,
    au.email as interviewer_email
FROM interviews i
LEFT JOIN authorized_users au ON i.interviewer_id = au.id
ORDER BY i.id;

-- 5. Update any interviews that might have invalid interviewer_id references
-- (This is a safety check - should not be needed if data is correct)
UPDATE interviews 
SET interviewer_id = (
    SELECT id FROM authorized_users 
    WHERE email = 'miraculine.j@zohocorp.com' 
    LIMIT 1
)
WHERE interviewer_id NOT IN (SELECT id FROM authorized_users)
AND interviewer_id IS NOT NULL;

-- 6. Final verification
SELECT 
    'Migration completed successfully' as status,
    COUNT(*) as total_interviews,
    COUNT(CASE WHEN au.id IS NOT NULL THEN 1 END) as interviews_with_valid_interviewer
FROM interviews i
LEFT JOIN authorized_users au ON i.interviewer_id = au.id;
