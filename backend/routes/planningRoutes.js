const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');

// GET /raw-materials - Get raw materials for Item Code dropdown
router.get('/raw-materials', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT RawMatCode, RawMatName, RawMatID
            FROM RawMaterial 
            WHERE Saleable = 'Y' AND GrnTypeId NOT IN (176, 181, 192, 193)
        `;

        if (search) {
            query += ` AND (RawMatName LIKE '%${search}%' OR RawMatCode LIKE '%${search}%')`;
        }

        query += ' ORDER BY RawMatCode';

        const result = await req.db.request().query(query);
        console.log(`Raw materials fetched: ${result.recordset.length} items`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching raw materials:', err);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// GET /raw-materials/all - Get ALL raw materials without filters (for debugging)
router.get('/raw-materials/all', async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT RawMatID, RawMatName, RawMatCode, Saleable, GrnTypeId
            FROM RawMaterial 
            ORDER BY RawMatID
        `);
        console.log(`All raw materials: ${result.recordset.length} items`);
        res.json({
            total: result.recordset.length,
            data: result.recordset.slice(0, 100)
        });
    } catch (err) {
        console.error('Error fetching all raw materials:', err);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// GET /planning-master - Get all planning schedules from PPC table
router.get('/planning-master', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                id as ID,
                ItemCode,
                CustName as CustomerName,
                SQty as ScheduleQty,
                PlanDate
            FROM PPC
        `;

        if (search) {
            query += ` WHERE 
                ItemCode LIKE '%${search}%' OR 
                CustName LIKE '%${search}%'
            `;
        }

        query += ' ORDER BY id ASC';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching planning schedules:', err);
        res.status(500).json({ error: 'Failed to fetch planning schedules' });
    }
});

// POST /planning-master - Create new planning schedule in PPC table
router.post('/planning-master', async (req, res) => {
    const { ItemCode, CustomerName, ScheduleQty, PlanDate } = req.body;

    // Validation
    if (!ItemCode || !CustomerName || !ScheduleQty || !PlanDate) {
        return res.status(400).json({
            error: 'Item Code, Customer Name, Schedule Qty, and Plan Date are required'
        });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));

        const result = await request.query`
            INSERT INTO PPC (ItemCode, CustName, SQty, PlanDate)
            OUTPUT INSERTED.id
            VALUES (@ItemCode, @CustName, @SQty, @PlanDate)
        `;

        const newId = result.recordset[0].id;
        res.json({
            success: true,
            message: 'Planning schedule added successfully',
            id: newId
        });
    } catch (err) {
        console.error('Error adding planning schedule:', err);
        res.status(500).json({ error: 'Failed to add planning schedule' });
    }
});

// PUT /planning-master/:id - Update existing planning schedule in PPC table
router.put('/planning-master/:id', async (req, res) => {
    const { id } = req.params;
    const { ItemCode, CustomerName, ScheduleQty, PlanDate } = req.body;

    // Validation
    if (!ItemCode || !CustomerName || !ScheduleQty || !PlanDate) {
        return res.status(400).json({
            error: 'Item Code, Customer Name, Schedule Qty, and Plan Date are required'
        });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));

        const result = await request.query`
            UPDATE PPC
            SET 
                ItemCode = @ItemCode,
                CustName = @CustName,
                SQty = @SQty,
                PlanDate = @PlanDate
            WHERE id = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        res.json({ success: true, message: 'Planning schedule updated successfully' });
    } catch (err) {
        console.error('Error updating planning schedule:', err);
        res.status(500).json({ error: 'Failed to update planning schedule' });
    }
});

// DELETE /planning-master/:id - Delete planning schedule from PPC table
router.delete('/planning-master/:id', async (req, res) => {
    const { id } = req.params;
    console.log('DELETE request received for ID:', id);

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM PPC WHERE id = @id
        `;

        console.log('Delete result - rows affected:', result.rowsAffected[0]);

        if (result.rowsAffected[0] === 0) {
            console.log('No rows deleted - ID not found:', id);
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        console.log('Successfully deleted schedule ID:', id);
        res.json({ success: true, message: 'Planning schedule deleted successfully' });
    } catch (err) {
        console.error('Error deleting planning schedule:', err);
        res.status(500).json({ error: 'Failed to delete planning schedule' });
    }
});

// GET /planning-entry - Get all planning entries
router.get('/planning-entry', async (req, res) => {
    try {
        // Ensure table exists
        await req.db.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PlanningEntry')
            CREATE TABLE PlanningEntry (
                EntryId INT IDENTITY(1,1) PRIMARY KEY,
                PlanDate DATE NOT NULL,
                PatternId NUMERIC(18, 0) NOT NULL,
                PatternNo VARCHAR(255),
                PartRowId INT,
                PartNo INT,
                ProductName VARCHAR(255),
                PlateQty INT NOT NULL,
                Shift INT NOT NULL,
                MouldBoxSize VARCHAR(50) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        const result = await req.db.request().query(`
            SELECT * FROM PlanningEntry ORDER BY EntryId DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching planning entries:', err);
        res.status(500).json({ error: 'Failed to fetch planning entries' });
    }
});

// POST /planning-entry - Create new planning entries (bulk insert)
router.post('/planning-entry', async (req, res) => {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: 'No entries provided' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        // Ensure table exists
        await new sql.Request(transaction).query(`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PlanningEntry')
            CREATE TABLE PlanningEntry (
                EntryId INT IDENTITY(1,1) PRIMARY KEY,
                PlanDate DATE NOT NULL,
                PatternId NUMERIC(18, 0) NOT NULL,
                PatternNo VARCHAR(255),
                PartRowId INT,
                PartNo INT,
                ProductName VARCHAR(255),
                PlateQty INT NOT NULL,
                Shift INT NOT NULL,
                MouldBoxSize VARCHAR(50) NOT NULL,
                CreatedAt DATETIME DEFAULT GETDATE()
            )
        `);

        // Insert each entry
        for (const entry of entries) {
            const request = new sql.Request(transaction);
            request.input('PlanDate', sql.Date, new Date(entry.planDate));
            request.input('PatternId', sql.Numeric(18, 0), entry.patternId);
            request.input('PatternNo', sql.VarChar(255), entry.patternNo || null);
            request.input('PartRowId', sql.Int, entry.partRowId || null);
            request.input('PartNo', sql.Int, entry.partNo || null);
            request.input('ProductName', sql.VarChar(255), entry.productName || null);
            request.input('PlateQty', sql.Int, entry.plateQty);
            request.input('Shift', sql.Int, entry.shift);
            request.input('MouldBoxSize', sql.VarChar(50), entry.mouldBoxSize);

            await request.query`
                INSERT INTO PlanningEntry (PlanDate, PatternId, PatternNo, PartRowId, PartNo, ProductName, PlateQty, Shift, MouldBoxSize)
                VALUES (@PlanDate, @PatternId, @PatternNo, @PartRowId, @PartNo, @ProductName, @PlateQty, @Shift, @MouldBoxSize)
            `;
        }

        await transaction.commit();

        res.json({
            success: true,
            message: `Successfully added ${entries.length} planning entries`
        });
    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error adding planning entries:', err);
        res.status(500).json({ error: 'Failed to add planning entries' });
    }
});

module.exports = router;
