/**
 * Audit Middleware - Automatically logs all API requests, responses, and errors
 */

const AuditService = require('../services/auditService');
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to capture and log all API requests and responses
 */
function auditMiddleware(options = {}) {
    const {
        excludePaths = ['/health', '/favicon.ico', '/logo.png', '/logo1.png'], // Paths to exclude from logging
        excludeStaticAssets = true, // Exclude static assets (CSS, JS, images)
        logRequestBody = true,
        logResponseBody = true,
        maxBodySize = 10000 // Max size of request/response body to log (in characters)
    } = options;

    return async (req, res, next) => {
        const startTime = Date.now();
        const correlationId = uuidv4();
        
        // Add correlation ID to request for tracking
        req.correlationId = correlationId;
        req.startTime = startTime;
        
        // Skip logging for excluded paths
        if (shouldExclude(req.path, excludePaths, excludeStaticAssets)) {
            return next();
        }

        // Enrich request with user information BEFORE route handlers
        try {
            await enrichRequestWithUserInfo(req);
        } catch (error) {
            console.error('❌ Failed to enrich request with user info:', error.message);
        }

        // Capture original response methods
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Override res.send to capture response body
        res.send = function(body) {
            if (logResponseBody && body) {
                res.locals.responseBody = truncateBody(body, maxBodySize);
            }
            return originalSend.call(this, body);
        };

        // Override res.json to capture response body
        res.json = function(obj) {
            if (logResponseBody && obj) {
                res.locals.responseBody = truncateBody(obj, maxBodySize);
            }
            return originalJson.call(this, obj);
        };

        // Capture response finish event
        res.on('finish', async () => {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            try {
                // Log the API request (user info already enriched)
                await AuditService.logAPIRequest(req, res, responseTime);
                
            } catch (error) {
                // Don't let audit logging break the application
                console.error('❌ Audit middleware error:', error.message);
            }
        });

        next();
    };
}

/**
 * Error handling middleware to capture and log errors
 */
function auditErrorMiddleware(error, req, res, next) {
    const endTime = Date.now();
    const responseTime = req.startTime ? endTime - req.startTime : null;
    
    // Log the error asynchronously
    setImmediate(async () => {
        try {
            await enrichRequestWithUserInfo(req);
            await AuditService.logAPIRequest(req, res, responseTime, error);
            
            // Also log as a specific error entry
            await AuditService.logError(error, {
                userId: req.userId,
                userEmail: req.query.email || req.headers['x-user-email'],
                userRole: req.userRole,
                actionName: `ERROR_${req.method}_${req.path}`,
                endpoint: req.originalUrl,
                method: req.method,
                correlationId: req.correlationId
            });
        } catch (auditError) {
            console.error('❌ Audit error middleware failed:', auditError.message);
        }
    });

    // Continue with normal error handling
    next(error);
}

/**
 * Middleware to add user information to request object
 */
async function enrichRequestWithUserInfo(req) {
    try {
        // Skip if already enriched
        if (req.userId && req.userRole && req.userEmail) return;
        
        // Try multiple ways to get user email
        let userEmail = req.query.email || 
                       req.headers['x-user-email'] || 
                       req.body?.email ||
                       req.cookies?.user_email ||
                       (req.session && req.session.user && req.session.user.email) ||
                       req.headers['authorization']?.split(' ')[1]; // Bearer token
        
        // Normalize
        if (userEmail && typeof userEmail === 'string') userEmail = userEmail.trim();
        
        // Try to get from referrer header if it contains email
        if (!userEmail && req.headers.referer) {
            try {
                const urlParams = new URL(req.headers.referer).searchParams;
                userEmail = urlParams.get('email');
            } catch (urlError) {
                // Ignore URL parsing errors
                console.log('❌ Could not parse referrer URL:', req.headers.referer);
            }
        }
        
        console.log('🔍 Enriching request with user info for email:', userEmail);
        console.log('🔍 Request details:', {
            path: req.path,
            query: JSON.stringify(req.query),
            headers: {
                'x-user-email': req.headers['x-user-email'],
                'authorization': req.headers['authorization'] ? 'Bearer [REDACTED]' : undefined,
                'referer': req.headers.referer
            }
        });
        
        if (!userEmail) {
            console.log('❌ No user email found in request');
            return;
        }

        // Get user info from database
        const pool = require('../db/pool');
        const result = await pool.query(
            'SELECT id, email, role FROM authorized_users WHERE email = $1',
            [userEmail]
        );

        if (result.rows.length > 0) {
            req.userId = result.rows[0].id;
            req.userEmail = result.rows[0].email;
            req.userRole = result.rows[0].role;
            console.log('✅ User enriched:', { userId: req.userId, email: req.userEmail, role: req.userRole });
        } else {
            console.log('❌ User not found in database for email:', userEmail);
        }
    } catch (error) {
        // Don't break the request if user enrichment fails
        console.error('❌ Failed to enrich request with user info:', error.message);
    }
}

/**
 * Check if a path should be excluded from audit logging
 */
function shouldExclude(path, excludePaths, excludeStaticAssets) {
    // Check explicit exclusions
    if (excludePaths.includes(path)) {
        return true;
    }

    // Check static assets
    if (excludeStaticAssets) {
        const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf', '.otf'];
        const hasStaticExtension = staticExtensions.some(ext => path.toLowerCase().endsWith(ext));
        if (hasStaticExtension) {
            return true;
        }
    }

    return false;
}

/**
 * Truncate body content if it's too large
 */
function truncateBody(body, maxSize) {
    if (!body) return body;
    
    let bodyString;
    if (typeof body === 'string') {
        bodyString = body;
    } else {
        try {
            bodyString = JSON.stringify(body);
        } catch (error) {
            bodyString = '[UNPARSEABLE_BODY]';
        }
    }
    
    if (bodyString.length > maxSize) {
        return bodyString.substring(0, maxSize) + '... [TRUNCATED]';
    }
    
    return body;
}

/**
 * Middleware to log specific user actions
 */
function logUserAction(actionName, options = {}) {
    return async (req, res, next) => {
        const {
            resourceType = null,
            resourceIdFromParams = null, // e.g., 'id' to get req.params.id
            resourceIdFromBody = null,   // e.g., 'studentId' to get req.body.studentId
            metadata = null
        } = options;

        // Continue with the request first
        next();

        // Log the action asynchronously after response
        setImmediate(async () => {
            try {
                await enrichRequestWithUserInfo(req);
                
                let resourceId = null;
                if (resourceIdFromParams) {
                    resourceId = req.params[resourceIdFromParams];
                } else if (resourceIdFromBody) {
                    resourceId = req.body[resourceIdFromBody];
                }

                await AuditService.logUserAction(
                    actionName,
                    req.userId,
                    req.query.email || req.headers['x-user-email'],
                    req.userRole,
                    metadata,
                    resourceType,
                    resourceId
                );
            } catch (error) {
                console.error('❌ Failed to log user action:', error.message);
            }
        });
    };
}

module.exports = {
    auditMiddleware,
    auditErrorMiddleware,
    logUserAction,
    enrichRequestWithUserInfo
};
