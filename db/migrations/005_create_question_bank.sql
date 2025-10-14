-- Migration: Create question bank table
-- Description: Creates a table to store preloaded questions with categories and usage tracking

CREATE TABLE IF NOT EXISTS question_bank (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    times_asked INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on category for faster queries
CREATE INDEX IF NOT EXISTS idx_question_bank_category ON question_bank(category);

-- Removed sample inserts to prevent duplicate seeding. Use UI or bulk import instead.
