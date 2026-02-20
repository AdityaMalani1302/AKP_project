/**
 * IT Management - Software Routes
 * CRUD operations for IT_SoftwareList table
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { validateBody, itSoftwareSchema, itSoftwareHistorySchema } = require('../../utils/validators');
const logger = require('../../utils/logger');

// GET /software - Get all software
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                s.SoftwareId, s.SoftwareName, s.VendorPublisher, s.Category, s.Version,
                s.LicenseType, s.LicenseCountPurchased, s.LicenseCountInUse, s.LicenseStatus,
                s.LicenseExpiryDate, s.InstalledOnAssetId, a.AssetTagNumber AS InstalledOnAssetTag,
                s.Department, s.SoftwareStatus, s.Owner, s.Notes, s.UpdateDate,
                s.POContractReference, s.Cost, s.CreatedAt, s.UpdatedAt
            FROM IT_SoftwareList s
            LEFT JOIN IT_Asset a ON s.InstalledOnAssetId = a.AssetId
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                s.SoftwareName LIKE @search OR 
                s.VendorPublisher LIKE @search OR 
                s.Category LIKE @search
            `;
        }

        query += ' ORDER BY s.SoftwareId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching software list:', err);
        res.status(500).json({ error: 'Failed to fetch software list' });
    }
});

// POST /software - Create new software
router.post('/', validateBody(itSoftwareSchema), async (req, res) => {
    const {
        SoftwareName, VendorPublisher, Category, Version, LicenseType,
        LicenseCountPurchased, LicenseCountInUse, LicenseStatus, LicenseExpiryDate,
        InstalledOnAssetId, Department, SoftwareStatus, Owner, Notes, UpdateDate,
        POContractReference, Cost
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('SoftwareName', sql.NVarChar(255), SoftwareName || null);
        request.input('VendorPublisher', sql.NVarChar(255), VendorPublisher || null);
        request.input('Category', sql.NVarChar(50), Category || null);
        request.input('Version', sql.NVarChar(50), Version || null);
        request.input('LicenseType', sql.NVarChar(50), LicenseType || null);
        request.input('LicenseCountPurchased', sql.Int, LicenseCountPurchased || null);
        request.input('LicenseCountInUse', sql.Int, LicenseCountInUse || null);
        request.input('LicenseStatus', sql.NVarChar(50), LicenseStatus || null);
        request.input('LicenseExpiryDate', sql.Date, LicenseExpiryDate || null);
        request.input('InstalledOnAssetId', sql.Int, InstalledOnAssetId || null);
        request.input('Department', sql.NVarChar(100), Department || null);
        request.input('SoftwareStatus', sql.NVarChar(50), SoftwareStatus || null);
        request.input('Owner', sql.NVarChar(255), Owner || null);
        request.input('Notes', sql.NVarChar(500), Notes || null);
        request.input('UpdateDate', sql.Date, UpdateDate || null);
        request.input('POContractReference', sql.NVarChar(100), POContractReference || null);
        request.input('Cost', sql.NVarChar(100), Cost || null);

        const result = await request.query`
            INSERT INTO IT_SoftwareList (
                SoftwareName, VendorPublisher, Category, Version, LicenseType,
                LicenseCountPurchased, LicenseCountInUse, LicenseStatus, LicenseExpiryDate,
                InstalledOnAssetId, Department, SoftwareStatus, Owner, Notes, UpdateDate,
                POContractReference, Cost
            )
            OUTPUT INSERTED.SoftwareId
            VALUES (
                @SoftwareName, @VendorPublisher, @Category, @Version, @LicenseType,
                @LicenseCountPurchased, @LicenseCountInUse, @LicenseStatus, @LicenseExpiryDate,
                @InstalledOnAssetId, @Department, @SoftwareStatus, @Owner, @Notes, @UpdateDate,
                @POContractReference, @Cost
            )
        `;

        res.json({ success: true, message: 'Software added successfully', id: result.recordset[0].SoftwareId });
    } catch (err) {
        logger.error('Error adding software:', err);
        res.status(500).json({ error: 'Failed to add software' });
    }
});

// PUT /software/:id - Update software
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        SoftwareName, VendorPublisher, Category, Version, LicenseType,
        LicenseCountPurchased, LicenseCountInUse, LicenseStatus, LicenseExpiryDate,
        InstalledOnAssetId, Department, SoftwareStatus, Owner, Notes, UpdateDate,
        POContractReference, Cost
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('SoftwareName', sql.NVarChar(255), SoftwareName || null);
        request.input('VendorPublisher', sql.NVarChar(255), VendorPublisher || null);
        request.input('Category', sql.NVarChar(50), Category || null);
        request.input('Version', sql.NVarChar(50), Version || null);
        request.input('LicenseType', sql.NVarChar(50), LicenseType || null);
        request.input('LicenseCountPurchased', sql.Int, LicenseCountPurchased || null);
        request.input('LicenseCountInUse', sql.Int, LicenseCountInUse || null);
        request.input('LicenseStatus', sql.NVarChar(50), LicenseStatus || null);
        request.input('LicenseExpiryDate', sql.Date, LicenseExpiryDate || null);
        request.input('InstalledOnAssetId', sql.Int, InstalledOnAssetId || null);
        request.input('Department', sql.NVarChar(100), Department || null);
        request.input('SoftwareStatus', sql.NVarChar(50), SoftwareStatus || null);
        request.input('Owner', sql.NVarChar(255), Owner || null);
        request.input('Notes', sql.NVarChar(500), Notes || null);
        request.input('UpdateDate', sql.Date, UpdateDate || null);
        request.input('POContractReference', sql.NVarChar(100), POContractReference || null);
        request.input('Cost', sql.NVarChar(100), Cost || null);

        const result = await request.query`
            UPDATE IT_SoftwareList SET
                SoftwareName = @SoftwareName, VendorPublisher = @VendorPublisher, Category = @Category,
                Version = @Version, LicenseType = @LicenseType, LicenseCountPurchased = @LicenseCountPurchased,
                LicenseCountInUse = @LicenseCountInUse, LicenseStatus = @LicenseStatus,
                LicenseExpiryDate = @LicenseExpiryDate, InstalledOnAssetId = @InstalledOnAssetId,
                Department = @Department, SoftwareStatus = @SoftwareStatus, Owner = @Owner,
                Notes = @Notes, UpdateDate = @UpdateDate, POContractReference = @POContractReference,
                Cost = @Cost, UpdatedAt = SYSDATETIME()
            WHERE SoftwareId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Software not found' });
        }

        res.json({ success: true, message: 'Software updated successfully' });
    } catch (err) {
        logger.error('Error updating software:', err);
        res.status(500).json({ error: 'Failed to update software' });
    }
});

// DELETE /software/:id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM IT_SoftwareList WHERE SoftwareId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Software not found' });
        }

        res.json({ success: true, message: 'Software deleted successfully' });
    } catch (err) {
        logger.error('Error deleting software:', err);
        res.status(500).json({ error: 'Failed to delete software' });
    }
});

// =============================================
// Repair History Routes
// =============================================

// GET /software/repair-history - Get all repair history
router.get('/repair-history', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                r.RepairId, r.AssetId, a.AssetTagNumber, r.IssuedUserName, r.IssuedDepartment,
                r.IssuedBy, r.Date, r.IssueVendorName, r.DescriptionOfIssue, r.Remark,
                r.CreatedAt, r.UpdatedAt
            FROM IT_DeviceRepairedHistory r
            LEFT JOIN IT_Asset a ON r.AssetId = a.AssetId
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                a.AssetTagNumber LIKE @search OR 
                r.IssuedUserName LIKE @search OR 
                r.IssueVendorName LIKE @search
            `;
        }

        query += ' ORDER BY r.RepairId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching repair history:', err);
        res.status(500).json({ error: 'Failed to fetch repair history' });
    }
});

// POST /software/repair-history - Create new repair record
router.post('/repair-history', validateBody(itSoftwareHistorySchema), async (req, res) => {
    const { AssetId, IssuedUserName, IssuedDepartment, IssuedBy, Date, IssueVendorName, DescriptionOfIssue, Remark } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('AssetId', sql.Int, AssetId);
        request.input('IssuedUserName', sql.NVarChar(255), IssuedUserName || null);
        request.input('IssuedDepartment', sql.NVarChar(100), IssuedDepartment || null);
        request.input('IssuedBy', sql.NVarChar(255), IssuedBy || null);
        request.input('Date', sql.Date, Date || null);
        request.input('IssueVendorName', sql.NVarChar(255), IssueVendorName || null);
        request.input('DescriptionOfIssue', sql.NVarChar(1000), DescriptionOfIssue || null);
        request.input('Remark', sql.NVarChar(500), Remark || null);

        const result = await request.query`
            INSERT INTO IT_DeviceRepairedHistory (AssetId, IssuedUserName, IssuedDepartment, IssuedBy, Date, IssueVendorName, DescriptionOfIssue, Remark)
            OUTPUT INSERTED.RepairId
            VALUES (@AssetId, @IssuedUserName, @IssuedDepartment, @IssuedBy, @Date, @IssueVendorName, @DescriptionOfIssue, @Remark)
        `;

        res.json({ success: true, message: 'Repair record added successfully', id: result.recordset[0].RepairId });
    } catch (err) {
        logger.error('Error adding repair record:', err);
        res.status(500).json({ error: 'Failed to add repair record' });
    }
});

// PUT /software/repair-history/:id - Update repair record
router.put('/repair-history/:id', async (req, res) => {
    const { id } = req.params;
    const { AssetId, IssuedUserName, IssuedDepartment, IssuedBy, Date, IssueVendorName, DescriptionOfIssue, Remark } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('AssetId', sql.Int, AssetId);
        request.input('IssuedUserName', sql.NVarChar(255), IssuedUserName || null);
        request.input('IssuedDepartment', sql.NVarChar(100), IssuedDepartment || null);
        request.input('IssuedBy', sql.NVarChar(255), IssuedBy || null);
        request.input('Date', sql.Date, Date || null);
        request.input('IssueVendorName', sql.NVarChar(255), IssueVendorName || null);
        request.input('DescriptionOfIssue', sql.NVarChar(1000), DescriptionOfIssue || null);
        request.input('Remark', sql.NVarChar(500), Remark || null);

        const result = await request.query`
            UPDATE IT_DeviceRepairedHistory SET
                AssetId = @AssetId, IssuedUserName = @IssuedUserName, IssuedDepartment = @IssuedDepartment,
                IssuedBy = @IssuedBy, Date = @Date, IssueVendorName = @IssueVendorName,
                DescriptionOfIssue = @DescriptionOfIssue, Remark = @Remark, UpdatedAt = SYSDATETIME()
            WHERE RepairId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Repair record not found' });
        }

        res.json({ success: true, message: 'Repair record updated successfully' });
    } catch (err) {
        logger.error('Error updating repair record:', err);
        res.status(500).json({ error: 'Failed to update repair record' });
    }
});

// DELETE /software/repair-history/:id
router.delete('/repair-history/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM IT_DeviceRepairedHistory WHERE RepairId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Repair record not found' });
        }

        res.json({ success: true, message: 'Repair record deleted successfully' });
    } catch (err) {
        logger.error('Error deleting repair record:', err);
        res.status(500).json({ error: 'Failed to delete repair record' });
    }
});

module.exports = router;
