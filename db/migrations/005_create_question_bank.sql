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

-- Insert sample questions for different categories
INSERT INTO question_bank (question, category) VALUES
-- Math Aptitude Questions
('What is 15% of 200?', 'Math Aptitude'),
('If a train travels 120 km in 2 hours, what is its speed?', 'Math Aptitude'),
('Solve: 2x + 5 = 15', 'Math Aptitude'),
('What is the area of a circle with radius 7 cm?', 'Math Aptitude'),
('If 3x + 2y = 12 and x = 2, find y', 'Math Aptitude'),
('What is the square root of 144?', 'Math Aptitude'),
('If a number is increased by 20% and then decreased by 20%, what is the net change?', 'Math Aptitude'),
('What is the next number in the sequence: 2, 4, 8, 16, ?', 'Math Aptitude'),
('If 5 workers can complete a job in 8 days, how many days will 8 workers take?', 'Math Aptitude'),
('What is the value of 3² + 4²?', 'Math Aptitude'),

-- Generic HR Questions
('Tell me about yourself', 'Generic HR'),
('What are your strengths and weaknesses?', 'Generic HR'),
('Why do you want to work here?', 'Generic HR'),
('Where do you see yourself in 5 years?', 'Generic HR'),
('What motivates you?', 'Generic HR'),
('How do you handle stress?', 'Generic HR'),
('Describe a challenging situation you faced and how you overcame it', 'Generic HR'),
('What is your greatest achievement?', 'Generic HR'),
('How do you work in a team?', 'Generic HR'),
('What are your career goals?', 'Generic HR'),

-- English Questions
('Correct the sentence: "The team are working hard"', 'English'),
('What is the past tense of "run"?', 'English'),
('Identify the error: "She don''t like coffee"', 'English'),
('What is the plural of "child"?', 'English'),
('Complete the sentence: "If I _____ you, I would study harder"', 'English'),
('What is the meaning of "ubiquitous"?', 'English'),
('Correct the spelling: "accomodate"', 'English'),
('What is the opposite of "benevolent"?', 'English'),
('Identify the figure of speech: "The wind whispered through the trees"', 'English'),
('What is the correct form: "Neither John nor Mary _____ present"', 'English'),

-- Technical Questions
('What is the difference between HTTP and HTTPS?', 'Technical'),
('Explain what a database index is', 'Technical'),
('What is version control?', 'Technical'),
('What is the difference between GET and POST requests?', 'Technical'),
('Explain the concept of object-oriented programming', 'Technical'),
('What is the difference between SQL and NoSQL databases?', 'Technical'),
('What is the purpose of an API?', 'Technical'),
('Explain the difference between frontend and backend', 'Technical'),
('What is the difference between a framework and a library?', 'Technical'),
('What is the purpose of testing in software development?', 'Technical'),

-- Problem Solving Questions
('How would you approach solving a complex problem?', 'Problem Solving'),
('Describe a time when you had to think outside the box', 'Problem Solving'),
('How do you prioritize multiple tasks?', 'Problem Solving'),
('What steps would you take to debug a software issue?', 'Problem Solving'),
('How would you handle a difficult client?', 'Problem Solving'),
('Describe a time when you had to learn something new quickly', 'Problem Solving'),
('How do you ensure quality in your work?', 'Problem Solving'),
('What would you do if you disagreed with your manager?', 'Problem Solving'),
('How do you stay updated with industry trends?', 'Problem Solving'),
('Describe a time when you had to work under pressure', 'Problem Solving');
