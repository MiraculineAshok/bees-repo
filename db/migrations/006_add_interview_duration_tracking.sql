-- Add duration tracking fields to interviews table
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

-- Add user roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'interviewer', -- interviewer, superadmin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Insert default superadmin role (you can change the user_id as needed)
-- This assumes user_id 1 is the superadmin - adjust as needed
INSERT INTO user_roles (user_id, role) 
VALUES (1, 'superadmin') 
ON CONFLICT (user_id) DO NOTHING;
