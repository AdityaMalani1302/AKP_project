const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const { parseDateRange, buildMonthsInRange, buildMonthConditions } = require('../utils/dateHelpers');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// =============================================
// Production Dashboard API Routes
// Real-time melting & production analytics
// Uses MeltingDashboard and ProductionDashboard views
// =============================================

// GET /production-dashboard/melting-data - Melting dashboard data (cached 5 min)
router.get('/melting-data', cacheMiddleware('production-melting', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);

        logger.info(`[Production Dashboard - Melting] Fetching data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const monthsInRange = buildMonthsInRange(fromDateValue, toDateValue);

        logger.info(`[Production Dashboard - Melting] Filtering for months: ${monthsInRange.join(', ')}`);

        const request = new sql.Request(pool);
        request.timeout = 120000;

        const monthConditions = buildMonthConditions(request, monthsInRange, sql);

        // Query the MeltingDashboard view
        const result = await request.query(`
            SELECT Month, Grade, HeatNO, Metal
            FROM [${DB.POOLS.ERP}].dbo.MeltingDashboard
            ${monthConditions ? `WHERE (${monthConditions})` : ''}
            ORDER BY Month, Grade
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching melting dashboard data:', err);
        res.status(500).json({
            error: 'Failed to fetch melting dashboard data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

// GET /production-dashboard/production-data - Production dashboard data (cached 5 min)
router.get('/production-data', cacheMiddleware('production-data', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);

        logger.info(`[Production Dashboard - Production] Fetching data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const monthsInRange = buildMonthsInRange(fromDateValue, toDateValue);

        logger.info(`[Production Dashboard - Production] Filtering for months: ${monthsInRange.join(', ')}`);

        const request = new sql.Request(pool);
        request.timeout = 120000;

        const monthConditions = buildMonthConditions(request, monthsInRange, sql);

        // Query the ProductionDashboard view
        const result = await request.query(`
            SELECT MainGrade, Grade, PartNo, BoxSize, Month, Pouredweight, OkWeight, RejWeight
            FROM [${DB.POOLS.ERP}].dbo.ProductionDashboard
            ${monthConditions ? `WHERE (${monthConditions})` : ''}
            ORDER BY Month, Grade, PartNo
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching production dashboard data:', err);
        res.status(500).json({
            error: 'Failed to fetch production dashboard data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

module.exports = router;
