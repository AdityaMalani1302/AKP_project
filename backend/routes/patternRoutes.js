const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// POST /pattern-master - Add a new pattern
router.post('/', async (req, res) => {
    const {
        Customer, Part_No, Product_Name, Pattern_Maker, PatternNo,
        Bunch_Wt, YieldPercent,
        Moulding_Box_Size, Core_Wt,
        Rack_Location, Box_Per_Heat, Customer_Po_No,
        Serial_No,
        Asset_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
        Quoted_Estimated_Weight, Pattern_Material_Details, No_Of_Patterns_Set, Pattern_Pieces,
        Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No, Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
        Total_Weight, Core_Type,
        Main_Core, Side_Core, Loose_Core,
        Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
        Mould_Vents_Size, Mould_Vents_No,
        shell_qty, coldBox_qty, noBake_qty,
        mainCore_qty, sideCore_qty, looseCore_qty,
        breaker_core_size, down_sprue_size, foam_filter_size,
        sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
        runner_bar_size, runner_bar_no,
        rev_no_status, date, comment,
        parts, // Dynamic parts array
        sleeveRows // Dynamic sleeve rows array
    } = req.body;

    if (!Customer || !Pattern_Maker) {
        return res.status(400).json({ error: 'Customer and Pattern Maker are required' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);

        request.input('Customer', sql.Numeric(18, 0), Customer);
        request.input('Part_No', sql.Numeric(18, 0), Part_No || null);
        request.input('Product_Name', sql.Numeric(18, 0), Product_Name || null);
        request.input('Pattern_Maker', sql.Numeric(18, 0), Pattern_Maker);
        request.input('PatternNo', sql.VarChar(255), PatternNo || null);
        request.input('Bunch_Wt', sql.VarChar(255), Bunch_Wt || null);
        request.input('YieldPercent', sql.VarChar(255), YieldPercent || null);
        request.input('Moulding_Box_Size', sql.VarChar(255), Moulding_Box_Size || null);
        request.input('Core_Wt', sql.VarChar(255), Core_Wt || null);
        request.input('Rack_Location', sql.VarChar(255), Rack_Location || null);
        request.input('Box_Per_Heat', sql.VarChar(255), Box_Per_Heat || null);
        request.input('Customer_Po_No', sql.VarChar(255), Customer_Po_No || null);
        request.input('Serial_No', sql.VarChar(255), Serial_No || null);
        request.input('Asset_No', sql.VarChar(255), Asset_No || null);
        request.input('Tooling_PO_Date', sql.Date, Tooling_PO_Date || null);
        request.input('Purchase_No', sql.VarChar(255), Purchase_No || null);
        request.input('Purchase_Date', sql.Date, Purchase_Date || null);
        request.input('Quoted_Estimated_Weight', sql.VarChar(255), Quoted_Estimated_Weight || null);
        request.input('Pattern_Material_Details', sql.VarChar(255), Pattern_Material_Details || null);
        request.input('No_Of_Patterns_Set', sql.VarChar(255), No_Of_Patterns_Set || null);
        request.input('Pattern_Pieces', sql.VarChar(255), Pattern_Pieces || null);
        request.input('Core_Box_Material_Details', sql.VarChar(255), Core_Box_Material_Details || null);
        request.input('Core_Box_Location', sql.VarChar(255), Core_Box_Location || null);
        request.input('Core_Box_S7_F4_No', sql.VarChar(255), Core_Box_S7_F4_No || null);
        request.input('Core_Box_S7_F4_Date', sql.Date, Core_Box_S7_F4_Date || null);
        request.input('No_Of_Core_Box_Set', sql.VarChar(255), No_Of_Core_Box_Set || null);
        request.input('Core_Box_Pieces', sql.VarChar(255), Core_Box_Pieces || null);
        request.input('Total_Weight', sql.VarChar(255), Total_Weight || null);
        request.input('Core_Type', sql.VarChar(255), Core_Type || null);
        request.input('Main_Core', sql.VarChar(255), Main_Core || null);
        request.input('Side_Core', sql.VarChar(255), Side_Core || null);
        request.input('Loose_Core', sql.VarChar(255), Loose_Core || null);
        request.input('Chaplets_COPE', sql.VarChar(255), Chaplets_COPE || null);
        request.input('Chaplets_DRAG', sql.VarChar(255), Chaplets_DRAG || null);
        request.input('Chills_COPE', sql.VarChar(255), Chills_COPE || null);
        request.input('Chills_DRAG', sql.VarChar(255), Chills_DRAG || null);
        request.input('Mould_Vents_Size', sql.VarChar(255), Mould_Vents_Size || null);
        request.input('Mould_Vents_No', sql.VarChar(255), Mould_Vents_No || null);
        request.input('shell_qty', sql.Int, shell_qty || null);
        request.input('coldBox_qty', sql.Int, coldBox_qty || null);
        request.input('noBake_qty', sql.Int, noBake_qty || null);
        request.input('mainCore_qty', sql.VarChar(255), mainCore_qty || null);
        request.input('sideCore_qty', sql.VarChar(255), sideCore_qty || null);
        request.input('looseCore_qty', sql.VarChar(255), looseCore_qty || null);
        request.input('breaker_core_size', sql.VarChar(255), breaker_core_size || null);
        request.input('down_sprue_size', sql.VarChar(255), down_sprue_size || null);
        request.input('foam_filter_size', sql.VarChar(255), foam_filter_size || null);
        request.input('sand_riser_size', sql.VarChar(255), sand_riser_size || null);
        request.input('no_of_sand_riser', sql.VarChar(255), no_of_sand_riser || null);
        request.input('ingate_size', sql.VarChar(255), ingate_size || null);
        request.input('no_of_ingate', sql.VarChar(255), no_of_ingate || null);
        request.input('runner_bar_size', sql.VarChar(255), runner_bar_size || null);
        request.input('runner_bar_no', sql.VarChar(255), runner_bar_no || null);
        request.input('rev_no_status', sql.VarChar(255), rev_no_status || null);
        request.input('date', sql.Date, date || null);
        request.input('comment', sql.VarChar(8000), comment || null);

        const result = await request.query`
            INSERT INTO PatternMaster (
                Customer, Part_No, Product_Name, Pattern_Maker,
                PatternNo, Bunch_Wt, YieldPercent,
                Moulding_Box_Size, Core_Wt,
                Rack_Location, Box_Per_Heat, Customer_Po_No,
                Serial_No,
                Asset_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
                Quoted_Estimated_Weight, Pattern_Material_Details, No_Of_Patterns_Set, Pattern_Pieces,
                Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No, Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
                Total_Weight, Core_Type,
                Main_Core, Side_Core, Loose_Core,
                Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
                Mould_Vents_Size, Mould_Vents_No,
                shell_qty, coldBox_qty, noBake_qty,
                mainCore_qty, sideCore_qty, looseCore_qty,
                breaker_core_size, down_sprue_size, foam_filter_size,
                sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
                runner_bar_size, runner_bar_no,
                rev_no_status, date, comment
            )
            OUTPUT INSERTED.PatternId
            VALUES (
                @Customer, @Part_No, @Product_Name, @Pattern_Maker,
                @PatternNo, @Bunch_Wt, @YieldPercent,
                @Moulding_Box_Size, @Core_Wt,
                @Rack_Location, @Box_Per_Heat, @Customer_Po_No,
                @Serial_No,
                @Asset_No, @Tooling_PO_Date, @Purchase_No, @Purchase_Date,
                @Quoted_Estimated_Weight, @Pattern_Material_Details, @No_Of_Patterns_Set, @Pattern_Pieces,
                @Core_Box_Material_Details, @Core_Box_Location, @Core_Box_S7_F4_No, @Core_Box_S7_F4_Date, @No_Of_Core_Box_Set, @Core_Box_Pieces,
                @Total_Weight, @Core_Type,
                @Main_Core, @Side_Core, @Loose_Core,
                @Chaplets_COPE, @Chaplets_DRAG, @Chills_COPE, @Chills_DRAG,
                @Mould_Vents_Size, @Mould_Vents_No,
                @shell_qty, @coldBox_qty, @noBake_qty,
                @mainCore_qty, @sideCore_qty, @looseCore_qty,
                @breaker_core_size, @down_sprue_size, @foam_filter_size,
                @sand_riser_size, @no_of_sand_riser, @ingate_size, @no_of_ingate,
                @runner_bar_size, @runner_bar_no,
                @rev_no_status, @date, @comment
            )
        `;

        const newPatternId = result.recordset[0].PatternId;

        if (parts && Array.isArray(parts) && parts.length > 0) {
            const checkTableReq = new sql.Request(transaction);
            await checkTableReq.query`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternCavityMaster')
                CREATE TABLE PatternCavityMaster (
                    PartRowId INT IDENTITY(1,1) PRIMARY KEY,
                    PatternId NUMERIC(18, 0),
                    PartNo INT,
                    ProductName NVARCHAR(255),
                    Qty INT,
                    Weight DECIMAL(18,2),
                    MaterialGrade NVARCHAR(255),
                    FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
                )
            `;

            for (const part of parts) {
                if (part.partNo) {
                    const partReq = new sql.Request(transaction);
                    partReq.input('PatternId', sql.Numeric(18, 0), newPatternId);
                    partReq.input('PartNo', sql.Int, part.partNo);
                    partReq.input('ProductName', sql.VarChar(255), part.productName || '');
                    partReq.input('Qty', sql.Int, parseInt(part.qty) || 0);
                    partReq.input('Weight', sql.Decimal(18, 2), parseFloat(part.weight) || 0);
                    partReq.input('MaterialGrade', sql.NVarChar(255), part.materialGradeName || null);

                    await partReq.query`
                        INSERT INTO PatternCavityMaster (PatternId, PartNo, ProductName, Qty, Weight, MaterialGrade)
                        VALUES (@PatternId, @PartNo, @ProductName, @Qty, @Weight, @MaterialGrade)
                    `;
                }
            }
        }

        if (sleeveRows && Array.isArray(sleeveRows) && sleeveRows.length > 0) {
            const checkSleeveTableReq = new sql.Request(transaction);
            await checkSleeveTableReq.query`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleeveMaster')
                CREATE TABLE SleeveMaster (
                    SleeveRowId INT IDENTITY(1,1) PRIMARY KEY,
                    PatternId NUMERIC(18, 0),
                    sleeve_name NVARCHAR(255) NULL,
                    sleeve_type_size NVARCHAR(255) NULL,
                    quantity INT NULL,
                    FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
                )
            `;

            for (const sleeve of sleeveRows) {
                const sleeveReq = new sql.Request(transaction);
                sleeveReq.input('PatternId', sql.Numeric(18, 0), newPatternId);
                sleeveReq.input('sleeve_name', sql.NVarChar(255), sleeve.sleeve_name || null);
                sleeveReq.input('sleeve_type_size', sql.NVarChar(255), sleeve.sleeve_type_size || null);
                sleeveReq.input('quantity', sql.Int, sleeve.quantity || null);

                await sleeveReq.query`
                    INSERT INTO SleeveMaster (PatternId, sleeve_name, sleeve_type_size, quantity)
                    VALUES (@PatternId, @sleeve_name, @sleeve_type_size, @quantity)
                `;
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Pattern added successfully', patternId: newPatternId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error adding pattern:', err);
        res.status(500).json({ error: 'Failed to add pattern. Ensure database schema is updated.' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                pm.*,
                c.CustName as CustomerName,
                s.SupName as Pattern_Maker_Name,
                (SELECT TOP 1 Qty FROM PatternCavityMaster WHERE PatternId = pm.PatternId) as No_Of_Cavities,
                (SELECT TOP 1 MaterialGrade FROM PatternCavityMaster WHERE PatternId = pm.PatternId) as Casting_Material_Grade
            FROM PatternMaster pm
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
        `;

        const request = req.db.request();

        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search OR c.CustName LIKE @search OR pm.Serial_No LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY pm.PatternId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching patterns:', err);
        res.status(500).json({ error: 'Failed to fetch patterns' });
    }
});

// --- Pattern Return History Routes ---
// IMPORTANT: These routes must be BEFORE /:id route

// GET /pattern-master/numbers - Get pattern numbers for dropdown
router.get('/numbers', async (req, res) => {
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
        
        query += ' ORDER BY pm.PatternNo';
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching pattern numbers:', err);
        res.status(500).json({ error: 'Failed to fetch pattern numbers' });
    }
});

// GET /pattern-master/return-history - Get all pattern return history records
router.get('/return-history', async (req, res) => {
    try {
        // First check if table exists, create if not
        await req.db.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternReturnHistory')
            CREATE TABLE PatternReturnHistory (
                ReturnId INT IDENTITY(1,1) PRIMARY KEY,
                PatternId INT NOT NULL,
                PatternNo VARCHAR(255),
                PatternName VARCHAR(255),
                Customer INT,
                ReturnChallanNo VARCHAR(255),
                ReturnDate DATE,
                Description VARCHAR(1000),
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        const result = await req.db.request().query(`
            SELECT 
                prh.*,
                c.CustName as CustomerName
            FROM PatternReturnHistory prh
            LEFT JOIN Customer c ON prh.Customer = c.CustId
            ORDER BY prh.ReturnId DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching pattern return history:', err);
        res.status(500).json({ error: 'Failed to fetch pattern return history' });
    }
});

// GET /pattern-master/parts-by-pattern/:patternId - Get parts for a specific pattern
router.get('/parts-by-pattern/:patternId', async (req, res) => {
    const { patternId } = req.params;
    try {
        const request = req.db.request();
        request.input('patternId', sql.Numeric(18, 0), parseInt(patternId));
        
        const result = await request.query`
            SELECT 
                PartRowId,
                PatternId,
                PartNo,
                ProductName,
                Qty,
                Weight,
                MaterialGrade
            FROM PatternCavityMaster 
            WHERE PatternId = @patternId
            ORDER BY PartRowId
        `;
        
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching parts for pattern:', err);
        res.status(500).json({ error: 'Failed to fetch parts for pattern' });
    }
});

// POST /pattern-master/return-history - Create new pattern return record
router.post('/return-history', async (req, res) => {
    const { PatternId, PatternNo, PatternName, Customer, ReturnChallanNo, ReturnDate, Description, SelectedParts } = req.body;

    if (!PatternId || !PatternNo || !Customer || !ReturnChallanNo || !ReturnDate) {
        return res.status(400).json({ error: 'Pattern No, Customer, Return Challan No, and Return Date are required' });
    }

    if (!SelectedParts || !Array.isArray(SelectedParts) || SelectedParts.length === 0) {
        return res.status(400).json({ error: 'At least one part must be selected' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        // Ensure tables exist
        await new sql.Request(transaction).query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternReturnHistory')
            CREATE TABLE PatternReturnHistory (
                ReturnId INT IDENTITY(1,1) PRIMARY KEY,
                PatternId INT NOT NULL,
                PatternNo VARCHAR(255),
                PatternName VARCHAR(255),
                Customer INT,
                ReturnChallanNo VARCHAR(255),
                ReturnDate DATE,
                Description VARCHAR(1000),
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        await new sql.Request(transaction).query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternReturnParts')
            CREATE TABLE PatternReturnParts (
                ReturnPartId INT IDENTITY(1,1) PRIMARY KEY,
                ReturnId INT NOT NULL,
                PartRowId INT,
                PartNo INT,
                ProductName VARCHAR(255),
                FOREIGN KEY (ReturnId) REFERENCES PatternReturnHistory(ReturnId)
            )
        `);

        const request = new sql.Request(transaction);
        request.input('PatternId', sql.Int, PatternId);
        request.input('PatternNo', sql.VarChar(255), PatternNo);
        request.input('PatternName', sql.VarChar(255), PatternName || null);
        request.input('Customer', sql.Int, Customer);
        request.input('ReturnChallanNo', sql.VarChar(255), ReturnChallanNo);
        request.input('ReturnDate', sql.Date, ReturnDate);
        request.input('Description', sql.VarChar(1000), Description || null);

        const result = await request.query`
            INSERT INTO PatternReturnHistory (PatternId, PatternNo, PatternName, Customer, ReturnChallanNo, ReturnDate, Description)
            OUTPUT INSERTED.ReturnId
            VALUES (@PatternId, @PatternNo, @PatternName, @Customer, @ReturnChallanNo, @ReturnDate, @Description)
        `;

        const returnId = result.recordset[0].ReturnId;

        // Insert selected parts
        for (const part of SelectedParts) {
            const partReq = new sql.Request(transaction);
            partReq.input('ReturnId', sql.Int, returnId);
            partReq.input('PartRowId', sql.Int, part.PartRowId || null);
            partReq.input('PartNo', sql.Int, part.PartNo || null);
            partReq.input('ProductName', sql.VarChar(255), part.ProductName || null);

            await partReq.query`
                INSERT INTO PatternReturnParts (ReturnId, PartRowId, PartNo, ProductName)
                VALUES (@ReturnId, @PartRowId, @PartNo, @ProductName)
            `;
        }

        await transaction.commit();

        res.json({ 
            success: true, 
            message: 'Pattern return history added successfully', 
            returnId: returnId 
        });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error adding pattern return history:', err);
        res.status(500).json({ error: 'Failed to add pattern return history' });
    }
});

router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));

        const patternResult = await request.query`
            SELECT * FROM PatternMaster WHERE PatternId = @id
        `;

        if (patternResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Pattern not found' });
        }

        const pattern = patternResult.recordset[0];

        const partsRequest = new sql.Request(req.db);
        partsRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));
        const partsResult = await partsRequest.query`
            SELECT * FROM PatternCavityMaster WHERE PatternId = @patternId
        `;

        const sleevesRequest = new sql.Request(req.db);
        sleevesRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));
        const sleevesResult = await sleevesRequest.query`
            SELECT * FROM SleeveMaster WHERE PatternId = @patternId
        `;

        res.json({
            ...pattern,
            parts: partsResult.recordset,
            sleeveRows: sleevesResult.recordset
        });
    } catch (err) {
        console.error('Error fetching pattern details:', err);
        res.status(500).json({ error: 'Failed to fetch pattern details' });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));

        await req.db.request().input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM PatternCavityMaster WHERE PatternId = @pid
        `;
        await req.db.request().input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM SleeveMaster WHERE PatternId = @pid
        `;

        const result = await request.query`
            DELETE FROM PatternMaster WHERE PatternId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Pattern not found' });
        }

        res.json({ success: true, message: 'Pattern deleted successfully' });
    } catch (err) {
        console.error('Error deleting pattern:', err);
        res.status(500).json({ error: 'Failed to delete pattern' });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        Customer, Part_No, Product_Name, Pattern_Maker, PatternNo,
        Bunch_Wt, YieldPercent,
        Moulding_Box_Size, Core_Wt,
        Rack_Location, Box_Per_Heat, Customer_Po_No,
        Serial_No,
        Asset_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
        Quoted_Estimated_Weight, Pattern_Material_Details, No_Of_Patterns_Set, Pattern_Pieces,
        Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No, Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
        Total_Weight, Core_Type,
        Main_Core, Side_Core, Loose_Core,
        Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
        Mould_Vents_Size, Mould_Vents_No,
        shell_qty, coldBox_qty, noBake_qty,
        mainCore_qty, sideCore_qty, looseCore_qty,
        breaker_core_size, down_sprue_size, foam_filter_size,
        sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
        runner_bar_size, runner_bar_no,
        rev_no_status, date, comment,
        parts, 
        sleeveRows 
    } = req.body;

    if (!Customer || !Pattern_Maker) {
        return res.status(400).json({ error: 'Customer and Pattern Maker are required' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        const request = new sql.Request(transaction);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Customer', sql.Numeric(18, 0), Customer);
        request.input('Part_No', sql.Numeric(18, 0), Part_No || null);
        request.input('Product_Name', sql.Numeric(18, 0), Product_Name || null);
        request.input('Pattern_Maker', sql.Numeric(18, 0), Pattern_Maker);
        request.input('PatternNo', sql.VarChar(255), PatternNo || null);
        request.input('Bunch_Wt', sql.VarChar(255), Bunch_Wt || null);
        request.input('YieldPercent', sql.VarChar(255), YieldPercent || null);
        request.input('Moulding_Box_Size', sql.VarChar(255), Moulding_Box_Size || null);
        request.input('Core_Wt', sql.VarChar(255), Core_Wt || null);
        request.input('Rack_Location', sql.VarChar(255), Rack_Location || null);
        request.input('Box_Per_Heat', sql.VarChar(255), Box_Per_Heat || null);
        request.input('Customer_Po_No', sql.VarChar(255), Customer_Po_No || null);
        request.input('Serial_No', sql.VarChar(255), Serial_No || null);
        request.input('Asset_No', sql.VarChar(255), Asset_No || null);
        request.input('Tooling_PO_Date', sql.Date, Tooling_PO_Date || null);
        request.input('Purchase_No', sql.VarChar(255), Purchase_No || null);
        request.input('Purchase_Date', sql.Date, Purchase_Date || null);
        request.input('Quoted_Estimated_Weight', sql.VarChar(255), Quoted_Estimated_Weight || null);
        request.input('Pattern_Material_Details', sql.VarChar(255), Pattern_Material_Details || null);
        request.input('No_Of_Patterns_Set', sql.VarChar(255), No_Of_Patterns_Set || null);
        request.input('Pattern_Pieces', sql.VarChar(255), Pattern_Pieces || null);
        request.input('Core_Box_Material_Details', sql.VarChar(255), Core_Box_Material_Details || null);
        request.input('Core_Box_Location', sql.VarChar(255), Core_Box_Location || null);
        request.input('Core_Box_S7_F4_No', sql.VarChar(255), Core_Box_S7_F4_No || null);
        request.input('Core_Box_S7_F4_Date', sql.Date, Core_Box_S7_F4_Date || null);
        request.input('No_Of_Core_Box_Set', sql.VarChar(255), No_Of_Core_Box_Set || null);
        request.input('Core_Box_Pieces', sql.VarChar(255), Core_Box_Pieces || null);
        request.input('Total_Weight', sql.VarChar(255), Total_Weight || null);
        request.input('Core_Type', sql.VarChar(255), Core_Type || null);
        request.input('Main_Core', sql.VarChar(255), Main_Core || null);
        request.input('Side_Core', sql.VarChar(255), Side_Core || null);
        request.input('Loose_Core', sql.VarChar(255), Loose_Core || null);
        request.input('Chaplets_COPE', sql.VarChar(255), Chaplets_COPE || null);
        request.input('Chaplets_DRAG', sql.VarChar(255), Chaplets_DRAG || null);
        request.input('Chills_COPE', sql.VarChar(255), Chills_COPE || null);
        request.input('Chills_DRAG', sql.VarChar(255), Chills_DRAG || null);
        request.input('Mould_Vents_Size', sql.VarChar(255), Mould_Vents_Size || null);
        request.input('Mould_Vents_No', sql.VarChar(255), Mould_Vents_No || null);
        request.input('shell_qty', sql.Int, shell_qty || null);
        request.input('coldBox_qty', sql.Int, coldBox_qty || null);
        request.input('noBake_qty', sql.Int, noBake_qty || null);
        request.input('mainCore_qty', sql.VarChar(255), mainCore_qty || null);
        request.input('sideCore_qty', sql.VarChar(255), sideCore_qty || null);
        request.input('looseCore_qty', sql.VarChar(255), looseCore_qty || null);
        request.input('breaker_core_size', sql.VarChar(255), breaker_core_size || null);
        request.input('down_sprue_size', sql.VarChar(255), down_sprue_size || null);
        request.input('foam_filter_size', sql.VarChar(255), foam_filter_size || null);
        request.input('sand_riser_size', sql.VarChar(255), sand_riser_size || null);
        request.input('no_of_sand_riser', sql.VarChar(255), no_of_sand_riser || null);
        request.input('ingate_size', sql.VarChar(255), ingate_size || null);
        request.input('no_of_ingate', sql.VarChar(255), no_of_ingate || null);
        request.input('runner_bar_size', sql.VarChar(255), runner_bar_size || null);
        request.input('runner_bar_no', sql.VarChar(255), runner_bar_no || null);
        request.input('rev_no_status', sql.VarChar(255), rev_no_status || null);
        request.input('date', sql.Date, date || null);
        request.input('comment', sql.VarChar(8000), comment || null);

        const updateResult = await request.query`
            UPDATE PatternMaster
            SET Customer = @Customer,
                Part_No = @Part_No,
                Product_Name = @Product_Name,
                Pattern_Maker = @Pattern_Maker,
                PatternNo = @PatternNo,
                Bunch_Wt = @Bunch_Wt,
                YieldPercent = @YieldPercent,
                Moulding_Box_Size = @Moulding_Box_Size,
                Core_Wt = @Core_Wt,
                Rack_Location = @Rack_Location,
                Box_Per_Heat = @Box_Per_Heat,
                Customer_Po_No = @Customer_Po_No,
                Serial_No = @Serial_No,
                Asset_No = @Asset_No,
                Tooling_PO_Date = @Tooling_PO_Date,
                Purchase_No = @Purchase_No,
                Purchase_Date = @Purchase_Date,
                Quoted_Estimated_Weight = @Quoted_Estimated_Weight,
                Pattern_Material_Details = @Pattern_Material_Details,
                No_Of_Patterns_Set = @No_Of_Patterns_Set,
                Pattern_Pieces = @Pattern_Pieces,
                Core_Box_Material_Details = @Core_Box_Material_Details,
                Core_Box_Location = @Core_Box_Location,
                Core_Box_S7_F4_No = @Core_Box_S7_F4_No,
                Core_Box_S7_F4_Date = @Core_Box_S7_F4_Date,
                No_Of_Core_Box_Set = @No_Of_Core_Box_Set,
                Core_Box_Pieces = @Core_Box_Pieces,
                Total_Weight = @Total_Weight,
                Core_Type = @Core_Type,
                Main_Core = @Main_Core,
                Side_Core = @Side_Core,
                Loose_Core = @Loose_Core,
                Chaplets_COPE = @Chaplets_COPE,
                Chaplets_DRAG = @Chaplets_DRAG,
                Chills_COPE = @Chills_COPE,
                Chills_DRAG = @Chills_DRAG,
                Mould_Vents_Size = @Mould_Vents_Size,
                Mould_Vents_No = @Mould_Vents_No,
                shell_qty = @shell_qty,
                coldBox_qty = @coldBox_qty,
                noBake_qty = @noBake_qty,
                mainCore_qty = @mainCore_qty,
                sideCore_qty = @sideCore_qty,
                looseCore_qty = @looseCore_qty,
                breaker_core_size = @breaker_core_size,
                down_sprue_size = @down_sprue_size,
                foam_filter_size = @foam_filter_size,
                sand_riser_size = @sand_riser_size,
                no_of_sand_riser = @no_of_sand_riser,
                ingate_size = @ingate_size,
                no_of_ingate = @no_of_ingate,
                runner_bar_size = @runner_bar_size,
                runner_bar_no = @runner_bar_no,
                rev_no_status = @rev_no_status,
                date = @date,
                comment = @comment
            WHERE PatternId = @id
        `;

        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Pattern not found' });
        }

        await new sql.Request(transaction).input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM PatternCavityMaster WHERE PatternId = @pid
        `;

        if (parts && Array.isArray(parts) && parts.length > 0) {
            for (const part of parts) {
                if (part.partNo) {
                    const partReq = new sql.Request(transaction);
                    partReq.input('PatternId', sql.Numeric(18, 0), parseInt(id));
                    partReq.input('PartNo', sql.Int, part.partNo);
                    partReq.input('ProductName', sql.VarChar(255), part.productName || '');
                    partReq.input('Qty', sql.Int, parseInt(part.qty) || 0);
                    partReq.input('Weight', sql.Decimal(18, 2), parseFloat(part.weight) || 0);
                    partReq.input('MaterialGrade', sql.NVarChar(255), part.materialGradeName || null);

                    await partReq.query`
                        INSERT INTO PatternCavityMaster (PatternId, PartNo, ProductName, Qty, Weight, MaterialGrade)
                        VALUES (@PatternId, @PartNo, @ProductName, @Qty, @Weight, @MaterialGrade)
                    `;
                }
            }
        }

        await new sql.Request(transaction).input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM SleeveMaster WHERE PatternId = @pid
        `;

        if (sleeveRows && Array.isArray(sleeveRows) && sleeveRows.length > 0) {
            for (const sleeve of sleeveRows) {
                const sleeveReq = new sql.Request(transaction);
                sleeveReq.input('PatternId', sql.Numeric(18, 0), parseInt(id));
                sleeveReq.input('sleeve_name', sql.NVarChar(255), sleeve.sleeve_name || null);
                sleeveReq.input('sleeve_type_size', sql.NVarChar(255), sleeve.sleeve_type_size || null);
                sleeveReq.input('quantity', sql.Int, sleeve.quantity || null);

                await sleeveReq.query`
                    INSERT INTO SleeveMaster (PatternId, sleeve_name, sleeve_type_size, quantity)
                    VALUES (@PatternId, @sleeve_name, @sleeve_type_size, @quantity)
                `;
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Pattern updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating pattern:', err);
        res.status(500).json({ error: 'Failed to update pattern' });
    }
});

// --- Parts Routes ---

// GET /pattern-master/parts - Get all parts
router.get('/data/parts', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                pcm.*,
                pm.PatternNo,
                pm.Product_Name as Main_Product_Name
            FROM PatternCavityMaster pcm
            LEFT JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
        `;

        const request = req.db.request();

        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search OR pcm.ProductName LIKE @search OR pcm.PartNo LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY pcm.PartRowId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching parts:', err);
        res.status(500).json({ error: 'Failed to fetch parts' });
    }
});

// DELETE /pattern-master/parts/:id - Delete a part
router.delete('/data/parts/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.db.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM PatternCavityMaster WHERE PartRowId = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Part not found' });
        }
        res.json({ success: true, message: 'Part deleted successfully' });
    } catch (err) {
        console.error('Error deleting part:', err);
        res.status(500).json({ error: 'Failed to delete part' });
    }
});

// --- Sleeves Routes ---

// GET /pattern-master/sleeves - Get all sleeves
router.get('/data/sleeves', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                sm.*,
                pm.PatternNo
            FROM SleeveMaster sm
            LEFT JOIN PatternMaster pm ON sm.PatternId = pm.PatternId
        `;

        const request = req.db.request();

        if (search) {
            query += ' WHERE pm.PatternNo LIKE @search OR sm.sleeve_name LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY sm.SleeveRowId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching sleeves:', err);
        res.status(500).json({ error: 'Failed to fetch sleeves' });
    }
});

// DELETE /pattern-master/sleeves/:id - Delete a sleeve
router.delete('/data/sleeves/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await req.db.request()
            .input('id', sql.Int, parseInt(id))
            .query('DELETE FROM SleeveMaster WHERE SleeveRowId = @id');

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Sleeve not found' });
        }
        res.json({ success: true, message: 'Sleeve deleted successfully' });
    } catch (err) {
        console.error('Error deleting sleeve:', err);
        res.status(500).json({ error: 'Failed to delete sleeve' });
    }
});

module.exports = router;



