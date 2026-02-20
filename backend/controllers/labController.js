/**
 * Lab Master Controller
 * Handles all business logic for Lab Master operations.
 */

const { sql } = require('../config/db');
const logger = require('../utils/logger');

// Excel Import Helpers
const ExcelJS = require('exceljs');

/**
 * Parses Excel file from request
 * @param {Object} file - Multer file object
 * @returns {Promise<{workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet}>}
 */
const parseExcelFile = async (file) => {
    if (!file) {
        throw new Error('No file uploaded');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
        throw new Error('Excel file is empty or has no data rows');
    }

    return { workbook, worksheet };
};

/**
 * Extracts and cleans headers from Excel worksheet
 * @param {ExcelJS.Worksheet} worksheet
 * @returns {Object} - Column index to header name mapping
 */
const extractHeaders = (worksheet) => {
    const headerRow = worksheet.getRow(2);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
        let value = cell.value ? String(cell.value).trim() : '';
        value = value.replace(/\s+/g, ' ');
        headers[colNumber] = value;
    });
    return headers;
};

/**
 * Column mapping configuration for Lab Master Excel import
 */
const LAB_COLUMN_MAP = {
    'No': null,
    'Customer': 'Customer',
    'Drg. No': 'DrgNo',
    'Drg No': 'DrgNo',
    'Description': 'Description',
    'Grade': 'Grade',
    'Part Weight': 'PartWeight',
    'Min-Max Thickness': 'MinMaxThickness',
    'Thickness Group': 'ThicknessGroup',
    'BASE CHEMISTRY C %': 'BaseChe_C',
    'BASE CHEMISTRY Si %': 'BaseChe_Si',
    'BASE CHEMISTRY C%': 'BaseChe_C',
    'BASE CHEMISTRY Si%': 'BaseChe_Si',
    'C %': 'C',
    'Si %': 'Si',
    'Mn %': 'Mn',
    'P %': 'P',
    'S %': 'S',
    'Cr %': 'Cr',
    'Cu %': 'Cu',
    'Mg %': 'Mg_Chem',
    'CE %': 'CE',
    'Nickel %': 'Nickel',
    'Moly %': 'Moly',
    'CRCA': 'CRCA',
    'RR': 'RR',
    'PIG': 'PIG',
    'MS': 'MS',
    'Mg': 'Mg_Mix',
    'Regular / Critical': 'RegularCritical',
    'Last Box Temp': 'LastBoxTemp',
    'Remarks': 'Remarks'
};

/**
 * Builds column index to database field mapping
 * @param {Object} headers - Headers from extractHeaders
 * @returns {Object} - Column index to DB field mapping
 */
const buildColumnMapping = (headers) => {
    const columnIndexToField = {
        '9': 'BaseChe_C',
        '10': 'BaseChe_Si'
    };

    for (const [colNumber, header] of Object.entries(headers)) {
        if (colNumber === '9' || colNumber === '10') continue;
        const dbField = LAB_COLUMN_MAP[header];
        if (dbField) {
            columnIndexToField[colNumber] = dbField;
        }
    }

    return columnIndexToField;
};

/**
 * Gets cell value as string
 * @param {ExcelJS.Cell} cell
 * @returns {string|null}
 */
const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    if (typeof cell.value === 'object' && cell.value.richText) {
        return cell.value.richText.map(r => r.text).join('');
    }
    return String(cell.value);
};

/**
 * Gets mapped value from row
 * @param {ExcelJS.Row} row
 * @param {Object} columnMap
 * @param {string} dbField
 * @returns {string|null}
 */
const getMappedValue = (row, columnMap, dbField) => {
    for (const [colNumber, field] of Object.entries(columnMap)) {
        if (field === dbField) {
            return getCellValue(row.getCell(parseInt(colNumber)));
        }
    }
    return null;
};

/**
 * Checks if lab record already exists
 * @param {Object} db - Database connection
 * @param {string} drgNo
 * @param {string} customer
 * @param {string} grade
 * @returns {Promise<boolean>}
 */
const checkDuplicateLabRecord = async (db, drgNo, customer, grade) => {
    const normalizedDrgNo = drgNo.replace(/[-\s]/g, '');
    const checkRequest = new sql.Request(db);
    checkRequest.input('NormalizedDrgNo', sql.NVarChar(100), normalizedDrgNo);
    checkRequest.input('Customer', sql.NVarChar(255), customer || '');
    checkRequest.input('Grade', sql.NVarChar(100), grade || '');

    const existingCheck = await checkRequest.query`
        SELECT LabMasterId FROM LabMaster 
        WHERE REPLACE(REPLACE(DrgNo, '-', ''), ' ', '') = @NormalizedDrgNo 
        AND Customer = @Customer AND Grade = @Grade
    `;

    return existingCheck.recordset.length > 0;
};

/**
 * Inserts a single lab master record
 * @param {Object} db - Database connection
 * @param {Object} rowData - Row data object
 * @returns {Promise<void>}
 */
const insertLabRecord = async (db, rowData) => {
    const request = new sql.Request(db);
    
    const fields = [
        'Customer', 'DrgNo', 'Description', 'Grade', 'PartWeight',
        'MinMaxThickness', 'ThicknessGroup', 'BaseChe_C', 'BaseChe_Si',
        'C', 'Si', 'Mn', 'P', 'S',
        'Cr', 'Cu', 'Mg_Chem', 'CE', 'Nickel', 'Moly',
        'CRCA', 'RR', 'PIG', 'MS', 'Mg_Mix',
        'RegularCritical', 'LastBoxTemp', 'Remarks'
    ];

    fields.forEach(field => {
        const maxLength = field === 'Remarks' ? 2000 : 
                         ['Customer', 'Description'].includes(field) ? 500 :
                         ['CRCA', 'RR', 'PIG', 'MS', 'Mg_Mix'].includes(field) ? 100 : 50;
        request.input(field, sql.NVarChar(maxLength), rowData[field] || null);
    });

    await request.query`
        INSERT INTO LabMaster (
            Customer, DrgNo, Description, Grade, PartWeight,
            MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
            C, Si, Mn, P, S,
            Cr, Cu, Mg_Chem, CE, Nickel, Moly,
            CRCA, RR, PIG, MS, Mg_Mix,
            RegularCritical, LastBoxTemp, Remarks
        )
        VALUES (
            @Customer, @DrgNo, @Description, @Grade, @PartWeight,
            @MinMaxThickness, @ThicknessGroup, @BaseChe_C, @BaseChe_Si,
            @C, @Si, @Mn, @P, @S,
            @Cr, @Cu, @Mg_Chem, @CE, @Nickel, @Moly,
            @CRCA, @RR, @PIG, @MS, @Mg_Mix,
            @RegularCritical, @LastBoxTemp, @Remarks
        )
    `;
};

/**
 * Processes a single Excel row
 * @param {Object} db - Database connection
 * @param {ExcelJS.Row} row
 * @param {Object} columnMap
 * @param {number} rowNumber
 * @returns {Promise<{success: boolean, error?: string, skipped?: boolean}>}
 */
const processLabRow = async (db, row, columnMap, rowNumber) => {
    try {
        const drgNo = getMappedValue(row, columnMap, 'DrgNo');
        const customer = getMappedValue(row, columnMap, 'Customer');
        const grade = getMappedValue(row, columnMap, 'Grade');

        if (!drgNo || drgNo.trim() === '') {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Missing DrgNo` };
        }

        const isDuplicate = await checkDuplicateLabRecord(db, drgNo, customer, grade);
        if (isDuplicate) {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Duplicate (DrgNo: ${drgNo})` };
        }

        const rowData = {
            Customer: customer,
            DrgNo: drgNo,
            Description: getMappedValue(row, columnMap, 'Description'),
            Grade: grade,
            PartWeight: getMappedValue(row, columnMap, 'PartWeight'),
            MinMaxThickness: getMappedValue(row, columnMap, 'MinMaxThickness'),
            ThicknessGroup: getMappedValue(row, columnMap, 'ThicknessGroup'),
            BaseChe_C: getMappedValue(row, columnMap, 'BaseChe_C'),
            BaseChe_Si: getMappedValue(row, columnMap, 'BaseChe_Si'),
            C: getMappedValue(row, columnMap, 'C'),
            Si: getMappedValue(row, columnMap, 'Si'),
            Mn: getMappedValue(row, columnMap, 'Mn'),
            P: getMappedValue(row, columnMap, 'P'),
            S: getMappedValue(row, columnMap, 'S'),
            Cr: getMappedValue(row, columnMap, 'Cr'),
            Cu: getMappedValue(row, columnMap, 'Cu'),
            Mg_Chem: getMappedValue(row, columnMap, 'Mg_Chem'),
            CE: getMappedValue(row, columnMap, 'CE'),
            Nickel: getMappedValue(row, columnMap, 'Nickel'),
            Moly: getMappedValue(row, columnMap, 'Moly'),
            CRCA: getMappedValue(row, columnMap, 'CRCA'),
            RR: getMappedValue(row, columnMap, 'RR'),
            PIG: getMappedValue(row, columnMap, 'PIG'),
            MS: getMappedValue(row, columnMap, 'MS'),
            Mg_Mix: getMappedValue(row, columnMap, 'Mg_Mix'),
            RegularCritical: getMappedValue(row, columnMap, 'RegularCritical'),
            LastBoxTemp: getMappedValue(row, columnMap, 'LastBoxTemp'),
            Remarks: getMappedValue(row, columnMap, 'Remarks')
        };

        await insertLabRecord(db, rowData);
        return { success: true };
    } catch (err) {
        return { success: false, error: `Row ${rowNumber}: ${err.message}` };
    }
};

const labController = {

/**
 * Retrieves all lab master records with optional search filtering.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
getAllLabRecords: async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                LabMasterId,
                Customer, DrgNo, Description, Grade, PartWeight,
                MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
                C, Si, Mn, P, S,
                Cr, Cu, Mg_Chem, CE, Nickel, Moly,
                CRCA, RR, PIG, MS, Mg_Mix,
                RegularCritical, LastBoxTemp, Remarks,
                CreatedAt, UpdatedAt
            FROM LabMaster
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                Customer LIKE @search OR 
                DrgNo LIKE @search OR 
                Grade LIKE @search OR
                Description LIKE @search
            `;
        }

        query += ' ORDER BY LabMasterId ASC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching lab master records:', err);
        res.status(500).json({ error: 'Failed to fetch lab master records' });
    }
},

/**
 * Retrieves a single lab master record by ID.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
getLabRecordById: async (req, res) => {
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
        logger.error('Error fetching lab master record:', err);
        res.status(500).json({ error: 'Failed to fetch lab master record' });
    }
},

/**
 * Creates a new lab master record.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
createLabRecord: async (req, res) => {
    const {
        // Details
        Customer, DrgNo, Description, Grade, PartWeight,
        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
        // Final Chemistry
        C, Si, Mn, P, S,
        Cr, Cu, Mg_Chem, CE, Nickel, Moly,
        // Charge Mix
        CRCA, RR, PIG, MS, Mg_Mix,
        // Others
        RegularCritical, LastBoxTemp, Remarks
    } = req.body;

    try {
        // Check for duplicate DrgNo before inserting
        // Normalize by removing hyphens/dashes so "104-9409" and "1049409" are treated as same
        if (DrgNo && DrgNo.trim() !== '') {
            const normalizedDrgNo = DrgNo.replace(/[-\s]/g, ''); // Remove hyphens and spaces
            const checkRequest = new sql.Request(req.db);
            checkRequest.input('NormalizedDrgNo', sql.NVarChar(100), normalizedDrgNo);
            const existingCheck = await checkRequest.query`
                SELECT LabMasterId, DrgNo FROM LabMaster 
                WHERE REPLACE(REPLACE(DrgNo, '-', ''), ' ', '') = @NormalizedDrgNo
            `;
            if (existingCheck.recordset.length > 0) {
                const existingDrgNo = existingCheck.recordset[0].DrgNo;
                return res.status(400).json({ 
                    error: `Drawing No "${DrgNo}" already exists (matches existing "${existingDrgNo}"). Each entry must have a unique Drawing No.` 
                });
            }
        }

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
        request.input('Nickel', sql.NVarChar(50), Nickel || null);
        request.input('Moly', sql.NVarChar(50), Moly || null);

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
                Cr, Cu, Mg_Chem, CE, Nickel, Moly,
                CRCA, RR, PIG, MS, Mg_Mix,
                RegularCritical, LastBoxTemp, Remarks
            )
            OUTPUT INSERTED.LabMasterId
            VALUES (
                @Customer, @DrgNo, @Description, @Grade, @PartWeight,
                @MinMaxThickness, @ThicknessGroup, @BaseChe_C, @BaseChe_Si,
                @C, @Si, @Mn, @P, @S,
                @Cr, @Cu, @Mg_Chem, @CE, @Nickel, @Moly,
                @CRCA, @RR, @PIG, @MS, @Mg_Mix,
                @RegularCritical, @LastBoxTemp, @Remarks
            )
        `;

        const newId = result.recordset[0].LabMasterId;
        logger.info(`Lab master record created: ID ${newId}`);
        res.json({
            success: true,
            message: 'Lab master record added successfully',
            id: newId
        });
    } catch (err) {
        logger.error('Error adding lab master record:', err);
        res.status(500).json({ error: 'Failed to add lab master record' });
    }
},

/**
 * Updates an existing lab master record.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
updateLabRecord: async (req, res) => {
    const { id } = req.params;
    const {
        Customer, DrgNo, Description, Grade, PartWeight,
        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
        C, Si, Mn, P, S,
        Cr, Cu, Mg_Chem, CE, Nickel, Moly,
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
        request.input('Nickel', sql.NVarChar(50), Nickel || null);
        request.input('Moly', sql.NVarChar(50), Moly || null);

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
                Nickel = @Nickel,
                Moly = @Moly,
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

        logger.info(`Lab master record updated: ID ${id}`);
        res.json({ success: true, message: 'Lab master record updated successfully' });
    } catch (err) {
        logger.error('Error updating lab master record:', err);
        res.status(500).json({ error: 'Failed to update lab master record' });
    }
},

/**
 * Deletes a lab master record by ID.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
deleteLabRecord: async (req, res) => {
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

        logger.info(`Lab master record deleted: ID ${id}`);
        res.json({ success: true, message: 'Lab master record deleted successfully' });
    } catch (err) {
        logger.error('Error deleting lab master record:', err);
        res.status(500).json({ error: 'Failed to delete lab master record' });
    }
},

/**
 * Imports lab master records from an Excel file.
 * @param {import('express').Request} req - Express request object (with file in req.file).
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<void>}
 */
importExcel: async (req, res) => {
    try {
        // Step 1: Parse Excel file
        const { worksheet } = await parseExcelFile(req.file);
        
        // Step 2: Extract and map headers
        const headers = extractHeaders(worksheet);
        logger.info(`[Lab Import] Detected Headers: ${JSON.stringify(headers)}`);
        
        const columnMap = buildColumnMapping(headers);

        // Step 3: Process rows
        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        const errors = [];
        const skippedRows = [];

        for (let rowNumber = 3; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            if (row.cellCount === 0) continue;

            const result = await processLabRow(req.db, row, columnMap, rowNumber);
            
            if (result.success) {
                successCount++;
            } else if (result.skipped) {
                skippedCount++;
                skippedRows.push(result.error);
            } else {
                errorCount++;
                errors.push(result.error);
            }
        }

        // Step 4: Return results
        logger.info(`[Lab Import] Completed: ${successCount} imported, ${skippedCount} skipped, ${errorCount} errors`);
        res.json({
            success: true,
            message: `Import completed. ${successCount} new records imported, ${skippedCount} duplicates skipped.`,
            successCount,
            skippedCount,
            errorCount,
            errors: errors.slice(0, 10),
            skippedRows: skippedRows.slice(0, 10)
        });
    } catch (err) {
        logger.error('Error importing Excel file:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
}

};

module.exports = labController;
