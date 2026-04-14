/**
 * Drawing Master Controller
 * Handles all business logic for Drawing Master operations including multi-file attachments.
 * Attachments are stored in the DrawingMasterAttachments child table.
 */

const { sql } = require('../config/db');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const { parseExcelFile, getCellValue, extractHeaders, buildColumnMapping, getMappedValue } = require('../utils/excelImport');

// Uploads directory for drawing attachments
const uploadsDir = path.join(__dirname, '../uploads/drawing-attachments');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Column mapping configuration for Drawing Master Excel import
 */
const DRAWING_COLUMN_MAP = {
    'no': 'No',
    'serial no': 'No',
    'serialno': 'No',
    'customer': 'Customer',
    'drg no': 'DrawingNo',
    'drgno': 'DrawingNo',
    'drawing no': 'DrawingNo',
    'drawingno': 'DrawingNo',
    'rev no': 'RevNo',
    'revno': 'RevNo',
    'rev': 'RevNo',
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
 */
const buildDrawingColumnMapping = (headers) => {
    return buildColumnMapping(headers, DRAWING_COLUMN_MAP);
};

/**
 * Checks if drawing record already exists
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
 * Inserts a single drawing master record (for Excel import)
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
 */
const processDrawingRow = async (db, row, columnMap, rowNumber) => {
    try {
        if (row.cellCount === 0) {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Empty row` };
        }

        const drawingNo = getMappedValue(row, columnMap, 'DrawingNo');

        if (!drawingNo || drawingNo.trim() === '') {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Missing Drg No` };
        }

        const isDuplicate = await checkDuplicateDrawing(db, drawingNo);
        if (isDuplicate) {
            return { success: false, skipped: true, error: `Row ${rowNumber}: Duplicate (Drg No: ${drawingNo})` };
        }

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

/**
 * Inserts attachment records into DrawingMasterAttachments
 * @param {Object} db - Database pool
 * @param {number} drawingMasterId
 * @param {Array} files - Array of multer file objects
 */
const insertAttachments = async (db, drawingMasterId, files) => {
    for (const file of files) {
        const request = new sql.Request(db);
        request.input('DrawingMasterId', sql.Int, drawingMasterId);
        request.input('AttachmentPath', sql.NVarChar(500), file.filename);
        request.input('AttachmentName', sql.NVarChar(255), file.originalname);
        await request.query`
            INSERT INTO DrawingMasterAttachments (DrawingMasterId, AttachmentPath, AttachmentName, CreatedAt)
            VALUES (@DrawingMasterId, @AttachmentPath, @AttachmentName, GETDATE())
        `;
    }
};

/**
 * Cleans up uploaded files from disk
 */
const cleanupFiles = (files) => {
    if (!files || !Array.isArray(files)) return;
    for (const file of files) {
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
    }
};

const drawingMasterController = {
    /**
     * Retrieves all drawing master records with attachments.
     */
    getAllDrawings: async (req, res) => {
        try {
            const { search } = req.query;
            let query = `
                SELECT 
                    dm.DrawingMasterId, dm.No,
                    dm.Customer, dm.DrawingNo, dm.RevNo, dm.Description,
                    dm.CustomerGrade, dm.AKPGrade, dm.Remarks, dm.Comments,
                    dm.CreatedAt, dm.UpdatedAt
                FROM DrawingMaster dm
            `;

            if (search && search.trim() !== '') {
                query += `
                    WHERE dm.Customer LIKE '%' + @search + '%'
                       OR dm.DrawingNo LIKE '%' + @search + '%'
                       OR dm.Description LIKE '%' + @search + '%'
                       OR dm.CustomerGrade LIKE '%' + @search + '%'
                       OR dm.AKPGrade LIKE '%' + @search + '%'
                `;
            }

            query += ` ORDER BY dm.DrawingMasterId ASC`;

            const request = new sql.Request(req.db);
            if (search && search.trim() !== '') {
                request.input('search', sql.NVarChar(255), search);
            }

            const result = await request.query(query);
            const records = result.recordset;

            // Fetch all attachments for these records in one query
            if (records.length > 0) {
                const ids = records.map(r => r.DrawingMasterId);
                const attachRequest = new sql.Request(req.db);
                const attachResult = await attachRequest.query(`
                    SELECT AttachmentId, DrawingMasterId, AttachmentPath, AttachmentName
                    FROM DrawingMasterAttachments
                    WHERE DrawingMasterId IN (${ids.join(',')})
                    ORDER BY AttachmentId ASC
                `);

                // Group attachments by DrawingMasterId
                const attachmentMap = {};
                for (const att of attachResult.recordset) {
                    if (!attachmentMap[att.DrawingMasterId]) {
                        attachmentMap[att.DrawingMasterId] = [];
                    }
                    attachmentMap[att.DrawingMasterId].push({
                        AttachmentId: att.AttachmentId,
                        AttachmentPath: att.AttachmentPath,
                        AttachmentName: att.AttachmentName
                    });
                }

                // Attach to each record
                for (const record of records) {
                    record.Attachments = attachmentMap[record.DrawingMasterId] || [];
                }
            }

            res.json(records);
        } catch (err) {
            logger.error('Error fetching drawing master records:', err);
            res.status(500).json({ error: 'Failed to fetch drawing master records' });
        }
    },

    /**
     * Retrieves all drawing numbers for dropdown (cached).
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
     * Serves a specific attachment file by AttachmentId.
     */
    getAttachment: async (req, res) => {
        const { attachmentId } = req.params;

        try {
            const request = new sql.Request(req.db);
            request.input('attachmentId', sql.Int, parseInt(attachmentId));

            const result = await request.query`
                SELECT AttachmentPath, AttachmentName FROM DrawingMasterAttachments WHERE AttachmentId = @attachmentId
            `;

            if (result.recordset.length === 0) {
                return res.status(404).json({ error: 'Attachment not found' });
            }

            const { AttachmentPath, AttachmentName } = result.recordset[0];
            const filePath = path.join(uploadsDir, AttachmentPath);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ error: 'File not found on server' });
            }

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

            const record = result.recordset[0];

            // Fetch attachments
            const attachRequest = new sql.Request(req.db);
            attachRequest.input('id', sql.Int, parseInt(id));
            const attachResult = await attachRequest.query`
                SELECT AttachmentId, AttachmentPath, AttachmentName
                FROM DrawingMasterAttachments
                WHERE DrawingMasterId = @id
                ORDER BY AttachmentId ASC
            `;
            record.Attachments = attachResult.recordset;

            res.json(record);
        } catch (err) {
            logger.error('Error fetching drawing master record:', err);
            res.status(500).json({ error: 'Failed to fetch drawing master record' });
        }
    },

    /**
     * Retrieves a drawing master record by Drawing Number.
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

            const record = result.recordset[0];

            // Fetch attachments
            const attachRequest = new sql.Request(req.db);
            attachRequest.input('dmId', sql.Int, record.DrawingMasterId);
            const attachResult = await attachRequest.query`
                SELECT AttachmentId, AttachmentPath, AttachmentName
                FROM DrawingMasterAttachments
                WHERE DrawingMasterId = @dmId
                ORDER BY AttachmentId ASC
            `;
            record.Attachments = attachResult.recordset;

            res.json(record);
        } catch (err) {
            logger.error('Error fetching drawing master record by drawing no:', err);
            res.status(500).json({ error: 'Failed to fetch drawing master record' });
        }
    },

    /**
     * Creates a new drawing master record with optional multi-file upload.
     * Files come from req.files (multer array).
     */
    createDrawing: async (req, res) => {
        const {
            No, Customer, DrawingNo, RevNo, Description,
            CustomerGrade, AKPGrade, Remarks, Comments
        } = req.body;

        if (!Customer || Customer.trim() === '') {
            cleanupFiles(req.files);
            return res.status(400).json({ error: 'Customer is required' });
        }
        if (!DrawingNo || DrawingNo.trim() === '') {
            cleanupFiles(req.files);
            return res.status(400).json({ error: 'Drawing No is required' });
        }

        try {
            // Check for duplicate DrawingNo
            const checkRequest = new sql.Request(req.db);
            checkRequest.input('DrawingNo', sql.NVarChar(100), DrawingNo);
            const existingRecord = await checkRequest.query`
                SELECT DrawingMasterId FROM DrawingMaster WHERE DrawingNo = @DrawingNo
            `;

            if (existingRecord.recordset.length > 0) {
                cleanupFiles(req.files);
                return res.status(400).json({ error: 'Drawing No already exists' });
            }

            // Insert main record
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

            const result = await request.query`
                INSERT INTO DrawingMaster (
                    No, Customer, DrawingNo, RevNo, Description,
                    CustomerGrade, AKPGrade, Remarks, Comments,
                    CreatedAt, UpdatedAt
                )
                OUTPUT INSERTED.DrawingMasterId
                VALUES (
                    @No, @Customer, @DrawingNo, @RevNo, @Description,
                    @CustomerGrade, @AKPGrade, @Remarks, @Comments,
                    GETDATE(), GETDATE()
                )
            `;

            const newId = result.recordset[0].DrawingMasterId;

            // Insert attachments
            if (req.files && req.files.length > 0) {
                await insertAttachments(req.db, newId, req.files);
            }

            logger.info(`Drawing master record created: ID ${newId} with ${(req.files || []).length} attachment(s)`);
            res.json({
                success: true,
                message: 'Drawing master record added successfully',
                id: newId
            });
        } catch (err) {
            logger.error('Error adding drawing master record:', err);
            cleanupFiles(req.files);
            res.status(500).json({ error: 'Failed to add drawing master record' });
        }
    },

    /**
     * Imports drawing master records from an Excel file.
     */
    importExcel: async (req, res) => {
        try {
            const { worksheet } = await parseExcelFile(req.file);
            const { headers: extractedHeaders, headerRowNum } = extractHeaders(worksheet, DRAWING_COLUMN_MAP);
            logger.info(`[Drawing Master Import] Header row: ${headerRowNum}, Detected Headers: ${JSON.stringify(extractedHeaders)}`);

            const columnMap = buildDrawingColumnMapping(extractedHeaders);
            logger.info(`[Drawing Master Import] Column mapping: ${JSON.stringify(columnMap)}`);

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
     * Updates an existing drawing master record with optional multi-file upload.
     * New files are added. Removals are handled via removeAttachmentIds in body.
     */
    updateDrawing: async (req, res) => {
        const { id } = req.params;
        const {
            No, Customer, DrawingNo, RevNo, Description,
            CustomerGrade, AKPGrade, Remarks, Comments,
            removeAttachmentIds // JSON string of attachment IDs to remove, e.g. "[1,2,3]"
        } = req.body;

        if (!Customer || Customer.trim() === '') {
            cleanupFiles(req.files);
            return res.status(400).json({ error: 'Customer is required' });
        }
        if (!DrawingNo || DrawingNo.trim() === '') {
            cleanupFiles(req.files);
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
                cleanupFiles(req.files);
                return res.status(400).json({ error: 'Drawing No already exists' });
            }

            // Handle attachment removals
            if (removeAttachmentIds) {
                let idsToRemove = [];
                try {
                    idsToRemove = JSON.parse(removeAttachmentIds);
                } catch (e) {
                    // If it's a single value string
                    idsToRemove = [parseInt(removeAttachmentIds)];
                }

                if (idsToRemove.length > 0) {
                    // Get file paths before deleting from DB
                    const getFilesRequest = new sql.Request(req.db);
                    const fileResult = await getFilesRequest.query(`
                        SELECT AttachmentPath FROM DrawingMasterAttachments
                        WHERE AttachmentId IN (${idsToRemove.map(i => parseInt(i)).join(',')})
                          AND DrawingMasterId = ${parseInt(id)}
                    `);

                    // Delete files from disk
                    for (const row of fileResult.recordset) {
                        const filePath = path.join(uploadsDir, row.AttachmentPath);
                        if (fs.existsSync(filePath)) {
                            try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
                        }
                    }

                    // Delete from DB
                    const delRequest = new sql.Request(req.db);
                    await delRequest.query(`
                        DELETE FROM DrawingMasterAttachments
                        WHERE AttachmentId IN (${idsToRemove.map(i => parseInt(i)).join(',')})
                          AND DrawingMasterId = ${parseInt(id)}
                    `);
                }
            }

            // Update main record
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
                    UpdatedAt = GETDATE()
                WHERE DrawingMasterId = @id
            `;

            if (result.rowsAffected[0] === 0) {
                cleanupFiles(req.files);
                return res.status(404).json({ error: 'Drawing master record not found' });
            }

            // Insert new attachments
            if (req.files && req.files.length > 0) {
                await insertAttachments(req.db, parseInt(id), req.files);
            }

            logger.info(`Drawing master record updated: ID ${id}`);
            res.json({ success: true, message: 'Drawing master record updated successfully' });
        } catch (err) {
            logger.error('Error updating drawing master record:', err);
            cleanupFiles(req.files);
            res.status(500).json({ error: 'Failed to update drawing master record' });
        }
    },

    /**
     * Deletes a single attachment by AttachmentId.
     */
    deleteAttachment: async (req, res) => {
        const { attachmentId } = req.params;

        try {
            const request = new sql.Request(req.db);
            request.input('attachmentId', sql.Int, parseInt(attachmentId));

            // Get file path first
            const getResult = await request.query`
                SELECT AttachmentPath FROM DrawingMasterAttachments WHERE AttachmentId = @attachmentId
            `;

            if (getResult.recordset.length === 0) {
                return res.status(404).json({ error: 'Attachment not found' });
            }

            const filePath = path.join(uploadsDir, getResult.recordset[0].AttachmentPath);

            // Delete from DB
            const delRequest = new sql.Request(req.db);
            delRequest.input('attachmentId', sql.Int, parseInt(attachmentId));
            await delRequest.query`
                DELETE FROM DrawingMasterAttachments WHERE AttachmentId = @attachmentId
            `;

            // Delete file from disk
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
            }

            logger.info(`Attachment deleted: ID ${attachmentId}`);
            res.json({ success: true, message: 'Attachment deleted successfully' });
        } catch (err) {
            logger.error('Error deleting attachment:', err);
            res.status(500).json({ error: 'Failed to delete attachment' });
        }
    },

    /**
     * Deletes a drawing master record by ID.
     * Associated attachments are cascade-deleted by FK, but files need manual cleanup.
     */
    deleteDrawing: async (req, res) => {
        const { id } = req.params;

        try {
            // Get all attachment paths before deleting
            const getRequest = new sql.Request(req.db);
            getRequest.input('id', sql.Int, parseInt(id));
            const attachments = await getRequest.query`
                SELECT AttachmentPath FROM DrawingMasterAttachments WHERE DrawingMasterId = @id
            `;

            const request = new sql.Request(req.db);
            request.input('id', sql.Int, parseInt(id));

            const result = await request.query`
                DELETE FROM DrawingMaster WHERE DrawingMasterId = @id
            `;

            if (result.rowsAffected[0] === 0) {
                return res.status(404).json({ error: 'Drawing master record not found' });
            }

            // Delete all attachment files from disk
            for (const att of attachments.recordset) {
                const filePath = path.join(uploadsDir, att.AttachmentPath);
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
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
