-- Migration: Create sms_logs table
-- Description: Creates table to store SMS logs for tracking sent, failed, and drafted SMS messages

-- Create sms_logs table
CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    from_number VARCHAR(20) NOT NULL,
    to_numbers TEXT NOT NULL, -- Comma-separated phone numbers
    message TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'sms', -- 'sms' or 'whatsapp'
    status VARCHAR(20) NOT NULL DEFAULT 'drafted', -- 'sent', 'failed', 'drafted'
    error_message TEXT,
    consolidation_id INTEGER REFERENCES interview_consolidation(id) ON DELETE SET NULL,
    sent_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_by ON sms_logs(sent_by);
CREATE INDEX IF NOT EXISTS idx_sms_logs_consolidation_id ON sms_logs(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_message_type ON sms_logs(message_type);

COMMENT ON TABLE sms_logs IS 'Stores logs of all SMS/WhatsApp messages sent, failed, or drafted through the system';
COMMENT ON COLUMN sms_logs.status IS 'Status of SMS: sent, failed, or drafted';
COMMENT ON COLUMN sms_logs.message_type IS 'Type of message: sms or whatsapp';

