-- Migration: Create schools, locations, and examination_mode tables
-- Map these tables with interview_sessions

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
    id SERIAL PRIMARY KEY,
    school_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    location_name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create examination_mode table
CREATE TABLE IF NOT EXISTS examination_mode (
    id SERIAL PRIMARY KEY,
    mode VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key columns to interview_sessions table
ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL;

ALTER TABLE interview_sessions 
ADD COLUMN IF NOT EXISTS examination_mode_id INTEGER REFERENCES examination_mode(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_school_id ON interview_sessions(school_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_location_id ON interview_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_examination_mode_id ON interview_sessions(examination_mode_id);

-- Add comments to document the columns
COMMENT ON COLUMN interview_sessions.school_id IS 'References the school associated with this interview session';
COMMENT ON COLUMN interview_sessions.location_id IS 'References the location where this interview session takes place';
COMMENT ON COLUMN interview_sessions.examination_mode_id IS 'References the examination mode for this interview session';

