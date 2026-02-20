const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');
const { validateBody, planningMasterSchema, planningEntrySchema, sleeveRequirementSchema } = require('../utils/validators');
const logger = require('../utils/logger');

// GET /raw-materials - Get raw materials for Item Code dropdown (cached 5 minutes)
router.get('/raw-materials', cacheMiddleware('raw-materials', 300), async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT RawMatCode, RawMatName, RawMatID
            FROM RawMaterial 
            WHERE Saleable = 'Y' AND GrnTypeId NOT IN (176, 192, 193)
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` AND (RawMatName LIKE @search OR RawMatCode LIKE @search)`;
        }

        query += ' ORDER BY RawMatCode';

        const result = await request.query(query);
        console.log(`Raw materials fetched: ${result.recordset.length} items`);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching raw materials:', err);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// GET /raw-materials/all - Get ALL raw materials without filters (for debugging)
router.get('/raw-materials/all', async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT RawMatID, RawMatName, RawMatCode, Saleable, GrnTypeId
            FROM RawMaterial 
            ORDER BY RawMatID
        `);
        console.log(`All raw materials: ${result.recordset.length} items`);
        res.json({
            total: result.recordset.length,
            data: result.recordset.slice(0, 100)
        });
    } catch (err) {
        logger.error('Error fetching all raw materials:', err);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// GET /planning-master - Get all planning schedules from PPC table (current month by default)
router.get('/planning-master', async (req, res) => {
    try {
        const { search } = req.query;
        const request = req.db.request();
        
        // Filter by current month by default
        let query = `
            SELECT 
                id as ID,
                ItemCode,
                CustName as CustomerName,
                SQty as ScheduleQty,
                PlanDate
            FROM PPC
            WHERE MONTH(PlanDate) = MONTH(GETDATE()) AND YEAR(PlanDate) = YEAR(GETDATE())
        `;

        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` AND (ItemCode LIKE @search OR CustName LIKE @search)`;
        }

        query += ' ORDER BY id ASC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching planning schedules:', err);
        res.status(500).json({ error: 'Failed to fetch planning schedules' });
    }
});

// POST /planning-master - Create new planning schedule in PPC table
router.post('/planning-master', validateBody(planningMasterSchema), async (req, res) => {
    const { ItemCode, CustomerName, ScheduleQty, PlanDate } = req.body;

    // Validation
    if (!ItemCode || !CustomerName || !ScheduleQty || !PlanDate) {
        return res.status(400).json({
            error: 'Item Code, Customer Name, Schedule Qty, and Plan Date are required'
        });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));

        const result = await request.query`
            INSERT INTO PPC (ItemCode, CustName, SQty, PlanDate)
            OUTPUT INSERTED.id
            VALUES (@ItemCode, @CustName, @SQty, @PlanDate)
        `;

        const newId = result.recordset[0].id;
        // Invalidate cache after creating new schedule
        invalidateCache('raw-materials');

        res.json({
            success: true,
            message: 'Planning schedule added successfully',
            id: newId
        });
    } catch (err) {
        logger.error('Error adding planning schedule:', err);
        res.status(500).json({ error: 'Failed to add planning schedule' });
    }
});

// PUT /planning-master/:id - Update existing planning schedule in PPC table
router.put('/planning-master/:id', validateBody(planningMasterSchema), async (req, res) => {
    const { id } = req.params;
    const { ItemCode, CustomerName, ScheduleQty, PlanDate } = req.body;

    // Validation
    if (!ItemCode || !CustomerName || !ScheduleQty || !PlanDate) {
        return res.status(400).json({
            error: 'Item Code, Customer Name, Schedule Qty, and Plan Date are required'
        });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));

        const result = await request.query`
            UPDATE PPC
            SET 
                ItemCode = @ItemCode,
                CustName = @CustName,
                SQty = @SQty,
                PlanDate = @PlanDate
            WHERE id = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        // Invalidate cache after updating schedule
        invalidateCache('raw-materials');

        res.json({ success: true, message: 'Planning schedule updated successfully' });
    } catch (err) {
        logger.error('Error updating planning schedule:', err);
        res.status(500).json({ error: 'Failed to update planning schedule' });
    }
});

// DELETE /planning-master/:id - Delete planning schedule from PPC table
router.delete('/planning-master/:id', async (req, res) => {
    const { id } = req.params;
    console.log('DELETE request received for ID:', id);

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM PPC WHERE id = @id
        `;

        console.log('Delete result - rows affected:', result.rowsAffected[0]);

        if (result.rowsAffected[0] === 0) {
            console.log('No rows deleted - ID not found:', id);
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        console.log('Successfully deleted schedule ID:', id);

        // Invalidate cache after deleting schedule
        invalidateCache('raw-materials');

        res.json({ success: true, message: 'Planning schedule deleted successfully' });
    } catch (err) {
        logger.error('Error deleting planning schedule:', err);
        res.status(500).json({ error: 'Failed to delete planning schedule' });
    }
});

// GET /planning-entry - Get all planning entries
router.get('/planning-entry', async (req, res) => {
    try {
        // Ensure table exists with all columns
        await req.db.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PlanningEntry')
            CREATE TABLE PlanningEntry (
                EntryId INT IDENTITY(1,1) PRIMARY KEY,
                PlanDate DATE NOT NULL,
                PatternId NUMERIC(18, 0) NOT NULL,
                PatternNo VARCHAR(255),
                CustomerName VARCHAR(255),
                PartRowId INT,
                PartNo VARCHAR(255),
                PartName VARCHAR(255),
                Cavity INT,
                CoreType VARCHAR(255),
                ProductionQty INT,
                PlateQty INT NOT NULL,
                CastWeight DECIMAL(10,2),
                TotalWeight DECIMAL(10,2),
                BoxesPerHeat DECIMAL(10,2),
                NoOfHeats INT,
                Sleeves VARCHAR(500),
                Shift INT NOT NULL,
                MouldBoxSize VARCHAR(50) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        // Add new columns if they don't exist (for existing tables)
        await req.db.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'CustomerName')
            ALTER TABLE PlanningEntry ADD CustomerName VARCHAR(255);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'PartName')
            ALTER TABLE PlanningEntry ADD PartName VARCHAR(255);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'Cavity')
            ALTER TABLE PlanningEntry ADD Cavity INT;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'CoreType')
            ALTER TABLE PlanningEntry ADD CoreType VARCHAR(255);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'ProductionQty')
            ALTER TABLE PlanningEntry ADD ProductionQty INT;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'CastWeight')
            ALTER TABLE PlanningEntry ADD CastWeight DECIMAL(10,2);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'TotalWeight')
            ALTER TABLE PlanningEntry ADD TotalWeight DECIMAL(10,2);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'BoxesPerHeat')
            ALTER TABLE PlanningEntry ADD BoxesPerHeat DECIMAL(10,2);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'NoOfHeats')
            ALTER TABLE PlanningEntry ADD NoOfHeats INT;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'Sleeves')
            ALTER TABLE PlanningEntry ADD Sleeves VARCHAR(500);
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningEntry') AND name = 'Weight')
            ALTER TABLE PlanningEntry ADD Weight DECIMAL(10,2);
        `);

        // Fix: Ensure Cavity and Weight are VARCHAR to support comma-separated values for multi-part entries
        // Use INFORMATION_SCHEMA for reliable type checking
        await req.db.request().query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PlanningEntry' AND COLUMN_NAME = 'Cavity' AND DATA_TYPE = 'int')
            BEGIN
                ALTER TABLE PlanningEntry ALTER COLUMN Cavity VARCHAR(255);
            END

            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PlanningEntry' AND COLUMN_NAME = 'Weight' AND DATA_TYPE != 'varchar')
            BEGIN
                ALTER TABLE PlanningEntry ALTER COLUMN Weight VARCHAR(255);
            END
        `);

        const result = await req.db.request().query(`
            SELECT * FROM PlanningEntry ORDER BY EntryId DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching planning entries:', err);
        res.status(500).json({ error: 'Failed to fetch planning entries' });
    }
});

// POST /planning-entry - Create new planning entries (bulk insert)
router.post('/planning-entry', validateBody(planningEntrySchema), async (req, res) => {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'No entries provided' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        // Insert each entry
        for (const entry of entries) {
            const request = new sql.Request(transaction);
            // Convert values to strings for VARCHAR columns
            request.input('PlanDate', sql.Date, entry.planDate ? new Date(entry.planDate) : null);
            request.input('PatternId', sql.VarChar(255), String(entry.patternId || ''));
            request.input('PatternNo', sql.VarChar(255), String(entry.patternNo || ''));
            request.input('CustomerName', sql.VarChar(255), String(entry.customerName || ''));
            request.input('PartRowId', sql.VarChar(255), String(entry.partRowId || ''));
            request.input('PartNo', sql.VarChar(255), String(entry.partNo || ''));
            request.input('PartName', sql.VarChar(255), String(entry.partName || ''));
            request.input('Cavity', sql.VarChar(255), String(entry.cavity || ''));
            request.input('Weight', sql.VarChar(255), String(entry.weight || ''));
            request.input('CoreType', sql.VarChar(255), String(entry.coreType || ''));
            request.input('ProductionQty', sql.VarChar(255), String(entry.productionQty || ''));
            request.input('PlateQty', sql.VarChar(255), String(entry.plateQty || ''));
            request.input('CastWeight', sql.VarChar(255), String(entry.castWeight || ''));
            request.input('TotalWeight', sql.VarChar(255), String(entry.totalWeight || ''));
            request.input('BoxesPerHeat', sql.VarChar(255), String(entry.boxPerHeat || ''));
            request.input('NoOfHeats', sql.VarChar(255), String(entry.noOfHeats || ''));
            request.input('Sleeves', sql.VarChar(500), String(entry.sleeve || ''));
            request.input('Shift', sql.VarChar(255), String(entry.shift || ''));
            request.input('MouldBoxSize', sql.VarChar(255), String(entry.mouldBoxSize || ''));

            await request.query`
                INSERT INTO PlanningEntry (PlanDate, PatternId, PatternNo, CustomerName, PartRowId, PartNo, PartName, 
                    Cavity, Weight, CoreType, ProductionQty, PlateQty, CastWeight, TotalWeight, BoxesPerHeat, NoOfHeats, Sleeves, Shift, MouldBoxSize)
                VALUES (@PlanDate, @PatternId, @PatternNo, @CustomerName, @PartRowId, @PartNo, @PartName, 
                    @Cavity, @Weight, @CoreType, @ProductionQty, @PlateQty, @CastWeight, @TotalWeight, @BoxesPerHeat, @NoOfHeats, @Sleeves, @Shift, @MouldBoxSize)
            `;
        }

        await transaction.commit();

        res.json({
            success: true,
            message: `Successfully added ${entries.length} planning entries`
        });
    } catch (err) {
        logger.error('Error adding planning entries:', err);
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackErr) {
                logger.error('Transaction rollback failed:', rollbackErr);
            }
        }
        res.status(500).json({ error: 'Failed to add planning entries' });
    }
});

// DELETE /planning-entry/:id - Delete a planning entry
router.delete('/planning-entry/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM PlanningEntry WHERE EntryId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Planning entry not found' });
        }

        // Invalidate cache after deleting entry
        invalidateCache('raw-materials');

        res.json({ success: true, message: 'Planning entry deleted successfully' });
    } catch (err) {
        logger.error('Error deleting planning entry:', err);
        res.status(500).json({ error: 'Failed to delete planning entry' });
    }
});

// PUT /planning-entry/:id - Update a planning entry
router.put('/planning-entry/:id', validateBody(planningEntrySchema), async (req, res) => {
    const { id } = req.params;
    const entry = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('PlanDate', sql.Date, entry.planDate ? new Date(entry.planDate) : null);
        request.input('ProductionQty', sql.VarChar(255), String(entry.productionQty || ''));
        request.input('PlateQty', sql.VarChar(255), String(entry.plateQty || ''));
        request.input('TotalWeight', sql.VarChar(255), String(entry.totalWeight || ''));
        request.input('NoOfHeats', sql.VarChar(255), String(entry.noOfHeats || ''));
        request.input('Shift', sql.VarChar(255), String(entry.shift || ''));
        request.input('MouldBoxSize', sql.VarChar(255), String(entry.mouldBoxSize || ''));

        const result = await request.query`
            UPDATE PlanningEntry 
            SET PlanDate = @PlanDate,
                ProductionQty = @ProductionQty,
                PlateQty = @PlateQty,
                TotalWeight = @TotalWeight,
                NoOfHeats = @NoOfHeats,
                Shift = @Shift,
                MouldBoxSize = @MouldBoxSize
            WHERE EntryId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Planning entry not found' });
        }

        // Invalidate cache after updating entry
        invalidateCache('raw-materials');

        res.json({ success: true, message: 'Planning entry updated successfully' });
    } catch (err) {
        logger.error('Error updating planning entry:', err);
        res.status(500).json({ error: 'Failed to update planning entry' });
    }
});

// GET /sleeve-requirement - Get sleeve requirements by date and shift
router.get('/sleeve-requirement', async (req, res) => {
    const { planDate, shift } = req.query;

    if (!planDate || !shift) {
        return res.status(400).json({ error: 'Plan Date and Shift are required' });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('planDate', sql.Date, new Date(planDate));
        request.input('shift', sql.VarChar(255), shift);

        // Fetch planning entries for the given date and shift
        const result = await request.query`
            SELECT PatternNo, PlateQty, Sleeves 
            FROM PlanningEntry 
            WHERE CAST(PlanDate AS DATE) = @planDate AND Shift = @shift
            ORDER BY PatternNo
        `;

        // Check if SleeveRequirement table exists and get already submitted entries
        let submittedEntries = [];
        try {
            const submittedRequest = new sql.Request(req.db);
            submittedRequest.input('planDate', sql.Date, new Date(planDate));
            submittedRequest.input('shift', sql.Int, parseInt(shift));
            
            const submittedResult = await submittedRequest.query`
                SELECT PatternNo, SleeveType, SleeveQty, PlateQty, TotalSleeves
                FROM SleeveRequirement
                WHERE CAST(PlanDate AS DATE) = @planDate AND Shift = @shift
            `;
            submittedEntries = submittedResult.recordset || [];
        } catch (tableErr) {
            // Table might not exist yet, that's okay
            console.log('SleeveRequirement table may not exist yet:', tableErr.message);
        }

        // Create a lookup key for submitted entries
        const submittedLookup = new Set();
        for (const entry of submittedEntries) {
            const key = `${entry.PatternNo}|${entry.SleeveType}|${entry.PlateQty}`;
            submittedLookup.add(key);
        }

        // Parse sleeve data and create separate rows for each sleeve type
        const sleeveRows = [];
        for (const entry of result.recordset) {
            const sleevesStr = entry.Sleeves || '';
            const plateQty = parseInt(entry.PlateQty) || 0;
            
            // Skip if no sleeves or sleeves is just "-"
            if (!sleevesStr || sleevesStr === '-' || sleevesStr.trim() === '') {
                continue;
            }

            // Parse sleeves: format is "SleeveType=Qty, SleeveType2=Qty2"
            const sleeveParts = sleevesStr.split(',').map(s => s.trim()).filter(s => s);
            
            for (const sleevePart of sleeveParts) {
                const [sleeveType, sleeveQtyStr] = sleevePart.split('=').map(s => s.trim());
                const sleeveQty = parseInt(sleeveQtyStr) || 0;
                
                if (sleeveType && sleeveQty > 0) {
                    const lookupKey = `${entry.PatternNo}|${sleeveType}|${plateQty}`;
                    const isSubmitted = submittedLookup.has(lookupKey);
                    
                    sleeveRows.push({
                        PatternNo: entry.PatternNo,
                        PlateQty: plateQty,
                        SleeveType: sleeveType,
                        SleeveQty: sleeveQty,
                        TotalSleeves: sleeveQty * plateQty,
                        isSubmitted: isSubmitted
                    });
                }
            }
        }

        res.json(sleeveRows);
    } catch (err) {
        logger.error('Error fetching sleeve requirements:', err);
        res.status(500).json({ error: 'Failed to fetch sleeve requirements' });
    }
});

// POST /sleeve-requirement - Save sleeve requirement submission
router.post('/sleeve-requirement', validateBody(sleeveRequirementSchema), async (req, res) => {
    const { planDate, shift, entries } = req.body;

    try {
        // Ensure table exists
        await req.db.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleeveRequirement')
            CREATE TABLE SleeveRequirement (
                Id INT IDENTITY(1,1) PRIMARY KEY,
                PlanDate DATE NOT NULL,
                Shift INT NOT NULL,
                PatternNo VARCHAR(255),
                PlateQty INT,
                SleeveType VARCHAR(255),
                SleeveQty INT,
                TotalSleeves INT,
                SubmittedAt DATETIME DEFAULT GETDATE()
            )
        `);

        const transaction = new sql.Transaction(req.db);
        await transaction.begin();

        for (const entry of entries) {
            const request = new sql.Request(transaction);
            request.input('planDate', sql.Date, new Date(planDate));
            request.input('shift', sql.Int, parseInt(shift));
            request.input('patternNo', sql.VarChar(255), entry.PatternNo || '');
            request.input('plateQty', sql.Int, parseInt(entry.PlateQty) || 0);
            request.input('sleeveType', sql.VarChar(255), entry.SleeveType || '');
            request.input('sleeveQty', sql.Int, parseInt(entry.SleeveQty) || 0);
            request.input('totalSleeves', sql.Int, parseInt(entry.TotalSleeves) || 0);

            await request.query`
                INSERT INTO SleeveRequirement (PlanDate, Shift, PatternNo, PlateQty, SleeveType, SleeveQty, TotalSleeves)
                VALUES (@planDate, @shift, @patternNo, @plateQty, @sleeveType, @sleeveQty, @totalSleeves)
            `;
        }

        await transaction.commit();

        res.json({
            success: true,
            message: `Successfully submitted ${entries.length} sleeve requirement(s)`
        });
    } catch (err) {
        logger.error('Error saving sleeve requirements:', err);
        res.status(500).json({ error: 'Failed to save sleeve requirements' });
    }
});

// GET /sleeve-requirement/records - Get all submitted sleeve requirements
router.get('/sleeve-requirement/records', async (req, res) => {
    try {
        const { planDate, shift } = req.query;
        
        let query = `
            SELECT Id, PlanDate, Shift, PatternNo, PlateQty, SleeveType, SleeveQty, TotalSleeves, SubmittedAt
            FROM SleeveRequirement
        `;
        
        const conditions = [];
        const request = new sql.Request(req.db);
        
        if (planDate) {
            request.input('planDate', sql.Date, new Date(planDate));
            conditions.push('CAST(PlanDate AS DATE) = @planDate');
        }
        if (shift) {
            request.input('shift', sql.Int, parseInt(shift));
            conditions.push('Shift = @shift');
        }
        
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ' ORDER BY SubmittedAt DESC, PatternNo';
        
        const result = await request.query(query);
        res.json(result.recordset || []);
    } catch (err) {
        logger.error('Error fetching sleeve requirement records:', err);
        res.status(500).json({ error: 'Failed to fetch sleeve requirement records' });
    }
});

// GET /sleeve-requirement/print-data - Get aggregated sleeve data for printing
router.get('/sleeve-requirement/print-data', async (req, res) => {
    const { planDate, shift } = req.query;
    
    if (!planDate || !shift) {
        return res.status(400).json({ error: 'Plan Date and Shift are required' });
    }
    
    try {
        const request = new sql.Request(req.db);
        request.input('planDate', sql.Date, new Date(planDate));
        request.input('shift', sql.Int, parseInt(shift));
        
        // Aggregate sleeve types - sum TotalSleeves for same sleeve type
        const result = await request.query`
            SELECT SleeveType, SUM(TotalSleeves) as Quantity
            FROM SleeveRequirement
            WHERE CAST(PlanDate AS DATE) = @planDate AND Shift = @shift
            GROUP BY SleeveType
            ORDER BY SleeveType
        `;
        
        res.json(result.recordset || []);
    } catch (err) {
        logger.error('Error fetching sleeve print data:', err);
        res.status(500).json({ error: 'Failed to fetch sleeve print data' });
    }
});

// GET /sleeve-indent - Get sleeve indent data by date range from schedule planning
router.get('/sleeve-indent', async (req, res) => {
    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'From Date and To Date are required' });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('fromDate', sql.Date, new Date(fromDate));
        request.input('toDate', sql.Date, new Date(toDate));

        // Step 1: Fetch schedule planning entries from PPC table for the given date range
        const ppcResult = await request.query`
            SELECT 
                ppc.ItemCode,
                SUM(CAST(ppc.SQty AS INT)) as ScheduleQty
            FROM PPC ppc
            WHERE CAST(ppc.PlanDate AS DATE) >= @fromDate 
              AND CAST(ppc.PlanDate AS DATE) <= @toDate
            GROUP BY ppc.ItemCode
            ORDER BY ppc.ItemCode
        `;

        if (!ppcResult.recordset || ppcResult.recordset.length === 0) {
            return res.json([]);
        }

        // Step 2: For each ItemCode, find the pattern and sleeve information
        const sleeveIndentData = [];

        for (const ppcEntry of ppcResult.recordset) {
            const originalItemCode = ppcEntry.ItemCode;
            const scheduleQty = parseInt(ppcEntry.ScheduleQty) || 0;

            if (!originalItemCode || scheduleQty === 0) continue;

            // Extract the core part code - if ItemCode is like "652996 - HUB BOTTOM164X42/ 652996", extract "652996"
            // The format could be: just a code, or "code - description/ code"
            let itemCode = originalItemCode.trim();
            if (itemCode.includes(' - ')) {
                itemCode = itemCode.split(' - ')[0].trim();
            }


            // First, get the RawMatID for this ItemCode
            const rmRequest = new sql.Request(req.db);
            rmRequest.input('itemCode', sql.NVarChar, itemCode);
            rmRequest.input('originalItemCode', sql.NVarChar, originalItemCode);
            
            const rmResult = await rmRequest.query`
                SELECT RawMatID, RawMatCode, RawMatName
                FROM RawMaterial
                WHERE RawMatCode = @itemCode OR RawMatCode = @originalItemCode
            `;

            let rawMatId = null;
            if (rmResult.recordset && rmResult.recordset.length > 0) {
                rawMatId = rmResult.recordset[0].RawMatID;
            }

            // Now find pattern(s) that have this part
            // Try to find by looking at PatternCavityMaster.PartNo which is Product.ProdId
            const partRequest = new sql.Request(req.db);
            partRequest.input('itemCode', sql.NVarChar, itemCode);
            if (rawMatId) {
                partRequest.input('rawMatId', sql.Int, rawMatId);
            }
            
            // Try multiple matching strategies - also check ProductName matching
            let partResult;
            if (rawMatId) {
                partResult = await partRequest.query`
                    SELECT DISTINCT
                        pcm.PatternId,
                        pcm.PartNo,
                        pcm.ProductName,
                        pcm.Qty as Cavity,
                        pm.PatternNo,
                        p.InternalPartNo,
                        p.ProdName
                    FROM PatternCavityMaster pcm
                    INNER JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
                    LEFT JOIN Product p ON pcm.PartNo = p.ProdId
                    WHERE p.InternalPartNo = @itemCode
                       OR CAST(pcm.PartNo AS VARCHAR) = @itemCode
                       OR CAST(pcm.PartNo AS VARCHAR) = CAST(@rawMatId AS VARCHAR)
                       OR pcm.PartNo = @rawMatId
                `;
            } else {
                partResult = await partRequest.query`
                    SELECT DISTINCT
                        pcm.PatternId,
                        pcm.PartNo,
                        pcm.ProductName,
                        pcm.Qty as Cavity,
                        pm.PatternNo,
                        p.InternalPartNo,
                        p.ProdName
                    FROM PatternCavityMaster pcm
                    INNER JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
                    LEFT JOIN Product p ON pcm.PartNo = p.ProdId
                    WHERE p.InternalPartNo = @itemCode
                       OR CAST(pcm.PartNo AS VARCHAR) = @itemCode
                `;
            }

            // If no pattern found with primary queries, try additional fallback searches
            if (!partResult.recordset || partResult.recordset.length === 0) {
                // Try searching by ProductName in PatternCavityMaster (sometimes ItemCode is stored as ProductName)
                const fallbackRequest = new sql.Request(req.db);
                fallbackRequest.input('itemCode', sql.NVarChar, itemCode);
                fallbackRequest.input('itemCodeLike', sql.NVarChar, `%${itemCode}%`);
                
                partResult = await fallbackRequest.query`
                    SELECT DISTINCT
                        pcm.PatternId,
                        pcm.PartNo,
                        pcm.ProductName,
                        pcm.Qty as Cavity,
                        pm.PatternNo
                    FROM PatternCavityMaster pcm
                    INNER JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
                    WHERE pcm.ProductName LIKE @itemCodeLike
                       OR pcm.ProductName = @itemCode
                `;
            }

            // If still no pattern found, include with placeholders
            if (!partResult.recordset || partResult.recordset.length === 0) {
                sleeveIndentData.push({
                    PartCode: itemCode,
                    PatternNo: '-',
                    Cavity: 1,
                    ScheduleQty: scheduleQty,
                    SleeveQty: 0,
                    SleeveDetails: [],
                    RequiredSleeveQty: 0
                });
                continue;
            }

            // Process each pattern association (a part can be in multiple patterns)
            for (const partEntry of partResult.recordset) {
                const patternId = partEntry.PatternId;
                const patternNo = partEntry.PatternNo || '-';
                const cavity = parseInt(partEntry.Cavity) || 1;

                // Get sleeve information for this pattern
                const sleeveRequest = new sql.Request(req.db);
                sleeveRequest.input('patternId', sql.Numeric(18, 0), patternId);
                
                const sleeveResult = await sleeveRequest.query`
                    SELECT 
                        sm.sleeve_name,
                        sm.sleeve_type_size,
                        sm.quantity,
                        rm.RawMatName AS sleeve_type_name
                    FROM SleeveMaster sm
                    LEFT JOIN RawMaterial rm ON 
                        CASE 
                            WHEN sm.sleeve_type_size IS NOT NULL AND sm.sleeve_type_size != '' AND ISNUMERIC(sm.sleeve_type_size) = 1 
                            THEN CAST(sm.sleeve_type_size AS INT) 
                            ELSE NULL 
                        END = rm.RawMatID
                    WHERE sm.PatternId = @patternId
                `;

                // Build sleeve details array with names and quantities
                const sleeveDetails = [];
                let totalSleeveQty = 0;
                
                if (sleeveResult.recordset && sleeveResult.recordset.length > 0) {
                    for (const sleeve of sleeveResult.recordset) {
                        const qty = parseInt(sleeve.quantity) || 0;
                        const sleeveName = sleeve.sleeve_type_name || sleeve.sleeve_name || 'Unknown';
                        totalSleeveQty += qty;
                        
                        // Calculate required for this specific sleeve type
                        const requiredForThisSleeve = Math.ceil((scheduleQty / cavity) * qty);
                        
                        sleeveDetails.push({
                            name: sleeveName,
                            qty: qty,
                            requiredQty: requiredForThisSleeve
                        });
                    }
                }

                // Calculate total required sleeve qty = (ScheduleQty / Cavity) × TotalSleeveQty
                const requiredSleeveQty = Math.ceil((scheduleQty / cavity) * totalSleeveQty);

                sleeveIndentData.push({
                    PartCode: itemCode,
                    PatternNo: patternNo,
                    Cavity: cavity,
                    ScheduleQty: scheduleQty,
                    SleeveQty: totalSleeveQty,
                    SleeveDetails: sleeveDetails,
                    RequiredSleeveQty: requiredSleeveQty
                });
            }
        }

        res.json(sleeveIndentData);
    } catch (err) {
        logger.error('Error fetching sleeve indent data:', err);
        res.status(500).json({ error: 'Failed to fetch sleeve indent data' });
    }
});

module.exports = router;
