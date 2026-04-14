const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const { parseDateRange, buildMonthsInRange, buildMonthConditions } = require('../utils/dateHelpers');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');
const { getInvoiceValueExpr } = require('../utils/invoiceCalc');

// =============================================
// Sales Dashboard API Routes
// Real-time sales analytics endpoints
// Uses SalesDashboard view from IcSoftVer3 database
// Frontend handles all aggregation client-side
// =============================================

// GET /sales-dashboard/data - Complete sales data grouped by customer, segment, and month (cached 5 min)
router.get('/data', cacheMiddleware('sales-data', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        
        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);

        logger.info(`[Sales Dashboard] Fetching data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const monthsInRange = buildMonthsInRange(fromDateValue, toDateValue);

        logger.info(`[Sales Dashboard] Filtering for months: ${monthsInRange.join(', ')}`);

        const request = new sql.Request(req.db);
        request.timeout = 60000; // 60 second timeout for complex query

        const monthConditions = buildMonthConditions(request, monthsInRange, sql);

        // Query the SalesDashboard view with specific month filtering
        // Try with CountryName first, fall back without it if column doesn't exist
        let result;
        try {
            result = await request.query(`
                SELECT CustName, CountryName, CategoryName, Segment_Type, [CUSTOMER AREA GROUP], Month, Quantity, Weight, Value
                FROM [${DB.POOLS.ERP}].dbo.SalesDashboard
                ${monthConditions ? `WHERE (${monthConditions})` : ''}
                ORDER BY Month
            `);
        } catch (queryErr) {
            logger.info('[Sales Dashboard] CountryName column not found, using fallback query');
            result = await request.query(`
                SELECT CustName, CategoryName, Segment_Type, [CUSTOMER AREA GROUP], Month, Quantity, Weight, Value
                FROM [${DB.POOLS.ERP}].dbo.SalesDashboard
                ${monthConditions ? `WHERE (${monthConditions})` : ''}
                ORDER BY Month
            `);
        }

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching sales dashboard data:', err);
        res.status(500).json({ error: 'Failed to fetch sales dashboard data', ...(process.env.NODE_ENV !== 'production' && { details: err.message }) });
    }
});

// GET /sales-dashboard/historical-records - Highest ever sales by month and FY from FY 2016-17 (cached 5 min)
router.get('/historical-records', cacheMiddleware('sales-historical', 300), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        request.timeout = 60000; // 60 second timeout

        // Get highest ever month sales (from April 2016 onwards)
        const highestMonthResult = await request.query(`
            SELECT TOP 1
                DATENAME(month, InvDate1) + ' - ' + CAST(YEAR(InvDate1) AS VARCHAR) AS Month,
                SUM(
                    ${getInvoiceValueExpr()}
                ) AS TotalValue
            FROM InvoiceQuery  
            WHERE InvDate1 >= '2016-04-01' AND InvDone = 'Y'
            GROUP BY YEAR(InvDate1), DATENAME(month, InvDate1)
            ORDER BY TotalValue DESC
        `);

        // Get highest ever FY sales (from FY 2016-17 onwards) using CTE for proper grouping
        const highestFYRequest = new sql.Request(req.db);
        highestFYRequest.timeout = 60000;

        const highestFYResult = await highestFYRequest.query(`
            WITH FYData AS (
                SELECT 
                    CASE 
                        WHEN MONTH(InvDate1) >= 4 THEN YEAR(InvDate1)
                        ELSE YEAR(InvDate1) - 1
                    END AS FYStart,
                    ${getInvoiceValueExpr()} AS Value
                FROM InvoiceQuery  
                WHERE InvDate1 >= '2016-04-01' AND InvDone = 'Y'
            )
            SELECT TOP 1
                'FY ' + CAST(FYStart AS VARCHAR) + '-' + RIGHT(CAST(FYStart + 1 AS VARCHAR), 2) AS FinancialYear,
                SUM(Value) AS TotalValue
            FROM FYData
            GROUP BY FYStart
            ORDER BY TotalValue DESC
        `);

        const highestMonth = highestMonthResult.recordset[0] || {};
        const highestFY = highestFYResult.recordset[0] || {};

        res.json({
            highestMonth: {
                month: highestMonth.Month || 'N/A',
                value: highestMonth.TotalValue || 0
            },
            highestFY: {
                fy: highestFY.FinancialYear || 'N/A',
                value: highestFY.TotalValue || 0
            }
        });
    } catch (err) {
        logger.error('Error fetching historical records:', err);
        res.status(500).json({ error: 'Failed to fetch historical records', ...(process.env.NODE_ENV !== 'production' && { details: err.message }) });
    }
});

// GET /sales-dashboard/grade-wise-sales - Grade wise sales data from GradeWiseSales view (cached 5 min)
router.get('/grade-wise-sales', cacheMiddleware('grade-wise-sales', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);
        const monthsInRange = buildMonthsInRange(fromDateValue, toDateValue);

        const request = new sql.Request(req.db);
        request.timeout = 60000;

        const monthConditions = buildMonthConditions(request, monthsInRange, sql);

        logger.info(`[Sales Dashboard] Fetching grade wise sales data from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const result = await request.query(`
            SELECT YYYYMM, Month, MainType, Type, Qty, Wt, Value
            FROM [${DB.POOLS.ERP}].dbo.GradeWiseSales
            ${monthConditions ? `WHERE (${monthConditions})` : ''}
            ORDER BY YYYYMM
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching grade wise sales data:', err);
        res.status(500).json({ error: 'Failed to fetch grade wise sales data', ...(process.env.NODE_ENV !== 'production' && { details: err.message }) });
    }
});

// GET /sales-dashboard/family - Product Family and Segment Family data (cached 5 min)
router.get('/family', cacheMiddleware('sales-family', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);
        const monthsInRange = buildMonthsInRange(fromDateValue, toDateValue);

        const request = new sql.Request(req.db);
        request.timeout = 60000;

        const monthConditions = buildMonthConditions(request, monthsInRange, sql);

        logger.info(`[Sales Dashboard - Family] Fetching from ${fromDateValue.toISOString()} to ${toDateValue.toISOString()}`);

        const result = await request.query(`
            SELECT ProductType, SegmentType, Month, Quantity, Weight, Value
            FROM [${DB.POOLS.ERP}].dbo.SalesDashboardFamily
            ${monthConditions ? `WHERE (${monthConditions})` : ''}
            ORDER BY Month, ProductType, SegmentType
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching sales dashboard family data:', err);
        res.status(500).json({ error: 'Failed to fetch sales dashboard family data', ...(process.env.NODE_ENV !== 'production' && { details: err.message }) });
    }
});

module.exports = router;
