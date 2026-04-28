/**
 * Pattern Routes - Parts Module
 * Endpoints for pattern parts (cavities) management
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { requirePage } = require('../../middleware/authMiddleware');
const logger = require('../../utils/logger');

router.use(requirePage('pattern-master'));

// GET /pattern-master/parts-by-pattern/:patternId - Get parts for a specific pattern
router.get('/by-pattern/:patternId', async (req, res) => {
    const { patternId } = req.params;
    const parsed = parseInt(patternId, 10);
    if (isNaN(parsed)) return res.status(400).json({ error: 'Invalid pattern ID' });
    try {
        const request = req.db.request();
        request.input('patternId', sql.Numeric(18, 0), parsed);
        
        const result = await request.query`
            SELECT 
                pcm.PartRowId,
                pcm.PatternId,
                pcm.PartNo,
                ISNULL(p.InternalPartNo, CAST(pcm.PartNo AS VARCHAR)) AS InternalPartNo,
                pcm.ProductName,
                ISNULL(p.ProdName, pcm.ProductName) AS ProdName,
                ISNULL(p.ProdName, pcm.ProductName) AS PartName,
                pcm.Qty,
                pcm.Weight,
                pcm.MaterialGrade,
                g.GradeName
            FROM PatternCavityMaster pcm
            LEFT JOIN Product p ON pcm.PartNo = p.ProdId
            LEFT JOIN Grade g ON pcm.MaterialGrade = g.GradeId
            WHERE pcm.PatternId = @patternId
            ORDER BY pcm.PartRowId ASC
        `;
        
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching parts for pattern:', err);
        res.status(500).json({ error: 'Failed to fetch parts for pattern' });
    }
});

// GET /pattern-master/data/parts - Get all parts
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                pcm.*,
                pm.PatternNo,
                pm.Product_Name as Main_Product_Name
            FROM PatternCavityMaster pcm
            LEFT JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
        `;

        const request = req.db.request();

        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search OR pcm.ProductName LIKE @search OR pcm.PartNo LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY pcm.PartRowId ASC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching parts:', err);
        res.status(500).json({ error: 'Failed to fetch parts' });
    }
});

// DELETE /pattern-master/data/parts/:id - Delete a part
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const partId = parseInt(id, 10);
    if (isNaN(partId)) return res.status(400).json({ error: 'Invalid part ID' });
    try {

        const planningCheck = await req.db.request()
            .input('partId', sql.Int, partId)
            .query(`
                SELECT TOP 1 EntryId, PlanDate, PartNo
                FROM PlanningEntry
                WHERE CASE WHEN ISNUMERIC(PartRowId) = 1 THEN CAST(PartRowId AS INT) ELSE NULL END = @partId
            `);
        if (planningCheck.recordset.length > 0) {
            const entry = planningCheck.recordset[0];
            return res.status(409).json({
                error: `Cannot delete this part — it is used in planning entry (Plan Date: ${entry.PlanDate}, Part No: ${entry.PartNo}). Remove the planning entries first.`
            });
        }

        const result = await req.db.request()
            .input('id', sql.Int, partId)
            .query('DELETE FROM PatternCavityMaster WHERE PartRowId = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Part not found' });
        }
        res.json({ success: true, message: 'Part deleted successfully' });
    } catch (err) {
        logger.error('Error deleting part:', err);
        res.status(500).json({ error: 'Failed to delete part' });
    }
});

module.exports = router;
