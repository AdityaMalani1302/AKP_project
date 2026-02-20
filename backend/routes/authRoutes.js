const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { loginSchema, validateBody } = require('../utils/validators');
const authController = require('../controllers/authController');

// --- Routes ---

// Register (Admin Only)
router.post('/register', verifyToken, requireRole('admin'), authController.register);

// Login
router.post('/login', validateBody(loginSchema), authController.login);

// Logout (requires authentication)
router.post('/logout', verifyToken, authController.logout);

// Me (Check Auth Status)
router.get('/me', verifyToken, authController.getMe);

module.exports = router;