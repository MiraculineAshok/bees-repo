-- Migration: Add short codes to examination_mode and update values
-- Add short_code column to examination_mode table
ALTER TABLE examination_mode 
ADD COLUMN IF NOT EXISTS short_code VARCHAR(10);

-- Update existing examination modes with short codes
UPDATE examination_mode SET short_code = 'RE' WHERE mode = 'Regular';
UPDATE examination_mode SET short_code = 'EX' WHERE mode = 'Examless';
UPDATE examination_mode SET short_code = 'ZE' WHERE mode = 'Zestober';

-- Insert new examination modes if they don't exist
INSERT INTO examination_mode (mode, short_code) VALUES
    ('Regular', 'RE'),
    ('Examless', 'EX'),
    ('Zestober', 'ZE'),
    ('Family Outreach', 'FO'),
    ('Outreach', 'OR')
ON CONFLICT (mode) DO UPDATE SET short_code = EXCLUDED.short_code;

-- Add short_code columns to schools and locations tables
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS short_code VARCHAR(10);

ALTER TABLE locations 
ADD COLUMN IF NOT EXISTS short_code VARCHAR(10);

-- Update schools with short codes
UPDATE schools SET short_code = 'SB' WHERE school_name = 'School of Business';
UPDATE schools SET short_code = 'ST' WHERE school_name = 'School of Tech';
UPDATE schools SET short_code = 'SD' WHERE school_name = 'School of Design';

-- Update locations with short codes
UPDATE locations SET short_code = 'TK' WHERE location_name = 'Tenkasi';
UPDATE locations SET short_code = 'TH' WHERE location_name = 'Tharuvai';
UPDATE locations SET short_code = 'CH' WHERE location_name = 'Chennai';
UPDATE locations SET short_code = 'KK' WHERE location_name = 'Kumbakonam';

