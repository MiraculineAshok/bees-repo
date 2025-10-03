-- Create session_panelists table to store panelists for each session
CREATE TABLE IF NOT EXISTS session_panelists (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id) -- Ensure a user can only be added once per session
);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_session_panelists_session_id ON session_panelists(session_id);
CREATE INDEX IF NOT EXISTS idx_session_panelists_user_id ON session_panelists(user_id);
