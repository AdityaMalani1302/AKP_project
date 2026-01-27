const express = require('express');
const router = express.Router();
const { cacheMiddleware } = require('../../utils/cache');
const patternController = require('../../controllers/patternController');

// GET /pattern-master/stats - Get pattern stats summary (cached 60 sec)
router.get('/stats', cacheMiddleware('pattern-stats', 60), patternController.getStats);

// GET /pattern-master/unified-data - Get unified pattern data with ALL columns
router.get('/unified-data', patternController.getUnifiedData);

// GET /pattern-master/numbers - Get pattern numbers for dropdown (cached 5 min)
router.get('/numbers', cacheMiddleware('pattern-numbers', 300), patternController.getPatternNumbers);

// GET /pattern-master/:id - Get single pattern with parts and sleeves
router.get('/:id', patternController.getPatternById);

// GET /pattern-master - Get all patterns (Must be last to avoid wildcard match issues if any)
router.get('/', patternController.getAllPatterns);

module.exports = router;
