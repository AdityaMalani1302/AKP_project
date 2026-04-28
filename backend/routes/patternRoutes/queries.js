const express = require('express');
const router = express.Router();
const { requirePage } = require('../../middleware/authMiddleware');
const { cacheMiddleware } = require('../../utils/cache');
const patternController = require('../../controllers/patternController');

// GET /pattern-master/stats - Get pattern stats summary (cached 60 sec)
router.get('/stats', requirePage('pattern-master'), cacheMiddleware('pattern-stats', 60), patternController.getStats);

// GET /pattern-master/unified-data - Get unified pattern data with ALL columns
router.get('/unified-data', requirePage('pattern-master'), patternController.getUnifiedData);

// GET /pattern-master/numbers - Get pattern numbers for dropdown (cached 5 min)
router.get('/numbers', requirePage('pattern-master'), cacheMiddleware('pattern-numbers', 300), patternController.getPatternNumbers);

// GET /pattern-master/:id - Get single pattern with parts and sleeves
router.get('/:id', requirePage('pattern-master'), patternController.getPatternById);

// GET /pattern-master - Get all patterns (Must be last to avoid wildcard match issues if any)
router.get('/', requirePage('pattern-master'), patternController.getAllPatterns);

module.exports = router;
