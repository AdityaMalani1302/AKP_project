const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { cacheMiddleware } = require('../utils/cache');
const { validateBody, userUpdateSchema } = require('../utils/validators');

// Helper to check for admin role (imported or re-defined if necessary)
// Note: We need to ensure verifyToken and requireRole are applied from the main app or exported from authRoutes
// For now, let's assume they are passed as middleware in server.js or we export them from authRoutes

// GET all users (Admin only) - cached for 60 seconds
router.get('/', cacheMiddleware('users-list', 60), async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT Id, Username, FullName, Role, IsActive, AllowedPages, CreatedAt 
            FROM Users 
            ORDER BY CreatedAt DESC
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// PUT update user (Admin only) - with validation
router.put('/:id', validateBody(userUpdateSchema), async (req, res) => {
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
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        console.error('Error updating user:', err);
        if (err.number === 2627) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE user (Admin only, cannot delete admins)
router.delete('/:id', async (req, res) => {
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
            return res.status(403).json({ error: 'Cannot delete admin users' });
        }

        // Delete the user
        await req.db.request()
            .input('id', id)
            .query`DELETE FROM Users WHERE Id = @id`;

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;
