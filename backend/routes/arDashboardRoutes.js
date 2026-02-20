const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// =============================================
// AR Dashboard API Routes
// Account Receivables analytics endpoints
// Uses AccountReceivables view from IcSoftVer3 database
// =============================================

// GET /ar-dashboard/data - Complete AR data from AccountReceivables view (cached 5 min)
router.get('/data', cacheMiddleware('ar-data', 300), async (req, res) => {
    try {
        logger.info('[AR Dashboard] Fetching AccountReceivables data');

        // Get the main database pool
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const request = new sql.Request(pool);
        request.timeout = 120000; // 120 second timeout for complex query

        // Query the AccountReceivables view
        const result = await request.query(`
            SELECT 
                Category,
                name as CustomerName,
                CreditPeriod,
                Description,
                [.] as Amount
            FROM [${DB.POOLS.ERP}].dbo.AccountReceivables
            ORDER BY Category, name, Description
        `);

        logger.info(`[AR Dashboard] Retrieved ${result.recordset.length} records`);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching AR dashboard data:', err);
        res.status(500).json({ 
            error: 'Failed to fetch AR dashboard data', 
            ...(process.env.NODE_ENV !== 'production' && { details: err.message }) 
        });
    }
});

// GET /ar-dashboard/recovery - Recovery data from CustomerRecovery view (cached 5 min)
router.get('/recovery', cacheMiddleware('ar-recovery', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        logger.info('[AR Dashboard] Fetching CustomerRecovery data', { fromDate, toDate });

        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const request = new sql.Request(pool);
        request.timeout = 120000;

        // Build query with optional date filtering
        let query = `
            SELECT 
                MM,
                TransactionDate,
                DomesticAmount,
                ExportAmount,
                TotalAmount
            FROM [${DB.POOLS.ERP}].dbo.CustomerRecovery
        `;

        // If date range provided, filter by MM (YYYYMM format)
        if (fromDate && toDate) {
            const fromMM = fromDate.replace(/-/g, '').substring(0, 6); // Convert to YYYYMM
            const toMM = toDate.replace(/-/g, '').substring(0, 6);
            query += ` WHERE MM >= '${fromMM}' AND MM <= '${toMM}'`;
        }

        query += ` ORDER BY MM`;

        const result = await request.query(query);

        logger.info(`[AR Dashboard] Retrieved ${result.recordset.length} recovery records`);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching recovery data:', err);
        res.status(500).json({ 
            error: 'Failed to fetch recovery data', 
            ...(process.env.NODE_ENV !== 'production' && { details: err.message }) 
        });
    }
});

module.exports = router;
