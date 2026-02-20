/**
 * Drawing Master Controller
 * Handles all business logic for Drawing Master operations including file attachments.
 */

const { sql } = require('../config/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// Uploads directory for drawing attachments
const uploadsDir = path.join(__dirname, '../uploads/drawing-attachments');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Excel Import Helpers
const ExcelJS = require('exceljs');

/**
 * Parses Excel file from request
 * @param {Object} file - Multer file object
 * @returns {Promise<{workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet}>}
 */
const parseDrawingExcelFile = async (file) => {
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
const extractDrawingHeaders = (worksheet) => {
    const headerRow = worksheet.getRow(1);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
        let value = getCellValue(cell); // Use getCellValue to handle rich text headers
        if (value) {
            value = value.toLowerCase();
            // Normalize header: remove extra spaces, dots, etc.
            value = value.replace(/\s+/g, ' ').replace(/\./g, '');
            headers[colNumber] = value;
        }
    });
    return headers;
};

/**
 * Column mapping configuration for Drawing Master Excel import
 */
const DRAWING_COLUMN_MAP = {
    'no': 'No',
    'serial no': 'No',
    'serialno': 'No',
    'customer': 'Customer',
    // Drawing No variations
    'drg no': 'DrawingNo',
    'drgno': 'DrawingNo',
    'drawing no': 'DrawingNo',
    'drawingno': 'DrawingNo',
    // Rev No variations
    'rev no': 'RevNo',
    'revno': 'RevNo',
    'rev': 'RevNo',
    // Other fields
    'description': 'Description',
    'customer grade': 'CustomerGrade',
    'cusomer grade': 'CustomerGrade',
    'customergrade': 'CustomerGrade',
    'akp grade': 'AKPGrade',
    'akpgrade': 'AKPGrade',
    'remarks': 'Remarks',
    'comments': 'Comments'
};

/**
 * Builds column index to database field mapping
 * @param {Object} headers - Headers from extractDrawingHeaders
 * @returns {Object} - Column index to DB field mapping
 */
const buildDrawingColumnMapping = (headers) => {
    const columnIndexToField = {};
    for (const [colNumber, header] of Object.entries(headers)) {
        const dbField = DRAWING_COLUMN_MAP[header];
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
    const val = cell.value;

    // Handle rich text
    if (typeof val === 'object' && val.richText) {
        return val.richText.map(r => r.text).join('').trim();
    }
    // Handle hyperlinks
    if (typeof val === 'object' && val.text) {
        return String(val.text).trim();
    }
    // Handle formulas
    if (typeof val === 'object' && val.result !== undefined) {
        return String(val.result).trim();
    }
    // Handle generic objects (failsafe for [object Object])
    if (typeof val === 'object') {
        const str = val.toString();
        return str === '[object Object]' ? '' : str.trim();
    }
    return String(val).trim();
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
 * Checks if drawing record already exists
 * @param {Object} db - Database connection
 * @param {string} drawingNo
 * @returns {Promise<boolean>}
 */
const checkDuplicateDrawing = async (db, drawingNo) => {
    const checkRequest = new sql.Request(db);
    checkRequest.input('DrawingNo', sql.NVarChar(100), drawingNo);
    const existing = await checkRequest.query`
        SELECT DrawingMasterId FROM DrawingMaster WHERE DrawingNo = @DrawingNo
    `;
    return existing.recordset.length > 0;
};

/**
 * Inserts a single drawing master record
 * @param {Object} db - Database connection
 * @param {Object} rowData - Row data object
 * @returns {Promise<void>}
 */
const insertDrawingRecord = async (db, rowData) => {
    const request = new sql.Request(db);
    request.input('No', sql.NVarChar(50), rowData.No || null);
    request.input('Customer', sql.NVarChar(255), rowData.Customer);
    request.input('DrawingNo', sql.NVarChar(100), rowData.DrawingNo);
    request.input('RevNo', sql.NVarChar(50), rowData.RevNo || null);
    request.input('Description', sql.NVarChar(500), rowData.Description || null);
    request.input('CustomerGrade', sql.NVarChar(100), rowData.CustomerGrade || null);
    request.input('AKPGrade', sql.NVarChar(100), rowData.AKPGrade || null);
    request.input('Remarks', sql.NVarChar(1000), rowData.Remarks || null);
    request.input('Comments', sql.NVarChar(2000), rowData.Comments || null);

    await request.query`
        INSERT INTO DrawingMaster (
            No, Customer, DrawingNo, RevNo, Description,
            CustomerGrade, AKPGrade, Remarks, Comments,
            CreatedAt, UpdatedAt
        )
        VALUES (
            @No, @Customer, @DrawingNo, @RevNo, @Description,
            @CustomerGrade, @AKPGrade, @Remarks, @Comments,
            GETDATE(), GETDATE()
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
const processDrawingRow = async (db, row, columnMap, rowNumber) => {
    try {
        // Skip empty rows
        if (row.cellCount === 0) {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Empty row` };
        }

        // Get key field: Drawing No (required)
        const drawingNo = getMappedValue(row, columnMap, 'DrawingNo');

        // Skip rows with no Drawing No (required field)
        if (!drawingNo || drawingNo.trim() === '') {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Missing Drg No` };
        }

        // Check for duplicate DrawingNo
        const isDuplicate = await checkDuplicateDrawing(db, drawingNo);
        if (isDuplicate) {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Duplicate (Drg No: ${drawingNo})` };
        }

        // Get other fields
        const rowData = {
            No: getMappedValue(row, columnMap, 'No'),
            Customer: getMappedValue(row, columnMap, 'Customer') || '',
            DrawingNo: drawingNo,
            RevNo: getMappedValue(row, columnMap, 'RevNo'),
            Description: getMappedValue(row, columnMap, 'Description'),
            CustomerGrade: getMappedValue(row, columnMap, 'CustomerGrade'),
            AKPGrade: getMappedValue(row, columnMap, 'AKPGrade'),
            Remarks: getMappedValue(row, columnMap, 'Remarks'),
            Comments: getMappedValue(row, columnMap, 'Comments')
        };

        await insertDrawingRecord(db, rowData);
        return { success: true };
    } catch (err) {
        return { success: false, error: `Row ${rowNumber}: ${err.message}` };
    }
};

const drawingMasterController = {
    /**
     * Retrieves all drawing master records with optional search filtering.
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    getAllDrawings: async (req, res) => {
        try {
            const { search } = req.query;
            let query = `
                SELECT 
                    DrawingMasterId, No,
                    Customer, DrawingNo, RevNo, Description,
                    CustomerGrade, AKPGrade, Remarks, Comments,
                    AttachmentPath, AttachmentName,
                    CreatedAt, UpdatedAt
                FROM DrawingMaster
            `;

            if (search && search.trim() !== '') {
                query += `
                    WHERE Customer LIKE '%' + @search + '%'
                       OR DrawingNo LIKE '%' + @search + '%'
                       OR Description LIKE '%' + @search + '%'
                       OR CustomerGrade LIKE '%' + @search + '%'
                       OR AKPGrade LIKE '%' + @search + '%'
                `;
            }

            query += ` ORDER BY DrawingMasterId DESC`;

            const request = new sql.Request(req.db);
            if (search && search.trim() !== '') {
                request.input('search', sql.NVarChar(255), search);
            }

            const result = await request.query(query);
            res.json(result.recordset);
        } catch (err) {
            logger.error('Error fetching drawing master records:', err);
            res.status(500).json({ error: 'Failed to fetch drawing master records' });
        }
    },

    /**
     * Retrieves all drawing numbers for dropdown (cached).
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    getDrawingNumbers: async (req, res) => {
        try {
            const request = new sql.Request(req.db);
            const result = await request.query(`
                SELECT DISTINCT DrawingNo, Customer, Description
                FROM DrawingMaster
                WHERE DrawingNo IS NOT NULL AND DrawingNo <> ''
                ORDER BY DrawingNo
            `);
            res.json(result.recordset);
        } catch (err) {
            logger.error('Error fetching drawing numbers:', err);
            res.status(500).json({ error: 'Failed to fetch drawing numbers' });
        }
    },

    /**
     * Serves an attachment file for a drawing record.
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    getAttachment: async (req, res) => {
        const { id } = req.params;

        try {
            const request = new sql.Request(req.db);
            request.input('id', sql.Int, parseInt(id));

            const result = await request.query`
                SELECT AttachmentPath, AttachmentName FROM DrawingMaster WHERE DrawingMasterId = @id
            `;

            if (result.recordset.length === 0 || !result.recordset[0].AttachmentPath) {
                return res.status(404).json({ error: 'Attachment not found' });
            }

            const { AttachmentPath, AttachmentName } = result.recordset[0];
            const filePath = path.join(uploadsDir, AttachmentPath);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on server' });
            }

            // Set content-disposition to inline for viewing in browser
            const ext = path.extname(AttachmentPath).toLowerCase();
            const mimeTypes = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.txt': 'text/plain',
                '.doc': 'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.xls': 'application/vnd.ms-excel',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };

            const contentType = mimeTypes[ext] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `inline; filename="${AttachmentName || AttachmentPath}"`);
            res.sendFile(filePath);
        } catch (err) {
            logger.error('Error serving attachment:', err);
            res.status(500).json({ error: 'Failed to serve attachment' });
        }
    },

    /**
     * Retrieves a single drawing master record by ID.
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    getDrawingById: async (req, res) => {
        const { id } = req.params;

        try {
            const request = new sql.Request(req.db);
            request.input('id', sql.Int, parseInt(id));

            const result = await request.query`
                SELECT * FROM DrawingMaster WHERE DrawingMasterId = @id
            `;

            if (result.recordset.length === 0) {
                return res.status(404).json({ error: 'Drawing master record not found' });
            }

            res.json(result.recordset[0]);
        } catch (err) {
            logger.error('Error fetching drawing master record:', err);
            res.status(500).json({ error: 'Failed to fetch drawing master record' });
        }
    },

    /**
     * Retrieves a drawing master record by Drawing Number.
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    getDrawingByNumber: async (req, res) => {
        const { drawingNo } = req.params;

        try {
            const request = new sql.Request(req.db);
            request.input('drawingNo', sql.NVarChar(100), drawingNo);

            const result = await request.query`
                SELECT * FROM DrawingMaster WHERE DrawingNo = @drawingNo
            `;

            if (result.recordset.length === 0) {
                return res.status(404).json({ error: 'Drawing master record not found' });
            }

            res.json(result.recordset[0]);
        } catch (err) {
            logger.error('Error fetching drawing master record by drawing no:', err);
            res.status(500).json({ error: 'Failed to fetch drawing master record' });
        }
    },

    /**
     * Creates a new drawing master record with optional file upload.
     * @param {import('express').Request} req - Express request object (with optional file in req.file).
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    createDrawing: async (req, res) => {
        const {
            No, Customer, DrawingNo, RevNo, Description,
            CustomerGrade, AKPGrade, Remarks, Comments
        } = req.body;

        // Validation
        if (!Customer || Customer.trim() === '') {
            return res.status(400).json({ error: 'Customer is required' });
        }
        if (!DrawingNo || DrawingNo.trim() === '') {
            return res.status(400).json({ error: 'Drawing No is required' });
        }

        try {
            // Check for duplicate DrawingNo before inserting
            const checkRequest = new sql.Request(req.db);
            checkRequest.input('DrawingNo', sql.NVarChar(100), DrawingNo);
            const existingRecord = await checkRequest.query`
                SELECT DrawingMasterId FROM DrawingMaster WHERE DrawingNo = @DrawingNo
            `;

            if (existingRecord.recordset.length > 0) {
                // Delete uploaded file if duplicate
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ error: 'Drawing No already exists' });
            }

            const request = new sql.Request(req.db);
            request.input('No', sql.NVarChar(50), No || null);
            request.input('Customer', sql.NVarChar(255), Customer);
            request.input('DrawingNo', sql.NVarChar(100), DrawingNo);
            request.input('RevNo', sql.NVarChar(50), RevNo || null);
            request.input('Description', sql.NVarChar(500), Description || null);
            request.input('CustomerGrade', sql.NVarChar(100), CustomerGrade || null);
            request.input('AKPGrade', sql.NVarChar(100), AKPGrade || null);
            request.input('Remarks', sql.NVarChar(1000), Remarks || null);
            request.input('Comments', sql.NVarChar(2000), Comments || null);
            request.input('AttachmentPath', sql.NVarChar(500), req.file ? req.file.filename : null);
            request.input('AttachmentName', sql.NVarChar(255), req.file ? req.file.originalname : null);

            const result = await request.query`
                INSERT INTO DrawingMaster (
                    No, Customer, DrawingNo, RevNo, Description,
                    CustomerGrade, AKPGrade, Remarks, Comments,
                    AttachmentPath, AttachmentName,
                    CreatedAt, UpdatedAt
                )
                OUTPUT INSERTED.DrawingMasterId
                VALUES (
                    @No, @Customer, @DrawingNo, @RevNo, @Description,
                    @CustomerGrade, @AKPGrade, @Remarks, @Comments,
                    @AttachmentPath, @AttachmentName,
                    GETDATE(), GETDATE()
                )
            `;

            const newId = result.recordset[0].DrawingMasterId;
            logger.info(`Drawing master record created: ID ${newId}`);
            res.json({
                success: true,
                message: 'Drawing master record added successfully',
                id: newId
            });
        } catch (err) {
            logger.error('Error adding drawing master record:', err);
            // Clean up uploaded file on error
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            }
            res.status(500).json({ error: 'Failed to add drawing master record' });
        }
    },

    /**
     * Imports drawing master records from an Excel file.
     * @param {import('express').Request} req - Express request object (with file in req.file).
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    importExcel: async (req, res) => {
        try {
            // Step 1: Parse Excel file
            const { worksheet } = await parseDrawingExcelFile(req.file);

            // Step 2: Extract and map headers
            const headers = extractDrawingHeaders(worksheet);
            logger.info(`[Drawing Master Import] Detected Headers: ${JSON.stringify(headers)}`);

            const columnMap = buildDrawingColumnMapping(headers);
            logger.info(`[Drawing Master Import] Column mapping: ${JSON.stringify(columnMap)}`);

            // Step 3: Process rows
            let successCount = 0;
            let errorCount = 0;
            let skippedCount = 0;
            const errors = [];
            const skippedRows = [];

            for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
                const row = worksheet.getRow(rowNumber);

                const result = await processDrawingRow(req.db, row, columnMap, rowNumber);

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
            logger.info(`[Drawing Master Import] Completed: ${successCount} imported, ${skippedCount} skipped, ${errorCount} errors`);
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
            logger.error('Error importing Excel:', err);
            res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
        }
    },

    /**
     * Updates an existing drawing master record with optional file upload.
     * @param {import('express').Request} req - Express request object (with optional file in req.file).
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    updateDrawing: async (req, res) => {
        const { id } = req.params;
        const {
            No, Customer, DrawingNo, RevNo, Description,
            CustomerGrade, AKPGrade, Remarks, Comments,
            removeAttachment
        } = req.body;

        // Validation
        if (!Customer || Customer.trim() === '') {
            return res.status(400).json({ error: 'Customer is required' });
        }
        if (!DrawingNo || DrawingNo.trim() === '') {
            return res.status(400).json({ error: 'Drawing No is required' });
        }

        try {
            // Check for duplicate DrawingNo (excluding current record)
            const checkRequest = new sql.Request(req.db);
            checkRequest.input('DrawingNo', sql.NVarChar(100), DrawingNo);
            checkRequest.input('id', sql.Int, parseInt(id));
            const existingRecord = await checkRequest.query`
                SELECT DrawingMasterId FROM DrawingMaster 
                WHERE DrawingNo = @DrawingNo AND DrawingMasterId != @id
            `;

            if (existingRecord.recordset.length > 0) {
                if (req.file) {
                    fs.unlinkSync(req.file.path);
                }
                return res.status(400).json({ error: 'Drawing No already exists' });
            }

            // Get current attachment info
            const currentRequest = new sql.Request(req.db);
            currentRequest.input('id', sql.Int, parseInt(id));
            const currentRecord = await currentRequest.query`
                SELECT AttachmentPath FROM DrawingMaster WHERE DrawingMasterId = @id
            `;

            // Handle attachment updates
            let attachmentPath = null;
            let attachmentName = null;

            if (req.file) {
                // New file uploaded - delete old one if exists
                if (currentRecord.recordset.length > 0 && currentRecord.recordset[0].AttachmentPath) {
                    const oldPath = path.join(uploadsDir, currentRecord.recordset[0].AttachmentPath);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                attachmentPath = req.file.filename;
                attachmentName = req.file.originalname;
            } else if (removeAttachment === 'true') {
                // Remove attachment requested
                if (currentRecord.recordset.length > 0 && currentRecord.recordset[0].AttachmentPath) {
                    const oldPath = path.join(uploadsDir, currentRecord.recordset[0].AttachmentPath);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
                attachmentPath = null;
                attachmentName = null;
            } else {
                // Keep existing attachment
                attachmentPath = currentRecord.recordset[0]?.AttachmentPath || null;
                // Need to get attachment name too
                const nameRequest = new sql.Request(req.db);
                nameRequest.input('id', sql.Int, parseInt(id));
                const nameResult = await nameRequest.query`
                    SELECT AttachmentName FROM DrawingMaster WHERE DrawingMasterId = @id
                `;
                attachmentName = nameResult.recordset[0]?.AttachmentName || null;
            }

            const request = new sql.Request(req.db);
            request.input('id', sql.Int, parseInt(id));
            request.input('No', sql.NVarChar(50), No || null);
            request.input('Customer', sql.NVarChar(255), Customer);
            request.input('DrawingNo', sql.NVarChar(100), DrawingNo);
            request.input('RevNo', sql.NVarChar(50), RevNo || null);
            request.input('Description', sql.NVarChar(500), Description || null);
            request.input('CustomerGrade', sql.NVarChar(100), CustomerGrade || null);
            request.input('AKPGrade', sql.NVarChar(100), AKPGrade || null);
            request.input('Remarks', sql.NVarChar(1000), Remarks || null);
            request.input('Comments', sql.NVarChar(2000), Comments || null);
            request.input('AttachmentPath', sql.NVarChar(500), attachmentPath);
            request.input('AttachmentName', sql.NVarChar(255), attachmentName);

            const result = await request.query`
                UPDATE DrawingMaster
                SET No = @No,
                    Customer = @Customer,
                    DrawingNo = @DrawingNo,
                    RevNo = @RevNo,
                    Description = @Description,
                    CustomerGrade = @CustomerGrade,
                    AKPGrade = @AKPGrade,
                    Remarks = @Remarks,
                    Comments = @Comments,
                    AttachmentPath = @AttachmentPath,
                    AttachmentName = @AttachmentName,
                    UpdatedAt = GETDATE()
                WHERE DrawingMasterId = @id
            `;

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'Drawing master record not found' });
            }

            logger.info(`Drawing master record updated: ID ${id}`);
            res.json({ success: true, message: 'Drawing master record updated successfully' });
        } catch (err) {
            logger.error('Error updating drawing master record:', err);
            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            }
            res.status(500).json({ error: 'Failed to update drawing master record' });
        }
    },

    /**
     * Deletes a drawing master record by ID.
     * @param {import('express').Request} req - Express request object.
     * @param {import('express').Response} res - Express response object.
     * @returns {Promise<void>}
     */
    deleteDrawing: async (req, res) => {
        const { id } = req.params;

        try {
            // Get attachment path before deleting
            const getRequest = new sql.Request(req.db);
            getRequest.input('id', sql.Int, parseInt(id));
            const currentRecord = await getRequest.query`
                SELECT AttachmentPath FROM DrawingMaster WHERE DrawingMasterId = @id
            `;

            const request = new sql.Request(req.db);
            request.input('id', sql.Int, parseInt(id));

            const result = await request.query`
                DELETE FROM DrawingMaster WHERE DrawingMasterId = @id
            `;

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'Drawing master record not found' });
            }

            // Delete attachment file if exists
            if (currentRecord.recordset.length > 0 && currentRecord.recordset[0].AttachmentPath) {
                const filePath = path.join(uploadsDir, currentRecord.recordset[0].AttachmentPath);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            logger.info(`Drawing master record deleted: ID ${id}`);
            res.json({ success: true, message: 'Drawing master record deleted successfully' });
        } catch (err) {
            logger.error('Error deleting drawing master record:', err);
            res.status(500).json({ error: 'Failed to delete drawing master record' });
        }
    }
};

module.exports = drawingMasterController;
