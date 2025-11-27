-- Migration: Create email_templates and sms_templates tables
-- Description: Creates tables to store email and SMS templates for the admin dashboard

-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT NOT NULL,
    created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create sms_templates table
CREATE TABLE IF NOT EXISTS sms_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_by INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_email_templates_created_at ON email_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_by ON sms_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_sms_templates_created_at ON sms_templates(created_at DESC);

COMMENT ON TABLE email_templates IS 'Stores email templates for sending notifications';
COMMENT ON TABLE sms_templates IS 'Stores SMS templates for sending text messages';

