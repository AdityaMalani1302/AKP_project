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

const YYYY_MM_DD = /^\d{4}-\d{2}-\d{2}$/;
function safeDateLiteral(v) {
    if (!YYYY_MM_DD.test(v)) throw new Error('Invalid date format');
    return `'${v}'`;
}

// GET /rejection-dashboard/data - Rejection dashboard data (cached 5 min)
router.get('/data', cacheMiddleware('rejection-data-v2', 300), async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const request = new sql.Request(pool);
        request.timeout = 120000;

        // Inline query instead of view to guarantee Month-Year grouping.
        // The RejectionAnalysis view on the DB may have lost its year component.
        const db = DB.POOLS.ERP;
        const result = await request.query(`
            SELECT
                CAST(DATENAME(month, Dates) AS VARCHAR) + '-' + CAST(DATENAME(year, Dates) AS VARCHAR) AS Months,
                ISNULL(SUM(OkQTy), 0) AS ProductionQty,
                ISNULL(SUM(OkQty * ir.RawCastingWeight), 0) AS ProductionWeight,
                ISNULL(SUM(OutQty), 0) AS SubconOutQty,
                ROUND(ISNULL(SUM(OutQty * ir.RawCastingWeight), 0), 2) AS SubconOutweight,
                ISNULL(SUM(DispQty), 0) AS DespatchQty,
                ISNULL(SUM(DispQty * weight), 0) AS DespatchWeight,
                ISNULL(SUM(RejQty), 0) AS ProductionRejQty,
                ISNULL(SUM(RejQty * ir.RawCastingWeight), 0) AS InhouseRejWt,
                ISNULL(SUM(SubRejQty), 0) AS SubConRejQty,
                ISNULL(SUM(SubRejQty * ir.RawCastingWeight), 0) AS SubconRejWt,
                ISNULL(SUM(CustRejQty), 0) AS CustEndRejQty,
                ISNULL(SUM(CustRejQty * ir.RawCastingWeight), 0) AS CustEndRejWt,
                ISNULL(SUM(RejQty) + SUM(SubRejQty) + SUM(CustRejQty), 0) AS TotalRejQty,
                ISNULL(SUM(RejQty * ir.RawCastingWeight) + SUM(SubRejQty * ir.RawCastingWeight) + SUM(CustRejQty * ir.RawCastingWeight), 0) AS TotalWeight
            FROM [${db}].dbo.Product A
            INNER JOIN [${db}].dbo.RawMaterial B ON A.ProdID = B.RawMatID
            LEFT JOIN [${db}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = A.ProdID
            INNER JOIN (
                SELECT stgdate AS dates, ProdID, SUM(OkQty) AS OkQty, 0 AS DespQty, SUM(CummRejQty) AS RejQty,
                    0 AS SubRejQTy, 0 AS CustRejQty, 0 AS OutQty, '' AS Customer, 0 AS DispQty, 0 AS dispwt
                FROM [${db}].dbo.view_ProductionSummary
                WHERE StgDATE >= '2020-04-01' AND ProcessID IN (19) AND ProdID LIKE '%'
                GROUP BY ProdID, stgdate

                UNION ALL

                SELECT dates, sub.ProdID, 0, 0, 0, SUM(SubRejQty), 0, 0, '', 0, 0 FROM (
                    SELECT o.InspDate AS dates, B.ProdID, SUM(A.RejQty) AS SubRejQty
                    FROM [${db}].dbo.ProdnSubContractorCause A
                    INNER JOIN [${db}].dbo.ProdnSubContractorDetails B ON A.SubconDetID = B.SubconDetID
                    INNER JOIN [${db}].dbo.OtherInspection o ON o.OtherInspId = A.OtherInspId
                    WHERE o.InspDate >= '2020-04-01' AND ProdID LIKE '%'
                    GROUP BY ProdID, o.InspDate
                    UNION ALL
                    SELECT ir2.rejdate, p.ProdID, SUM(RejQty)
                    FROM [${db}].dbo.Invent_rejection ir2
                    INNER JOIN [${db}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir2.GrnId
                    INNER JOIN [${db}].dbo.Invent_grn ig ON ig.grnno = igm.Grnno
                    INNER JOIN [${db}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                    WHERE ir2.RejDate >= '2020-04-01' AND ir2.RejMode = 'Rejected' AND ig.AddnlParameter <> 'Customer Return'
                        AND p.ProdID LIKE '%'
                    GROUP BY p.ProdID, ir2.rejdate
                ) sub
                GROUP BY ProdID, dates

                UNION ALL

                SELECT im.mindate, R.RawMatID, 0, 0, 0, 0, 0, SUM(imm.Qty), '', 0, 0
                FROM [${db}].dbo.Invent_min im
                INNER JOIN [${db}].dbo.Invent_MinMaterial imm ON im.MinNo = imm.Minno
                INNER JOIN [${db}].dbo.Subcontractor S ON S.SubconId = im.VendorID
                LEFT OUTER JOIN [${db}].dbo.RawMaterial r ON r.rawmatId = imm.rawmatId
                INNER JOIN [${db}].dbo.Invent_grnmaterialdetail IGM ON IGM.Grnid = imm.Grnid
                WHERE im.mindate >= '2020-04-01' AND im.VendorID LIKE '%' AND im.LocationId = 1
                    AND r.RawMatID LIKE '%' AND im.AddnlParameter = 'Issue To Subcontractor'
                GROUP BY R.RawMatID, im.mindate

                UNION ALL

                SELECT ir3.RejDate, p2.ProdID, 0, 0, 0, 0, SUM(RejQty), 0, si.Name, 0, 0
                FROM [${db}].dbo.Invent_rejection ir3
                INNER JOIN [${db}].dbo.Invent_GrnMaterialdetail igm2 ON igm2.GRNID = ir3.GrnId
                INNER JOIN [${db}].dbo.Invent_Grn ig2 ON ig2.GrnNo = igm2.Grnno
                INNER JOIN [${db}].dbo.Product p2 ON p2.Rawmatid = igm2.Rawmatid
                LEFT OUTER JOIN [${db}].dbo.PartyDetail si ON si.PartyID = ig2.supid
                WHERE ir3.RejDate >= '2020-04-01' AND ig2.AddnlParameter = 'Customer Return' AND p2.ProdID LIKE '%'
                GROUP BY p2.ProdID, si.Name, ir3.RejDate

                UNION ALL

                SELECT DespatchDATE, d.ProdID, 0, 0, 0, 0, 0, 0, '', SUM(DespatchQty), SUM(Despatchqty * weight)
                FROM [${db}].dbo.Despatch d
                INNER JOIN [${db}].dbo.RawMaterial r ON r.rawmatid = d.ProdId
                WHERE DespatchDATE >= '2020-04-01' AND r.RawMatID LIKE '%'
                GROUP BY d.ProdID, DespatchDATE
            ) C ON A.ProdID = C.ProdID
            GROUP BY CAST(DATENAME(month, Dates) AS VARCHAR), CAST(DATENAME(year, Dates) AS VARCHAR)
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
            const sd = safeDateLiteral(startDate);
            const ed = safeDateLiteral(endDate);
            const isAll = String(all).toLowerCase() === 'true';
            const topClause = isAll ? '' : 'TOP 10';
            result = await request.query(`
                SELECT ${topClause} vp.InternalPartNo,
                    SUM(OkQty * ir.RawCastingWeight) AS inhouseokWt,
                    SUM(CummRejQty * ir.RawCastingWeight) AS inhouseRejWt
                FROM [${DB.POOLS.ERP}].dbo.view_ProductionSummary vp
                LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = vp.ProdID
                WHERE StgDATE >= ${sd} AND StgDATE <= ${ed} AND ProcessID IN (19)
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
            const sd = safeDateLiteral(startDate);
            const ed = safeDateLiteral(endDate);
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
                        WHERE o.InspDate >= ${sd} AND o.InspDate <= ${ed}
                        GROUP BY p.InternalPartNo, o.InspDate
                        UNION ALL
                        SELECT ir.rejdate AS dates, p.InternalPartNo, Sum(RejQty * irm.actual_akp_wt) AS SubRejweight
                        FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_grn ig ON ig.grnno = igm.Grnno
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                        LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial irm ON irm.Af_ID = p.RawMatID
                        WHERE ir.RejDate >= ${sd} AND ir.RejDate <= ${ed} AND ir.RejMode = 'Rejected' AND ig.AddnlParameter <> 'Customer Return'
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
                    WHERE im.mindate >= ${sd} AND im.mindate <= ${ed} AND im.AddnlParameter = 'Issue To Subcontractor'
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
            const sd = safeDateLiteral(startDate);
            const ed = safeDateLiteral(endDate);
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
                    WHERE ir.RejDate >= ${sd} AND ir.RejDate <= ${ed} AND ig.AddnlParameter = 'Customer Return' AND p.ProdID LIKE '%'
                    GROUP BY p.InternalPartNo, ir.RejDate
                    UNION ALL
                    SELECT DespatchDATE AS dates, r.RawMatCode AS InternalPartNo, 0 AS Rejwt, Sum(DespatchQty * Weight) AS DispWt
                    FROM [${DB.POOLS.ERP}].dbo.Despatch d
                    INNER JOIN [${DB.POOLS.ERP}].dbo.RawMaterial r ON r.rawmatid = d.ProdId
                    WHERE DespatchDATE >= ${sd} AND DespatchDATE <= ${ed} AND r.RawMatID LIKE '%'
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

// GET /rejection-dashboard/subconname-top - Top 10 Subcontractor Rejection by SubconName
router.get('/subconname-top', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) return res.status(503).json({ error: 'Database service unavailable' });

        const request = new sql.Request(pool);
        const result = await request.query(`
            SELECT TOP 10 * FROM [${DB.POOLS.ERP}].dbo.SubconNameTop ORDER BY RejWt DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching subcon name top rejection data:', err);
        res.status(500).json({ error: 'Failed to fetch subcon name top rejection data' });
    }
});

// GET /rejection-dashboard/customername-top - Top 10 Customer Rejection by CustomerName
router.get('/customername-top', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) return res.status(503).json({ error: 'Database service unavailable' });

        const request = new sql.Request(pool);
        const result = await request.query(`
            SELECT TOP 10 * FROM [${DB.POOLS.ERP}].dbo.CustomerNameTop ORDER BY Rej DESC
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching customer name top rejection data:', err);
        res.status(500).json({ error: 'Failed to fetch customer name top rejection data' });
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
            const sd = safeDateLiteral(startDate);
            const ed = safeDateLiteral(endDate);

            result = await request.query(`
                SELECT r.description,
                    ISNULL(SUM(InhRejWt), 0) AS InhRejtypeWt,
                    ISNULL(SUM(SubRejWt), 0) AS SubRejtypeWt,
                    ISNULL(SUM(CustRejWt), 0) AS CustRejtypeWt
                FROM [${DB.POOLS.ERP}].dbo.Rejection R
                LEFT OUTER JOIN (
                    SELECT e.RejId, ISNULL(F.InspDate, A.stgdate) AS Dates, p.ProdID,
                        SUM(E.RejQty * ir.actual_akp_wt) AS InhRejWt, 0 AS SubRejWt, 0 AS CustRejWt
                    FROM [${DB.POOLS.ERP}].dbo.ProdnForgingStagesCause E
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.OtherInspection F ON E.OtherInspId = F.OtherInspID AND F.InspectionID = E.ProdnForgingStagesID
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.ProdnForgingStages A ON E.ProdnForgingStagesID = A.ProdnForgingStagesID
                    LEFT OUTER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdId = A.ProdId
                    LEFT JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = a.ProdID
                    WHERE ISNULL(F.Inspdate, A.stgdate) BETWEEN ${sd} AND ${ed}
                    GROUP BY p.ProdID, e.RejId, F.InspDate, A.stgdate

                    UNION ALL

                    SELECT sub.RejId, sub.dates AS Dates, sub.prodid, 0 AS InhRejWt,
                        ROUND(SUM(sub.SubRejQty * ir.actual_akp_wt), 2) AS SubRejWt, 0 AS CustRejWt
                    FROM (
                        SELECT a.rejid AS rejid, B.inwarddate AS dates, p.prodid AS prodid, p.productweight AS ProductWeight, A.rejqty AS SubRejQty
                        FROM [${DB.POOLS.ERP}].dbo.ProdnSubContractorCause A
                        INNER JOIN [${DB.POOLS.ERP}].dbo.ProdnSubContractorDetails B ON A.SubconDetID = B.SubconDetID
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdId = B.ProdId
                        WHERE InwardDate BETWEEN ${sd} AND ${ed}
                        UNION ALL
                        SELECT ir.rejid AS rejid, ir.RejDate AS dates, p.ProdID, p.productweight AS ProductWeight, RejQty AS SubRejQty
                        FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_grn ig ON ig.grnno = igm.Grnno
                        INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                        WHERE ir.RejDate BETWEEN ${sd} AND ${ed} AND ir.RejMode = 'Rejected' AND ig.AddnlParameter <> 'Customer Return'
                    ) sub
                    LEFT JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial ir ON ir.Af_ID = sub.prodid
                    GROUP BY sub.RejId, sub.dates, sub.prodid

                    UNION ALL

                    SELECT ir.RejId, ir.RejDate AS Dates, p.ProdId AS prodid, 0, 0,
                        SUM(RejQty * rm.actual_akp_wt) AS CustRejWt
                    FROM [${DB.POOLS.ERP}].dbo.Invent_rejection ir
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_GrnMaterialdetail igm ON igm.GRNID = ir.GrnId
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Invent_Grn ig ON ig.GrnNo = igm.Grnno
                    INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.Rawmatid = igm.Rawmatid
                    LEFT JOIN [${DB.POOLS.ERP}].dbo.Invent_Rawmaterial rm ON rm.Af_ID = igm.Rawmatid
                    WHERE ir.RejDate BETWEEN ${sd} AND ${ed} AND ig.AddnlParameter = 'Customer Return'
                    GROUP BY p.ProdID, ir.RejDate, ir.RejId
                ) C ON r.RejID = c.RejId
                INNER JOIN [${DB.POOLS.ERP}].dbo.Product p ON p.ProdId = c.ProdID
                WHERE p.ProdID LIKE '%' AND p.CategoryID NOT IN (138)
                    AND Dates BETWEEN ${sd} AND ${ed}
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
// GET /rejection-dashboard/family-segment - Family and Segment wise rejection data
// Uses RejectionAnalysisFamily view
router.get('/family-segment', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        if (!pool) {
            return res.status(503).json({ error: 'Database service unavailable' });
        }

        const request = new sql.Request(pool);
        request.timeout = 180000;

        const result = await request.query(`
            SELECT 
                Months,
                ProductType,
                SegmentType,
                ProductionQty,
                ProductionWeight,
                SubconOutQty,
                SubconOutweight,
                DespatchQty,
                DespatchWeight,
                ProductionRejQty,
                InhouseRejWt,
                SubConRejQty,
                SubconRejWt,
                CustEndRejQty,
                CustEndRejWt,
                TotalRejQty,
                TotalWeight
            FROM [${DB.POOLS.ERP}].dbo.RejectionAnalysisFamily
        `);

        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching family-segment rejection data:', err);
        res.status(500).json({
            error: 'Failed to fetch family-segment rejection data',
            ...(process.env.NODE_ENV !== 'production' && { details: err.message })
        });
    }
});

module.exports = router;
