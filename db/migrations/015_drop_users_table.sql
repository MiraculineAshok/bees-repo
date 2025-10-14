-- Migration: Drop obsolete 'users' table
-- The 'authorized_users' table is the single source of truth for user management
-- The 'users' table was causing ID conflicts and confusion

-- Check if there are any foreign key dependencies first
DO $$ 
BEGIN
    -- Drop the users table
    -- Note: This will CASCADE to any dependent objects
    DROP TABLE IF EXISTS users CASCADE;
    
    RAISE NOTICE 'Successfully dropped users table';
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping users table: %', SQLERRM;
END $$;

-- Also drop user_roles table if it exists (seems related to old users table)
DROP TABLE IF EXISTS user_roles CASCADE;

-- Verify cleanup
DO $$
DECLARE
    table_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE '⚠️  users table still exists!';
    ELSE
        RAISE NOTICE '✅ users table successfully removed';
    END IF;
END $$;

COMMENT ON TABLE authorized_users IS 'Single source of truth for all user accounts - includes interviewers, admins, and superadmins';

