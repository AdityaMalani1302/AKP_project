const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const { requirePage } = require('../middleware/authMiddleware');
const multer = require('multer');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { drawingMasterSchema } = require('../utils/validators');
const { cacheMiddleware } = require('../utils/cache');

// Create uploads directory for drawing attachments
const uploadsDir = path.join(__dirname, '../uploads/drawing-attachments');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `drawing-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        // Allow common document types
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/zip',
            'text/plain',
            'application/octet-stream' // For generic file types
        ];
        if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|gif|txt|zip|dwg|dxf)$/i)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Allowed: PDF, Word, Excel, Images, DWG, DXF, ZIP, TXT'), false);
        }
    }
});

// Configure multer for Excel import (memory storage)
const excelUpload = multer({ storage: multer.memoryStorage() });

// GET /drawing-master - Get all drawing master records
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                DrawingMasterId,
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
        console.error('Error fetching drawing master records:', err);
        res.status(500).json({ error: 'Failed to fetch drawing master records' });
    }
});

// GET /drawing-master/drawing-numbers - Get all drawing numbers for dropdown (cached 5 min)
router.get('/drawing-numbers', cacheMiddleware('drawing-numbers', 300), async (req, res) => {
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
        console.error('Error fetching drawing numbers:', err);
        res.status(500).json({ error: 'Failed to fetch drawing numbers' });
    }
});

// GET /drawing-master/attachment/:id - Serve attachment file
router.get('/attachment/:id', async (req, res) => {
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
        console.error('Error serving attachment:', err);
        res.status(500).json({ error: 'Failed to serve attachment' });
    }
});

// GET /drawing-master/:id - Get single drawing master record
router.get('/:id', async (req, res) => {
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
        console.error('Error fetching drawing master record:', err);
        res.status(500).json({ error: 'Failed to fetch drawing master record' });
    }
});

// GET /drawing-master/by-drawing/:drawingNo - Get record by Drawing No
router.get('/by-drawing/:drawingNo', async (req, res) => {
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
        console.error('Error fetching drawing master record by drawing no:', err);
        res.status(500).json({ error: 'Failed to fetch drawing master record' });
    }
});

// POST /drawing-master - Create new drawing master record (with optional file upload)
router.post('/', requirePage('lab-master'), upload.single('attachment'), async (req, res) => {
    const {
        Customer, DrawingNo, RevNo, Description,
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
                Customer, DrawingNo, RevNo, Description,
                CustomerGrade, AKPGrade, Remarks, Comments,
                AttachmentPath, AttachmentName,
                CreatedAt, UpdatedAt
            )
            OUTPUT INSERTED.DrawingMasterId
            VALUES (
                @Customer, @DrawingNo, @RevNo, @Description,
                @CustomerGrade, @AKPGrade, @Remarks, @Comments,
                @AttachmentPath, @AttachmentName,
                GETDATE(), GETDATE()
            )
        `;

        const newId = result.recordset[0].DrawingMasterId;
        res.json({
            success: true,
            message: 'Drawing master record added successfully',
            id: newId
        });
    } catch (err) {
        console.error('Error adding drawing master record:', err);
        // Clean up uploaded file on error
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: 'Failed to add drawing master record' });
    }
});

// POST /drawing-master/import-excel - Import from Excel
router.post('/import-excel', requirePage('lab-master'), excelUpload.single('file'), async (req, res) => {
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

        // Get headers from first row
        const headerRow = worksheet.getRow(1);
        const headers = {};
        headerRow.eachCell((cell, colNumber) => {
            let value = cell.value ? String(cell.value).trim().toLowerCase() : '';
            // Normalize header: remove extra spaces, dots, etc.
            value = value.replace(/\s+/g, ' ').replace(/\./g, '');
            headers[colNumber] = value;
        });

        console.log('[Drawing Master Import] Detected Headers:', headers);

        // Column name mapping (normalized header -> database field)
        // Supports multiple variations for Drg No
        const columnMap = {
            'no': null, // Skip ID/No column
            'customer': 'Customer',
            // Drawing No variations
            'drg no': 'DrawingNo',
            'drgno': 'DrawingNo',
            'drawing no': 'DrawingNo',
            'drawingno': 'DrawingNo',
            // Rev No variations
            'rev no': 'RevNo',
            'revno': 'RevNo',
            // Other fields
            'description': 'Description',
            'customer grade': 'CustomerGrade',
            'cusomer grade': 'CustomerGrade', // Typo in screenshot
            'customergrade': 'CustomerGrade',
            'akp grade': 'AKPGrade',
            'akpgrade': 'AKPGrade',
            'remarks': 'Remarks',
            'comments': 'Comments'
        };

        // Build column index to db field mapping
        const columnIndexToField = {};
        for (const [colNumber, header] of Object.entries(headers)) {
            const dbField = columnMap[header];
            if (dbField) {
                columnIndexToField[colNumber] = dbField;
            }
        }

        console.log('[Drawing Master Import] Column mapping:', columnIndexToField);

        // Helper function to get cell value as string
        const getCellValue = (cell) => {
            if (!cell || cell.value === null || cell.value === undefined) return null;
            // Handle rich text
            if (typeof cell.value === 'object' && cell.value.richText) {
                return cell.value.richText.map(r => r.text).join('').trim();
            }
            // Handle hyperlinks or other complex objects
            if (typeof cell.value === 'object' && cell.value.text) {
                return String(cell.value.text).trim();
            }
            return String(cell.value).trim();
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

        let successCount = 0;
        let skippedCount = 0;
        let errorCount = 0;
        const errors = [];
        const skippedRows = [];

        // Process each row (starting from row 2, skipping header row)
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Skip empty rows
            if (row.cellCount === 0) continue;

            try {
                // Get key field: Drawing No (required)
                const drawingNo = getMappedValue(row, 'DrawingNo');
                
                // Skip rows with no Drawing No (required field)
                if (!drawingNo || drawingNo.trim() === '') {
                    skippedCount++;
                    skippedRows.push(`Row ${rowNumber}: Missing Drg No`);
                    continue;
                }

                // Get other fields
                const customer = getMappedValue(row, 'Customer') || '';
                const revNo = getMappedValue(row, 'RevNo');
                const description = getMappedValue(row, 'Description');
                const customerGrade = getMappedValue(row, 'CustomerGrade');
                const akpGrade = getMappedValue(row, 'AKPGrade');
                const remarks = getMappedValue(row, 'Remarks');
                const comments = getMappedValue(row, 'Comments');

                // Check for duplicate DrawingNo
                const checkRequest = new sql.Request(req.db);
                checkRequest.input('DrawingNo', sql.NVarChar(100), drawingNo);
                const existing = await checkRequest.query`
                    SELECT DrawingMasterId FROM DrawingMaster WHERE DrawingNo = @DrawingNo
                `;

                if (existing.recordset.length > 0) {
                    skippedCount++;
                    skippedRows.push(`Row ${rowNumber}: Duplicate (Drg No: ${drawingNo})`);
                    continue;
                }

                // Insert new record
                const request = new sql.Request(req.db);
                request.input('Customer', sql.NVarChar(255), customer);
                request.input('DrawingNo', sql.NVarChar(100), drawingNo);
                request.input('RevNo', sql.NVarChar(50), revNo || null);
                request.input('Description', sql.NVarChar(500), description || null);
                request.input('CustomerGrade', sql.NVarChar(100), customerGrade || null);
                request.input('AKPGrade', sql.NVarChar(100), akpGrade || null);
                request.input('Remarks', sql.NVarChar(1000), remarks || null);
                request.input('Comments', sql.NVarChar(2000), comments || null);

                await request.query`
                    INSERT INTO DrawingMaster (
                        Customer, DrawingNo, RevNo, Description,
                        CustomerGrade, AKPGrade, Remarks, Comments,
                        CreatedAt, UpdatedAt
                    )
                    VALUES (
                        @Customer, @DrawingNo, @RevNo, @Description,
                        @CustomerGrade, @AKPGrade, @Remarks, @Comments,
                        GETDATE(), GETDATE()
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
            message: `Import completed. ${successCount} new records imported, ${skippedCount} duplicates skipped.`,
            successCount,
            skippedCount,
            errorCount,
            errors: errors.slice(0, 10),
            skippedRows: skippedRows.slice(0, 10)
        });
    } catch (err) {
        console.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

// PUT /drawing-master/:id - Update existing drawing master record (with optional file upload)
router.put('/:id', requirePage('lab-master'), upload.single('attachment'), async (req, res) => {
    const { id } = req.params;
    const {
        Customer, DrawingNo, RevNo, Description,
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
            SET Customer = @Customer,
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

        res.json({ success: true, message: 'Drawing master record updated successfully' });
    } catch (err) {
        console.error('Error updating drawing master record:', err);
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: 'Failed to update drawing master record' });
    }
});

// DELETE /drawing-master/:id - Delete drawing master record
router.delete('/:id', requirePage('lab-master'), async (req, res) => {
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

        res.json({ success: true, message: 'Drawing master record deleted successfully' });
    } catch (err) {
        console.error('Error deleting drawing master record:', err);
        res.status(500).json({ error: 'Failed to delete drawing master record' });
    }
});

module.exports = router;
