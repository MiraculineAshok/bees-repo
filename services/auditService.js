/**
 * Audit Service - Comprehensive logging for all user actions and system events
 */

const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

class AuditService {
    /**
     * Log any audit event (API requests, user actions, errors, etc.)
     * @param {Object} auditData - The audit log data
     */
    static async logAudit(auditData) {
        try {
            const {
                // User Information
                userId = null,
                userEmail = null,
                userRole = null,
                
                // Action Information
                actionType, // Required: 'API_REQUEST', 'USER_ACTION', 'ERROR', etc.
                actionName, // Required: Specific action name
                
                // HTTP Request/Response
                method = null,
                endpoint = null,
                requestHeaders = null,
                requestBody = null,
                queryParams = null,
                statusCode = null,
                responseBody = null,
                responseHeaders = null,
                responseTimeMs = null,
                
                // Error Information
                errorMessage = null,
                errorStack = null,
                errorCode = null,
                
                // Context
                ipAddress = null,
                userAgent = null,
                sessionId = null,
                correlationId = null,
                
                // Resource
                resourceType = null,
                resourceId = null,
                
                // Metadata
                success = true,
                metadata = null
            } = auditData;

            // Validate required fields
            if (!actionType || !actionName) {
                console.error('❌ AuditService: actionType and actionName are required');
                return null;
            }

            const query = `
                INSERT INTO audit_logs (
                    user_id, user_email, user_role,
                    action_type, action_name,
                    method, endpoint, request_headers, request_body, query_params,
                    status_code, response_body, response_headers, response_time_ms,
                    error_message, error_stack, error_code,
                    ip_address, user_agent, session_id, correlation_id,
                    resource_type, resource_id,
                    success, metadata
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
                ) RETURNING id, created_at
            `;

            const values = [
                userId, userEmail, userRole,
                actionType, actionName,
                method, endpoint, 
                requestHeaders ? JSON.stringify(requestHeaders) : null,
                requestBody ? JSON.stringify(requestBody) : null,
                queryParams ? JSON.stringify(queryParams) : null,
                statusCode, 
                responseBody ? JSON.stringify(responseBody) : null,
                responseHeaders ? JSON.stringify(responseHeaders) : null,
                responseTimeMs,
                errorMessage, errorStack, errorCode,
                ipAddress, userAgent, sessionId, correlationId,
                resourceType, resourceId,
                success, 
                metadata ? JSON.stringify(metadata) : null
            ];

            const result = await pool.query(query, values);
            
            // Don't log successful audit logs to avoid noise, only log errors
            if (!success || errorMessage) {
                console.log(`📝 Audit logged: ${actionType} - ${actionName} (ID: ${result.rows[0].id})`);
            }
            
            return result.rows[0];
        } catch (error) {
            // Even audit logging can fail, so we need to handle this gracefully
            console.error('❌ Failed to log audit entry:', error.message);
            console.error('   Original audit data:', JSON.stringify(auditData, null, 2));
            return null;
        }
    }

    /**
     * Log API requests and responses
     */
    static async logAPIRequest(req, res, responseTime, error = null) {
        const correlationId = req.correlationId || uuidv4();
        
        // Extract user information from request (enriched by middleware)
        const userEmail = req.userEmail || req.query.email || req.headers['x-user-email'] || null;
        const userId = req.userId || null;
        const userRole = req.userRole || null;
        
        console.log('📝 Logging API request:', {
            method: req.method,
            endpoint: req.originalUrl,
            userId,
            userEmail,
            userRole,
            statusCode: res.statusCode,
            responseTime,
            hasError: !!error
        });

        // Sanitize sensitive data
        const sanitizedHeaders = this.sanitizeHeaders(req.headers);
        const sanitizedBody = this.sanitizeRequestBody(req.body);
        const sanitizedResponse = this.sanitizeResponseBody(res.locals.responseBody);

        return await this.logAudit({
            userId,
            userEmail,
            userRole,
            actionType: 'API_REQUEST',
            actionName: `${req.method} ${req.originalUrl}`,
            method: req.method,
            endpoint: req.originalUrl,
            requestHeaders: sanitizedHeaders,
            requestBody: sanitizedBody,
            queryParams: req.query,
            statusCode: res.statusCode,
            responseBody: sanitizedResponse,
            responseTimeMs: responseTime,
            errorMessage: error ? error.message : null,
            errorStack: error ? error.stack : null,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            correlationId,
            success: !error && res.statusCode < 400
        });
    }

    /**
     * Log user actions (login, logout, create interview, etc.)
     */
    static async logUserAction(actionName, userId, userEmail, userRole, metadata = null, resourceType = null, resourceId = null) {
        return await this.logAudit({
            userId,
            userEmail,
            userRole,
            actionType: 'USER_ACTION',
            actionName,
            resourceType,
            resourceId,
            metadata,
            success: true
        });
    }

    /**
     * Log errors and exceptions
     */
    static async logError(error, context = {}) {
        const {
            userId = null,
            userEmail = null,
            userRole = null,
            actionName = 'SYSTEM_ERROR',
            endpoint = null,
            method = null,
            resourceType = null,
            resourceId = null,
            correlationId = null
        } = context;

        return await this.logAudit({
            userId,
            userEmail,
            userRole,
            actionType: 'ERROR',
            actionName,
            method,
            endpoint,
            errorMessage: error.message,
            errorStack: error.stack,
            errorCode: error.code || error.name,
            resourceType,
            resourceId,
            correlationId,
            success: false,
            metadata: {
                errorName: error.name,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Log authentication events
     */
    static async logAuth(actionName, userEmail, success, metadata = null, ipAddress = null, userAgent = null) {
        return await this.logAudit({
            userEmail,
            actionType: actionName.includes('LOGIN') ? 'LOGIN' : 'LOGOUT',
            actionName,
            ipAddress,
            userAgent,
            success,
            metadata
        });
    }

    /**
     * Get audit logs with filtering and pagination
     */
    static async getAuditLogs(filters = {}) {
        try {
            const {
                userId = null,
                userEmail = null,
                actionType = null,
                startDate = null,
                endDate = null,
                success = null,
                limit = 100,
                offset = 0,
                orderBy = 'created_at',
                orderDirection = 'DESC'
            } = filters;

            let whereConditions = [];
            let values = [];
            let paramIndex = 1;

            if (userId) {
                whereConditions.push(`user_id = $${paramIndex++}`);
                values.push(userId);
            }

            if (userEmail) {
                whereConditions.push(`user_email ILIKE $${paramIndex++}`);
                values.push(`%${userEmail}%`);
            }

            if (actionType) {
                whereConditions.push(`action_type = $${paramIndex++}`);
                values.push(actionType);
            }

            if (startDate) {
                whereConditions.push(`created_at >= $${paramIndex++}`);
                values.push(startDate);
            }

            if (endDate) {
                whereConditions.push(`created_at <= $${paramIndex++}`);
                values.push(endDate);
            }

            if (success !== null) {
                whereConditions.push(`success = $${paramIndex++}`);
                values.push(success);
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
            
            const query = `
                SELECT 
                    id, user_id, user_email, user_role,
                    action_type, action_name,
                    method, endpoint, status_code, response_time_ms,
                    error_message, ip_address, user_agent,
                    resource_type, resource_id,
                    success, created_at
                FROM audit_logs 
                ${whereClause}
                ORDER BY ${orderBy} ${orderDirection}
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;

            values.push(limit, offset);

            const result = await pool.query(query, values);

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
            const countResult = await pool.query(countQuery, values.slice(0, -2)); // Remove limit and offset

            return {
                logs: result.rows,
                total: parseInt(countResult.rows[0].total),
                limit,
                offset
            };
        } catch (error) {
            console.error('❌ Error fetching audit logs:', error);
            throw error;
        }
    }

    /**
     * Get audit statistics
     */
    static async getAuditStats(days = 30) {
        try {
            const query = `
                SELECT 
                    action_type,
                    COUNT(*) as total_count,
                    COUNT(*) FILTER (WHERE success = false) as error_count,
                    COUNT(DISTINCT user_id) as unique_users,
                    AVG(response_time_ms) as avg_response_time
                FROM audit_logs 
                WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
                GROUP BY action_type
                ORDER BY total_count DESC
            `;

            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('❌ Error fetching audit stats:', error);
            throw error;
        }
    }

    /**
     * Sanitize request headers to remove sensitive information
     */
    static sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
        
        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Sanitize request body to remove sensitive information
     */
    static sanitizeRequestBody(body) {
        if (!body || typeof body !== 'object') return body;
        
        const sanitized = { ...body };
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Sanitize response body to remove sensitive information
     */
    static sanitizeResponseBody(body) {
        if (!body || typeof body !== 'object') return body;
        
        const sanitized = { ...body };
        const sensitiveFields = ['token', 'secret', 'key', 'password'];
        
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Clean up old audit logs
     */
    static async cleanupOldLogs(daysToKeep = 90) {
        try {
            const result = await pool.query('SELECT cleanup_old_audit_logs($1)', [daysToKeep]);
            const deletedCount = result.rows[0].cleanup_old_audit_logs;
            console.log(`🧹 Cleaned up ${deletedCount} old audit logs (older than ${daysToKeep} days)`);
            return deletedCount;
        } catch (error) {
            console.error('❌ Error cleaning up audit logs:', error);
            throw error;
        }
    }
}

module.exports = AuditService;
