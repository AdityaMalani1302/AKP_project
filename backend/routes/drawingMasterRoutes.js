/**
 * Drawing Master Routes
 * Delegates to drawingMasterController for business logic.
 */

const express = require('express');
const router = express.Router();
const { requirePage } = require('../middleware/authMiddleware');
const { cacheMiddleware } = require('../utils/cache');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const drawingMasterController = require('../controllers/drawingMasterController');

// Create uploads directory for drawing attachments
const uploadsDir = path.join(__dirname, '../uploads/drawing-attachments');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads (disk storage for attachments)
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
router.get('/', drawingMasterController.getAllDrawings);

// GET /drawing-master/drawing-numbers - Get all drawing numbers for dropdown (cached 5 min)
router.get('/drawing-numbers', cacheMiddleware('drawing-numbers', 300), drawingMasterController.getDrawingNumbers);

// GET /drawing-master/attachment/:id - Serve attachment file
router.get('/attachment/:id', drawingMasterController.getAttachment);

// GET /drawing-master/by-drawing/:drawingNo - Get record by Drawing No
// NOTE: This must come BEFORE /:id to avoid conflict
router.get('/by-drawing/:drawingNo', drawingMasterController.getDrawingByNumber);

// GET /drawing-master/:id - Get single drawing master record
router.get('/:id', drawingMasterController.getDrawingById);

// POST /drawing-master - Create new drawing master record (with optional file upload)
router.post('/', requirePage('lab-master'), upload.single('attachment'), drawingMasterController.createDrawing);

// POST /drawing-master/import-excel - Import from Excel
router.post('/import-excel', requirePage('lab-master'), excelUpload.single('file'), drawingMasterController.importExcel);

// PUT /drawing-master/:id - Update existing drawing master record (with optional file upload)
router.put('/:id', requirePage('lab-master'), upload.single('attachment'), drawingMasterController.updateDrawing);

// DELETE /drawing-master/:id - Delete drawing master record
router.delete('/:id', requirePage('lab-master'), drawingMasterController.deleteDrawing);

module.exports = router;
