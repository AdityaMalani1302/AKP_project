const rateLimit = require('express-rate-limit');

// Rate limiter for authentication endpoints (login)
// Prevents brute force attacks by limiting login attempts
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 login attempts per window
    message: { 
        error: 'Too many login attempts, please try again after 15 minutes' 
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable X-RateLimit headers
    skipSuccessfulRequests: true, // Don't count successful logins
});

// General API rate limiter (less restrictive)
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: { 
        error: 'Too many requests, please try again later' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
