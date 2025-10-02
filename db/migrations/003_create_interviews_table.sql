-- Create interviews table
CREATE TABLE IF NOT EXISTS interviews (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    interviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interview_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, cancelled
    overall_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create interview_questions table
CREATE TABLE IF NOT EXISTS interview_questions (
    id SERIAL PRIMARY KEY,
    interview_id INTEGER NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    student_answer TEXT,
    answer_photo_url VARCHAR(500), -- URL to stored photo
    question_order INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_interviews_student_id ON interviews(student_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);
