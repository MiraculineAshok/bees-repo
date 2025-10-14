-- Create interview_sessions table for named interviews
CREATE TABLE IF NOT EXISTS interview_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, cancelled
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add session_id to interviews table to link with interview_sessions
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES interview_sessions(id);

-- Create question_performance table to track student answers
CREATE TABLE IF NOT EXISTS question_performance (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    is_correct BOOLEAN,
    answer_text TEXT,
    answer_photo_url TEXT,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_question_performance_question_id ON question_performance(question_id);
CREATE INDEX IF NOT EXISTS idx_question_performance_student_id ON question_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_interviews_session_id ON interviews(session_id);

-- Note: Sample interview session creation removed to prevent automatic duplicates
-- Sessions should be created manually through the admin interface
