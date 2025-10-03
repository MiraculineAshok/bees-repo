-- Update interviewer_id foreign key to reference authorized_users instead of users
-- First, drop the existing foreign key constraint
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;

-- Add the new foreign key constraint referencing authorized_users
ALTER TABLE interviews 
ADD CONSTRAINT interviews_interviewer_id_fkey 
FOREIGN KEY (interviewer_id) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- Also update the interviewer_favorites table to reference authorized_users
ALTER TABLE interviewer_favorites DROP CONSTRAINT IF EXISTS interviewer_favorites_interviewer_id_fkey;

ALTER TABLE interviewer_favorites 
ADD CONSTRAINT interviewer_favorites_interviewer_id_fkey 
FOREIGN KEY (interviewer_id) REFERENCES authorized_users(id) ON DELETE CASCADE;

-- Update session_panelists table to reference authorized_users
ALTER TABLE session_panelists DROP CONSTRAINT IF EXISTS session_panelists_user_id_fkey;

ALTER TABLE session_panelists 
ADD CONSTRAINT session_panelists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES authorized_users(id) ON DELETE CASCADE;
