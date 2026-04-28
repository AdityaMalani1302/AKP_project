const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { cacheMiddleware, invalidateCache } = require('../utils/cache');
const { validateBody, planningMasterSchema, planningEntrySchema, sleeveRequirementSchema } = require('../utils/validators');
const logger = require('../utils/logger');
const multer = require('multer');
const ExcelJS = require('exceljs');
const upload = multer({ storage: multer.memoryStorage() });

// GET /raw-materials - Get raw materials for Item Code dropdown (cached 5 minutes)
router.get('/raw-materials', cacheMiddleware('raw-materials', 300), async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT RawMatCode, RawMatName, RawMatID
            FROM RawMaterial 
            WHERE IsCreateProduct = 'Y' AND GrnTypeId NOT IN (176, 192, 193)
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` AND (RawMatName LIKE @search OR RawMatCode LIKE @search)`;
        }

        query += ' ORDER BY RawMatCode';

        const result = await request.query(query);
        logger.info(`Raw materials fetched: ${result.recordset.length} items`);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching raw materials:', err);
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
                PlanDate,
                DeliveryDate
            FROM PPC
            WHERE DATEDIFF(month, GETDATE(), PlanDate) IN (0, 1)
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
    const { ItemCode, CustomerName, ScheduleQty, PlanDate, DeliveryDate } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));
        request.input('DeliveryDate', sql.DateTime, DeliveryDate ? new Date(DeliveryDate) : null);

        const result = await request.query`
            INSERT INTO PPC (ItemCode, CustName, SQty, PlanDate, DeliveryDate)
            OUTPUT INSERTED.id
            VALUES (@ItemCode, @CustName, @SQty, @PlanDate, @DeliveryDate)
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
    const { ItemCode, CustomerName, ScheduleQty, PlanDate, DeliveryDate } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));
        request.input('DeliveryDate', sql.DateTime, DeliveryDate ? new Date(DeliveryDate) : null);

        const result = await request.query`
            UPDATE PPC
            SET 
                ItemCode = @ItemCode,
                CustName = @CustName,
                SQty = @SQty,
                PlanDate = @PlanDate,
                DeliveryDate = @DeliveryDate
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
    logger.info('DELETE request received for ID:', id);

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, idNum);

        const result = await request.query`
            DELETE FROM PPC WHERE id = @id
        `;

        logger.info('Delete result - rows affected:', result.rowsAffected[0]);

        if (result.rowsAffected[0] === 0) {
            logger.warn('No rows deleted - ID not found:', id);
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        logger.info('Successfully deleted schedule ID:', id);

        // Invalidate cache after deleting schedule
        invalidateCache('raw-materials');

        res.json({ success: true, message: 'Planning schedule deleted successfully' });
    } catch (err) {
        logger.error('Error deleting planning schedule:', err);
        res.status(500).json({ error: 'Failed to delete planning schedule' });
    }
});

// POST /planning-master/import-excel - Import planning schedules from Excel
router.post('/planning-master/import-excel', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        // Helper function to get cell value
        const getCellValue = (cell) => {
            if (!cell || cell.value === null || cell.value === undefined) return '';
            if (typeof cell.value === 'object' && cell.value.text) return cell.value.text;
            if (typeof cell.value === 'object' && cell.value.richText) {
                return cell.value.richText.map(rt => rt.text).join('');
            }
            return String(cell.value);
        };

        // Helper to parse Excel date
        const parseExcelDate = (val) => {
            if (!val) return null;
            if (val instanceof Date) return val;
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        // Process data starting from row 2
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            try {
                const itemCode = getCellValue(row.getCell(1));
                const customerName = getCellValue(row.getCell(2));
                const scheduleQtyStr = getCellValue(row.getCell(3));
                const scheduleQty = parseInt(scheduleQtyStr);
                const planDateVal = getCellValue(row.getCell(4));
                const deliveryDateVal = getCellValue(row.getCell(5));

                if (!itemCode || !customerName || !scheduleQty || !planDateVal) {
                    errors.push(`Row ${rowNumber}: Missing required fields`);
                    errorCount++;
                    continue;
                }

                const planDate = parseExcelDate(planDateVal);
                const deliveryDate = deliveryDateVal ? parseExcelDate(deliveryDateVal) : null;

                if (!planDate) {
                    errors.push(`Row ${rowNumber}: Invalid plan date`);
                    errorCount++;
                    continue;
                }

                const request = new sql.Request(req.db);
                request.input('ItemCode', sql.VarChar(50), itemCode);
                request.input('CustName', sql.VarChar(50), customerName);
                request.input('SQty', sql.Numeric(18, 0), scheduleQty);
                request.input('PlanDate', sql.DateTime, planDate);
                request.input('DeliveryDate', sql.DateTime, deliveryDate);

                await request.query`
                    INSERT INTO PPC (ItemCode, CustName, SQty, PlanDate, DeliveryDate)
                    VALUES (@ItemCode, @CustName, @SQty, @PlanDate, @DeliveryDate)
                `;

                successCount++;
            } catch (rowErr) {
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
                errorCount++;
            }
        }

        invalidateCache('raw-materials');
        res.json({ successCount, errorCount, errors: errors.slice(0, 10) });
    } catch (err) {
        logger.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file' });
    }
});

// One-time table migration (runs on first request)
let planningEntryMigrated = false;
const ensurePlanningEntryTable = async (db) => {
    if (planningEntryMigrated) return;
    try {
        await db.request().query(`
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
                Cavity VARCHAR(255),
                Weight VARCHAR(255),
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
        await db.request().query(`
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
        await db.request().query(`
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PlanningEntry' AND COLUMN_NAME = 'Cavity' AND DATA_TYPE = 'int')
            BEGIN
                ALTER TABLE PlanningEntry ALTER COLUMN Cavity VARCHAR(255);
            END
            IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'PlanningEntry' AND COLUMN_NAME = 'Weight' AND DATA_TYPE != 'varchar')
            BEGIN
                ALTER TABLE PlanningEntry ALTER COLUMN Weight VARCHAR(255);
            END
        `);
        planningEntryMigrated = true;
        logger.info('PlanningEntry table migration complete');
    } catch (err) {
        logger.error('PlanningEntry table migration error:', err);
    }
};

// GET /planning-entry - Get all planning entries
router.get('/planning-entry', async (req, res) => {
    try {
        await ensurePlanningEntryTable(req.db);

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

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, idNum);

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
router.put('/planning-entry/:id', async (req, res) => {
    const { id } = req.params;
    const entry = req.body;

    const idNum = parseInt(id);
    if (isNaN(idNum)) {
        return res.status(400).json({ error: 'Invalid entry ID' });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, idNum);
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
            WHERE CAST(PlanDate AS DATE) = @planDate AND CAST(Shift AS VARCHAR) = @shift
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
            logger.warn('SleeveRequirement table may not exist yet:', tableErr.message);
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

            // Parse sleeves: format is "SleeveTypeID=Qty, SleeveTypeID2=Qty2" (now using IDs)
            const sleeveParts = sleevesStr.split(',').map(s => s.trim()).filter(s => s);

            for (const sleevePart of sleeveParts) {
                const [sleeveTypeId, sleeveQtyStr] = sleevePart.split('=').map(s => s.trim());
                const sleeveQty = parseInt(sleeveQtyStr) || 0;

                if (sleeveTypeId && sleeveQty > 0) {
                    const lookupKey = `${entry.PatternNo}|${sleeveTypeId}|${plateQty}`;
                    const isSubmitted = submittedLookup.has(lookupKey);

                    sleeveRows.push({
                        PatternNo: entry.PatternNo,
                        PlateQty: plateQty,
                        SleeveType: sleeveTypeId, // Store ID
                        SleeveTypeName: null, // Will be populated after lookup
                        SleeveQty: sleeveQty,
                        TotalSleeves: sleeveQty * plateQty,
                        isSubmitted: isSubmitted
                    });
                }
            }
        }

        // Look up sleeve type names from RawMaterial
        if (sleeveRows.length > 0) {
            const uniqueSleeveIds = [...new Set(sleeveRows.map(r => r.SleeveType).filter(id => id && !isNaN(id)))];
            if (uniqueSleeveIds.length > 0) {
                const sleeveIdList = uniqueSleeveIds.map(id => parseInt(id)).join(',');
                try {
                    const nameRequest = new sql.Request(req.db);
                    const nameResult = await nameRequest.query`
                        SELECT CAST(RawMatID AS VARCHAR) AS RawMatID, RawMatName 
                        FROM RawMaterial 
                        WHERE RawMatID IN (${sql.RawStr(sleeveIdList)})
                    `;
                    const nameMap = {};
                    nameResult.recordset.forEach(row => {
                        nameMap[row.RawMatID] = row.RawMatName;
                    });
                    // Populate SleeveTypeName
                    sleeveRows.forEach(row => {
                        if (row.SleeveType && nameMap[row.SleeveType]) {
                            row.SleeveTypeName = nameMap[row.SleeveType];
                        }
                    });
                } catch (nameErr) {
                    logger.error('Error looking up sleeve type names:', nameErr);
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

    let transaction;
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

        transaction = new sql.Transaction(req.db);
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
        if (transaction) {
            try { await transaction.rollback(); } catch (rbErr) { logger.error('Rollback failed:', rbErr); }
        }
        logger.error('Error saving sleeve requirements:', err);
        res.status(500).json({ error: 'Failed to save sleeve requirements' });
    }
});

// GET /sleeve-requirement/records - Get all submitted sleeve requirements
router.get('/sleeve-requirement/records', async (req, res) => {
    try {
        const { planDate, shift } = req.query;

        let query = `
            SELECT sr.Id, sr.PlanDate, sr.Shift, sr.PatternNo, sr.PlateQty, sr.SleeveType, 
                   rm.RawMatName AS SleeveTypeName, sr.SleeveQty, sr.TotalSleeves, sr.SubmittedAt
            FROM SleeveRequirement sr
            LEFT JOIN RawMaterial rm ON CAST(sr.SleeveType AS INT) = rm.RawMatID
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
            SELECT sr.SleeveType, rm.RawMatName AS SleeveTypeName, SUM(sr.TotalSleeves) as Quantity
            FROM SleeveRequirement sr
            LEFT JOIN RawMaterial rm ON CAST(sr.SleeveType AS INT) = rm.RawMatID
            WHERE CAST(sr.PlanDate AS DATE) = @planDate AND sr.Shift = @shift
            GROUP BY sr.SleeveType, rm.RawMatName
            ORDER BY sr.SleeveType
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

// ==================== PLANNING REPORTS ====================

// GET /reports - Planning report (schedule vs production vs stock vs despatch)
router.get('/reports', async (req, res) => {
    const { fromDate, toDate, partNo } = req.query;

    if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    try {
        const request = new sql.Request(req.db);
        request.timeout = 120000;
        
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        // Set to end of day to include all transactions happening on the 'to' date
        toDateObj.setUTCHours(23, 59, 59, 990);

        request.input('fromDate', sql.DateTime, fromDateObj);
        request.input('toDate', sql.DateTime, toDateObj);
        request.input('endOfTo', sql.DateTime, toDateObj);

        let partFilter = `pl.RawMatCode LIKE '%'`;
        if (partNo && partNo.trim() !== '') {
            request.input('partNo', sql.NVarChar, partNo.trim());
            partFilter = `pl.RawMatCode = @partNo`;
        }

        const query = `
            SELECT
                pl.RawMatCode AS ItemCode,
                pl.CommanPartNO,
                pl.RawMatName,
                ISNULL(p.CustName, pl.CustName) AS custname,
                pl.PurchaseVendor,
                pl.SubconName,
                pl.RawMachine,
                pl.CommanNo,
                ISNULL(pl.Core_Type, '') AS CoreType,
                pl.Grade,
                pl.Weight,
                pl.Price,
                pl.boxsize,
                ISNULL(pl.caviti, 0) AS cavity,
                pl.[Yield %] AS [Yield],
                p.SQty AS ScheduledQty,
                p.SQty * pl.Weight AS ScheduledWt,
                p.SQty / CASE WHEN ISNULL(pl.caviti, 0) = 0 THEN 1 ELSE pl.caviti END AS FixBox,
                ISNULL(inhs.INhStock, 0) AS INhStock,
                ISNULL(SUbFet.FetStock, 0) AS FetStock,
                ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) AS TotalInH,
                (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0)) * pl.Weight AS InHouseWt,
                ISNULL(SUBMC.SubStock, 0) AS MCSubStockQty,
                ISNULL(SUBMC.SubStock, 0) * pl.Weight AS MCSubStockWt,
                CASE
                    WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                         - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                    THEN 0
                    ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                         - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                END AS TobeProductionQty,
                (CASE
                    WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                         - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                    THEN 0
                    ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                         - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                END) * pl.Weight AS TobeProductionWt,
                ISNULL(Prod.prodQty, 0) AS ProductionQTY,
                CASE
                    WHEN (CASE
                            WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                            THEN 0
                            ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                          END) < 0
                    THEN 0
                    ELSE (CASE
                            WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                            THEN 0
                            ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                          END)
                END AS BalToPour,
                (CASE
                    WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                         - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                    THEN 0
                    ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                         - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                END) / CASE WHEN ISNULL(pl.caviti, 0) = 0 THEN 1 ELSE pl.caviti END AS BoxesReq,
                (CASE
                    WHEN (CASE
                            WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                            THEN 0
                            ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                          END) < 0
                    THEN 0
                    ELSE (CASE
                            WHEN (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0)) < 0
                            THEN 0
                            ELSE (ISNULL(p.SQty, 0) - ISNULL(d.DespQty, 0))
                                 - (ISNULL(SUbFet.FetStock, 0) + ISNULL(inhs.INhStock, 0) + ISNULL(SUBMC.SubStock, 0))
                          END)
                END) / CASE WHEN ISNULL(pl.caviti, 0) = 0 THEN 1 ELSE pl.caviti END AS BalBoxReq,
                ISNULL(d.DespQty, 0) AS DespQty,
                p.SQty * pl.Weight AS BalWt,
                p.SQty * pl.Price AS BalValue,
                pl.Sleeve,
                pl.Noofsleeve,
                pl.Noofcores
            FROM PPC p
            INNER JOIN (
                SELECT
                    r.Rawmatid,
                    r.RawMatCode,
                    r.RawMatName,
                    G.Gradename AS Grade,
                    r.Weight,
                    ROUND(pr.Price, 2) AS Price,
                    pr.CustName,
                    i.Comman_No AS CommanPartNO,
                    i.pur_vendor AS PurchaseVendor,
                    i.SubContractor_Name AS SubconName,
                    CASE WHEN i.IS_RawCasting = 'No' THEN 'Machining' ELSE 'Raw' END AS RawMachine,
                    i.comman_no AS CommanNo,
                    pm.Core_Type,
                    ISNULL(i.Moulding_Box_Size, pm.Moulding_Box_Size) AS boxsize,
                    ISNULL(i.[Yield %], pm.YieldPercent) AS [Yield %],
                    ISNULL(NULLIF(i.No_Of_Cavities, 0), pcm.Qty) AS caviti,
                    ISNULL(NULLIF(i.Sleeve, ''), sm.SleeveNames) AS Sleeve,
                    ISNULL(NULLIF(i.No_Of_Sleeves, 0), sm.TotalSleeveQty) AS Noofsleeve,
                    i.No_of_Cores AS Noofcores
                FROM dbo.Product p
                LEFT JOIN RawMaterial r ON r.RawMatID = p.RawMatID
                INNER JOIN dbo.Grade G ON r.GradeID = G.GradeID
                LEFT JOIN (
                    SELECT Af_ID, Comman_No, pur_vendor, SubContractor_Name, IS_RawCasting,
                           Moulding_Box_Size, [Yield %], No_Of_Cavities,
                           Sleeve, No_Of_Sleeves, No_of_Cores,
                           ROW_NUMBER() OVER (PARTITION BY Af_ID ORDER BY Af_ID) AS rn
                    FROM Invent_Rawmaterial
                ) i ON i.Af_ID = r.Rawmatid AND i.rn = 1
                LEFT JOIN (
                    SELECT PartNo, PatternId, Qty,
                        ROW_NUMBER() OVER (PARTITION BY PartNo ORDER BY PatternId) AS rn
                    FROM PatternCavityMaster
                ) pcm ON p.ProdId = pcm.PartNo AND pcm.rn = 1
                LEFT JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
                LEFT JOIN (
                    SELECT PatternId,
                        MAX(sleeve_name) AS SleeveNames,
                        SUM(quantity) AS TotalSleeveQty
                    FROM SleeveMaster
                    GROUP BY PatternId
                ) sm ON pm.PatternId = sm.PatternId
                OUTER APPLY (
                    SELECT TOP 1 sc2.Price, sc2.EffectiveDate, c.CustName
                    FROM Sales_CustSettingDetails sc2
                    INNER JOIN Customer c ON c.CustId = sc2.CustId
                    WHERE sc2.ProdId = p.RawMatID
                    ORDER BY sc2.EffectiveDate DESC
                ) PR
                WHERE p.ProdID LIKE '%'
            ) pl ON pl.RawMatCode = p.ItemCode
            LEFT JOIN (
                SELECT d1.ProdId, pr.InternalPartNo, SUM(d1.Despatchqty) AS DespQty
                FROM despatch d1
                INNER JOIN Product pr ON pr.ProdId = d1.ProdId
                WHERE d1.DespatchDate >= @fromDate AND d1.DespatchDate <= @toDate
                GROUP BY d1.ProdId, pr.InternalPartNo
            ) d ON d.InternalPartNo = p.ItemCode
            LEFT JOIN (
                SELECT r.RawMatID, r.RawMatCode, SUM(pf.OkQty) AS prodQty
                FROM ProdnForgingStages pf
                INNER JOIN RawMaterial r ON r.RawMatID = pf.ProdID
                WHERE pf.StgDate >= @fromDate AND pf.StgDate <= @toDate
                  AND pf.DeptID = 185 AND pf.OkQty <> 0
                GROUP BY r.RawMatID, r.RawMatCode
            ) Prod ON Prod.RawMatCode = p.ItemCode
            LEFT JOIN (
                SELECT RawMatID, RawMatCode, SUM(stock) AS INhStock
                FROM (
                    SELECT r.RawMatID, r.rawmatcode, SUM(isl.stock) AS Stock
                    FROM invent_storagelocationentry isl
                    INNER JOIN invent_grnmaterialdetail igm ON igm.grnid = isl.grnid
                    INNER JOIN invent_Grn ig ON ig.grnno = igm.grnno
                    INNER JOIN invent_rawmatlocation irl ON irl.location_id = isl.loc_id
                    INNER JOIN rawmaterial r ON r.rawmatid = igm.rawmatid
                    WHERE ig.locationid = 1
                      AND r.GrnTypeId NOT IN (78, 192, 84, 176, 124)
                      AND ig.GrnDate <= @endOfTo
                      AND irl.locationname <> 'REJECTED STORE'
                    GROUP BY r.RawMatID, r.rawmatcode

                    UNION ALL

                    SELECT r.RawMatID, r.rawmatcode, SUM(pfs.stockqty) AS Stock
                    FROM prodnforgingstages pfs
                    INNER JOIN department d ON d.deptid = pfs.deptid
                    INNER JOIN rawmaterial r ON r.rawmatid = pfs.prodid
                    WHERE pfs.LocationID = 1
                      AND r.GrnTypeId NOT IN (78, 192, 84, 176, 124)
                      AND pfs.StgDate <= @endOfTo
                    GROUP BY r.RawMatID, r.rawmatcode

                    UNION ALL

                    SELECT r.RawMatID, r.rawmatcode,
                        SUM(CASE WHEN imm.avlstockqty = -1 THEN imm.qty ELSE imm.avlstockqty END) AS Stock
                    FROM invent_minmaterial imm
                    INNER JOIN invent_min im ON im.minno = imm.minno
                    INNER JOIN invent_grnmaterialdetail igm ON igm.grnid = imm.grnid
                    INNER JOIN invent_Grn ig ON ig.grnno = igm.grnno
                    INNER JOIN rawmaterial r ON r.rawmatid = igm.rawmatid
                    LEFT JOIN subcontractor s ON s.subconid = im.vendorid
                    LEFT JOIN Invent_SubcontractorAddn sa ON sa.AF_ID = s.SubconId
                    WHERE ig.LocationID = 1
                      AND r.GrnTypeId NOT IN (78, 192, 84, 176, 124)
                      AND im.Mindate <= @endOfTo
                      AND (sa.SUBCON_TYPE IS NULL OR sa.SUBCON_TYPE NOT IN ('Machinig ', 'Fettling '))
                    GROUP BY r.RawMatID, r.rawmatcode
                ) INH
                GROUP BY rawmatcode, RawMatID
            ) INHS ON inhs.RawMatCode = p.ItemCode
            LEFT JOIN (
                SELECT RawMatID, RawMatCode, SUM(stock) AS SubStock
                FROM (
                    SELECT r.RawMatID, r.rawmatcode,
                        SUM(CASE WHEN imm.avlstockqty = -1 THEN imm.qty ELSE imm.avlstockqty END) AS Stock
                    FROM invent_minmaterial imm
                    INNER JOIN invent_min im ON im.minno = imm.minno
                    INNER JOIN invent_grnmaterialdetail igm ON igm.grnid = imm.grnid
                    INNER JOIN invent_Grn ig ON ig.grnno = igm.grnno
                    INNER JOIN subcontractor s ON s.subconid = im.vendorid
                    INNER JOIN rawmaterial r ON r.rawmatid = igm.rawmatid
                    LEFT JOIN Invent_SubcontractorAddn sa ON sa.AF_ID = s.SubconId
                    WHERE ig.LocationID = 1
                      AND r.GrnTypeId NOT IN (78, 192, 84, 176, 124)
                      AND im.Mindate <= @endOfTo
                      AND sa.SUBCON_TYPE = 'Machinig '
                    GROUP BY r.RawMatID, r.rawmatcode
                ) SUb
                GROUP BY rawmatcode, RawMatID
            ) SUBMC ON SUBMC.RawMatCode = p.ItemCode
            LEFT JOIN (
                SELECT RawMatID, RawMatCode, SUM(stock) AS FetStock
                FROM (
                    SELECT r.RawMatID, r.rawmatcode,
                        SUM(CASE WHEN imm.avlstockqty = -1 THEN imm.qty ELSE imm.avlstockqty END) AS Stock
                    FROM invent_minmaterial imm
                    INNER JOIN invent_min im ON im.minno = imm.minno
                    INNER JOIN invent_grnmaterialdetail igm ON igm.grnid = imm.grnid
                    INNER JOIN invent_Grn ig ON ig.grnno = igm.grnno
                    INNER JOIN subcontractor s ON s.subconid = im.vendorid
                    INNER JOIN rawmaterial r ON r.rawmatid = igm.rawmatid
                    LEFT JOIN Invent_SubcontractorAddn sa ON sa.AF_ID = s.SubconId
                    WHERE ig.LocationID = 1
                      AND r.GrnTypeId NOT IN (78, 192, 84, 176, 124)
                      AND im.Mindate <= @endOfTo
                      AND sa.SUBCON_TYPE = 'Fettling '
                    GROUP BY r.RawMatID, r.rawmatcode
                ) SUb
                GROUP BY rawmatcode, RawMatID
            ) SUbFet ON SUbFet.RawMatCode = p.ItemCode
            WHERE p.PlanDate >= @fromDate AND p.PlanDate <= @toDate
              AND ${partFilter}
            ORDER BY p.CustName ASC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('SQL Error:', err.message);
        logger.error('SQL Errors:', err.precedingErrors);
        logger.error('Error fetching planning report:', err);
        res.status(500).json({ error: 'Failed to fetch planning report' });
    }
});

// ==================== BOXES CALCULATION REPORT ====================

// GET /boxes-calculation - Get boxes calculation summary by pattern (from Planning Schedule Qty / PPC)
router.get('/boxes-calculation', async (req, res) => {
    const { fromDate, toDate, patternNo } = req.query;

    if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    try {
        const request = new sql.Request(req.db);
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setUTCHours(23, 59, 59, 990);
        
        request.input('fromDate', sql.DateTime, fromDateObj);
        request.input('toDate', sql.DateTime, toDateObj);

        let patternFilter = '';
        if (patternNo && patternNo.trim() !== '' && patternNo !== 'ALL') {
            request.input('patternNo', sql.NVarChar, patternNo.trim());
            patternFilter = 'AND pm.PatternNo = @patternNo';
        }

        const query = `
            SELECT 
                pm.PatternNo,
                ISNULL(ppc.CustName, c.CustName) AS CustomerName,
                ISNULL(ir.Moulding_Box_Size, pm.Moulding_Box_Size) AS MouldBoxSize,
                ISNULL(pm.Box_Per_Heat, 0) AS BoxPerHeat,
                SUM(CAST(ppc.SQty AS INT)) AS ScheduleQty,
                ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(pcm.Qty, 1)) AS Cavity,
                CASE 
                    WHEN ISNULL(pm.Box_Per_Heat, 0) = 0 OR ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(pcm.Qty, 1)) = 0 THEN 0
                    ELSE CEILING(
                        CAST(SUM(CAST(ppc.SQty AS INT)) AS FLOAT) 
                        / (ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(pcm.Qty, 1)) * ISNULL(pm.Box_Per_Heat, 1))
                    )
                END AS NoOfHeats,
                CASE 
                    WHEN ISNULL(pm.Box_Per_Heat, 0) = 0 OR ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(pcm.Qty, 1)) = 0 THEN 0
                    ELSE CEILING(
                        CAST(SUM(CAST(ppc.SQty AS INT)) AS FLOAT) 
                        / (ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(pcm.Qty, 1)) * ISNULL(pm.Box_Per_Heat, 1))
                    ) * ISNULL(pm.Box_Per_Heat, 0)
                END AS TotalBoxes
            FROM PPC ppc
            INNER JOIN RawMaterial rm ON rm.RawMatCode = ppc.ItemCode
            INNER JOIN Product p ON p.RawMatID = rm.RawMatID
            LEFT JOIN (
                SELECT PartNo, PatternId, Qty,
                    ROW_NUMBER() OVER (PARTITION BY PartNo ORDER BY PatternId) AS rn
                FROM PatternCavityMaster
            ) pcm ON p.ProdId = pcm.PartNo AND pcm.rn = 1
            LEFT JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN (
                SELECT Af_ID, Moulding_Box_Size, No_Of_Cavities,
                    ROW_NUMBER() OVER (PARTITION BY Af_ID ORDER BY Af_ID) AS rn
                FROM Invent_Rawmaterial
            ) ir ON ir.Af_ID = rm.RawMatID AND ir.rn = 1
            WHERE ppc.PlanDate >= @fromDate AND ppc.PlanDate <= @toDate
            ${patternFilter}
            GROUP BY pm.PatternId, pm.PatternNo, ppc.CustName, c.CustName, 
                     ISNULL(ir.Moulding_Box_Size, pm.Moulding_Box_Size), pm.Box_Per_Heat, ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(pcm.Qty, 1))
            ORDER BY pm.PatternNo
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('SQL Error:', err.message);
        logger.error('Error fetching boxes calculation report:', err);
        res.status(500).json({ error: 'Failed to fetch boxes calculation report' });
    }
});

// ==================== CORE CALCULATION REPORT ====================

// GET /core-calculation - Get core calculation summary by pattern (from Planning Schedule Qty / PPC)
router.get('/core-calculation', async (req, res) => {
    const { fromDate, toDate, patternNo } = req.query;

    if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    try {
        const request = new sql.Request(req.db);
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setUTCHours(23, 59, 59, 990);
        
        request.input('fromDate', sql.DateTime, fromDateObj);
        request.input('toDate', sql.DateTime, toDateObj);

        let patternFilter = '';
        if (patternNo && patternNo.trim() !== '' && patternNo !== 'ALL') {
            request.input('patternNo', sql.NVarChar, patternNo.trim());
            patternFilter = 'AND pm.PatternNo = @patternNo';
        }

        const query = `
            SELECT 
                pm.PatternNo,
                ISNULL(ppc.CustName, c.CustName) AS CustomerName,
                CAST(pcm.PartNo AS VARCHAR) AS PartNo,
                ISNULL(p2.ProdName, pcm.ProductName) AS PartName,
                ISNULL(pm.Core_Type, '') AS CoreType,
                ISNULL(pm.shell_qty, 0) + ISNULL(pm.coldBox_qty, 0) + ISNULL(pm.noBake_qty, 0) AS TotalNoOfCore,
                ISNULL(pm.shell_qty, 0) AS ShellQty,
                ISNULL(pm.coldBox_qty, 0) AS ColdBoxQty,
                ISNULL(pm.noBake_qty, 0) AS NoBakeQty,
                SUM(CAST(ppc.SQty AS INT)) AS ProductionQty,
                CAST(ISNULL(pm.Core_Wt, 0) AS FLOAT) AS CoreWeight,
                SUM(CAST(ppc.SQty AS INT)) * CAST(ISNULL(pm.Core_Wt, 0) AS FLOAT) AS TotalCoreWeight
            FROM PPC ppc
            INNER JOIN RawMaterial rm ON rm.RawMatCode = ppc.ItemCode
            INNER JOIN Product p ON p.RawMatID = rm.RawMatID
            LEFT JOIN (
                SELECT PartNo, PatternId, Qty, ProductName,
                    ROW_NUMBER() OVER (PARTITION BY PartNo ORDER BY PatternId) AS rn
                FROM PatternCavityMaster
            ) pcm ON p.ProdId = pcm.PartNo AND pcm.rn = 1
            LEFT JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN Product p2 ON pcm.PartNo = p2.ProdId
            WHERE ppc.PlanDate >= @fromDate AND ppc.PlanDate <= @toDate
            ${patternFilter}
            GROUP BY pm.PatternId, pm.PatternNo, ppc.CustName, c.CustName, 
                     pcm.PartNo, p2.ProdName, pcm.ProductName, 
                     pm.Core_Type,
                     pm.shell_qty, pm.coldBox_qty, pm.noBake_qty,
                     pm.Core_Wt
            ORDER BY pm.PatternNo, pcm.PartNo
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('SQL Error:', err.message);
        logger.error('Error fetching core calculation report:', err);
        res.status(500).json({ error: 'Failed to fetch core calculation report' });
    }
});

// ==================== SLEEVE CALCULATION REPORT ====================

// GET /sleeve-calculation - Get sleeve calculation summary by pattern (from Planning Schedule Qty / PPC)
router.get('/sleeve-calculation', async (req, res) => {
    const { fromDate, toDate, patternNo } = req.query;

    if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    try {
        const request = new sql.Request(req.db);
        const fromDateObj = new Date(fromDate);
        const toDateObj = new Date(toDate);
        toDateObj.setUTCHours(23, 59, 59, 990);
        
        request.input('fromDate', sql.DateTime, fromDateObj);
        request.input('toDate', sql.DateTime, toDateObj);

        let patternFilter = '';
        if (patternNo && patternNo.trim() !== '' && patternNo !== 'ALL') {
            request.input('patternNo', sql.NVarChar, patternNo.trim());
            patternFilter = 'AND pm.PatternNo = @patternNo';
        }

        const query = `
            SELECT 
                pm.PatternNo,
                ISNULL(ppc.CustName, c.CustName) AS CustomerName,
                CAST(pcm.PartNo AS VARCHAR) AS PartNo,
                ISNULL(p2.ProdName, pcm.ProductName) AS PartName,
                sm.sleeve_name AS SleeveType,
                ISNULL(rmSleeve.RawMatName, sm.sleeve_type_size) AS SleeveSize,
                ISNULL(NULLIF(ir.No_Of_Sleeves, 0), ISNULL(sm.quantity, 0)) AS SleeveCount,
                CEILING(
                    CAST(SUM(CAST(ppc.SQty AS INT)) AS FLOAT) 
                    / ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(NULLIF(pcm.Qty, 0), 1))
                ) * ISNULL(NULLIF(ir.No_Of_Sleeves, 0), ISNULL(sm.quantity, 0)) AS TotalSleeves,
                CEILING(
                    CAST(SUM(CAST(ppc.SQty AS INT)) AS FLOAT) 
                    / (ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(NULLIF(pcm.Qty, 0), 1)) * ISNULL(NULLIF(pm.Box_Per_Heat, 0), 1))
                ) AS NoOfHeats,
                SUM(CAST(ppc.SQty AS INT)) AS ProductionQty
            FROM PPC ppc
            INNER JOIN RawMaterial rm ON rm.RawMatCode = ppc.ItemCode
            INNER JOIN Product p ON p.RawMatID = rm.RawMatID
            LEFT JOIN (
                SELECT PartNo, PatternId, Qty, ProductName,
                    ROW_NUMBER() OVER (PARTITION BY PartNo ORDER BY PatternId) AS rn
                FROM PatternCavityMaster
            ) pcm ON p.ProdId = pcm.PartNo AND pcm.rn = 1
            LEFT JOIN PatternMaster pm ON pcm.PatternId = pm.PatternId
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN Product p2 ON pcm.PartNo = p2.ProdId
            LEFT JOIN SleeveMaster sm ON pm.PatternId = sm.PatternId
            LEFT JOIN (
                SELECT Af_ID, No_Of_Cavities, No_Of_Sleeves,
                    ROW_NUMBER() OVER (PARTITION BY Af_ID ORDER BY Af_ID) AS rn
                FROM Invent_Rawmaterial
            ) ir ON ir.Af_ID = rm.RawMatID AND ir.rn = 1
            LEFT JOIN RawMaterial rmSleeve ON 
                CASE 
                    WHEN sm.sleeve_type_size IS NOT NULL AND sm.sleeve_type_size != '' AND ISNUMERIC(sm.sleeve_type_size) = 1 
                    THEN CAST(sm.sleeve_type_size AS INT) 
                    ELSE NULL 
                END = rmSleeve.RawMatID
            WHERE ppc.PlanDate >= @fromDate AND ppc.PlanDate <= @toDate
            ${patternFilter}
            GROUP BY pm.PatternId, pm.PatternNo, ppc.CustName, c.CustName, 
                     pcm.PartNo, p2.ProdName, pcm.ProductName, ISNULL(NULLIF(ir.No_Of_Cavities, 0), ISNULL(NULLIF(pcm.Qty, 0), 1)),
                     sm.sleeve_name, sm.sleeve_type_size, rmSleeve.RawMatName, ISNULL(NULLIF(ir.No_Of_Sleeves, 0), ISNULL(sm.quantity, 0)), pm.Box_Per_Heat
            HAVING sm.sleeve_name IS NOT NULL AND sm.sleeve_name <> ''
            ORDER BY pm.PatternNo, sm.sleeve_name
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('SQL Error:', err.message);
        logger.error('Error fetching sleeve calculation report:', err);
        res.status(500).json({ error: 'Failed to fetch sleeve calculation report' });
    }
});

module.exports = router;
