-- Create interviewer_favorites table
CREATE TABLE IF NOT EXISTS interviewer_favorites (
    id SERIAL PRIMARY KEY,
    interviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(interviewer_id, question_id) -- Prevent duplicate favorites
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_interviewer_favorites_interviewer_id ON interviewer_favorites(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviewer_favorites_question_id ON interviewer_favorites(question_id);
