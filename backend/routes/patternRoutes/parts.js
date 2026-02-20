/**
 * Pattern Routes - Parts Module
 * Endpoints for pattern parts (cavities) management
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const logger = require('../../utils/logger');

// GET /pattern-master/parts-by-pattern/:patternId - Get parts for a specific pattern
router.get('/by-pattern/:patternId', async (req, res) => {
    const { patternId } = req.params;
    try {
        const request = req.db.request();
        request.input('patternId', sql.Numeric(18, 0), parseInt(patternId));
        
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
    try {
        const result = await req.db.request()
            .input('id', sql.Int, parseInt(id))
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
