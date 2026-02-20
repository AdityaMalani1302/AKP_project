/**
 * Pattern Routes - Return History Module
 * Endpoints for pattern return history management
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { verifyToken, requirePage } = require('../../middleware/authMiddleware');
const logger = require('../../utils/logger');
const { validateBody, patternReturnHistorySchema } = require('../../utils/validators');

// Helper to ensure tables exist (called once per request if needed)
const ensureTablesExist = async (db) => {
    await db.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternReturnHistory')
        CREATE TABLE PatternReturnHistory (
            ReturnId INT IDENTITY(1,1) PRIMARY KEY,
            PatternId INT NOT NULL,
            PatternNo VARCHAR(255),
            PatternName VARCHAR(255),
            Customer INT,
            ReturnChallanNo VARCHAR(255),
            ReturnDate DATE,
            Description VARCHAR(1000),
            CreatedAt DATETIME DEFAULT GETDATE()
        );
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternReturnParts')
        CREATE TABLE PatternReturnParts (
            ReturnPartId INT IDENTITY(1,1) PRIMARY KEY,
            ReturnId INT NOT NULL,
            PartRowId INT,
            PartNo INT,
            ProductName VARCHAR(255),
            FOREIGN KEY (ReturnId) REFERENCES PatternReturnHistory(ReturnId)
        )
    `);
};

// GET /pattern-master/return-history - Get all pattern return history records
router.get('/', async (req, res) => {
    try {
        await ensureTablesExist(req.db);

        const result = await req.db.request().query(`
            SELECT 
                prh.*,
                c.CustName as CustomerName
            FROM PatternReturnHistory prh
            LEFT JOIN Customer c ON prh.Customer = c.CustId
            ORDER BY prh.ReturnId ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching pattern return history:', err);
        res.status(500).json({ error: 'Failed to fetch pattern return history' });
    }
});

// POST /pattern-master/return-history - Create new pattern return record
router.post('/', requirePage('pattern-master'), validateBody(patternReturnHistorySchema), async (req, res) => {
    const { PatternId, PatternNo, PatternName, Customer, ReturnChallanNo, ReturnDate, Description, SelectedParts } = req.body;

    const transaction = new sql.Transaction(req.db);

    try {
        // Ensure tables exist before starting transaction
        await ensureTablesExist(req.db);
        
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input('PatternId', sql.Int, PatternId);
        request.input('PatternNo', sql.VarChar(255), PatternNo);
        request.input('PatternName', sql.VarChar(255), PatternName || null);
        request.input('Customer', sql.Int, Customer);
        request.input('ReturnChallanNo', sql.VarChar(255), ReturnChallanNo);
        request.input('ReturnDate', sql.Date, ReturnDate);
        request.input('Description', sql.VarChar(1000), Description || null);

        const result = await request.query`
            INSERT INTO PatternReturnHistory (PatternId, PatternNo, PatternName, Customer, ReturnChallanNo, ReturnDate, Description)
            OUTPUT INSERTED.ReturnId
            VALUES (@PatternId, @PatternNo, @PatternName, @Customer, @ReturnChallanNo, @ReturnDate, @Description)
        `;

        const returnId = result.recordset[0].ReturnId;

        // Insert selected parts
        for (const part of SelectedParts) {
            const partReq = new sql.Request(transaction);
            partReq.input('ReturnId', sql.Int, returnId);
            partReq.input('PartRowId', sql.Int, part.PartRowId || null);
            partReq.input('PartNo', sql.Int, part.PartNo || null);
            partReq.input('ProductName', sql.VarChar(255), part.ProductName || null);

            await partReq.query`
                INSERT INTO PatternReturnParts (ReturnId, PartRowId, PartNo, ProductName)
                VALUES (@ReturnId, @PartRowId, @PartNo, @ProductName)
            `;
        }

        await transaction.commit();

        res.json({ 
            success: true, 
            message: 'Pattern return history added successfully', 
            returnId: returnId 
        });
    } catch (err) {
        if (transaction) await transaction.rollback();
        logger.error('Error adding pattern return history:', err);
        res.status(500).json({ error: 'Failed to add pattern return history' });
    }
});

// PUT /pattern-master/return-history/:id - Update pattern return record
router.put('/:id', verifyToken, requirePage('pattern-master'), async (req, res) => {
    const { id } = req.params;
    const { ReturnChallanNo, ReturnDate, Description } = req.body;

    if (!ReturnChallanNo || !ReturnDate) {
        return res.status(400).json({ error: 'Return Challan No and Return Date are required' });
    }

    try {
        const request = req.db.request();
        request.input('ReturnId', sql.Int, id);
        request.input('ReturnChallanNo', sql.VarChar(255), ReturnChallanNo);
        request.input('ReturnDate', sql.Date, ReturnDate);
        request.input('Description', sql.VarChar(1000), Description || null);

        const result = await request.query`
            UPDATE PatternReturnHistory 
            SET ReturnChallanNo = @ReturnChallanNo, 
                ReturnDate = @ReturnDate, 
                Description = @Description
            WHERE ReturnId = @ReturnId
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ success: true, message: 'Pattern return history updated successfully' });
    } catch (err) {
        logger.error('Error updating pattern return history:', err);
        res.status(500).json({ error: 'Failed to update pattern return history' });
    }
});

// DELETE /pattern-master/return-history/:id - Delete pattern return record
router.delete('/:id', verifyToken, requirePage('pattern-master'), async (req, res) => {
    const { id } = req.params;
    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        // Delete parts first (foreign key constraint)
        const partsReq = new sql.Request(transaction);
        partsReq.input('ReturnId', sql.Int, id);
        await partsReq.query`DELETE FROM PatternReturnParts WHERE ReturnId = @ReturnId`;

        // Delete the main record
        const mainReq = new sql.Request(transaction);
        mainReq.input('ReturnId', sql.Int, id);
        const result = await mainReq.query`DELETE FROM PatternReturnHistory WHERE ReturnId = @ReturnId`;

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Record not found' });
        }

        await transaction.commit();
        res.json({ success: true, message: 'Pattern return history deleted successfully' });
    } catch (err) {
        if (transaction) await transaction.rollback();
        logger.error('Error deleting pattern return history:', err);
        res.status(500).json({ error: 'Failed to delete pattern return history' });
    }
});

module.exports = router;
