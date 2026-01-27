const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');
const logger = require('../utils/logger');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';
const DB_NAME = 'IcSoftVer3'; // Default ERP Database

/**
 * Gets the database connection pool.
 * @returns {import('mssql').ConnectionPool} The database connection pool.
 * @throws {Error} If the database connection is not established.
 */
const getDb = () => {
    const pool = getPool(DB_NAME);
    if (!pool) {
        throw new Error('Database connection not established');
    }
    return pool;
};

/**
 * Registers a new user (Admin only).
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.register = async (req, res) => {
    const { username, password, fullName, role, allowedPages } = req.body;
    if (!username || !password || !fullName) {
        return res.status(400).json({ error: 'Username, password, and full name required' });
    }

    const userRole = role || 'employee';
    const pagesString = userRole === 'admin' ? 'all' : (allowedPages && allowedPages.length > 0 ? allowedPages.join(',') : '');

    try {
        const pool = getDb();
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await pool.request().query`
            INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive, AllowedPages)
            VALUES (${username}, ${hashedPassword}, ${fullName}, ${userRole}, 1, ${pagesString})
        `;
        
        logger.info(`User registered successfully: ${username} by ${req.user.username}`);
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        logger.error('Registration error:', err);
        if (err.message === 'Database connection not established') {
             return res.status(503).json({ error: 'Database service unavailable' });
        }
        if (err.number === 2627) { // Unique constraint violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
};

/**
 * Authenticates a user and issues a JWT token.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.login = async (req, res) => {
    const { username, password } = req.body;
    // Validation is done by middleware in the route before calling this

    try {
        const pool = getDb();
        const result = await pool.request().query`SELECT * FROM Users WHERE Username = ${username} AND IsActive = 1`;
        const user = result.recordset[0];

        if (!user) {
            logger.warn(`Failed login attempt for username: ${username}`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) {
            logger.warn(`Failed login attempt for username: ${username} (Invalid Password)`);
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Parse allowedPages from database
        const allowedPages = user.AllowedPages ? user.AllowedPages.split(',') : [];

        const token = jwt.sign({
            id: user.Id,
            username: user.Username,
            role: user.Role
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Cookie Configuration
        const frontendUrl = process.env.FRONTEND_URL || '';
        const origin = req.get('origin') || '';
        const isCloudDeployment = frontendUrl.includes('vercel.app') || 
                                   frontendUrl.includes('akpfoundries.com') ||
                                   origin.includes('akpfoundries.com') ||
                                   origin.includes('vercel.app') ||
                                   origin.includes('trycloudflare.com');
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: isCloudDeployment || req.secure || req.protocol === 'https',
            sameSite: isCloudDeployment ? 'none' : 'lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        logger.info(`User logged in: ${username}`);
        res.json({ success: true, username: user.Username, role: user.Role, allowedPages: allowedPages });
    } catch (err) {
        logger.error('Login error:', err);
        if (err.message === 'Database connection not established') {
             return res.status(503).json({ error: 'Database service unavailable' });
        }
        res.status(500).json({ error: 'Login failed' });
    }
};

/**
 * Logs out the current user by clearing the JWT cookie.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {void}
 */
exports.logout = (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || '';
    const origin = req.get('origin') || '';
    const isCloudDeployment = frontendUrl.includes('vercel.app') || 
                               frontendUrl.includes('akpfoundries.com') ||
                               origin.includes('akpfoundries.com') ||
                               origin.includes('vercel.app') ||
                               origin.includes('trycloudflare.com');
                               
    res.clearCookie('token', {
        httpOnly: true,
        secure: isCloudDeployment || req.secure || req.protocol === 'https',
        sameSite: isCloudDeployment ? 'none' : 'lax'
    });
    
    // Check if user is logged in before logging logout? 
    // Usually logout is stateless on server besides cookie clearing, but we could log it.
    logger.info('User logged out');
    res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * Gets the current authenticated user's information.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
exports.getMe = async (req, res) => {
    try {
        const pool = getDb();
        // Fetch fresh allowedPages from database in case admin updated them
        const result = await pool.request().query`SELECT AllowedPages, Role FROM Users WHERE Id = ${req.user.id}`;
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
        if (err.message === 'Database connection not established') {
            // Should properly fail if DB is down, or just return from token?
            // Returning from token is safer for UI not to crash entire app if DB blips
            return res.json({ user: req.user });
        }
        // Fallback to token data
        res.json({ user: req.user });
    }
};
