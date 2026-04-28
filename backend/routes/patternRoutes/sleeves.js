/**
 * Pattern Routes - Sleeves Module
 * Endpoints for pattern sleeves management
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { requirePage } = require('../../middleware/authMiddleware');
const logger = require('../../utils/logger');

router.use(requirePage('pattern-master'));

// GET /pattern-master/sleeves-by-pattern/:patternId - Get sleeves for a specific pattern
router.get('/by-pattern/:patternId', async (req, res) => {
    const { patternId } = req.params;
    const parsed = parseInt(patternId, 10);
    if (isNaN(parsed)) return res.status(400).json({ error: 'Invalid pattern ID' });
    try {
        const request = req.db.request();
        request.input('patternId', sql.Numeric(18, 0), parsed);
        
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
                CASE WHEN ISNUMERIC(sm.sleeve_type_size) = 1 THEN CAST(sm.sleeve_type_size AS INT) ELSE NULL END = rm.RawMatID
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
    const sleeveId = parseInt(id, 10);
    if (isNaN(sleeveId)) return res.status(400).json({ error: 'Invalid sleeve ID' });
    try {
        const planningCheck = await req.db.request()
            .input('sleeveId', sql.Int, sleeveId)
            .query(`
                SELECT TOP 1 sr.RequirementId
                FROM SleeveRequirement sr
                INNER JOIN SleeveMaster sm ON sm.PatternId = sr.PatternId
                WHERE sm.SleeveRowId = @sleeveId
            `);
        if (planningCheck.recordset.length > 0) {
            return res.status(409).json({
                error: 'Cannot delete this sleeve — it is linked to sleeve requirement records.'
            });
        }

        const result = await req.db.request()
            .input('id', sql.Int, sleeveId)
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
