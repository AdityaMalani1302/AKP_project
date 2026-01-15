/**
 * Pattern Routes - Queries Module
 * GET endpoints for fetching pattern data
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { cacheMiddleware } = require('../../utils/cache');

// GET /pattern-master/stats - Get pattern stats summary (cached 60 sec)
router.get('/stats', cacheMiddleware('pattern-stats', 60), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        const result = await request.query(`
            SELECT COUNT(*) AS TotalPatterns FROM PatternMaster
        `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching pattern stats:', err);
        res.status(500).json({ error: 'Failed to fetch pattern stats' });
    }
});

// GET /pattern-master - Get all patterns with pagination
router.get('/', async (req, res) => {
    try {
        const { search, page, limit } = req.query;
        
        const usePagination = page !== undefined && limit !== undefined;
        const pageNum = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
        const offset = (pageNum - 1) * limitNum;

        let query;
        let countQuery;
        const request = req.db.request();

        let whereClause = '';
        if (search) {
            whereClause = ' WHERE pm.PatternNo LIKE @search OR c.CustName LIKE @search OR pm.Serial_No LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        if (usePagination) {
            query = `
                SELECT 
                    pm.*,
                    c.CustName as CustomerName,
                    s.SupName as Pattern_Maker_Name,
                    (SELECT TOP 1 Qty FROM PatternCavityMaster WHERE PatternId = pm.PatternId) as No_Of_Cavities,
                    (SELECT TOP 1 MaterialGrade FROM PatternCavityMaster WHERE PatternId = pm.PatternId) as Casting_Material_Grade
                FROM PatternMaster pm
                LEFT JOIN Customer c ON pm.Customer = c.CustId
                LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
                ${whereClause}
                ORDER BY pm.PatternId ASC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `;
            request.input('offset', sql.Int, offset);
            request.input('limit', sql.Int, limitNum);

            countQuery = `
                SELECT COUNT(*) as total
                FROM PatternMaster pm
                LEFT JOIN Customer c ON pm.Customer = c.CustId
                ${whereClause}
            `;
        } else {
            query = `
                SELECT TOP 100
                    pm.*,
                    c.CustName as CustomerName,
                    s.SupName as Pattern_Maker_Name,
                    (SELECT TOP 1 Qty FROM PatternCavityMaster WHERE PatternId = pm.PatternId) as No_Of_Cavities,
                    (SELECT TOP 1 MaterialGrade FROM PatternCavityMaster WHERE PatternId = pm.PatternId) as Casting_Material_Grade
                FROM PatternMaster pm
                LEFT JOIN Customer c ON pm.Customer = c.CustId
                LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
                ${whereClause}
                ORDER BY pm.PatternId ASC
            `;
        }

        const result = await request.query(query);

        if (usePagination) {
            const countRequest = req.db.request();
            if (search) {
                countRequest.input('search', sql.NVarChar, '%' + search + '%');
            }
            const countResult = await countRequest.query(countQuery);
            const total = countResult.recordset[0].total;

            res.json({
                data: result.recordset,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: total,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
        } else {
            res.json(result.recordset);
        }
    } catch (err) {
        console.error('Error fetching patterns:', err);
        res.status(500).json({ error: 'Failed to fetch patterns' });
    }
});

// GET /pattern-master/unified-data - Get unified pattern data with ALL columns
router.get('/unified-data', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                pm.PatternId,
                pm.PatternNo,
                pm.Customer,
                pm.Serial_No,
                pm.date,
                c.CustName AS CustomerName,
                pm.Pattern_Maker,
                s.SupName AS Pattern_Maker_Name,
                pm.Box_Per_Heat,
                pm.Total_Weight,
                pm.Moulding_Box_Size,
                pm.Bunch_Wt,
                pm.YieldPercent,
                pm.Rack_Location,
                pm.Asset_No,
                pm.Customer_Po_No,
                pm.Tooling_PO_Date,
                pm.Purchase_No,
                pm.Purchase_Date,
                pm.Pattern_Received_Date,
                pm.Quoted_Estimated_Weight,
                pm.Pattern_Material_Details,
                pm.No_Of_Patterns_Set,
                pm.Pattern_Pieces,
                pm.Core_Box_Material_Details,
                pm.Core_Box_Location,
                pm.Core_Box_S7_F4_No,
                pm.Core_Box_S7_F4_Date,
                pm.No_Of_Core_Box_Set,
                pm.Core_Box_Pieces,
                pm.Core_Wt,
                pm.shell_qty,
                pm.coldBox_qty,
                pm.noBake_qty,
                pm.Core_Type,
                pm.Main_Core,
                pm.Side_Core,
                pm.Loose_Core,
                pm.mainCore_qty,
                pm.sideCore_qty,
                pm.looseCore_qty,
                pm.Chaplets_COPE,
                pm.Chaplets_DRAG,
                pm.Chills_COPE,
                pm.Chills_DRAG,
                pm.Mould_Vents_Size,
                pm.Mould_Vents_No,
                pm.breaker_core_size,
                pm.down_sprue_size,
                pm.foam_filter_size,
                pm.sand_riser_size,
                pm.no_of_sand_riser,
                pm.ingate_size,
                pm.no_of_ingate,
                pm.runner_bar_size,
                pm.runner_bar_no,
                pm.rev_no_status,
                pm.comment,
                (SELECT COUNT(*) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalParts,
                (SELECT SUM(ISNULL(Qty, 0)) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalPartQty,
                (SELECT SUM(ISNULL(Qty, 0) * ISNULL(Weight, 0)) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalPartWeight,
                (SELECT COUNT(*) FROM SleeveMaster WHERE PatternId = pm.PatternId) AS TotalSleeveTypes,
                (SELECT SUM(ISNULL(quantity, 0)) FROM SleeveMaster WHERE PatternId = pm.PatternId) AS TotalSleeveQty
            FROM PatternMaster pm
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
        `;

        const request = req.db.request();

        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search OR c.CustName LIKE @search OR pm.Serial_No LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY pm.PatternId ASC';

        const result = await request.query(query);
        
        // Fetch parts and sleeves for each pattern
        const patternIds = result.recordset.map(p => p.PatternId);
        
        if (patternIds.length > 0) {
            // Fetch all parts for these patterns
            const partsRequest = req.db.request();
            const partsResult = await partsRequest.query(`
                SELECT 
                    pcm.PatternId,
                    ISNULL(p.InternalPartNo, CAST(pcm.PartNo AS VARCHAR)) AS PartNo,
                    ISNULL(p.ProdName, pcm.ProductName) AS ProductName,
                    pcm.Qty,
                    pcm.Weight
                FROM PatternCavityMaster pcm
                LEFT JOIN Product p ON pcm.PartNo = p.ProdId
                WHERE pcm.PatternId IN (${patternIds.join(',')})
            `);
            
            // Fetch all sleeves for these patterns
            const sleevesRequest = req.db.request();
            const sleevesResult = await sleevesRequest.query(`
                SELECT 
                    sm.PatternId,
                    sm.sleeve_name AS SleeveName,
                    ISNULL(rm.RawMatName, sm.sleeve_type_size) AS SleeveType,
                    sm.quantity AS Quantity
                FROM SleeveMaster sm
                LEFT JOIN RawMaterial rm ON 
                    CASE 
                        WHEN ISNUMERIC(sm.sleeve_type_size) = 1 
                        THEN CAST(sm.sleeve_type_size AS INT) 
                        ELSE NULL 
                    END = rm.RawMatID
                WHERE sm.PatternId IN (${patternIds.join(',')})
            `);
            
            // Group parts and sleeves by PatternId
            const partsByPattern = {};
            const sleevesByPattern = {};
            
            partsResult.recordset.forEach(part => {
                if (!partsByPattern[part.PatternId]) {
                    partsByPattern[part.PatternId] = [];
                }
                partsByPattern[part.PatternId].push({
                    partNo: part.PartNo,
                    productName: part.ProductName,
                    qty: part.Qty,
                    weight: part.Weight
                });
            });
            
            sleevesResult.recordset.forEach(sleeve => {
                if (!sleevesByPattern[sleeve.PatternId]) {
                    sleevesByPattern[sleeve.PatternId] = [];
                }
                sleevesByPattern[sleeve.PatternId].push({
                    sleeveName: sleeve.SleeveName,
                    sleeveType: sleeve.SleeveType,
                    quantity: sleeve.Quantity
                });
            });
            
            // Attach parts and sleeves to each pattern
            result.recordset.forEach(pattern => {
                pattern.parts = partsByPattern[pattern.PatternId] || [];
                pattern.sleeves = sleevesByPattern[pattern.PatternId] || [];
            });
        }
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching unified pattern data:', err);
        res.status(500).json({ error: 'Failed to fetch unified pattern data' });
    }
});

// GET /pattern-master/numbers - Get pattern numbers for dropdown (cached 5 min)
router.get('/numbers', cacheMiddleware('pattern-numbers', 300), async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                pm.PatternId, 
                pm.PatternNo,
                pm.Product_Name,
                p.ProdName as ProductName,
                c.CustId as CustomerId,
                c.CustName as CustomerName
            FROM PatternMaster pm
            LEFT JOIN Product p ON pm.Product_Name = p.ProdId
            LEFT JOIN Customer c ON pm.Customer = c.CustId
        `;
        
        const request = req.db.request();
        
        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }
        
        query += ' ORDER BY pm.PatternId ASC';
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching pattern numbers:', err);
        res.status(500).json({ error: 'Failed to fetch pattern numbers' });
    }
});

// GET /pattern-master/:id - Get single pattern with parts and sleeves
// Optimized: Uses Promise.all to run parts and sleeves queries in parallel
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // First, get the pattern (required to check if it exists)
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));

        const patternResult = await request.query`
            SELECT 
                pm.*,
                c.CustName AS CustomerName,
                s.SupName AS Pattern_Maker_Name
            FROM PatternMaster pm
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
            WHERE pm.PatternId = @id
        `;

        if (patternResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Pattern not found' });
        }

        const pattern = patternResult.recordset[0];

        // Run parts and sleeves queries in PARALLEL for better performance
        const partsRequest = new sql.Request(req.db);
        partsRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));
        
        const sleevesRequest = new sql.Request(req.db);
        sleevesRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));

        const [partsResult, sleevesResult] = await Promise.all([
            partsRequest.query`
                SELECT 
                    pcm.PartRowId,
                    pcm.PatternId,
                    pcm.PartNo,
                    ISNULL(p.InternalPartNo, CAST(pcm.PartNo AS VARCHAR)) AS InternalPartNo,
                    pcm.ProductName,
                    ISNULL(p.ProdName, pcm.ProductName) AS ProdName,
                    pcm.Qty,
                    pcm.Weight,
                    pcm.MaterialGrade AS MaterialGradeId,
                    g.GradeName AS MaterialGradeName
                FROM PatternCavityMaster pcm
                LEFT JOIN Product p ON pcm.PartNo = p.ProdId
                LEFT JOIN Grade g ON pcm.MaterialGrade = g.GradeId
                WHERE pcm.PatternId = @patternId
            `,
            sleevesRequest.query`
                SELECT 
                    sm.SleeveRowId,
                    sm.PatternId,
                    sm.sleeve_name,
                    sm.sleeve_type_size,
                    rm.RawMatName AS sleeve_type_size_name,
                    sm.quantity
                FROM SleeveMaster sm
                LEFT JOIN RawMaterial rm ON 
                    CASE 
                        WHEN ISNUMERIC(sm.sleeve_type_size) = 1 
                        THEN CAST(sm.sleeve_type_size AS INT) 
                        ELSE NULL 
                    END = rm.RawMatID
                WHERE sm.PatternId = @patternId
            `
        ]);

        const mappedParts = partsResult.recordset.map(part => ({
            partNo: part.PartNo,
            internalPartNo: part.InternalPartNo,
            productName: part.ProdName || part.ProductName,
            materialGradeId: part.MaterialGradeId,
            materialGradeName: part.MaterialGradeName || '',
            qty: part.Qty,
            weight: part.Weight
        }));

        res.json({
            ...pattern,
            parts: mappedParts,
            sleeveRows: sleevesResult.recordset
        });
    } catch (err) {
        console.error('Error fetching pattern details:', err);
        res.status(500).json({ error: 'Failed to fetch pattern details' });
    }
});

module.exports = router;
