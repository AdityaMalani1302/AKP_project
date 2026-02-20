/**
 * Performance Monitoring Middleware
 * Tracks API response times and logs slow requests
 */

const logger = require('../utils/logger');

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
    WARNING: 1000,  // Log warning if response takes > 1 second
    ERROR: 5000,    // Log error if response takes > 5 seconds
    CRITICAL: 10000 // Log critical if response takes > 10 seconds
};

/**
 * Performance monitoring middleware
 * Tracks request duration and logs slow requests
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
 */
const performanceMonitor = (req, res, next) => {
    const startTime = process.hrtime();
    const startTimeMs = Date.now();

    // Store start time in request for potential use in other middleware
    req.startTime = startTimeMs;

    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
        // Restore original end function
        res.end = originalEnd;
        res.end(chunk, encoding);

        // Calculate duration
        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1000 + diff[1] / 1000000).toFixed(2);

        // Log performance data
        const logData = {
            method: req.method,
            url: req.originalUrl || req.url,
            statusCode: res.statusCode,
            duration: `${durationMs}ms`,
            userAgent: req.get('user-agent'),
            ip: req.ip || req.connection.remoteAddress
        };

        // Add user info if available
        if (req.user) {
            logData.userId = req.user.id;
            logData.username = req.user.username;
        }

        // Log based on duration thresholds
        if (durationMs > THRESHOLDS.CRITICAL) {
            logger.error(`[PERFORMANCE] CRITICAL: Slow request`, logData);
        } else if (durationMs > THRESHOLDS.ERROR) {
            logger.error(`[PERFORMANCE] Slow request`, logData);
        } else if (durationMs > THRESHOLDS.WARNING) {
            logger.warn(`[PERFORMANCE] Slow request`, logData);
        } else {
            logger.info(`[PERFORMANCE] Request completed`, logData);
        }
    };

    next();
};

/**
 * Get performance statistics (for health checks)
 * @returns {Object} Performance statistics
 */
const getPerformanceStats = () => {
    // This could be extended to track average response times, etc.
    return {
        thresholds: THRESHOLDS,
        timestamp: new Date().toISOString()
    };
};

module.exports = {
    performanceMonitor,
    getPerformanceStats,
    THRESHOLDS
};
