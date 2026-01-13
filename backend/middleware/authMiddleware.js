const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = async (req, res, next) => {
    // Check header or cookie
    const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Access denied: No token provided' });
    }

    try {
        const verified = jwt.verify(token, JWT_SECRET);

        // Fetch fresh permissions from DB
        // We need to support cases where req.db might not be available (though it should be)
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

        // Attach fresh user data to request
        req.user = {
            id: verified.id,
            username: verified.username, // Keep username from token or fetch? Token is fine usually, but safer to trust DB.
            role: user.Role,
            allowedPages: user.Role === 'admin' ? ['all'] : allowedPages
        };

        next();
    } catch (err) {
        console.error('Auth Middleware Error:', err.message);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

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
