const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const { parseDateRange, buildMonthsInRange, buildMonthConditions } = require('../utils/dateHelpers');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// =============================================
// Finance Dashboard API Routes
// Real-time finance analytics endpoints
// Uses FinanceDashboard view from IcSoftVer3 database
// =============================================

// GET /finance-dashboard/data - Complete financial data grouped by category and month (cached 5 min)
router.get('/data', cacheMiddleware('finance-data', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        
        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);

        logger.info(`[Finance Dashboard] Fetching data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        // Get the Ledger database pool
        const ledgerPool = getPool(DB.POOLS.LEDGER);
        if (!ledgerPool) {
            return res.status(503).json({ error: 'Ledger database service unavailable' });
        }

        const monthsInRange = buildMonthsInRange(fromDateValue, toDateValue);

        logger.info(`[Finance Dashboard] Filtering for months: ${monthsInRange.join(', ')}`);

        const request = new sql.Request(ledgerPool);
        request.timeout = 120000; // 120 second timeout for complex query

        const monthConditions = buildMonthConditions(request, monthsInRange, sql);

        // Query the FinanceDashboard view with specific month filtering
        const result = await request.query(`
            SELECT MainGroup, SubGroup, AccountName, Name, Month, Valuses as Value
            FROM [${DB.POOLS.ERP}].dbo.FinanceDashboard
            ${monthConditions ? `WHERE (${monthConditions})` : ''}
            ORDER BY MainGroup, SubGroup, Month
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching finance dashboard data:', err);
        res.status(500).json({ error: 'Failed to fetch finance dashboard data', ...(process.env.NODE_ENV !== 'production' && { details: err.message }) });
    }
});

module.exports = router;

