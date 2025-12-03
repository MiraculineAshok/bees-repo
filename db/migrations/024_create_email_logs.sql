-- Migration: Create email_logs table
-- Description: Creates table to store email logs for tracking sent, failed, and drafted emails

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    from_email VARCHAR(255) NOT NULL,
    to_emails TEXT NOT NULL,
    cc_emails TEXT,
    bcc_emails TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'drafted', -- 'sent', 'failed', 'drafted'
    error_message TEXT,
    consolidation_id INTEGER REFERENCES consolidation(id) ON DELETE SET NULL,
    sent_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_logs_consolidation_id ON email_logs(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);

COMMENT ON TABLE email_logs IS 'Stores logs of all emails sent, failed, or drafted through the system';
COMMENT ON COLUMN email_logs.status IS 'Status of email: sent, failed, or drafted';

