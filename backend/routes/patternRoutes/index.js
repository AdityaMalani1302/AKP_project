/**
 * Pattern Routes - Main Index
 * Combines all pattern route modules into a single router
 * 
 * Structure:
 * - queries.js:       GET endpoints for patterns (stats, list, unified-data, numbers, single)
 * - crud.js:          POST, PUT, DELETE for patterns
 * - returnHistory.js: Pattern return history endpoints
 * - parts.js:         Parts/cavities management
 * - sleeves.js:       Sleeves management
 */
const express = require('express');
const router = express.Router();

// Import route modules
const queriesRoutes = require('./queries');
const crudRoutes = require('./crud');
const returnHistoryRoutes = require('./returnHistory');
const partsRoutes = require('./parts');
const sleevesRoutes = require('./sleeves');

// Mount return history routes at /return-history first
// IMPORTANT: Must come BEFORE queriesRoutes which has /:id wildcard that would match 'return-history'
router.use('/return-history', returnHistoryRoutes);

// Mount query routes (stats, list, unified-data, numbers, single pattern)
// Note: /:id route is at the end of this file, so specific paths above must come first
router.use('/', queriesRoutes);

// Mount CRUD routes (POST, PUT, DELETE) 
// Note: These also define /:id routes, so order matters
router.use('/', crudRoutes);

// Mount parts routes
// /parts-by-pattern/:patternId -> /parts/by-pattern/:patternId
router.use('/parts-by-pattern', (req, res, next) => {
    // Redirect old route format to new format
    req.url = '/by-pattern' + req.url;
    partsRoutes(req, res, next);
});
router.use('/data/parts', partsRoutes);

// Mount sleeves routes
// /sleeves-by-pattern/:patternId -> /sleeves/by-pattern/:patternId
router.use('/sleeves-by-pattern', (req, res, next) => {
    // Redirect old route format to new format
    req.url = '/by-pattern' + req.url;
    sleevesRoutes(req, res, next);
});
router.use('/data/sleeves', sleevesRoutes);

module.exports = router;
