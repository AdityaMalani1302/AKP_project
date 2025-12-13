const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const multer = require('multer');
const ExcelJS = require('exceljs');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// GET /lab-master - Get all lab master records
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                LabMasterId,
                Customer, DrgNo, Description, Grade, PartWeight,
                MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
                C, Si, Mn, P, S,
                Cr, Cu, Mg_Chem, CE,
                CRCA, RR, PIG, MS, Mg_Mix,
                RegularCritical, LastBoxTemp, Remarks,
                CreatedAt, UpdatedAt
            FROM LabMaster
        `;

        if (search) {
            query += ` WHERE 
                Customer LIKE '%${search}%' OR 
                DrgNo LIKE '%${search}%' OR 
                Grade LIKE '%${search}%' OR
                Description LIKE '%${search}%'
            `;
        }

        query += ' ORDER BY LabMasterId ASC';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching lab master records:', err);
        res.status(500).json({ error: 'Failed to fetch lab master records' });
    }
});

// GET /lab-master/:id - Get single lab master record
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM LabMaster WHERE LabMasterId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Lab master record not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching lab master record:', err);
        res.status(500).json({ error: 'Failed to fetch lab master record' });
    }
});

// POST /lab-master - Create new lab master record
router.post('/', async (req, res) => {
    const {
        // Details
        Customer, DrgNo, Description, Grade, PartWeight,
        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
        // Final Chemistry
        C, Si, Mn, P, S,
        Cr, Cu, Mg_Chem, CE,
        // Charge Mix
        CRCA, RR, PIG, MS, Mg_Mix,
        // Others
        RegularCritical, LastBoxTemp, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);

        // Details inputs
        request.input('Customer', sql.NVarChar(255), Customer || null);
        request.input('DrgNo', sql.NVarChar(100), DrgNo || null);
        request.input('Description', sql.NVarChar(500), Description || null);
        request.input('Grade', sql.NVarChar(100), Grade || null);
        request.input('PartWeight', sql.NVarChar(100), PartWeight || null);
        request.input('MinMaxThickness', sql.NVarChar(100), MinMaxThickness || null);
        request.input('ThicknessGroup', sql.NVarChar(100), ThicknessGroup || null);
        request.input('BaseChe_C', sql.NVarChar(50), BaseChe_C || null);
        request.input('BaseChe_Si', sql.NVarChar(50), BaseChe_Si || null);

        // Final Chemistry inputs
        request.input('C', sql.NVarChar(50), C || null);
        request.input('Si', sql.NVarChar(50), Si || null);
        request.input('Mn', sql.NVarChar(50), Mn || null);
        request.input('P', sql.NVarChar(50), P || null);
        request.input('S', sql.NVarChar(50), S || null);
        request.input('Cr', sql.NVarChar(50), Cr || null);
        request.input('Cu', sql.NVarChar(50), Cu || null);
        request.input('Mg_Chem', sql.NVarChar(50), Mg_Chem || null);
        request.input('CE', sql.NVarChar(50), CE || null);

        // Charge Mix inputs
        request.input('CRCA', sql.NVarChar(100), CRCA || null);
        request.input('RR', sql.NVarChar(100), RR || null);
        request.input('PIG', sql.NVarChar(100), PIG || null);
        request.input('MS', sql.NVarChar(100), MS || null);
        request.input('Mg_Mix', sql.NVarChar(100), Mg_Mix || null);

        // Others inputs
        request.input('RegularCritical', sql.NVarChar(50), RegularCritical || null);
        request.input('LastBoxTemp', sql.NVarChar(100), LastBoxTemp || null);
        request.input('Remarks', sql.NVarChar(2000), Remarks || null);

        const result = await request.query`
            INSERT INTO LabMaster (
                Customer, DrgNo, Description, Grade, PartWeight,
                MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
                C, Si, Mn, P, S,
                Cr, Cu, Mg_Chem, CE,
                CRCA, RR, PIG, MS, Mg_Mix,
                RegularCritical, LastBoxTemp, Remarks
            )
            OUTPUT INSERTED.LabMasterId
            VALUES (
                @Customer, @DrgNo, @Description, @Grade, @PartWeight,
                @MinMaxThickness, @ThicknessGroup, @BaseChe_C, @BaseChe_Si,
                @C, @Si, @Mn, @P, @S,
                @Cr, @Cu, @Mg_Chem, @CE,
                @CRCA, @RR, @PIG, @MS, @Mg_Mix,
                @RegularCritical, @LastBoxTemp, @Remarks
            )
        `;

        const newId = result.recordset[0].LabMasterId;
        res.json({
            success: true,
            message: 'Lab master record added successfully',
            id: newId
        });
    } catch (err) {
        console.error('Error adding lab master record:', err);
        res.status(500).json({ error: 'Failed to add lab master record' });
    }
});

// PUT /lab-master/:id - Update existing lab master record
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        Customer, DrgNo, Description, Grade, PartWeight,
        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
        C, Si, Mn, P, S,
        Cr, Cu, Mg_Chem, CE,
        CRCA, RR, PIG, MS, Mg_Mix,
        RegularCritical, LastBoxTemp, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        // Details inputs
        request.input('Customer', sql.NVarChar(255), Customer || null);
        request.input('DrgNo', sql.NVarChar(100), DrgNo || null);
        request.input('Description', sql.NVarChar(500), Description || null);
        request.input('Grade', sql.NVarChar(100), Grade || null);
        request.input('PartWeight', sql.NVarChar(100), PartWeight || null);
        request.input('MinMaxThickness', sql.NVarChar(100), MinMaxThickness || null);
        request.input('ThicknessGroup', sql.NVarChar(100), ThicknessGroup || null);
        request.input('BaseChe_C', sql.NVarChar(50), BaseChe_C || null);
        request.input('BaseChe_Si', sql.NVarChar(50), BaseChe_Si || null);

        // Final Chemistry inputs
        request.input('C', sql.NVarChar(50), C || null);
        request.input('Si', sql.NVarChar(50), Si || null);
        request.input('Mn', sql.NVarChar(50), Mn || null);
        request.input('P', sql.NVarChar(50), P || null);
        request.input('S', sql.NVarChar(50), S || null);
        request.input('Cr', sql.NVarChar(50), Cr || null);
        request.input('Cu', sql.NVarChar(50), Cu || null);
        request.input('Mg_Chem', sql.NVarChar(50), Mg_Chem || null);
        request.input('CE', sql.NVarChar(50), CE || null);

        // Charge Mix inputs
        request.input('CRCA', sql.NVarChar(100), CRCA || null);
        request.input('RR', sql.NVarChar(100), RR || null);
        request.input('PIG', sql.NVarChar(100), PIG || null);
        request.input('MS', sql.NVarChar(100), MS || null);
        request.input('Mg_Mix', sql.NVarChar(100), Mg_Mix || null);

        // Others inputs
        request.input('RegularCritical', sql.NVarChar(50), RegularCritical || null);
        request.input('LastBoxTemp', sql.NVarChar(100), LastBoxTemp || null);
        request.input('Remarks', sql.NVarChar(2000), Remarks || null);


        const result = await request.query`
            UPDATE LabMaster
            SET Customer = @Customer,
                DrgNo = @DrgNo,
                Description = @Description,
                Grade = @Grade,
                PartWeight = @PartWeight,
                MinMaxThickness = @MinMaxThickness,
                ThicknessGroup = @ThicknessGroup,
                BaseChe_C = @BaseChe_C,
                BaseChe_Si = @BaseChe_Si,
                C = @C,
                Si = @Si,
                Mn = @Mn,
                P = @P,
                S = @S,
                Cr = @Cr,
                Cu = @Cu,
                Mg_Chem = @Mg_Chem,
                CE = @CE,
                CRCA = @CRCA,
                RR = @RR,
                PIG = @PIG,
                MS = @MS,
                Mg_Mix = @Mg_Mix,
                RegularCritical = @RegularCritical,
                LastBoxTemp = @LastBoxTemp,
                Remarks = @Remarks,
                UpdatedAt = SYSDATETIME()
            WHERE LabMasterId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Lab master record not found' });
        }

        res.json({ success: true, message: 'Lab master record updated successfully' });
    } catch (err) {
        console.error('Error updating lab master record:', err);
        res.status(500).json({ error: 'Failed to update lab master record' });
    }
});

// DELETE /lab-master/:id - Delete lab master record
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM LabMaster WHERE LabMasterId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Lab master record not found' });
        }

        res.json({ success: true, message: 'Lab master record deleted successfully' });
    } catch (err) {
        console.error('Error deleting lab master record:', err);
        res.status(500).json({ error: 'Failed to delete lab master record' });
    }
});

// POST /lab-master/import-excel - Import lab master records from Excel
router.post('/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse the Excel file from buffer using ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        // Get headers from second row (since first row has grouped headers)
        const headerRow = worksheet.getRow(2);
        const headers = {};
        headerRow.eachCell((cell, colNumber) => {
            // Clean the header value (remove extra spaces, handle newlines)
            let value = cell.value ? String(cell.value).trim() : '';
            // Basic cleanup to match variations
            value = value.replace(/\s+/g, ' '); 
            headers[colNumber] = value;
        });

        console.log('Detected Headers:', headers); // Debug log

        let successCount = 0;
        let errorCount = 0;
        const errors = [];



        // Column name mapping (Excel header -> Database field)
        const columnMap = {
            'No': null, // Skip ID column if present
            'Customer': 'Customer',
            'Drg. No': 'DrgNo',
            'Drg No': 'DrgNo',
            'Description': 'Description',
            'Grade': 'Grade',
            'Part Weight': 'PartWeight',
            'Min-Max Thickness': 'MinMaxThickness',
            'Thickness Group': 'ThicknessGroup',
            
            // Base Chemistry - Handle variations in spacing
            'BASE CHEMISTRY C %': 'BaseChe_C',
            'BASE CHEMISTRY Si %': 'BaseChe_Si',
            'BASE CHEMISTRY C%': 'BaseChe_C',
            'BASE CHEMISTRY Si%': 'BaseChe_Si',

            // Final Control Chemistry
            'C %': 'C',
            'Si %': 'Si',
            'Mn %': 'Mn',
            'P %': 'P',
            'S %': 'S',
            'Cr %': 'Cr',
            'Cu %': 'Cu',
            'Mg %': 'Mg_Chem', // Critical: Mg % -> Mg_Chem
            'CE %': 'CE',

            // Charge Mix - Kgs
            'CRCA': 'CRCA',
            'RR': 'RR',
            'PIG': 'PIG',
            'MS': 'MS',
            'Mg': 'Mg_Mix',    // Critical: Plain Mg -> Mg_Mix
            
            // Others
            'Regular / Critical': 'RegularCritical',
            'Last Box Temp': 'LastBoxTemp',
            'Remarks': 'Remarks'
        };

        // Build column index to db field mapping
        const columnIndexToField = {};
        
        // FIRST: Hardcode Base Chemistry columns by position (columns 9 and 10)
        // since they have the same names as Final Chemistry but are in Row 1 merged cell
        columnIndexToField['9'] = 'BaseChe_C';
        columnIndexToField['10'] = 'BaseChe_Si';
        
        for (const [colNumber, header] of Object.entries(headers)) {
            // Skip columns 9 and 10 - already mapped to Base Chemistry
            if (colNumber === '9' || colNumber === '10') continue;
            
            // Try direct match
            let dbField = columnMap[header];
            
            if (dbField) {
                columnIndexToField[colNumber] = dbField;
            }
        }

        // Helper function to get cell value as string
        const getCellValue = (cell) => {
            if (!cell || cell.value === null || cell.value === undefined) return null;
            // Handle rich text
            if (typeof cell.value === 'object' && cell.value.richText) {
                return cell.value.richText.map(r => r.text).join('');
            }
            return String(cell.value);
        };

        // Helper function to get mapped value from row
        const getMappedValue = (row, dbField) => {
            for (const [colNumber, field] of Object.entries(columnIndexToField)) {
                if (field === dbField) {
                    return getCellValue(row.getCell(parseInt(colNumber)));
                }
            }
            return null;
        };

        // Process each row (starting from row 3, skipping 2 header rows)
        for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            // Skip empty rows
            if (row.cellCount === 0) continue;
            try {
                const request = new sql.Request(req.db);

                // Map Excel columns to database fields
                request.input('Customer', sql.NVarChar(255), getMappedValue(row, 'Customer'));
                request.input('DrgNo', sql.NVarChar(100), getMappedValue(row, 'DrgNo'));
                request.input('Description', sql.NVarChar(500), getMappedValue(row, 'Description'));
                request.input('Grade', sql.NVarChar(100), getMappedValue(row, 'Grade'));
                request.input('PartWeight', sql.NVarChar(100), getMappedValue(row, 'PartWeight'));
                request.input('MinMaxThickness', sql.NVarChar(100), getMappedValue(row, 'MinMaxThickness'));
                request.input('ThicknessGroup', sql.NVarChar(100), getMappedValue(row, 'ThicknessGroup'));
                request.input('BaseChe_C', sql.NVarChar(50), getMappedValue(row, 'BaseChe_C'));
                request.input('BaseChe_Si', sql.NVarChar(50), getMappedValue(row, 'BaseChe_Si'));
                request.input('C', sql.NVarChar(50), getMappedValue(row, 'C'));
                request.input('Si', sql.NVarChar(50), getMappedValue(row, 'Si'));
                request.input('Mn', sql.NVarChar(50), getMappedValue(row, 'Mn'));
                request.input('P', sql.NVarChar(50), getMappedValue(row, 'P'));
                request.input('S', sql.NVarChar(50), getMappedValue(row, 'S'));
                request.input('Cr', sql.NVarChar(50), getMappedValue(row, 'Cr'));
                request.input('Cu', sql.NVarChar(50), getMappedValue(row, 'Cu'));
                request.input('Mg_Chem', sql.NVarChar(50), getMappedValue(row, 'Mg_Chem'));
                request.input('CE', sql.NVarChar(50), getMappedValue(row, 'CE'));
                request.input('CRCA', sql.NVarChar(100), getMappedValue(row, 'CRCA'));
                request.input('RR', sql.NVarChar(100), getMappedValue(row, 'RR'));
                request.input('PIG', sql.NVarChar(100), getMappedValue(row, 'PIG'));
                request.input('MS', sql.NVarChar(100), getMappedValue(row, 'MS'));
                request.input('Mg_Mix', sql.NVarChar(100), getMappedValue(row, 'Mg_Mix'));
                request.input('RegularCritical', sql.NVarChar(50), getMappedValue(row, 'RegularCritical'));
                request.input('LastBoxTemp', sql.NVarChar(100), getMappedValue(row, 'LastBoxTemp'));
                request.input('Remarks', sql.NVarChar(2000), getMappedValue(row, 'Remarks'));

                await request.query`
                    INSERT INTO LabMaster (
                        Customer, DrgNo, Description, Grade, PartWeight,
                        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
                        C, Si, Mn, P, S,
                        Cr, Cu, Mg_Chem, CE,
                        CRCA, RR, PIG, MS, Mg_Mix,
                        RegularCritical, LastBoxTemp, Remarks
                    )
                    VALUES (
                        @Customer, @DrgNo, @Description, @Grade, @PartWeight,
                        @MinMaxThickness, @ThicknessGroup, @BaseChe_C, @BaseChe_Si,
                        @C, @Si, @Mn, @P, @S,
                        @Cr, @Cu, @Mg_Chem, @CE,
                        @CRCA, @RR, @PIG, @MS, @Mg_Mix,
                        @RegularCritical, @LastBoxTemp, @Remarks
                    )
                `;
                successCount++;
            } catch (rowErr) {
                errorCount++;
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
            }
        }

        res.json({
            success: true,
            message: `Import completed. ${successCount} records imported successfully.`,
            successCount,
            errorCount,
            errors: errors.slice(0, 10) // Return first 10 errors only
        });
    } catch (err) {
        console.error('Error importing Excel file:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

module.exports = router;
