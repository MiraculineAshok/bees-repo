-- ============================================================================
-- MANUAL MIGRATION: Drop obsolete 'users' table
-- ============================================================================
-- Run this directly in Neon DB Console (SQL Editor)
-- This will drop the 'users' and 'user_roles' tables that are causing conflicts
-- ============================================================================

-- Step 1: Check current state
SELECT 'Current user-related tables:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name LIKE '%user%'
ORDER BY table_name;

-- Step 2: Check for foreign key dependencies on users table
SELECT 'Foreign key dependencies on users table:' as status;
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND ccu.table_name = 'users';

-- Step 3: Show sample data from authorized_users (to confirm it's intact)
SELECT 'Sample authorized_users (before migration):' as status;
SELECT id, name, email, role, is_superadmin
FROM authorized_users
ORDER BY id
LIMIT 10;

-- Step 4: Drop the obsolete tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- Step 5: Add comment to authorized_users
COMMENT ON TABLE authorized_users IS 'Single source of truth for all user accounts - includes interviewers, admins, and superadmins';

-- Step 6: Verify cleanup
SELECT 'User-related tables after migration:' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name LIKE '%user%'
ORDER BY table_name;

-- Step 7: Confirm authorized_users data is intact
SELECT 'Sample authorized_users (after migration):' as status;
SELECT id, name, email, role, is_superadmin
FROM authorized_users
ORDER BY id
LIMIT 10;

-- Step 8: Count total users
SELECT 'Total authorized users:' as status;
SELECT COUNT(*) as total_users FROM authorized_users;

SELECT '✅ Migration complete! Only authorized_users table remains.' as status;

