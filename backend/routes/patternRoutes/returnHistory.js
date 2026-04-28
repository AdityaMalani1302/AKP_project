/**
 * Pattern Routes - Return History Module
 * Endpoints for pattern return history management
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { requirePage } = require('../../middleware/authMiddleware');
const logger = require('../../utils/logger');
const { validateBody, patternReturnHistorySchema } = require('../../utils/validators');

// GET /pattern-master/return-history - Get all pattern return history records
router.get('/', requirePage('pattern-master'), async (req, res) => {
    try {
        const { page, limit } = req.query;
        const usePagination = page !== undefined && limit !== undefined;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

        if (usePagination) {
            const request = req.db.request();
            request.input('offset', sql.Int, (pageNum - 1) * limitNum);
            request.input('limit', sql.Int, limitNum);

            const [dataResult, countResult] = await Promise.all([
                request.query(`
                    SELECT prh.ReturnId, prh.PatternId, prh.PatternNo, prh.Customer, prh.ReturnChallanNo, prh.ReturnDate, prh.Description,
                        c.CustName as CustomerName,
                        COALESCE(p.ProdName, p2.ProdName, LTRIM(RTRIM(prh.PatternName))) AS PatternName
                    FROM PatternReturnHistory prh
                    LEFT JOIN Customer c ON prh.Customer = c.CustId
                    LEFT JOIN Product p ON LTRIM(RTRIM(prh.PatternName)) = p.ProdName
                    LEFT JOIN Product p2 ON ISNUMERIC(prh.PatternName) = 1 AND CAST(prh.PatternName AS INT) = p2.ProdId
                    ORDER BY prh.ReturnId ASC
                    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
                `),
                req.db.request().query('SELECT COUNT(*) as total FROM PatternReturnHistory')
            ]);

            return res.json({
                data: dataResult.recordset,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: countResult.recordset[0].total,
                    totalPages: Math.ceil(countResult.recordset[0].total / limitNum)
                }
            });
        }

        const result = await req.db.request().query(`
            SELECT
                prh.ReturnId, prh.PatternId, prh.PatternNo, prh.Customer, prh.ReturnChallanNo, prh.ReturnDate, prh.Description,
                c.CustName as CustomerName,
                COALESCE(p.ProdName, p2.ProdName, LTRIM(RTRIM(prh.PatternName))) AS PatternName
            FROM PatternReturnHistory prh
            LEFT JOIN Customer c ON prh.Customer = c.CustId
            LEFT JOIN Product p ON LTRIM(RTRIM(prh.PatternName)) = p.ProdName
            LEFT JOIN Product p2 ON ISNUMERIC(prh.PatternName) = 1 AND CAST(prh.PatternName AS INT) = p2.ProdId
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
    let begun = false;

    try {
        const patternExists = await req.db.request()
            .input('pid', sql.Int, PatternId)
            .query`SELECT PatternId FROM PatternMaster WHERE PatternId = @pid`;
        if (patternExists.recordset.length === 0) {
            return res.status(404).json({ error: 'Pattern not found — cannot create return record for non-existent pattern.' });
        }

        await transaction.begin();
        begun = true;

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
        begun = false;

        res.status(201).json({ 
            success: true, 
            message: 'Pattern return history added successfully', 
            returnId: returnId 
        });
    } catch (err) {
        if (begun) { try { await transaction.rollback(); } catch (_) { /* already rolled back */ } }
        logger.error('Error adding pattern return history:', err);
        res.status(500).json({ error: 'Failed to add pattern return history' });
    }
});

// PUT /pattern-master/return-history/:id - Update pattern return record
router.put('/:id', requirePage('pattern-master'), async (req, res) => {
    const { id } = req.params;
    const returnId = parseInt(id, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid ID parameter' });

    const { ReturnChallanNo, ReturnDate, Description } = req.body;

    if (!ReturnChallanNo || !ReturnDate) {
        return res.status(400).json({ error: 'Return Challan No and Return Date are required' });
    }
    if (typeof ReturnChallanNo === 'string' && ReturnChallanNo.length > 255) {
        return res.status(400).json({ error: 'Return Challan No must be 255 characters or less' });
    }
    if (typeof Description === 'string' && Description.length > 1000) {
        return res.status(400).json({ error: 'Description must be 1000 characters or less' });
    }

    try {
        const request = req.db.request();
        request.input('ReturnId', sql.Int, returnId);
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
router.delete('/:id', requirePage('pattern-master'), async (req, res) => {
    const { id } = req.params;
    const returnId = parseInt(id, 10);
    if (isNaN(returnId)) return res.status(400).json({ error: 'Invalid ID parameter' });
    const transaction = new sql.Transaction(req.db);

    let begun = false;
    try {
        await transaction.begin();
        begun = true;

        const partsReq = new sql.Request(transaction);
        partsReq.input('ReturnId', sql.Int, returnId);
        await partsReq.query`DELETE FROM PatternReturnParts WHERE ReturnId = @ReturnId`;

        const mainReq = new sql.Request(transaction);
        mainReq.input('ReturnId', sql.Int, returnId);
        const result = await mainReq.query`DELETE FROM PatternReturnHistory WHERE ReturnId = @ReturnId`;

        if (result.rowsAffected[0] === 0) {
            await transaction.rollback();
            begun = false;
            return res.status(404).json({ error: 'Record not found' });
        }

        await transaction.commit();
        begun = false;
        res.json({ success: true, message: 'Pattern return history deleted successfully' });
    } catch (err) {
        if (begun) { try { await transaction.rollback(); } catch (_) { /* already rolled back */ } }
        logger.error('Error deleting pattern return history:', err);
        res.status(500).json({ error: 'Failed to delete pattern return history' });
    }
});

module.exports = router;
