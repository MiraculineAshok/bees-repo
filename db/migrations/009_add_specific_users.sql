-- Add specific users with roles
INSERT INTO users (email, name, role, created_at, updated_at) VALUES
('miraculine.j+bees@zohotest.com', 'Miraculine Bees', 'interviewer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('arunachalam.ra@zohocorp.com', 'Arunachalam RA', 'interviewer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('kannan.bb@zohocorp.com', 'Kannan BB', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;
