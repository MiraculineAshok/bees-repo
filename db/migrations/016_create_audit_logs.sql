-- Migration 016: Create audit logs table
-- This table will store all user actions, API requests, responses, and errors

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    
    -- User Information
    user_id INTEGER REFERENCES authorized_users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    
    -- Request Information
    action_type VARCHAR(100) NOT NULL, -- 'API_REQUEST', 'USER_ACTION', 'ERROR', 'LOGIN', 'LOGOUT', etc.
    action_name VARCHAR(255) NOT NULL, -- 'GET /api/interviews', 'CREATE_INTERVIEW', 'LOGIN_SUCCESS', etc.
    
    -- HTTP Request Details
    method VARCHAR(10), -- GET, POST, PUT, DELETE
    endpoint VARCHAR(500), -- Full API endpoint
    request_headers JSONB, -- Request headers
    request_body JSONB, -- Request payload
    query_params JSONB, -- URL query parameters
    
    -- HTTP Response Details
    status_code INTEGER, -- HTTP status code (200, 404, 500, etc.)
    response_body JSONB, -- Response payload
    response_headers JSONB, -- Response headers
    response_time_ms INTEGER, -- Response time in milliseconds
    
    -- Error Information
    error_message TEXT, -- Error message if any
    error_stack TEXT, -- Full error stack trace
    error_code VARCHAR(50), -- Custom error codes
    
    -- Additional Context
    ip_address INET, -- Client IP address
    user_agent TEXT, -- Browser/client user agent
    session_id VARCHAR(255), -- Session identifier
    correlation_id VARCHAR(255), -- For tracking related requests
    
    -- Resource Information
    resource_type VARCHAR(100), -- 'INTERVIEW', 'QUESTION', 'USER', 'SESSION', etc.
    resource_id VARCHAR(255), -- ID of the resource being acted upon
    
    -- Metadata
    success BOOLEAN DEFAULT true, -- Whether the action was successful
    metadata JSONB, -- Additional flexible data
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    CONSTRAINT audit_logs_action_type_check CHECK (action_type IN (
        'API_REQUEST', 'USER_ACTION', 'ERROR', 'LOGIN', 'LOGOUT', 
        'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'IMPORT'
    ))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint ON audit_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status_code ON audit_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id);

-- Create a partial index for errors only
CREATE INDEX IF NOT EXISTS idx_audit_logs_errors ON audit_logs(created_at, error_message) 
WHERE success = false OR error_message IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit log for all user actions, API requests, and system events';
COMMENT ON COLUMN audit_logs.action_type IS 'Category of action: API_REQUEST, USER_ACTION, ERROR, etc.';
COMMENT ON COLUMN audit_logs.action_name IS 'Specific action name or API endpoint';
COMMENT ON COLUMN audit_logs.correlation_id IS 'Links related requests together';
COMMENT ON COLUMN audit_logs.response_time_ms IS 'API response time in milliseconds';
COMMENT ON COLUMN audit_logs.metadata IS 'Flexible JSON field for additional context';

-- Create a function to clean up old audit logs (optional)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for common audit queries
CREATE OR REPLACE VIEW audit_logs_summary AS
SELECT 
    DATE(created_at) as log_date,
    action_type,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(response_time_ms) as avg_response_time_ms,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM audit_logs 
GROUP BY DATE(created_at), action_type
ORDER BY log_date DESC, action_type;

COMMENT ON VIEW audit_logs_summary IS 'Daily summary of audit log activity by action type';
