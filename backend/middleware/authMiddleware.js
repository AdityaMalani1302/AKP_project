const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies JWT token from cookies or Authorization header.
 * Attaches user object to request with fresh permissions from database.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>}
 */
const verifyToken = async (req, res, next) => {
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Access denied: No token provided' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);

        if (!req.db) {
            throw new Error('Database connection not available');
        }

        const result = await req.db.request().query`SELECT Role, AllowedPages, IsActive FROM Users WHERE Id = ${verified.id}`;

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'User not found associated with token' });
        }

        const user = result.recordset[0];

        if (!user.IsActive) {
            return res.status(401).json({ error: 'User account is inactive' });
        }

        const allowedPages = user.AllowedPages ? user.AllowedPages.split(',') : [];

        req.user = {
            id: verified.id,
            username: verified.username,
            role: user.Role,
            allowedPages: user.Role === 'admin' ? ['all'] : allowedPages
        };

        next();
    } catch (err) {
        const logger = require('../utils/logger');
        logger.error('Auth Middleware Error:', err);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

/**
 * Middleware factory that requires a specific role for access.
 * @param {string} role - Required role (e.g., 'admin').
 * @returns {import('express').RequestHandler} Express middleware function.
 */
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied: Insufficient permissions' });
        }
    };
};

/**
 * Middleware to require access to a specific page
 * Admins always have access, employees need the page in their allowedPages
 * @param {string} page - The page identifier (e.g., 'pattern-master', 'lab-master')
 */
const requirePage = (page) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Access denied: Not authenticated' });
        }

        // Admins always have access
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user has 'all' permission or the specific page
        const allowedPages = req.user.allowedPages || [];
        if (allowedPages.includes('all') || allowedPages.includes(page)) {
            return next();
        }

        res.status(403).json({ error: 'Access denied: You do not have permission to access this page' });
    };
};

module.exports = { verifyToken, requireRole, requirePage };
