/**
 * Pattern Routes - Sleeves Module
 * Endpoints for pattern sleeves management
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const logger = require('../../utils/logger');

// GET /pattern-master/sleeves-by-pattern/:patternId - Get sleeves for a specific pattern
router.get('/by-pattern/:patternId', async (req, res) => {
    const { patternId } = req.params;
    try {
        const request = req.db.request();
        request.input('patternId', sql.Numeric(18, 0), parseInt(patternId));
        
        const result = await request.query`
            SELECT 
                sm.SleeveRowId,
                sm.PatternId,
                sm.sleeve_name,
                sm.sleeve_type_size,
                rm.RawMatName AS sleeve_type_size_name,
                sm.quantity
            FROM SleeveMaster sm
            LEFT JOIN RawMaterial rm ON 
                CASE 
                    WHEN sm.sleeve_type_size IS NOT NULL AND sm.sleeve_type_size != '' AND ISNUMERIC(sm.sleeve_type_size) = 1 
                    THEN CAST(sm.sleeve_type_size AS INT) 
                    ELSE NULL 
                END = rm.RawMatID
            WHERE sm.PatternId = @patternId
            ORDER BY sm.SleeveRowId ASC
        `;
        
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching sleeves for pattern:', err);
        res.status(500).json({ error: 'Failed to fetch sleeves for pattern' });
    }
});

// GET /pattern-master/data/sleeves - Get all sleeves
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                sm.*,
                pm.PatternNo
            FROM SleeveMaster sm
            LEFT JOIN PatternMaster pm ON sm.PatternId = pm.PatternId
        `;

        const request = req.db.request();

        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search OR sm.sleeve_name LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY sm.SleeveRowId ASC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching sleeves:', err);
        res.status(500).json({ error: 'Failed to fetch sleeves' });
    }
});

// DELETE /pattern-master/data/sleeves/:id - Delete a sleeve
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.db.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM SleeveMaster WHERE SleeveRowId = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Sleeve not found' });
        }
        res.json({ success: true, message: 'Sleeve deleted successfully' });
    } catch (err) {
        logger.error('Error deleting sleeve:', err);
        res.status(500).json({ error: 'Failed to delete sleeve' });
    }
});

module.exports = router;
