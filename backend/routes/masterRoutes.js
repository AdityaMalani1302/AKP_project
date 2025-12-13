const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// --- Helper Routes (Dropdowns & Tables) ---

// 4. Get All Tables
router.get('/tables', async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT name AS TABLE_NAME 
            FROM sys.tables 
            WHERE name != 'sysdiagrams'
        `;
        const tables = result.recordset.map(row => row.TABLE_NAME);
        res.json(tables);
    } catch (err) {
        console.error('Error fetching tables:', err);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// 5. Get Table Data (Paginated)
router.get('/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // Get total count
        const countResult = await req.db.request().query(`SELECT COUNT(*) as total FROM [${tableName}]`);
        const total = countResult.recordset[0].total;

        // Get paginated data
        const result = await req.db.request().query(`
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
        console.error(`Error fetching data for ${tableName}:`, err);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
});

// 6. Get Customers for dropdown (with search)
router.get('/customers', async (req, res) => {
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
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// 7. Get Products for dropdown (with search)
router.get('/products', async (req, res) => {
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
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// 8. Get Suppliers (Pattern Makers)
router.get('/suppliers', async (req, res) => {
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
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get Sleeves
router.get('/sleeves', async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT RawMatID, RawMatName 
            FROM RawMaterial 
            WHERE GrnTypeId = 141
            ORDER BY RawMatName
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching sleeves:', err);
        res.status(500).json({ error: 'Failed to fetch sleeves' });
    }
});

// Get Grades
router.get('/grades', async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT GradeId, GradeName 
            FROM Grade 
            ORDER BY GradeName
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching grades:', err);
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});

module.exports = router;
