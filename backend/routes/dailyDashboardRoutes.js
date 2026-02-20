const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const { parseDateRange } = require('../utils/dateHelpers');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// =============================================
// Day-wise Dashboard API Routes
// Day-level sales & production analytics
// =============================================

// GET /daily-dashboard/sales-data - Day-wise sales data (cached 5 min)
router.get('/sales-data', cacheMiddleware('daily-sales', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        // Default to current month if no dates provided
        const today = new Date();
        const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromDateValue = fromDate ? new Date(fromDate) : defaultFrom;
        const toDateValue = toDate ? new Date(toDate) : today;

        logger.info(`[Daily Dashboard - Sales] Fetching day-wise data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const request = new sql.Request(req.db);
        request.timeout = 120000;
        request.input('fromDate', sql.DateTime, fromDateValue);
        request.input('toDate', sql.DateTime, toDateValue);

        const result = await request.query(`
            SELECT 
                CONVERT(VARCHAR(10), InvDate1, 120) AS InvDate,
                sc.CategoryName,
                sa.[CUSTOMER AREA GROUP] AS CustomerGroup,
                SUM(
                    CASE 
                        WHEN ALTUOM = 'N' AND ISNULL(DespatchQty, 0) <> 0 THEN (ISNULL(DespatchQty, 0) * (ISNULL(Price, 0) - ISNULL(Disc, 0) + ISNULL(Pack, 0)) * ISNULL(InvoiceQuery.ExRate, 1))
                        WHEN ALTUOM = 'N' AND ISNULL(DespatchQty, 0) = 0 THEN ((ISNULL(Price, 0) - ISNULL(Disc, 0) + ISNULL(Pack, 0)) * ISNULL(InvoiceQuery.ExRate, 1))
                        WHEN ALTUOM <> 'N' AND ISNULL(ALTUOMDespQty, 0) <> 0 THEN (ISNULL(ALTUOMDespQty, 0) * (ISNULL(ALTUOMPrice, 0) - ISNULL(Disc, 0) + ISNULL(Pack, 0)) * ISNULL(InvoiceQuery.ExRate, 1))
                        WHEN ALTUOM <> 'N' AND ISNULL(ALTUOMDespQty, 0) = 0 THEN ((ISNULL(ALTUOMPrice, 0) - ISNULL(Disc, 0) + ISNULL(Pack, 0)) * ISNULL(InvoiceQuery.ExRate, 1))
                    END
                ) AS Value,
                SUM(ISNULL(DespatchQty, 0) * ISNULL(r.Weight, 0)) AS Weight
            FROM InvoiceQuery 
            LEFT JOIN RawMaterial r ON r.RawMatID = InvoiceQuery.ProdId
            INNER JOIN Customer c ON c.CustId = InvoiceQuery.CustId
            INNER JOIN Sales_CustType sc ON sc.CTypeID = c.CTypeID
            LEFT JOIN Sales_CustAddn sa ON sa.Af_Id = c.CustId
            WHERE InvDate1 BETWEEN @fromDate AND @toDate
                AND InvDone = 'Y'
            GROUP BY 
                CONVERT(VARCHAR(10), InvDate1, 120),
                sc.CategoryName,
                sa.[CUSTOMER AREA GROUP]
            ORDER BY InvDate
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching daily sales data:', err);
        res.status(500).json({
            error: 'Failed to fetch daily sales data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

// GET /daily-dashboard/production-data - Day-wise production data (cached 5 min)
router.get('/production-data', cacheMiddleware('daily-production', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const today = new Date();
        const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
        const fromDateValue = fromDate ? new Date(fromDate) : defaultFrom;
        const toDateValue = toDate ? new Date(toDate) : today;

        logger.info(`[Daily Dashboard - Production] Fetching day-wise data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const request = new sql.Request(pool);
        request.timeout = 120000;
        request.input('fromDate', sql.DateTime, fromDateValue);
        request.input('toDate', sql.DateTime, toDateValue);

        const result = await request.query(`
            SELECT 
                CONVERT(VARCHAR(10), StgDate, 120) AS ProdDate,
                SUM(OkWt) AS PouredWeight,
                SUM(OkWt) - SUM(CummRejWt) AS OkWeight,
                SUM(CummRejWt) AS RejWeight
            FROM View_productionSummary
            WHERE StgDate BETWEEN @fromDate AND @toDate
            GROUP BY CONVERT(VARCHAR(10), StgDate, 120)
            ORDER BY ProdDate
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching daily production data:', err);
        res.status(500).json({
            error: 'Failed to fetch daily production data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

module.exports = router;
