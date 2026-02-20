/**
 * Lab Master Routes
 * Delegates to labController for business logic.
 */

const express = require('express');
const router = express.Router();
const { requirePage } = require('../middleware/authMiddleware');
const { validateBody, labMasterSchema } = require('../utils/validators');
const multer = require('multer');
const labController = require('../controllers/labController');

// Configure multer for memory storage (Excel import)
const upload = multer({ storage: multer.memoryStorage() });

// GET /lab-master - Get all lab master records
router.get('/', labController.getAllLabRecords);

// GET /lab-master/:id - Get single lab master record
router.get('/:id', labController.getLabRecordById);

// POST /lab-master - Create new lab master record
router.post('/', requirePage('lab-master'), validateBody(labMasterSchema), labController.createLabRecord);

// PUT /lab-master/:id - Update existing lab master record
router.put('/:id', requirePage('lab-master'), validateBody(labMasterSchema), labController.updateLabRecord);

// DELETE /lab-master/:id - Delete lab master record
router.delete('/:id', requirePage('lab-master'), labController.deleteLabRecord);

// POST /lab-master/import-excel - Import lab master records from Excel
router.post('/import-excel', requirePage('lab-master'), upload.single('file'), labController.importExcel);

module.exports = router;
