const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { loginSchema, validateBody } = require('../utils/validators');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h';

// --- Routes ---

// Register (Admin Only)
router.post('/register', verifyToken, requireRole('admin'), async (req, res) => {
    const { username, password, fullName, role, allowedPages } = req.body;
    if (!username || !password || !fullName) return res.status(400).json({ error: 'Username, password, and full name required' });

    const userRole = role || 'employee';
    // For admins, always grant all pages; for employees, use the selected pages
    const pagesString = userRole === 'admin' ? 'all' : (allowedPages && allowedPages.length > 0 ? allowedPages.join(',') : '');

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await req.db.request().query`
            INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive, AllowedPages)
            VALUES (${username}, ${hashedPassword}, ${fullName}, ${userRole}, 1, ${pagesString})
        `;
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.number === 2627) { // Unique constraint violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login - validateBody validates and sanitizes input via Zod
router.post('/login', validateBody(loginSchema), async (req, res) => {
    const { username, password } = req.body;
    // Validation already done by middleware, proceed directly

    try {
        const result = await req.db.request().query`SELECT * FROM Users WHERE Username = ${username} AND IsActive = 1`;
        const user = result.recordset[0];

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        // Parse allowedPages from database
        const allowedPages = user.AllowedPages ? user.AllowedPages.split(',') : [];

        const token = jwt.sign({
            id: user.Id,
            username: user.Username,
            role: user.Role
            // allowedPages removed to reduce token size and force DB lookup
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // For cross-origin deployment (frontend and backend on different domains)
        // sameSite: 'none' + secure: true is required
        const frontendUrl = process.env.FRONTEND_URL || '';
        const isCloudDeployment = frontendUrl.includes('vercel.app') || 
                                   frontendUrl.includes('akpfoundries.com') ||
                                   req.get('origin')?.includes('akpfoundries.com');
        
        res.cookie('token', token, {
            httpOnly: true,
            // secure must be true for sameSite: 'none'
            secure: isCloudDeployment || req.secure || req.protocol === 'https',
            // Use 'none' for cross-origin (cloud), 'lax' for same-origin (local)
            sameSite: isCloudDeployment ? 'none' : 'lax',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.json({ success: true, username: user.Username, role: user.Role, allowedPages: allowedPages });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || '';
    const isCloudDeployment = frontendUrl.includes('vercel.app') || 
                               frontendUrl.includes('akpfoundries.com') ||
                               req.get('origin')?.includes('akpfoundries.com');
    res.clearCookie('token', {
        httpOnly: true,
        secure: isCloudDeployment || req.secure || req.protocol === 'https',
        sameSite: isCloudDeployment ? 'none' : 'lax'
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Me (Check Auth Status)
router.get('/me', verifyToken, async (req, res) => {
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
        console.error('Error fetching user:', err);
        res.json({ user: req.user });
    }
});

module.exports = router;