/**
 * IT Management - Issued Material Routes
 * CRUD operations for IT_IssuedMaterial table
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const logger = require('../../utils/logger');
const { validateBody, itIssuedMaterialSchema } = require('../../utils/validators');

// GET /issued-material - Get all issued materials
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                IssuedMaterialId, MaterialName, MaterialType, Quantity, Unit,
                IssuedTo, IssuedBy, IssueDate, Department, Purpose,
                ReturnDate, Status, Remarks, CreatedAt, UpdatedAt
            FROM IT_IssuedMaterial
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                MaterialName LIKE @search OR 
                IssuedTo LIKE @search OR 
                Department LIKE @search OR
                MaterialType LIKE @search
            `;
        }

        query += ' ORDER BY IssuedMaterialId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching issued materials:', err);
        res.status(500).json({ error: 'Failed to fetch issued materials' });
    }
});

// GET /issued-material/:id - Get single issued material
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM IT_IssuedMaterial WHERE IssuedMaterialId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching issued material:', err);
        res.status(500).json({ error: 'Failed to fetch issued material' });
    }
});

// POST /issued-material - Create new issued material record
router.post('/', validateBody(itIssuedMaterialSchema), async (req, res) => {
    const {
        MaterialName, MaterialType, Quantity, Unit,
        IssuedTo, IssuedBy, IssueDate, Department, Purpose,
        ReturnDate, Status, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('MaterialName', sql.NVarChar(255), MaterialName);
        request.input('MaterialType', sql.NVarChar(100), MaterialType || null);
        request.input('Quantity', sql.Int, Quantity || null);
        request.input('Unit', sql.NVarChar(50), Unit || null);
        request.input('IssuedTo', sql.NVarChar(255), IssuedTo);
        request.input('IssuedBy', sql.NVarChar(255), IssuedBy || null);
        request.input('IssueDate', sql.Date, IssueDate || null);
        request.input('Department', sql.NVarChar(100), Department || null);
        request.input('Purpose', sql.NVarChar(500), Purpose || null);
        request.input('ReturnDate', sql.Date, ReturnDate || null);
        request.input('Status', sql.NVarChar(50), Status || 'Issued');
        request.input('Remarks', sql.NVarChar(500), Remarks || null);

        const result = await request.query`
            INSERT INTO IT_IssuedMaterial (
                MaterialName, MaterialType, Quantity, Unit,
                IssuedTo, IssuedBy, IssueDate, Department, Purpose,
                ReturnDate, Status, Remarks
            )
            OUTPUT INSERTED.IssuedMaterialId
            VALUES (
                @MaterialName, @MaterialType, @Quantity, @Unit,
                @IssuedTo, @IssuedBy, @IssueDate, @Department, @Purpose,
                @ReturnDate, @Status, @Remarks
            )
        `;

        res.json({ 
            success: true, 
            message: 'Issued material record added successfully', 
            id: result.recordset[0].IssuedMaterialId 
        });
    } catch (err) {
        logger.error('Error adding issued material:', err);
        res.status(500).json({ error: 'Failed to add issued material record' });
    }
});

// PUT /issued-material/:id - Update issued material record
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        MaterialName, MaterialType, Quantity, Unit,
        IssuedTo, IssuedBy, IssueDate, Department, Purpose,
        ReturnDate, Status, Remarks
    } = req.body;

    if (!MaterialName) {
        return res.status(400).json({ error: 'Material Name is required' });
    }
    if (!IssuedTo) {
        return res.status(400).json({ error: 'Issued To is required' });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('MaterialName', sql.NVarChar(255), MaterialName);
        request.input('MaterialType', sql.NVarChar(100), MaterialType || null);
        request.input('Quantity', sql.Int, Quantity || null);
        request.input('Unit', sql.NVarChar(50), Unit || null);
        request.input('IssuedTo', sql.NVarChar(255), IssuedTo);
        request.input('IssuedBy', sql.NVarChar(255), IssuedBy || null);
        request.input('IssueDate', sql.Date, IssueDate || null);
        request.input('Department', sql.NVarChar(100), Department || null);
        request.input('Purpose', sql.NVarChar(500), Purpose || null);
        request.input('ReturnDate', sql.Date, ReturnDate || null);
        request.input('Status', sql.NVarChar(50), Status || 'Issued');
        request.input('Remarks', sql.NVarChar(500), Remarks || null);

        const result = await request.query`
            UPDATE IT_IssuedMaterial SET
                MaterialName = @MaterialName,
                MaterialType = @MaterialType,
                Quantity = @Quantity,
                Unit = @Unit,
                IssuedTo = @IssuedTo,
                IssuedBy = @IssuedBy,
                IssueDate = @IssueDate,
                Department = @Department,
                Purpose = @Purpose,
                ReturnDate = @ReturnDate,
                Status = @Status,
                Remarks = @Remarks,
                UpdatedAt = SYSDATETIME()
            WHERE IssuedMaterialId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ success: true, message: 'Record updated successfully' });
    } catch (err) {
        logger.error('Error updating issued material:', err);
        res.status(500).json({ error: 'Failed to update record' });
    }
});

// DELETE /issued-material/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM IT_IssuedMaterial WHERE IssuedMaterialId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (err) {
        logger.error('Error deleting issued material:', err);
        res.status(500).json({ error: 'Failed to delete record' });
    }
});

module.exports = router;
