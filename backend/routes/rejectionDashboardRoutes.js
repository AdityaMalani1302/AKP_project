const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// =============================================
// Rejection Dashboard API Routes
// Uses RejectionAnalysis view
// =============================================

// GET /rejection-dashboard/data - Rejection dashboard data (cached 5 min)
router.get('/data', cacheMiddleware('rejection-data-v2', 300), async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const request = new sql.Request(pool);
        request.timeout = 120000;

        // Fetch all data from the view
        // The view groups by Month Name and already filters for >= 2025-04-01
        const result = await request.query(`
            SELECT *
            FROM [${DB.POOLS.ERP}].dbo.RejectionAnalysis
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching rejection dashboard data:', err);
        res.status(500).json({
            error: 'Failed to fetch rejection dashboard data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

// GET /rejection-dashboard/inhouse-top - Top 10 Inhouse Rejection by Parts
router.get('/inhouse-top', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const { startDate, endDate, all } = req.query;
        const request = new sql.Request(pool);
        request.timeout = 120000;

        let result;
        if (startDate && endDate) {
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
            const isAll = String(all).toLowerCase() === 'true';
            const topClause = isAll ? '' : 'TOP 10';
            result = await request.query(`
                SELECT ${topClause} vp.InternalPartNo,
                    Sum(OkQty * p.productweight) AS inhouseokWt,
                    Sum(CummRejQty * p.productweight) AS inhouseRejWt
                FROM [${DB.POOLS.ERP}].dbo.view_ProductionSummary vp
                INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdID = vp.ProdID
                WHERE StgDATE >= @startDate AND StgDATE <= @endDate AND ProcessID IN (12, 19)
                GROUP BY vp.InternalPartNo
                ORDER BY inhouseRejWt DESC
            `);
        } else {
            result = await request.query(`
                SELECT * FROM [${DB.POOLS.ERP}].dbo.InhouseTop
            `);
        }

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching inhouse top rejection data:', err);
        res.status(500).json({
            error: 'Failed to fetch inhouse top rejection data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

// GET /rejection-dashboard/subcon-top - Top 10 Subcontractor Rejection by Parts
router.get('/subcon-top', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const { startDate, endDate, all } = req.query;
        const request = new sql.Request(pool);
        request.timeout = 120000;

        let result;
        if (startDate && endDate) {
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
            const isAll = String(all).toLowerCase() === 'true';
            const topClause = isAll ? '' : 'TOP 10';
            result = await request.query(`
                SELECT ${topClause} InternalPartNo, SUM(OutwardWt) AS OutwardWt, SUM(SubRejweight) AS SubRejweight,
                    ROUND((SUM(SubRejweight)/NULLIF(SUM(OutwardWt),0))*100, 2) AS RejPer
                FROM (
                    SELECT dates, InternalPartNo, 0 AS OutwardWt, SUM(SubRejweight) AS SubRejweight FROM (
                        SELECT o.InspDate AS dates, p.InternalPartNo, Sum(A.RejQty * ir.actual_akp_wt) AS SubRejweight
                        FROM [${DB.POOLS.ERP}].dbo.ProdnSubContractorCause A
                        INNER JOIN [${DB.POOLS.ERP}].dbo.ProdnSubContractorDetails B ON A.SubconDetID = B.SubconDetID
                        INNER JOIN [${DB.POOLS.ERP}].dbo.OtherInspection o ON o.OtherInspId = A.OtherInspId
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = b.ProdId
                        LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = p.RawMatID
                        WHERE o.InspDate >= @startDate AND o.InspDate <= @endDate
                        GROUP BY p.InternalPartNo, o.InspDate
                        UNION ALL
                        SELECT ir.rejdate AS dates, p.InternalPartNo, Sum(RejQty * irm.actual_akp_wt) AS SubRejweight
                        FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_grn ig ON ig.grnno = igm.Grnno
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                        LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial irm ON irm.Af_ID = p.RawMatID
                        WHERE ir.RejDate >= @startDate AND ir.RejDate <= @endDate AND ir.RejMode = 'Rejected' AND ig.AddnlParameter <> 'Customer Return'
                        GROUP BY p.InternalPartNo, ir.rejdate
                    ) sub
                    GROUP BY InternalPartNo, dates
                    UNION ALL
                    SELECT im.mindate AS dates, R.RawMatCode AS InternalPartNo, sum(imm.Qty * ir.actual_akp_wt) AS OutwardWt, 0 AS SubRejweight
                    FROM [${DB.POOLS.ERP}].dbo.invent_min im
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_MinMaterial imm ON im.MinNo = imm.Minno
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Subcontractor S ON S.SubconId = im.VendorID
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.RawMaterial r ON r.rawmatId = imm.rawmatId
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = r.RawMatID
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_grnmaterialdetail IGM ON IGM.Grnid = imm.Grnid
                    WHERE im.mindate >= @startDate AND im.mindate <= @endDate AND im.AddnlParameter = 'Issue To Subcontractor'
                    GROUP BY R.RawMatCode, im.mindate
                ) Subcon
                GROUP BY InternalPartNo
                ORDER BY SubRejweight DESC
            `);
        } else {
            result = await request.query(`
                SELECT * FROM [${DB.POOLS.ERP}].dbo.SubconTop
            `);
        }

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching subcon top rejection data:', err);
        res.status(500).json({
            error: 'Failed to fetch subcon top rejection data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

// GET /rejection-dashboard/custend-top - Top 10 Customer Rejection by Parts
router.get('/custend-top', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const { startDate, endDate, all } = req.query;
        const request = new sql.Request(pool);
        request.timeout = 120000;

        let result;
        if (startDate && endDate) {
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);
            const isAll = String(all).toLowerCase() === 'true';
            const topClause = isAll ? '' : 'TOP 10';
            result = await request.query(`
                SELECT ${topClause} InternalPartNo, SUM(DispWt) AS DespatchWeight, SUM(Rejwt) AS CustRejWt,
                    ROUND((SUM(Rejwt)/NULLIF(SUM(DispWt),0))*100, 2) AS RejPer
                FROM (
                    SELECT ir.RejDate AS dates, p.InternalPartNo, Sum(RejQty * r.Weight) AS Rejwt, 0 AS DispWt
                    FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_Grn ig ON ig.GrnNo = igm.Grnno
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                    INNER JOIN [${DB.POOLS.ERP}].dbo.RawMaterial r ON r.rawmatid = p.ProdId
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.PartyDetail si ON si.PartyID = ig.supid
                    WHERE ir.RejDate >= @startDate AND ir.RejDate <= @endDate AND ig.AddnlParameter = 'Customer Return' AND p.ProdID LIKE '%'
                    GROUP BY p.InternalPartNo, ir.RejDate
                    UNION ALL
                    SELECT DespatchDATE AS dates, r.RawMatCode AS InternalPartNo, 0 AS Rejwt, Sum(DespatchQty * Weight) AS DispWt
                    FROM [${DB.POOLS.ERP}].dbo.Despatch d
                    INNER JOIN [${DB.POOLS.ERP}].dbo.RawMaterial r ON r.rawmatid = d.ProdId
                    WHERE DespatchDATE >= @startDate AND DespatchDATE <= @endDate AND r.RawMatID LIKE '%'
                    GROUP BY r.RawMatCode, DespatchDATE
                ) CustEnd
                GROUP BY InternalPartNo
                ORDER BY CustRejWt DESC
            `);
        } else {
            result = await request.query(`
                SELECT * FROM [${DB.POOLS.ERP}].dbo.CustendTop
            `);
        }

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching customer end top rejection data:', err);
        res.status(500).json({
            error: 'Failed to fetch customer end top rejection data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

// GET /rejection-dashboard/typewise - Rejection data grouped by type (description)
router.get('/typewise', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const { startDate, endDate, all } = req.query;
        const request = new sql.Request(pool);
        request.timeout = 120000;

        let result;
        if (startDate && endDate) {
            request.input('startDate', sql.Date, startDate);
            request.input('endDate', sql.Date, endDate);

            // Inline query matching the RejectionTypeWise view with parameterized dates
            result = await request.query(`
                SELECT r.description,
                    ISNULL(SUM(InhRejWt), 0) AS InhRejtypeWt,
                    ISNULL(SUM(SubRejWt), 0) AS SubRejtypeWt,
                    ISNULL(SUM(CustRejWt), 0) AS CustRejtypeWt
                FROM [${DB.POOLS.ERP}].dbo.Rejection R
                LEFT OUTER JOIN (
                    -- Inhouse
                    SELECT e.RejId, ISNULL(F.InspDate, A.stgdate) AS Dates, p.ProdID,
                        SUM(E.RejQty * ir.RawCastingWeight) AS InhRejWt, 0 AS SubRejWt, 0 AS CustRejWt
                    FROM [${DB.POOLS.ERP}].dbo.ProdnForgingStagesCause E
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.OtherInspection F ON E.OtherInspId = F.OtherInspID AND F.InspectionID = E.ProdnForgingStagesID
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.ProdnForgingStages A ON E.ProdnForgingStagesID = A.ProdnForgingStagesID
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdId = A.ProdId
                    LEFT JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = a.ProdID
                    WHERE A.stgdate BETWEEN @startDate AND @endDate OR F.Inspdate BETWEEN @startDate AND @endDate
                    GROUP BY p.ProdID, e.RejId, F.InspDate, A.stgdate

                    UNION ALL

                    -- Subcontractor
                    SELECT sub.RejId, sub.dates AS Dates, sub.prodid, 0 AS InhRejWt,
                        ROUND(SUM(sub.SubRejQty * ir.RawCastingWeight), 2) AS SubRejWt, 0 AS CustRejWt
                    FROM (
                        SELECT a.rejid AS rejid, B.inwarddate AS dates, p.prodid AS prodid, p.productweight AS ProductWeight, A.rejqty AS SubRejQty
                        FROM [${DB.POOLS.ERP}].dbo.ProdnSubContractorCause A
                        INNER JOIN [${DB.POOLS.ERP}].dbo.ProdnSubContractorDetails B ON A.SubconDetID = B.SubconDetID
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdId = B.ProdId
                        WHERE InwardDate BETWEEN @startDate AND @endDate
                        UNION ALL
                        SELECT ir.rejid AS rejid, ir.RejDate AS dates, p.ProdID, p.productweight AS ProductWeight, RejQty AS SubRejQty
                        FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_grn ig ON ig.grnno = igm.Grnno
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                        WHERE ir.RejDate BETWEEN @startDate AND @endDate AND ir.RejMode = 'Rejected' AND ig.AddnlParameter <> 'Customer Return'
                    ) sub
                    LEFT JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = sub.prodid
                    GROUP BY sub.RejId, sub.dates, sub.prodid

                    UNION ALL

                    -- Customer
                    SELECT ir.RejId, ir.RejDate AS Dates, p.ProdId AS prodid, 0, 0,
                        SUM(RejQty * rm.RawCastingWeight) AS CustRejWt
                    FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_Grn ig ON ig.GrnNo = igm.Grnno
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                    LEFT JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial rm ON rm.Af_ID = igm.Rawmatid
                    WHERE ir.RejDate BETWEEN @startDate AND @endDate AND ig.AddnlParameter = 'Customer Return'
                    GROUP BY p.ProdID, ir.RejDate, ir.RejId
                ) C ON r.RejID = c.RejId
                INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdId = c.ProdID
                WHERE p.ProdID LIKE '%' AND p.CategoryID NOT IN (138)
                    AND Dates BETWEEN @startDate AND @endDate
                GROUP BY r.description
                ORDER BY (ISNULL(SUM(InhRejWt), 0) + ISNULL(SUM(SubRejWt), 0) + ISNULL(SUM(CustRejWt), 0)) DESC
            `);
        } else {
            // Fallback: use the view (full FY data)
            const isAll = String(all).toLowerCase() === 'true';
            const topClause = isAll ? '' : 'TOP 10';
            result = await request.query(`
                SELECT ${topClause} description,
                    ISNULL(InhRejtypeWt, 0) AS InhRejtypeWt,
                    ISNULL(SubRejtypeWt, 0) AS SubRejtypeWt,
                    ISNULL(CustRejtypeWt, 0) AS CustRejtypeWt
                FROM [${DB.POOLS.ERP}].dbo.RejectionTypeWise
                ORDER BY (ISNULL(InhRejtypeWt, 0) + ISNULL(SubRejtypeWt, 0) + ISNULL(CustRejtypeWt, 0)) DESC
            `);
        }

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching rejection typewise data:', err);
        res.status(500).json({
            error: 'Failed to fetch rejection typewise data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

module.exports = router;
