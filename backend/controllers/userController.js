const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');
const { SQL_ERROR_CODES } = require('../config/constants');
const { invalidateCache } = require('../utils/cache');

/**
 * User Controller
 * Handles user management operations (Get All, Update, Delete)
 */
const userController = {
    /**
     * Get all users
     * @route GET /api/users
     * @access Private (Admin)
     */
    getAllUsers: async (req, res) => {
        try {
            const result = await req.db.request().query`
                SELECT Id, Username, FullName, Role, IsActive, AllowedPages, CreatedAt 
                FROM Users 
                ORDER BY CreatedAt DESC
            `;
            logger.info('Fetched all users');
            res.json(result.recordset);
        } catch (err) {
            logger.error('Error fetching users:', err);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    },

    /**
     * Update a user
     * @route PUT /api/users/:id
     * @access Private (Admin)
     */
    updateUser: async (req, res) => {
        const { id } = req.params;
        const { username, fullName, password, allowedPages } = req.body;

        try {
            const request = req.db.request();
            request.input('id', id);

            // Build dynamic update query
            let updateFields = [];
            
            if (username) {
                request.input('username', username);
                updateFields.push('Username = @username');
            }
            if (fullName) {
                request.input('fullName', fullName);
                updateFields.push('FullName = @fullName');
            }
            if (password) {
                const hashedPassword = await bcrypt.hash(password, 10);
                request.input('password', hashedPassword);
                updateFields.push('PasswordHash = @password');
            }
            if (allowedPages !== undefined) {
                const pagesString = Array.isArray(allowedPages) ? allowedPages.join(',') : allowedPages;
                request.input('allowedPages', pagesString);
                updateFields.push('AllowedPages = @allowedPages');
            }

            if (updateFields.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            const query = `UPDATE Users SET ${updateFields.join(', ')} WHERE Id = @id`;
            const result = await request.query(query);

            if (result.rowsAffected[0] === 0) {
                logger.warn(`Attempted to update non-existent user ID: ${id}`);
                return res.status(404).json({ error: 'User not found' });
            }

            logger.info(`User updated successfully: ID ${id}`);
            // Invalidate users cache after successful update
            invalidateCache('users-list');
            res.json({ success: true, message: 'User updated successfully' });
        } catch (err) {
            logger.error(`Error updating user ID ${id}:`, err);
            if (err.number === SQL_ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            res.status(500).json({ error: 'Failed to update user' });
        }
    },

    /**
     * Delete a user
     * @route DELETE /api/users/:id
     * @access Private (Admin)
     */
    deleteUser: async (req, res) => {
        const { id } = req.params;

        try {
            // First check if user exists and is not an admin
            const checkResult = await req.db.request()
                .input('id', id)
                .query`SELECT Id, Role FROM Users WHERE Id = @id`;

            if (checkResult.recordset.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (checkResult.recordset[0].Role === 'admin') {
                logger.warn(`Attempted to delete admin user ID: ${id}`);
                return res.status(403).json({ error: 'Cannot delete admin users' });
            }

            // Delete the user
            await req.db.request()
                .input('id', id)
                .query`DELETE FROM Users WHERE Id = @id`;

            logger.info(`User deleted successfully: ID ${id}`);
            // Invalidate users cache after successful delete
            invalidateCache('users-list');
            res.json({ success: true, message: 'User deleted successfully' });
        } catch (err) {
            logger.error(`Error deleting user ID ${id}:`, err);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
};

module.exports = userController;
