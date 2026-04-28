const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const activityLogController = require('../controllers/activityLogController');

// All routes require authentication and admin role
router.use(verifyToken, requireRole('admin'));

// GET users for activity log dropdown
router.get('/users', activityLogController.getUsers);

// GET activity logs for a specific user
router.get('/:userId', activityLogController.getActivityLogs);

module.exports = router;
