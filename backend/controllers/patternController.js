const { sql } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Field mapping for PatternMaster INSERT/UPDATE operations.
 * Maps field names to their SQL data types.
 */
const PATTERN_FIELD_MAP = {
    Part_No: sql.Numeric(18, 0),
    Product_Name: sql.Numeric(18, 0),
    Bunch_Wt: sql.VarChar(255),
    YieldPercent: sql.VarChar(255),
    Moulding_Box_Size: sql.VarChar(255),
    Core_Wt: sql.VarChar(255),
    Rack_Location: sql.VarChar(255),
    Box_Per_Heat: sql.VarChar(255),
    Customer_Po_No: sql.VarChar(255),
    Serial_No: sql.VarChar(255),
    Asset_No: sql.VarChar(255),
    Tooling_PO_Date: sql.Date,
    Purchase_No: sql.VarChar(255),
    Purchase_Date: sql.Date,
    Pattern_Received_Date: sql.Date,
    Quoted_Estimated_Weight: sql.VarChar(255),
    Pattern_Material_Details: sql.VarChar(255),
    No_Of_Patterns_Set: sql.VarChar(255),
    Pattern_Pieces: sql.VarChar(255),
    Core_Box_Material_Details: sql.VarChar(255),
    Core_Box_Location: sql.VarChar(255),
    Core_Box_S7_F4_No: sql.VarChar(255),
    Core_Box_S7_F4_Date: sql.Date,
    No_Of_Core_Box_Set: sql.VarChar(255),
    Core_Box_Pieces: sql.VarChar(255),
    Total_Weight: sql.VarChar(255),
    Core_Type: sql.VarChar(255),
    Main_Core: sql.VarChar(255),
    Side_Core: sql.VarChar(255),
    Loose_Core: sql.VarChar(255),
    Chaplets_COPE: sql.VarChar(255),
    Chaplets_DRAG: sql.VarChar(255),
    Chills_COPE: sql.VarChar(255),
    Chills_DRAG: sql.VarChar(255),
    Mould_Vents_Size: sql.VarChar(255),
    Mould_Vents_No: sql.VarChar(255),
    shell_qty: sql.Int,
    coldBox_qty: sql.Int,
    noBake_qty: sql.Int,
    mainCore_qty: sql.VarChar(255),
    sideCore_qty: sql.VarChar(255),
    looseCore_qty: sql.VarChar(255),
    breaker_core_size: sql.VarChar(255),
    down_sprue_size: sql.VarChar(255),
    foam_filter_size: sql.VarChar(255),
    sand_riser_size: sql.VarChar(255),
    no_of_sand_riser: sql.VarChar(255),
    ingate_size: sql.VarChar(255),
    no_of_ingate: sql.VarChar(255),
    runner_bar_size: sql.VarChar(255),
    runner_bar_no: sql.VarChar(255),
    rev_no_status: sql.VarChar(255),
    date: sql.Date,
    comment: sql.VarChar(8000)
};

/**
 * Pattern Controller
 * Handles Pattern Master CRUD and Query operations
 */
const patternController = {

    /**
     * Get pattern stats summary
     * @route GET /pattern-master/stats
     */
    getStats: async (req, res) => {
        try {
            const result = await req.db.request().query('SELECT COUNT(*) AS TotalPatterns FROM PatternMaster');
            res.json(result.recordset[0]);
        } catch (err) {
            logger.error('Error fetching pattern stats:', err);
            res.status(500).json({ error: 'Failed to fetch pattern stats' });
        }
    },

    /**
     * Get all patterns with pagination and search
     * @route GET /pattern-master
     */
    getAllPatterns: async (req, res) => {
        try {
            const { search, page, limit } = req.query;
            const usePagination = page !== undefined && limit !== undefined;
            const pageNum = Math.max(1, parseInt(page) || 1);
            const limitNum = Math.min(200, Math.max(1, parseInt(limit) || 50));
            const offset = (pageNum - 1) * limitNum;

            const pool = req.db;
            const request = pool.request();

            let whereClause = '';
            if (search) {
                whereClause = ' WHERE pm.PatternNo LIKE @search OR c.CustName LIKE @search OR pm.Serial_No LIKE @search';
                request.input('search', sql.NVarChar, '%' + search + '%');
            }

            let query;
            let countQuery;

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
                const countRequest = pool.request();
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
            logger.error('Error fetching patterns:', err);
            res.status(500).json({ error: 'Failed to fetch patterns' });
        }
    },

    /**
     * Get unified pattern data (heavy query)
     * @route GET /pattern-master/unified-data
     */
    getUnifiedData: async (req, res) => {
        try {
            const { search } = req.query;
            const pool = req.db;
            const request = pool.request();

            let query = `
                SELECT 
                    pm.PatternId, pm.PatternNo, pm.Customer, pm.Serial_No, pm.date,
                    c.CustName AS CustomerName, pm.Pattern_Maker, s.SupName AS Pattern_Maker_Name,
                    pm.Box_Per_Heat, pm.Total_Weight, pm.Moulding_Box_Size, pm.Bunch_Wt, pm.YieldPercent,
                    pm.Rack_Location, pm.Asset_No, pm.Customer_Po_No, pm.Tooling_PO_Date, pm.Purchase_No,
                    pm.Purchase_Date, pm.Pattern_Received_Date, pm.Quoted_Estimated_Weight, pm.Pattern_Material_Details,
                    pm.No_Of_Patterns_Set, pm.Pattern_Pieces, pm.Core_Box_Material_Details, pm.Core_Box_Location,
                    pm.Core_Box_S7_F4_No, pm.Core_Box_S7_F4_Date, pm.No_Of_Core_Box_Set, pm.Core_Box_Pieces,
                    pm.Core_Wt, pm.shell_qty, pm.coldBox_qty, pm.noBake_qty, pm.Core_Type,
                    pm.Main_Core, pm.Side_Core, pm.Loose_Core, pm.mainCore_qty, pm.sideCore_qty, pm.looseCore_qty,
                    pm.Chaplets_COPE, pm.Chaplets_DRAG, pm.Chills_COPE, pm.Chills_DRAG,
                    pm.Mould_Vents_Size, pm.Mould_Vents_No, pm.breaker_core_size, pm.down_sprue_size,
                    pm.foam_filter_size, pm.sand_riser_size, pm.no_of_sand_riser, pm.ingate_size,
                    pm.no_of_ingate, pm.runner_bar_size, pm.runner_bar_no, pm.rev_no_status, pm.comment,
                    (SELECT COUNT(*) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalParts,
                    (SELECT SUM(ISNULL(Qty, 0)) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalPartQty,
                    (SELECT SUM(ISNULL(Qty, 0) * ISNULL(Weight, 0)) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalPartWeight,
                    (SELECT COUNT(*) FROM SleeveMaster WHERE PatternId = pm.PatternId) AS TotalSleeveTypes,
                    (SELECT SUM(ISNULL(quantity, 0)) FROM SleeveMaster WHERE PatternId = pm.PatternId) AS TotalSleeveQty
                FROM PatternMaster pm
                LEFT JOIN Customer c ON pm.Customer = c.CustId
                LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
            `;

            if (search) {
                query += ' WHERE pm.PatternNo LIKE @search OR c.CustName LIKE @search OR pm.Serial_No LIKE @search';
                request.input('search', sql.NVarChar, '%' + search + '%');
            }

            query += ' ORDER BY pm.PatternId ASC';

            const result = await request.query(query);
            const patterns = result.recordset;
            const patternIds = patterns.map(p => p.PatternId);

            if (patternIds.length > 0) {
                const partsRequest = pool.request();
                const partsResult = await partsRequest.query(`
                    SELECT pcm.PatternId, ISNULL(p.InternalPartNo, CAST(pcm.PartNo AS VARCHAR)) AS PartNo,
                           ISNULL(p.ProdName, pcm.ProductName) AS ProductName, pcm.Qty, pcm.Weight
                    FROM PatternCavityMaster pcm
                    LEFT JOIN Product p ON pcm.PartNo = p.ProdId
                    WHERE pcm.PatternId IN (${patternIds.join(',')})
                `);

                const sleevesRequest = pool.request();
                const sleevesResult = await sleevesRequest.query(`
                    SELECT sm.PatternId, sm.sleeve_name AS SleeveName,
                           ISNULL(rm.RawMatName, sm.sleeve_type_size) AS SleeveType, sm.quantity AS Quantity
                    FROM SleeveMaster sm
                    LEFT JOIN RawMaterial rm ON 
                        CASE WHEN ISNUMERIC(sm.sleeve_type_size) = 1 THEN CAST(sm.sleeve_type_size AS INT) ELSE NULL END = rm.RawMatID
                    WHERE sm.PatternId IN (${patternIds.join(',')})
                `);

                const partsByPattern = {};
                const sleevesByPattern = {};

                partsResult.recordset.forEach(p => {
                    if (!partsByPattern[p.PatternId]) partsByPattern[p.PatternId] = [];
                    partsByPattern[p.PatternId].push({ partNo: p.PartNo, productName: p.ProductName, qty: p.Qty, weight: p.Weight });
                });

                sleevesResult.recordset.forEach(s => {
                    if (!sleevesByPattern[s.PatternId]) sleevesByPattern[s.PatternId] = [];
                    sleevesByPattern[s.PatternId].push({ sleeveName: s.SleeveName, sleeveType: s.SleeveType, quantity: s.Quantity });
                });

                patterns.forEach(p => {
                    p.parts = partsByPattern[p.PatternId] || [];
                    p.sleeves = sleevesByPattern[p.PatternId] || [];
                });
            }

            logger.info('Fetched unified pattern data');
            res.json(patterns);
        } catch (err) {
            logger.error('Error fetching unified pattern data:', err);
            res.status(500).json({ error: 'Failed to fetch unified pattern data' });
        }
    },

    /**
     * Get pattern numbers for dropdown
     * @route GET /pattern-master/numbers
     */
    getPatternNumbers: async (req, res) => {
        try {
            const { search } = req.query;
            const pool = req.db;
            const request = pool.request();

            let query = `
                SELECT pm.PatternId, pm.PatternNo, pm.Product_Name, p.ProdName as ProductName,
                       c.CustId as CustomerId, c.CustName as CustomerName
                FROM PatternMaster pm
                LEFT JOIN Product p ON pm.Product_Name = p.ProdId
                LEFT JOIN Customer c ON pm.Customer = c.CustId
            `;

            if (search) {
                query += ' WHERE pm.PatternNo LIKE @search';
                request.input('search', sql.NVarChar, '%' + search + '%');
            }

            query += ' ORDER BY pm.PatternId ASC';

            const result = await request.query(query);
            res.json(result.recordset);
        } catch (err) {
            logger.error('Error fetching pattern numbers:', err);
            res.status(500).json({ error: 'Failed to fetch pattern numbers' });
        }
    },

    /**
     * Get single pattern by ID
     * @route GET /pattern-master/:id
     */
    getPatternById: async (req, res) => {
        const { id } = req.params;
        try {
            const pool = req.db;
            const request = pool.request();
            request.input('id', sql.Numeric(18, 0), parseInt(id));

            const patternResult = await request.query`
                SELECT pm.*, c.CustName AS CustomerName, s.SupName AS Pattern_Maker_Name
                FROM PatternMaster pm
                LEFT JOIN Customer c ON pm.Customer = c.CustId
                LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
                WHERE pm.PatternId = @id
            `;

            if (patternResult.recordset.length === 0) {
                return res.status(404).json({ error: 'Pattern not found' });
            }

            const pattern = patternResult.recordset[0];

            const partsRequest = pool.request();
            partsRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));

            const sleevesRequest = pool.request();
            sleevesRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));

            const [partsResult, sleevesResult] = await Promise.all([
                partsRequest.query`
                    SELECT pcm.PartRowId, pcm.PatternId, pcm.PartNo,
                           ISNULL(p.InternalPartNo, CAST(pcm.PartNo AS VARCHAR)) AS InternalPartNo,
                           pcm.ProductName, ISNULL(p.ProdName, pcm.ProductName) AS ProdName,
                           pcm.Qty, pcm.Weight, pcm.MaterialGrade AS MaterialGradeId, g.GradeName AS MaterialGradeName
                    FROM PatternCavityMaster pcm
                    LEFT JOIN Product p ON pcm.PartNo = p.ProdId
                    LEFT JOIN Grade g ON pcm.MaterialGrade = g.GradeId
                    WHERE pcm.PatternId = @patternId
                `,
                sleevesRequest.query`
                    SELECT sm.SleeveRowId, sm.PatternId, sm.sleeve_name, sm.sleeve_type_size,
                           rm.RawMatName AS sleeve_type_size_name, sm.quantity
                    FROM SleeveMaster sm
                    LEFT JOIN RawMaterial rm ON 
                        CASE WHEN ISNUMERIC(sm.sleeve_type_size) = 1 THEN CAST(sm.sleeve_type_size AS INT) ELSE NULL END = rm.RawMatID
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

            res.json({ ...pattern, parts: mappedParts, sleeveRows: sleevesResult.recordset });
        } catch (err) {
            logger.error(`Error fetching pattern ${id}:`, err);
            res.status(500).json({ error: 'Failed to fetch pattern details' });
        }
    },

    /**
     * Create new pattern
     * @route POST /pattern-master
     */
    createPattern: async (req, res) => {
        // Assume req.body contains all validated fields (validation middleware handles basics)
        const {
            Customer, Pattern_Maker, PatternNo, parts, sleeveRows, ...otherFields
        } = req.body;

        const pool = req.db;
        const transaction = new sql.Transaction(pool);

        try {
            // Check Duplicate Logic (omitted for brevity, can be added if strict check needed outside transaction)
            // Check for duplicate PatternNo
            if (PatternNo) {
                const checkRequest = pool.request();
                checkRequest.input('PatternNo', sql.VarChar(255), PatternNo);
                const existingPattern = await checkRequest.query`SELECT PatternId FROM PatternMaster WHERE PatternNo = @PatternNo`;
                if (existingPattern.recordset.length > 0) {
                    return res.status(409).json({ error: `Pattern No '${PatternNo}' already exists.` });
                }
            }

            await transaction.begin();
            const request = new sql.Request(transaction);

            request.input('Customer', sql.Numeric(18, 0), Customer);
            request.input('Pattern_Maker', sql.Numeric(18, 0), Pattern_Maker || null);
            request.input('PatternNo', sql.VarChar(255), PatternNo || null);

            for (const [key, type] of Object.entries(PATTERN_FIELD_MAP)) {
                request.input(key, type, req.body[key] || null);
            }

            const result = await request.query`
                INSERT INTO PatternMaster (
                    Customer, Part_No, Product_Name, Pattern_Maker, PatternNo, Bunch_Wt, YieldPercent, Moulding_Box_Size, Core_Wt,
                    Rack_Location, Box_Per_Heat, Customer_Po_No, Serial_No, Asset_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
                    Pattern_Received_Date, Quoted_Estimated_Weight, Pattern_Material_Details, No_Of_Patterns_Set, Pattern_Pieces,
                    Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No, Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
                    Total_Weight, Core_Type, Main_Core, Side_Core, Loose_Core, Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
                    Mould_Vents_Size, Mould_Vents_No, shell_qty, coldBox_qty, noBake_qty, mainCore_qty, sideCore_qty, looseCore_qty,
                    breaker_core_size, down_sprue_size, foam_filter_size, sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
                    runner_bar_size, runner_bar_no, rev_no_status, date, comment
                )
                OUTPUT INSERTED.PatternId
                VALUES (
                    @Customer, @Part_No, @Product_Name, @Pattern_Maker, @PatternNo, @Bunch_Wt, @YieldPercent, @Moulding_Box_Size, @Core_Wt,
                    @Rack_Location, @Box_Per_Heat, @Customer_Po_No, @Serial_No, @Asset_No, @Tooling_PO_Date, @Purchase_No, @Purchase_Date,
                    @Pattern_Received_Date, @Quoted_Estimated_Weight, @Pattern_Material_Details, @No_Of_Patterns_Set, @Pattern_Pieces,
                    @Core_Box_Material_Details, @Core_Box_Location, @Core_Box_S7_F4_No, @Core_Box_S7_F4_Date, @No_Of_Core_Box_Set, @Core_Box_Pieces,
                    @Total_Weight, @Core_Type, @Main_Core, @Side_Core, @Loose_Core, @Chaplets_COPE, @Chaplets_DRAG, @Chills_COPE, @Chills_DRAG,
                    @Mould_Vents_Size, @Mould_Vents_No, @shell_qty, @coldBox_qty, @noBake_qty, @mainCore_qty, @sideCore_qty, @looseCore_qty,
                    @breaker_core_size, @down_sprue_size, @foam_filter_size, @sand_riser_size, @no_of_sand_riser, @ingate_size, @no_of_ingate,
                    @runner_bar_size, @runner_bar_no, @rev_no_status, @date, @comment
                )
            `;

            const newPatternId = result.recordset[0].PatternId;

            // Handle Parts
            if (parts && parts.length > 0) {
                // Check Table existence logic preserved if needed, or assume DB state is managed by migrations. 
                // For now, minimal check as per original code.
                const checkTableReq = new sql.Request(transaction);
                await checkTableReq.query`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternCavityMaster') CREATE TABLE PatternCavityMaster (PartRowId INT IDENTITY(1,1) PRIMARY KEY, PatternId NUMERIC(18, 0), PartNo INT, ProductName NVARCHAR(255), Qty INT, Weight DECIMAL(18,2), MaterialGrade NVARCHAR(255), FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId))`;

                for (const part of parts) {
                    if (part.partNo) {
                        const partReq = new sql.Request(transaction);
                        partReq.input('PatternId', sql.Numeric(18, 0), newPatternId);
                        partReq.input('PartNo', sql.Int, part.partNo);
                        partReq.input('ProductName', sql.NVarChar(255), part.productName || '');
                        partReq.input('Qty', sql.Int, parseInt(part.qty) || 0);
                        partReq.input('Weight', sql.Decimal(18, 2), parseFloat(part.weight) || 0);
                        partReq.input('MaterialGrade', sql.VarChar(255), part.materialGradeId ? String(part.materialGradeId) : null);
                        await partReq.query`INSERT INTO PatternCavityMaster (PatternId, PartNo, ProductName, Qty, Weight, MaterialGrade) VALUES (@PatternId, @PartNo, @ProductName, @Qty, @Weight, @MaterialGrade)`;
                    }
                }
            }

            // Handle Sleeves
            if (sleeveRows && sleeveRows.length > 0) {
                const checkSleeveReq = new sql.Request(transaction);
                await checkSleeveReq.query`IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleeveMaster') CREATE TABLE SleeveMaster (SleeveRowId INT IDENTITY(1,1) PRIMARY KEY, PatternId NUMERIC(18, 0), sleeve_name NVARCHAR(255) NULL, sleeve_type_size NVARCHAR(255) NULL, quantity INT NULL, FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId))`;

                for (const sleeve of sleeveRows) {
                    if (sleeve.sleeve_name) {
                        const sleeveReq = new sql.Request(transaction);
                        sleeveReq.input('PatternId', sql.Numeric(18, 0), newPatternId);
                        sleeveReq.input('sleeve_name', sql.NVarChar(255), sleeve.sleeve_name || null);
                        sleeveReq.input('sleeve_type_size', sql.NVarChar(255), sleeve.sleeve_type_size || null);
                        sleeveReq.input('quantity', sql.Int, sleeve.quantity || null);
                        await sleeveReq.query`INSERT INTO SleeveMaster (PatternId, sleeve_name, sleeve_type_size, quantity) VALUES (@PatternId, @sleeve_name, @sleeve_type_size, @quantity)`;
                    }
                }
            }

            await transaction.commit();
            logger.info(`Pattern created successfully: ${newPatternId}`);
            res.json({ success: true, message: 'Pattern added successfully', patternId: newPatternId });

        } catch (err) {
            if (transaction) await transaction.rollback();
            logger.error('Error creating pattern:', err);
            res.status(500).json({ error: 'Failed to add pattern: ' + err.message });
        }
    },

    /**
     * Update pattern
     * @route PUT /pattern-master/:id
     */
    updatePattern: async (req, res) => {
        const { id } = req.params;
        const { Customer, Pattern_Maker, PatternNo, parts, sleeveRows } = req.body;

        const pool = req.db;

        // Duplicate Check
        if (PatternNo) {
            try {
                const checkRequest = pool.request();
                checkRequest.input('PatternNo', sql.VarChar(255), PatternNo);
                checkRequest.input('CurrentId', sql.Numeric(18, 0), parseInt(id));
                const existing = await checkRequest.query`SELECT PatternId FROM PatternMaster WHERE PatternNo = @PatternNo AND PatternId != @CurrentId`;
                if (existing.recordset.length > 0) return res.status(409).json({ error: `Pattern No '${PatternNo}' already exists.` });
            } catch (err) {
                logger.error('Error checking duplicate:', err);
                return res.status(500).json({ error: 'Failed to validate Pattern No' });
            }
        }

        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            const request = new sql.Request(transaction);
            request.input('id', sql.Numeric(18, 0), parseInt(id));

            request.input('Customer', sql.Numeric(18, 0), Customer);
            request.input('Pattern_Maker', sql.Numeric(18, 0), Pattern_Maker && Pattern_Maker !== '' ? Pattern_Maker : null);
            request.input('PatternNo', sql.VarChar(255), PatternNo || null);

            for (const [key, type] of Object.entries(PATTERN_FIELD_MAP)) {
                request.input(key, type, req.body[key] || null);
            }

            const updateResult = await request.query`
                UPDATE PatternMaster
                SET Customer = @Customer, Part_No = @Part_No, Product_Name = @Product_Name, Pattern_Maker = @Pattern_Maker,
                    PatternNo = @PatternNo, Bunch_Wt = @Bunch_Wt, YieldPercent = @YieldPercent, Moulding_Box_Size = @Moulding_Box_Size,
                    Core_Wt = @Core_Wt, Rack_Location = @Rack_Location, Box_Per_Heat = @Box_Per_Heat, Customer_Po_No = @Customer_Po_No,
                    Serial_No = @Serial_No, Asset_No = @Asset_No, Tooling_PO_Date = @Tooling_PO_Date, Purchase_No = @Purchase_No,
                    Purchase_Date = @Purchase_Date, Pattern_Received_Date = @Pattern_Received_Date, Quoted_Estimated_Weight = @Quoted_Estimated_Weight,
                    Pattern_Material_Details = @Pattern_Material_Details, No_Of_Patterns_Set = @No_Of_Patterns_Set, Pattern_Pieces = @Pattern_Pieces,
                    Core_Box_Material_Details = @Core_Box_Material_Details, Core_Box_Location = @Core_Box_Location, Core_Box_S7_F4_No = @Core_Box_S7_F4_No,
                    Core_Box_S7_F4_Date = @Core_Box_S7_F4_Date, No_Of_Core_Box_Set = @No_Of_Core_Box_Set, Core_Box_Pieces = @Core_Box_Pieces,
                    Total_Weight = @Total_Weight, Core_Type = @Core_Type, Main_Core = @Main_Core, Side_Core = @Side_Core, Loose_Core = @Loose_Core,
                    Chaplets_COPE = @Chaplets_COPE, Chaplets_DRAG = @Chaplets_DRAG, Chills_COPE = @Chills_COPE, Chills_DRAG = @Chills_DRAG,
                    Mould_Vents_Size = @Mould_Vents_Size, Mould_Vents_No = @Mould_Vents_No, shell_qty = @shell_qty, coldBox_qty = @coldBox_qty,
                    noBake_qty = @noBake_qty, mainCore_qty = @mainCore_qty, sideCore_qty = @sideCore_qty, looseCore_qty = @looseCore_qty,
                    breaker_core_size = @breaker_core_size, down_sprue_size = @down_sprue_size, foam_filter_size = @foam_filter_size,
                    sand_riser_size = @sand_riser_size, no_of_sand_riser = @no_of_sand_riser, ingate_size = @ingate_size, no_of_ingate = @no_of_ingate,
                    runner_bar_size = @runner_bar_size, runner_bar_no = @runner_bar_no, rev_no_status = @rev_no_status, date = @date, comment = @comment
                WHERE PatternId = @id
            `;

            if (updateResult.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Pattern not found' });
            }

            // Delete existing parts and re-insert
            await new sql.Request(transaction)
                .input('pid', sql.Numeric(18, 0), parseInt(id))
                .query`DELETE FROM PatternCavityMaster WHERE PatternId = @pid`;

            if (parts) {
                for (const part of parts) {
                    if (!part.partNo) continue;

                    const partRequest = new sql.Request(transaction);
                    partRequest.input('PatternId', sql.Numeric(18, 0), parseInt(id));
                    partRequest.input('PartNo', sql.Int, part.partNo);
                    partRequest.input('ProductName', sql.NVarChar, part.productName || '');
                    partRequest.input('Qty', sql.Int, parseInt(part.qty) || 0);
                    partRequest.input('Weight', sql.Decimal(18, 2), parseFloat(part.weight) || 0);
                    partRequest.input('MaterialGrade', sql.VarChar, part.materialGradeId ? String(part.materialGradeId) : null);

                    await partRequest.query`
                        INSERT INTO PatternCavityMaster (PatternId, PartNo, ProductName, Qty, Weight, MaterialGrade) 
                        VALUES (@PatternId, @PartNo, @ProductName, @Qty, @Weight, @MaterialGrade)
                    `;
                }
            }

            // Delete existing sleeves and re-insert
            await new sql.Request(transaction)
                .input('pid', sql.Numeric(18, 0), parseInt(id))
                .query`DELETE FROM SleeveMaster WHERE PatternId = @pid`;

            if (sleeveRows) {
                for (const sleeve of sleeveRows) {
                    if (!sleeve.sleeve_name) continue;

                    const sleeveRequest = new sql.Request(transaction);
                    sleeveRequest.input('PatternId', sql.Numeric(18, 0), parseInt(id));
                    sleeveRequest.input('sleeve_name', sql.NVarChar, sleeve.sleeve_name);
                    sleeveRequest.input('sleeve_type_size', sql.NVarChar, sleeve.sleeve_type_size);
                    sleeveRequest.input('quantity', sql.Int, sleeve.quantity);

                    await sleeveRequest.query`
                        INSERT INTO SleeveMaster (PatternId, sleeve_name, sleeve_type_size, quantity) 
                        VALUES (@PatternId, @sleeve_name, @sleeve_type_size, @quantity)
                    `;
                }
            }

            await transaction.commit();
            logger.info(`Pattern updated successfully: ${id}`);
            res.json({ success: true, message: 'Pattern updated successfully' });

        } catch (err) {
            if (transaction) await transaction.rollback();
            logger.error(`Error updating pattern ${id}:`, err);
            res.status(500).json({ error: 'Failed to update pattern: ' + err.message });
        }
    },

    deletePattern: async (req, res) => {
        const { id } = req.params;
        const pool = req.db;
        const transaction = new sql.Transaction(pool);
        try {
            await transaction.begin();
            // Delete dependants
            await new sql.Request(transaction).input('pid', sql.Numeric(18, 0), parseInt(id)).query`DELETE FROM PatternCavityMaster WHERE PatternId = @pid`;
            await new sql.Request(transaction).input('pid', sql.Numeric(18, 0), parseInt(id)).query`DELETE FROM SleeveMaster WHERE PatternId = @pid`;

            const result = await new sql.Request(transaction).input('id', sql.Numeric(18, 0), parseInt(id)).query`DELETE FROM PatternMaster WHERE PatternId = @id`;

            if (result.rowsAffected[0] === 0) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Pattern not found' });
            }

            await transaction.commit();
            logger.info(`Pattern deleted: ${id}`);
            res.json({ success: true, message: 'Pattern deleted successfully' });
        } catch (err) {
            if (transaction) await transaction.rollback();
            logger.error(`Error deleting pattern ${id}:`, err);
            res.status(500).json({ error: 'Failed to delete pattern' });
        }
    }
};

module.exports = patternController;
