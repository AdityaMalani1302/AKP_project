/**
 * IT Management Routes - Index
 * Combines all IT management sub-routers while maintaining original API paths
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { cacheMiddleware } = require('../../utils/cache');
const logger = require('../../utils/logger');

// Import sub-routers
const assetsRouter = require('./assets');
const softwareRouter = require('./software');
const complaintsRouter = require('./complaints');
const issuedMaterialRouter = require('./issuedMaterial');

/**
 * Helper middleware to forward routes to a sub-router
 * @param {Router} targetRouter - The router to forward to
 * @param {string} basePath - The base path to prepend to the URL
 */
const forwardToRouter = (targetRouter, basePath) => (req, res, next) => {
    // Preserve query string if present
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = basePath + queryString;
    targetRouter(req, res, next);
};

const forwardToRouterWithId = (targetRouter, basePath) => (req, res, next) => {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    req.url = basePath + '/' + req.params.id + queryString;
    targetRouter(req, res, next);
};

// =============================================
// Stats Route (cached 60 seconds)
// =============================================
router.get('/stats', cacheMiddleware('it-stats', 60), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        const result = await request.query`
            SELECT 
                (SELECT COUNT(*) FROM IT_Asset) AS TotalAssets,
                (SELECT COUNT(*) FROM IT_Asset WHERE AssetStatus = 'Active') AS ActiveAssets,
                (SELECT COUNT(*) FROM IT_SoftwareList) AS TotalSoftware,
                (SELECT COUNT(*) FROM IT_Complaint WHERE Status = 'Open' OR Status = 'Pending') AS OpenComplaints
        `;
        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching IT stats:', err);
        res.status(500).json({ error: 'Failed to fetch IT stats' });
    }
});

// =============================================
// Mount Sub-Routers
// =============================================

// Assets routes: /assets, /assets/:id, etc.
router.use('/assets', assetsRouter);

// System Users: forward to assets router's /system-users routes
router.use('/system-users/:id', forwardToRouterWithId(assetsRouter, '/system-users'));
router.use('/system-users', forwardToRouter(assetsRouter, '/system-users'));

// Device Repaired: forward to assets router's /device-repaired routes
router.use('/device-repaired/:id', forwardToRouterWithId(assetsRouter, '/device-repaired'));
router.use('/device-repaired', forwardToRouter(assetsRouter, '/device-repaired'));

// Software routes: /software, /software/:id, etc.
router.use('/software', softwareRouter);

// Repair History: forward to software router's /repair-history routes
router.use('/repair-history/:id', forwardToRouterWithId(softwareRouter, '/repair-history'));
router.use('/repair-history', forwardToRouter(softwareRouter, '/repair-history'));

// Complaints routes: /complaints, /complaints/:id, etc.
router.use('/complaints', complaintsRouter);

// Resolved: forward to complaints router's /resolved routes
router.use('/resolved/:id', forwardToRouterWithId(complaintsRouter, '/resolved'));
router.use('/resolved', forwardToRouter(complaintsRouter, '/resolved'));

// Issued Material routes: /issued-material, /issued-material/:id, etc.
router.use('/issued-material', issuedMaterialRouter);

module.exports = router;
