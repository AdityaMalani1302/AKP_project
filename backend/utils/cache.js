const NodeCache = require('node-cache');

// Cache with 5 minute TTL, check expired keys every 2 minutes
// useClones: true to prevent cache corruption from downstream mutations
const cache = new NodeCache({ 
    stdTTL: 300, 
    checkperiod: 120,
    useClones: true
});

/**
 * Middleware to cache API responses
 * @param {string} keyPrefix - Prefix for cache key (e.g., 'customers', 'patterns')
 * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
 */
const cacheMiddleware = (keyPrefix, ttlSeconds = 300) => {
    return async (req, res, next) => {
        // Skip caching for authenticated user-specific requests if needed
        // Create cache key from URL including query params
        const cacheKey = `${keyPrefix}:${req.originalUrl}`;
        
        // Check if we have cached data
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            // Add header to indicate cache hit
            res.set('X-Cache', 'HIT');
            return res.json(cachedData);
        }
        
        // Store original json method
        const originalJson = res.json.bind(res);
        
        // Override json to cache the response before sending
        res.json = (data) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(cacheKey, data, ttlSeconds);
            }
            res.set('X-Cache', 'MISS');
            return originalJson(data);
        };
        
        next();
    };
};

/**
 * Invalidate all cache entries with a given prefix
 * Call this after POST/PUT/DELETE operations
 * @param {string} keyPrefix - Prefix to match (e.g., 'patterns')
 */
const invalidateCache = (keyPrefix) => {
    const keys = cache.keys();
    let invalidated = 0;
    keys.forEach(key => {
        if (key.startsWith(`${keyPrefix}:`)) {
            cache.del(key);
            invalidated++;
        }
    });
    console.log(`Cache invalidated: ${invalidated} entries with prefix '${keyPrefix}'`);
};

module.exports = { 
    cacheMiddleware, 
    invalidateCache
};
