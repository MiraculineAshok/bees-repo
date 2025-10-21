/**
 * Pagination utilities for efficient data loading
 */

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Request query parameters
 * @returns {Object} - Parsed pagination parameters
 */
function parsePaginationParams(query) {
    const page = parseInt(query.page) || 1;
    const limit = Math.min(parseInt(query.limit) || 50, 100); // Max 100 items per page
    const offset = (page - 1) * limit;
    
    return { page, limit, offset };
}

/**
 * Create pagination metadata for response
 * @param {number} total - Total count of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
function createPaginationMeta(total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    
    return {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
    };
}

/**
 * Create paginated response
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {Object} - Paginated response object
 */
function createPaginatedResponse(data, total, page, limit) {
    return {
        success: true,
        data,
        pagination: createPaginationMeta(total, page, limit)
    };
}

module.exports = {
    parsePaginationParams,
    createPaginationMeta,
    createPaginatedResponse
};

