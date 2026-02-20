const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../config/db');
const { cacheMiddleware } = require('../utils/cache');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// --- Helper Routes (Dropdowns & Tables) ---

// 4. Get All Tables (with optional database selection)
router.get('/tables', async (req, res) => {
    try {
        const database = req.query.database || DB.DEFAULT_POOL;
        const pool = getPool(database);
        
        if (!pool) {
            return res.status(400).json({ error: `Database '${database}' is not available` });
        }

        const result = await pool.request().query`
            SELECT name AS TABLE_NAME 
            FROM sys.tables 
            WHERE name != 'sysdiagrams'
        `;
        const tables = result.recordset.map(row => row.TABLE_NAME);
        res.json(tables);
    } catch (err) {
        logger.error('Error fetching tables:', err);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// Whitelist of allowed tables for security
const ALLOWED_TABLES = [
    'Customer', 'Product', 'Invent_Supplier', 'RawMaterial', 'Grade',
    'PatternMaster', 'LabMaster', 'Users', 'ICSOFT', 'PatternCavityMaster',
    'SleeveMaster', 'PatternReturnHistory', 'PatternReturnParts',
    'DrawingMaster', 'Marketing_RFQ', 'Marketing_Laboratory', 'Marketing_Patternshop',
    'Marketing_RFQMaster', 'IT_Assets', 'IT_Complaints', 'IT_SoftwareList',
    'IT_IssuedMaterial', 'IT_SystemUserDetails', 'IT_DeviceRepairedHistory',
    'PlanningMaster', 'PlanningEntry', 'ReportTemplates', 'ReportSchedules',
    'Lab_PhysicalProperties', 'Lab_Micro', 'Lab_Sand', 'Lab_Spectro', 'MouldHardness'
];

// 5. Get Table Data (Paginated, with optional database selection)
router.get('/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const database = req.query.database || 'IcSoftVer3';

    try {
        // Validate table name against whitelist
        if (!ALLOWED_TABLES.includes(tableName)) {
            return res.status(400).json({ error: 'Invalid or unauthorized table name' });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name format' });
        }

        const pool = getPool(database);
        
        if (!pool) {
            return res.status(400).json({ error: `Database '${database}' is not available` });
        }

        // Get total count
        const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM [${tableName}]`);
        const total = countResult.recordset[0].total;

        // Get paginated data
        const result = await pool.request().query(`
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS RowNum
                FROM [${tableName}]
            ) AS t
            WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
        `);

        const data = result.recordset.map(row => {
            const { RowNum, ...rest } = row;
            return rest;
        });

        res.json({
            data: data,
            total,
            page,
            limit
        });
    } catch (err) {
        logger.error(`Error fetching data for ${tableName}:`, err);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
});

// 6. Get Customers for dropdown (with search) - cached for 5 minutes
router.get('/customers', cacheMiddleware('customers', 300), async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT CustId, CustName FROM Customer';
        const request = req.db.request();

        if (search) {
            query += ' WHERE CustName LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY CustName';

        const result = await request.query(query);
        
        // Cache for 5 minutes for dropdown data (static-ish)
        if (!search) {
            res.set('Cache-Control', 'public, max-age=300');
        }
        
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// 7. Get Products for dropdown (with search) - cached for 5 minutes
router.get('/products', cacheMiddleware('products', 300), async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT
                p.ProdId, 
                p.ProdName, 
                LTRIM(RTRIM(ISNULL(p.InternalPartNo, ''))) as InternalPartNo,
                p.Gid as GradeId,
                g.GradeName
            FROM Product p
            LEFT JOIN Grade g ON p.Gid = g.GradeId
        `;
        const request = req.db.request();

        if (search) {
            query += ' WHERE p.InternalPartNo LIKE @search OR p.ProdName LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += `
            ORDER BY 
                CASE 
                    WHEN p.InternalPartNo IS NULL OR p.InternalPartNo = '' THEN 1 
                    ELSE 0 
                END,
                p.InternalPartNo
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// 8. Get Suppliers (Pattern Makers) - cached for 5 minutes
router.get('/suppliers', cacheMiddleware('suppliers', 300), async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT SupId, SupName FROM Invent_Supplier';
        const request = req.db.request();

        if (search) {
            query += ' WHERE SupName LIKE @search';
            request.input('search', sql.NVarChar, '%' + search + '%');
        }

        query += ' ORDER BY SupName';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching suppliers:', err);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get Sleeves (cached for 10 minutes - static data)
router.get('/sleeves', cacheMiddleware('sleeves', 600), async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT RawMatID, RawMatName 
            FROM RawMaterial 
            WHERE GrnTypeId = 141
            ORDER BY RawMatName
        `;
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching sleeves:', err);
        res.status(500).json({ error: 'Failed to fetch sleeves' });
    }
});

// Get Grades (cached for 10 minutes - rarely changes)
router.get('/grades', cacheMiddleware('grades', 600), async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT GradeId, GradeName 
            FROM Grade 
            ORDER BY GradeName
        `;
        // Cache grades for 10 minutes - rarely changes
        res.set('Cache-Control', 'public, max-age=600');
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching grades:', err);
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});

module.exports = router;
