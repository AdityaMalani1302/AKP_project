const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { JWT, SQL_ERROR_CODES } = require('../config/constants');
const { getCookieOptions } = require('../utils/cookieHelpers');
const { logActivity } = require('./activityLogController');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = JWT.EXPIRES_IN;

/**
 * Auth Controller
 * Handles authentication operations (Register, Login, Logout, GetMe)
 */
const authController = {
    /**
     * Registers a new user (Admin only).
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    register: async (req, res) => {
    const { username, password, fullName, role, allowedPages } = req.body;
    if (!username || !password || !fullName) {
        return res.status(400).json({ error: 'Username, password, and full name required' });
    }

    const userRole = role || 'employee';
    const pagesString = userRole === 'admin' ? 'all' : (allowedPages && allowedPages.length > 0 ? allowedPages.join(',') : '');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await req.db.request().query`
            INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive, AllowedPages)
            VALUES (${username}, ${hashedPassword}, ${fullName}, ${userRole}, 1, ${pagesString})
        `;
        
        logger.info(`User registered successfully: ${username} by ${req.user.username}`);
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        logger.error('Registration error:', err);
        if (err.number === SQL_ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION) { // Unique constraint violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
},

/**
 * Authenticates a user and issues a JWT token.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
login: async (req, res) => {
    const { username, password } = req.body;
    // Validation is done by middleware in the route before calling this

    try {
        const result = await req.db.request().query`SELECT * FROM Users WHERE Username = ${username} AND IsActive = 1`;
        const user = result.recordset[0];

        if (!user) {
            logger.warn(`Failed login attempt for username: ${username}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            logger.warn(`Failed login attempt for username: ${username} (Invalid Password)`);
            // Log failed login attempt
            const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            logActivity(req.db, user.Id, 'LOGIN_FAILED', 'Login failed - Invalid password', 'FAILURE', null, clientIP, req.headers['user-agent']);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Parse allowedPages from database
        const allowedPages = user.AllowedPages ? user.AllowedPages.split(',') : [];

        const token = jwt.sign({
            id: user.Id,
            username: user.Username,
            role: user.Role
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Set authentication cookie with secure options
        res.cookie('token', token, getCookieOptions(req, 8 * 60 * 60 * 1000)); // 8 hours

        logger.info(`User logged in: ${username}`);
        // Log successful login
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logActivity(req.db, user.Id, 'LOGIN', `User ${username} logged in successfully`, 'SUCCESS', { role: user.Role }, clientIP, req.headers['user-agent']);
        res.json({ success: true, username: user.Username, role: user.Role, allowedPages: allowedPages });
    } catch (err) {
        logger.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
},

/**
 * Logs out the current user by clearing the JWT cookie.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
logout: async (req, res) => {
    // Clear authentication cookie
    res.clearCookie('token', getCookieOptions(req));
    
    // Log logout activity
    if (req.user && req.user.id) {
        const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        logActivity(req.db, req.user.id, 'LOGOUT', `User ${req.user.username} logged out`, 'SUCCESS', null, clientIP, req.headers['user-agent']);
    }
    logger.info('User logged out');
    res.json({ success: true, message: 'Logged out successfully' });
},

/**
 * Gets the current authenticated user's information.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
getMe: async (req, res) => {
    try {
        // Fetch fresh allowedPages from database in case admin updated them
        const result = await req.db.request().query`SELECT AllowedPages, Role FROM Users WHERE Id = ${req.user.id}`;
        const dbUser = result.recordset[0];
        const allowedPages = dbUser?.AllowedPages ? dbUser.AllowedPages.split(',') : [];

        res.json({
            user: {
                ...req.user,
                allowedPages: dbUser?.Role === 'admin' ? ['all'] : allowedPages
            }
        });
    } catch (err) {
        logger.error('Error fetching user details:', err);
        // Fallback to token data
        res.json({ user: req.user });
    }
}
};

module.exports = authController;
