/**
 * Centralized Error Handler Middleware
 * Place this AFTER all routes in server.js
 */

/**
 * Error handler middleware
 * Add to server.js: app.use(errorHandler);
 */
const errorHandler = (err, req, res, next) => {
    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // SQL Server specific errors
    if (err.name === 'RequestError') {
        statusCode = 400;
        message = 'Database request error';
        console.error('SQL Error:', err.message);
    }

    // Validation errors (Zod)
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Validation error';
        const details = err.errors?.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));
        return res.status(statusCode).json({ error: message, details });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Log error in development
    if (process.env.NODE_ENV !== 'production') {
        console.error('Error:', err.message);
        if (err.stack) console.error('Stack:', err.stack);
    }

    // Send response
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    res.status(404).json({ error: 'Route not found' });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
