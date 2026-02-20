const logger = require('../utils/logger');
const sql = require('mssql');

/**
 * Activity Log Controller
 * Handles activity log operations (Get logs, Log activity)
 */
const activityLogController = {
    /**
     * Get all users for activity log dropdown
     * @route GET /api/activity-logs/users
     * @access Private (Admin)
     */
    getUsers: async (req, res) => {
        try {
            const result = await req.db.request().query`
                SELECT Id, Username, FullName 
                FROM Users 
                WHERE IsActive = 1
                ORDER BY FullName ASC
            `;
            res.json(result.recordset);
        } catch (err) {
            logger.error('Error fetching users for activity log:', err);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    },

    /**
     * Get activity logs for a specific user
     * @route GET /api/activity-logs/:userId
     * @access Private (Admin)
     */
    getActivityLogs: async (req, res) => {
        const { userId } = req.params;
        const { limit = 50 } = req.query;

        try {
            const result = await req.db.request()
                .input('userId', sql.Int, parseInt(userId))
                .input('limit', sql.Int, parseInt(limit))
                .query(`
                    SELECT TOP (@limit)
                        al.Id,
                        al.UserId,
                        u.Username,
                        u.FullName,
                        al.ActivityType,
                        al.ActivityDescription,
                        al.Status,
                        al.Details,
                        al.IPAddress,
                        al.CreatedAt
                    FROM UserActivityLog al
                    INNER JOIN Users u ON al.UserId = u.Id
                    WHERE al.UserId = @userId
                    ORDER BY al.CreatedAt DESC
                `);

            // Get total count for pagination
            const countResult = await req.db.request()
                .input('userId', sql.Int, parseInt(userId))
                .query(`
                    SELECT COUNT(*) as total FROM UserActivityLog WHERE UserId = @userId
                `);

            logger.info(`Activity logs found: ${result.recordset.length} for userId: ${userId}`);

            res.json({
                logs: result.recordset,
                total: countResult.recordset[0].total,
                limit: parseInt(limit)
            });
        } catch (err) {
            logger.error(`Error fetching activity logs for user ${userId}:`, err);
            res.status(500).json({ error: 'Failed to fetch activity logs' });
        }
    },

    /**
     * Log an activity - Helper function to be used by other controllers
     * @param {object} db - Database connection
     * @param {number} userId - User ID
     * @param {string} activityType - Type of activity (LOGIN, LOGOUT, CREATE, UPDATE, DELETE, etc.)
     * @param {string} activityDescription - Description of the activity
     * @param {string} status - SUCCESS or FAILURE
     * @param {object} details - Additional details as object (will be JSON stringified)
     * @param {string} ipAddress - Client IP address
     * @param {string} userAgent - Client user agent
     */
    logActivity: async (db, userId, activityType, activityDescription, status = 'SUCCESS', details = null, ipAddress = null, userAgent = null) => {
        try {
            const detailsJson = details ? JSON.stringify(details) : null;
            
            await db.request()
                .input('userId', userId)
                .input('activityType', activityType)
                .input('activityDescription', activityDescription)
                .input('status', status)
                .input('details', detailsJson)
                .input('ipAddress', ipAddress)
                .input('userAgent', userAgent)
                .query`
                    INSERT INTO UserActivityLog (UserId, ActivityType, ActivityDescription, Status, Details, IPAddress, UserAgent)
                    VALUES (@userId, @activityType, @activityDescription, @status, @details, @ipAddress, @userAgent)
                `;
            
            logger.debug(`Activity logged: ${activityType} for user ${userId}`);
        } catch (err) {
            // Don't throw - activity logging failure shouldn't break the application
            logger.error('Error logging activity:', err);
        }
    }
};

module.exports = activityLogController;
