-- Migration: Make email and zeta_id optional in students table
-- Only name (first_name, last_name) and phone are now required

-- Make email nullable (optional)
ALTER TABLE students 
ALTER COLUMN email DROP NOT NULL;

-- Make zeta_id nullable (optional)
ALTER TABLE students 
ALTER COLUMN zeta_id DROP NOT NULL;

-- Ensure phone is required (NOT NULL)
ALTER TABLE students 
ALTER COLUMN phone SET NOT NULL;

