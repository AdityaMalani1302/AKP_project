/**
 * IT Management - Complaints Routes
 * CRUD operations for IT_Complaint and IT_Resolved tables
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { validateBody, itComplaintSchema, itResolutionSchema } = require('../../utils/validators');
const logger = require('../../utils/logger');

// Helper function to generate ticket number
const generateTicketNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `TKT-${year}${month}${day}-${random}`;
};

// Helper function to generate resolved number
const generateResolvedNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `RES-${year}${month}${day}-${random}`;
};

// GET /complaints - Get all complaints
router.get('/', async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT 
                TicketId, TicketNumber, DateTimeSubmitted, EmployeeName, Department,
                ContactNumber, DeviceName, IssueType, ShortIssueTitle, ProblemDescription,
                ScreenshotPath, Status, CreatedAt, UpdatedAt
            FROM IT_Complaint
            WHERE 1=1
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` AND (
                TicketNumber LIKE @search OR 
                EmployeeName LIKE @search OR 
                ShortIssueTitle LIKE @search
            )`;
        }
        if (status) {
            request.input('status', sql.NVarChar, status);
            query += ` AND Status = @status`;
        }

        query += ' ORDER BY TicketId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching complaints:', err);
        res.status(500).json({ error: 'Failed to fetch complaints' });
    }
});

// POST /complaints - Create new complaint
router.post('/', validateBody(itComplaintSchema), async (req, res) => {
    const {
        EmployeeName, Department, ContactNumber, DeviceName, IssueType,
        ShortIssueTitle, ProblemDescription, ScreenshotPath
    } = req.body;

    try {
        const ticketNumber = generateTicketNumber();
        
        const request = new sql.Request(req.db);
        request.input('TicketNumber', sql.NVarChar(50), ticketNumber);
        request.input('EmployeeName', sql.NVarChar(255), EmployeeName || null);
        request.input('Department', sql.NVarChar(100), Department || null);
        request.input('ContactNumber', sql.NVarChar(100), ContactNumber || null);
        request.input('DeviceName', sql.NVarChar(100), DeviceName || null);
        request.input('IssueType', sql.NVarChar(50), IssueType || null);
        request.input('ShortIssueTitle', sql.NVarChar(255), ShortIssueTitle || null);
        request.input('ProblemDescription', sql.NVarChar(2000), ProblemDescription || null);
        request.input('ScreenshotPath', sql.NVarChar(500), ScreenshotPath || null);

        const result = await request.query`
            INSERT INTO IT_Complaint (
                TicketNumber, EmployeeName, Department, ContactNumber, DeviceName,
                IssueType, ShortIssueTitle, ProblemDescription, ScreenshotPath
            )
            OUTPUT INSERTED.TicketId, INSERTED.TicketNumber
            VALUES (
                @TicketNumber, @EmployeeName, @Department, @ContactNumber, @DeviceName,
                @IssueType, @ShortIssueTitle, @ProblemDescription, @ScreenshotPath
            )
        `;

        res.json({
            success: true,
            message: 'Complaint submitted successfully',
            id: result.recordset[0].TicketId,
            ticketNumber: result.recordset[0].TicketNumber
        });
    } catch (err) {
        logger.error('Error adding complaint:', err);
        res.status(500).json({ error: 'Failed to submit complaint' });
    }
});

// PUT /complaints/:id - Update complaint
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        EmployeeName, Department, ContactNumber, DeviceName, IssueType,
        ShortIssueTitle, ProblemDescription, ScreenshotPath, Status
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('EmployeeName', sql.NVarChar(255), EmployeeName || null);
        request.input('Department', sql.NVarChar(100), Department || null);
        request.input('ContactNumber', sql.NVarChar(100), ContactNumber || null);
        request.input('DeviceName', sql.NVarChar(100), DeviceName || null);
        request.input('IssueType', sql.NVarChar(50), IssueType || null);
        request.input('ShortIssueTitle', sql.NVarChar(255), ShortIssueTitle || null);
        request.input('ProblemDescription', sql.NVarChar(2000), ProblemDescription || null);
        request.input('ScreenshotPath', sql.NVarChar(500), ScreenshotPath || null);
        request.input('Status', sql.NVarChar(50), Status || null);

        const result = await request.query`
            UPDATE IT_Complaint SET
                EmployeeName = @EmployeeName, Department = @Department, ContactNumber = @ContactNumber,
                DeviceName = @DeviceName, IssueType = @IssueType, ShortIssueTitle = @ShortIssueTitle,
                ProblemDescription = @ProblemDescription, ScreenshotPath = @ScreenshotPath,
                Status = @Status, UpdatedAt = SYSDATETIME()
            WHERE TicketId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        res.json({ success: true, message: 'Complaint updated successfully' });
    } catch (err) {
        logger.error('Error updating complaint:', err);
        res.status(500).json({ error: 'Failed to update complaint' });
    }
});

// DELETE /complaints/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM IT_Complaint WHERE TicketId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        res.json({ success: true, message: 'Complaint deleted successfully' });
    } catch (err) {
        logger.error('Error deleting complaint:', err);
        res.status(500).json({ error: 'Failed to delete complaint' });
    }
});

// =============================================
// IT_Resolved Routes
// =============================================

// GET /complaints/resolved - Get all resolved issues
router.get('/resolved', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                r.ResolvedId, r.TicketId, c.TicketNumber, r.ResolvedNumber, r.Date,
                r.ShortIssueTitle, r.Description, r.CreatedAt, r.UpdatedAt
            FROM IT_Resolved r
            LEFT JOIN IT_Complaint c ON r.TicketId = c.TicketId
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                r.ResolvedNumber LIKE @search OR 
                c.TicketNumber LIKE @search OR 
                r.ShortIssueTitle LIKE @search
            `;
        }

        query += ' ORDER BY r.ResolvedId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching resolved issues:', err);
        res.status(500).json({ error: 'Failed to fetch resolved issues' });
    }
});

// POST /complaints/resolved - Create new resolved record
router.post('/resolved', validateBody(itResolutionSchema), async (req, res) => {
    const { TicketId, Date: resolvedDate, ShortIssueTitle, Description } = req.body;

    try {
        const resolvedNumber = generateResolvedNumber();
        
        const request = new sql.Request(req.db);
        request.input('TicketId', sql.Int, TicketId || null);
        request.input('ResolvedNumber', sql.NVarChar(50), resolvedNumber);
        request.input('Date', sql.Date, resolvedDate || new Date());
        request.input('ShortIssueTitle', sql.NVarChar(255), ShortIssueTitle || null);
        request.input('Description', sql.NVarChar(2000), Description || null);

        const result = await request.query`
            INSERT INTO IT_Resolved (TicketId, ResolvedNumber, Date, ShortIssueTitle, Description)
            OUTPUT INSERTED.ResolvedId, INSERTED.ResolvedNumber
            VALUES (@TicketId, @ResolvedNumber, @Date, @ShortIssueTitle, @Description)
        `;

        // If linked to a complaint, update its status
        if (TicketId) {
            const updateRequest = new sql.Request(req.db);
            updateRequest.input('ticketId', sql.Int, TicketId);
            await updateRequest.query`UPDATE IT_Complaint SET Status = 'Resolved', UpdatedAt = SYSDATETIME() WHERE TicketId = @ticketId`;
        }

        res.json({
            success: true,
            message: 'Resolution added successfully',
            id: result.recordset[0].ResolvedId,
            resolvedNumber: result.recordset[0].ResolvedNumber
        });
    } catch (err) {
        logger.error('Error adding resolution:', err);
        res.status(500).json({ error: 'Failed to add resolution' });
    }
});

// PUT /complaints/resolved/:id - Update resolved record
router.put('/resolved/:id', async (req, res) => {
    const { id } = req.params;
    const { TicketId, Date: resolvedDate, ShortIssueTitle, Description } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('TicketId', sql.Int, TicketId || null);
        request.input('Date', sql.Date, resolvedDate || null);
        request.input('ShortIssueTitle', sql.NVarChar(255), ShortIssueTitle || null);
        request.input('Description', sql.NVarChar(2000), Description || null);

        const result = await request.query`
            UPDATE IT_Resolved SET
                TicketId = @TicketId, Date = @Date, ShortIssueTitle = @ShortIssueTitle,
                Description = @Description, UpdatedAt = SYSDATETIME()
            WHERE ResolvedId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Resolution not found' });
        }

        res.json({ success: true, message: 'Resolution updated successfully' });
    } catch (err) {
        logger.error('Error updating resolution:', err);
        res.status(500).json({ error: 'Failed to update resolution' });
    }
});

// DELETE /complaints/resolved/:id
router.delete('/resolved/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM IT_Resolved WHERE ResolvedId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Resolution not found' });
        }

        res.json({ success: true, message: 'Resolution deleted successfully' });
    } catch (err) {
        logger.error('Error deleting resolution:', err);
        res.status(500).json({ error: 'Failed to delete resolution' });
    }
});

module.exports = router;
