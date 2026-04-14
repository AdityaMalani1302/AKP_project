const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const { parseDateRange, buildMonthsInRange, buildMonthConditions } = require('../utils/dateHelpers');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');
const { getInvoiceValueExpr } = require('../utils/invoiceCalc');

const INVOICE_VALUE_EXPR = getInvoiceValueExpr('iq');

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

// Invoice line value uses shared utility (see INVOICE_VALUE_EXPR above)

/**
 * GET /finance-dashboard/sales-per-kg
 * Monthly total sales / total weight for a date range (typically one FY), plus FY-wise history from Apr 2016.
 * Query: fromDate, toDate (YYYY-MM-DD)
 */
router.get('/sales-per-kg', cacheMiddleware('finance-sales-per-kg', 300), async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const { fromDateValue, toDateValue } = parseDateRange(fromDate, toDate);

        const toEnd = new Date(toDateValue);
        toEnd.setHours(23, 59, 59, 999);

        const erp = DB.POOLS.ERP;
        const monthlyReq = new sql.Request(req.db);
        monthlyReq.timeout = 120000;
        monthlyReq.input('fromDate', sql.DateTime, fromDateValue);
        monthlyReq.input('toDate', sql.DateTime, toEnd);

        logger.info(`[Finance Dashboard] sales-per-kg monthly ${fromDateValue.toISOString()} → ${toEnd.toISOString()}`);

        const monthlyResult = await monthlyReq.query(`
            SELECT 
                CAST(DATENAME(month, iq.InvDate1) AS NVARCHAR(20)) + N' - ' + CAST(YEAR(iq.InvDate1) AS NVARCHAR(4)) AS [Month],
                SUM(${INVOICE_VALUE_EXPR}) AS TotalValue,
                SUM(ISNULL(iq.DespatchQty, 0) * ISNULL(r.Weight, 0)) AS TotalWeight
            FROM [${erp}].dbo.InvoiceQuery iq
            LEFT JOIN [${erp}].dbo.RawMaterial r ON r.RawMatID = iq.ProdId
            INNER JOIN [${erp}].dbo.Customer c ON c.CustId = iq.CustId
            WHERE iq.InvDone = 'Y'
              AND iq.InvDate1 >= @fromDate
              AND iq.InvDate1 <= @toDate
            GROUP BY YEAR(iq.InvDate1), DATENAME(month, iq.InvDate1)
            ORDER BY MIN(iq.InvDate1)
        `);

        const fyFrom = new Date(2016, 3, 1);
        const fyTo = new Date();
        fyTo.setHours(23, 59, 59, 999);

        const fyReq = new sql.Request(req.db);
        fyReq.timeout = 120000;
        fyReq.input('fyFrom', sql.DateTime, fyFrom);
        fyReq.input('fyTo', sql.DateTime, fyTo);

        const fyResult = await fyReq.query(`
            SELECT 
                CASE WHEN MONTH(iq.InvDate1) >= 4 THEN YEAR(iq.InvDate1) ELSE YEAR(iq.InvDate1) - 1 END AS FYStartYear,
                SUM(${INVOICE_VALUE_EXPR}) AS TotalValue,
                SUM(ISNULL(iq.DespatchQty, 0) * ISNULL(r.Weight, 0)) AS TotalWeight
            FROM [${erp}].dbo.InvoiceQuery iq
            LEFT JOIN [${erp}].dbo.RawMaterial r ON r.RawMatID = iq.ProdId
            INNER JOIN [${erp}].dbo.Customer c ON c.CustId = iq.CustId
            WHERE iq.InvDone = 'Y'
              AND iq.InvDate1 >= @fyFrom
              AND iq.InvDate1 <= @fyTo
            GROUP BY CASE WHEN MONTH(iq.InvDate1) >= 4 THEN YEAR(iq.InvDate1) ELSE YEAR(iq.InvDate1) - 1 END
            ORDER BY FYStartYear
        `);

        const toNum = (v) => (v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v));

        const monthly = (monthlyResult.recordset || []).map((row) => {
            const totalValue = toNum(row.TotalValue);
            const totalWeight = toNum(row.TotalWeight);
            const salesPerKg = totalWeight > 0 ? totalValue / totalWeight : null;
            return {
                month: row.Month,
                totalValue,
                totalWeight,
                salesPerKg
            };
        });

        const fyHistory = (fyResult.recordset || []).map((row) => {
            const fyStart = toNum(row.FYStartYear);
            const totalValue = toNum(row.TotalValue);
            const totalWeight = toNum(row.TotalWeight);
            const salesPerKg = totalWeight > 0 ? totalValue / totalWeight : null;
            return {
                fyStartYear: fyStart,
                label: `FY ${fyStart}-${String(fyStart + 1).slice(-2)}`,
                totalValue,
                totalWeight,
                salesPerKg
            };
        });

        res.json({ monthly, fyHistory });
    } catch (err) {
        logger.error('Error fetching sales-per-kg:', err);
        res.status(500).json({
            error: 'Failed to fetch sales per kg data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

module.exports = router;

