const express = require('express');
const router = express.Router();
const { requirePage } = require('../../middleware/authMiddleware');
const { validateBody, patternSchema } = require('../../utils/validators');
const patternController = require('../../controllers/patternController');

// POST /pattern-master - Add a new pattern
router.post('/', requirePage('pattern-master'), validateBody(patternSchema), patternController.createPattern);

// PUT /pattern-master/:id - Update a pattern
router.put('/:id', requirePage('pattern-master'), validateBody(patternSchema), patternController.updatePattern);

// DELETE /pattern-master/:id - Delete a pattern
router.delete('/:id', requirePage('pattern-master'), patternController.deletePattern);

module.exports = router;
