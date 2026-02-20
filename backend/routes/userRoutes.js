const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');
const { validateBody, userUpdateSchema } = require('../utils/validators');
const userController = require('../controllers/userController');

// All routes require authentication and admin role
router.use(verifyToken, requireRole('admin'));

// GET all users (Admin only) - cached for 60 seconds
router.get('/', cacheMiddleware('users-list', 60), userController.getAllUsers);

// PUT update user (Admin only) - with validation
router.put('/:id', validateBody(userUpdateSchema), userController.updateUser);

// DELETE user (Admin only, cannot delete admins)
router.delete('/:id', userController.deleteUser);

module.exports = router;
