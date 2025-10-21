/**
 * Simple in-memory cache for frequently accessed data
 * For production, consider using Redis or Memcached
 */

class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.ttls = new Map();
    }

    /**
     * Set a cache entry with TTL (time to live)
     * @param {string} key - Cache key
     * @param {*} value - Value to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 5 minutes)
     */
    set(key, value, ttlSeconds = 300) {
        this.cache.set(key, value);
        
        // Set expiration
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.ttls.set(key, expiresAt);
        
        // Schedule cleanup
        setTimeout(() => this.delete(key), ttlSeconds * 1000);
    }

    /**
     * Get a cache entry
     * @param {string} key - Cache key
     * @returns {*} - Cached value or undefined if not found or expired
     */
    get(key) {
        // Check if expired
        const expiresAt = this.ttls.get(key);
        if (expiresAt && Date.now() > expiresAt) {
            this.delete(key);
            return undefined;
        }
        
        return this.cache.get(key);
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        const expiresAt = this.ttls.get(key);
        if (expiresAt && Date.now() > expiresAt) {
            this.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    /**
     * Delete a cache entry
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        this.ttls.delete(key);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        this.ttls.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string|RegExp} pattern - Pattern to match keys
     */
    invalidatePattern(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        const keysToDelete = [];
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => this.delete(key));
        return keysToDelete.length;
    }
}

// Create singleton instance
const cache = new SimpleCache();

module.exports = cache;

