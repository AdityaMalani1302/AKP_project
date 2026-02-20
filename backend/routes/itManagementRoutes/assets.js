/**
 * IT Management - Assets Routes
 * CRUD operations for IT_Asset table
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const { validateBody, itAssetSchema, itSystemUserSchema, itDeviceRepairSchema } = require('../../utils/validators');
const logger = require('../../utils/logger');

// GET /assets - Get all assets
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                AssetId, AssetTagNumber, AssetName, AssetType, Category,
                Manufacturer, Model, SerialNumber, Hostname, Location,
                Processor, RAM, StorageTypeCapacity, OperatingSystem, OSVersion,
                MACAddress, FirmwareVersion, NetworkSegmentVLAN, ServerType,
                PurchaseDate, VendorName, PONumber, InvoiceNumber, PurchaseCost,
                WarrantyStartDate, WarrantyEndDate, AMCDetails,
                AssetStatus, DeploymentDate, RetirementDate, DisposalMethod,
                SupportVendor, SupportContactDetails, Remark,
                LicenseDetails, AdditionalRemarks,
                CreatedBy, CreatedDate, ApprovedBy, ApprovalDate,
                CreatedAt, UpdatedAt
            FROM IT_Asset
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                AssetTagNumber LIKE @search OR 
                AssetName LIKE @search OR 
                SerialNumber LIKE @search OR
                Hostname LIKE @search OR
                Location LIKE @search
            `;
        }

        query += ' ORDER BY AssetId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching assets:', err);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// =============================================
// System User Details Routes (MUST be before /:id)
// =============================================

// GET /assets/system-users - Get all system user details
router.get('/system-users', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                s.Id, s.AssetId, a.AssetTagNumber, s.AssignedUser, s.SystemName,
                s.IPAddress, s.AssetOwner, s.Descriptions, s.IssueDate,
                s.CreatedAt, s.UpdatedAt
            FROM IT_SystemUserDetails s
            LEFT JOIN IT_Asset a ON s.AssetId = a.AssetId
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                a.AssetTagNumber LIKE @search OR 
                s.AssignedUser LIKE @search OR 
                s.SystemName LIKE @search
            `;
        }

        query += ' ORDER BY s.Id DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching system user details:', err);
        res.status(500).json({ error: 'Failed to fetch system user details' });
    }
});

// POST /assets/system-users - Create new system user detail
router.post('/system-users', validateBody(itSystemUserSchema), async (req, res) => {
    const { AssetId, AssignedUser, SystemName, IPAddress, AssetOwner, Descriptions, IssueDate } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('AssetId', sql.Int, AssetId);
        request.input('AssignedUser', sql.NVarChar(255), AssignedUser || null);
        request.input('SystemName', sql.NVarChar(100), SystemName || null);
        request.input('IPAddress', sql.NVarChar(50), IPAddress || null);
        request.input('AssetOwner', sql.NVarChar(255), AssetOwner || null);
        request.input('Descriptions', sql.NVarChar(500), Descriptions || null);
        request.input('IssueDate', sql.Date, IssueDate || null);

        const result = await request.query`
            INSERT INTO IT_SystemUserDetails (AssetId, AssignedUser, SystemName, IPAddress, AssetOwner, Descriptions, IssueDate)
            OUTPUT INSERTED.Id
            VALUES (@AssetId, @AssignedUser, @SystemName, @IPAddress, @AssetOwner, @Descriptions, @IssueDate)
        `;

        res.json({ success: true, message: 'System user detail added successfully', id: result.recordset[0].Id });
    } catch (err) {
        logger.error('Error adding system user detail:', err);
        res.status(500).json({ error: 'Failed to add system user detail' });
    }
});

// PUT /assets/system-users/:id - Update system user detail
router.put('/system-users/:id', async (req, res) => {
    const { id } = req.params;
    const { AssetId, AssignedUser, SystemName, IPAddress, AssetOwner, Descriptions, IssueDate } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('AssetId', sql.Int, AssetId);
        request.input('AssignedUser', sql.NVarChar(255), AssignedUser || null);
        request.input('SystemName', sql.NVarChar(100), SystemName || null);
        request.input('IPAddress', sql.NVarChar(50), IPAddress || null);
        request.input('AssetOwner', sql.NVarChar(255), AssetOwner || null);
        request.input('Descriptions', sql.NVarChar(500), Descriptions || null);
        request.input('IssueDate', sql.Date, IssueDate || null);

        const result = await request.query`
            UPDATE IT_SystemUserDetails SET
                AssetId = @AssetId, AssignedUser = @AssignedUser, SystemName = @SystemName,
                IPAddress = @IPAddress, AssetOwner = @AssetOwner, Descriptions = @Descriptions,
                IssueDate = @IssueDate, UpdatedAt = SYSDATETIME()
            WHERE Id = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'System user detail not found' });
        }

        res.json({ success: true, message: 'System user detail updated successfully' });
    } catch (err) {
        logger.error('Error updating system user detail:', err);
        res.status(500).json({ error: 'Failed to update system user detail' });
    }
});

// DELETE /assets/system-users/:id
router.delete('/system-users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM IT_SystemUserDetails WHERE Id = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'System user detail not found' });
        }

        res.json({ success: true, message: 'System user detail deleted successfully' });
    } catch (err) {
        logger.error('Error deleting system user detail:', err);
        res.status(500).json({ error: 'Failed to delete system user detail' });
    }
});

// =============================================
// Device Repaired History Routes (MUST be before /:id)
// =============================================

// GET /assets/device-repaired - Get all device repaired history
router.get('/device-repaired', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                r.RepairId, r.AssetId, a.AssetTagNumber, r.RepairDate, r.IssueDescription,
                r.ActionTaken, r.RepairedBy, r.RepairCost, r.VendorName, r.Status,
                r.Notes, r.CreatedAt, r.UpdatedAt
            FROM IT_DeviceRepairedHistory r
            LEFT JOIN IT_Asset a ON r.AssetId = a.AssetId
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                a.AssetTagNumber LIKE @search OR 
                r.IssueDescription LIKE @search OR 
                r.RepairedBy LIKE @search
            `;
        }

        query += ' ORDER BY r.RepairId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching device repaired history:', err);
        res.status(500).json({ error: 'Failed to fetch device repaired history' });
    }
});

// POST /assets/device-repaired - Create new repair record
router.post('/device-repaired', validateBody(itDeviceRepairSchema), async (req, res) => {
    const { AssetId, RepairDate, IssueDescription, ActionTaken, RepairedBy, RepairCost, VendorName, Status, Notes } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('AssetId', sql.Int, AssetId);
        request.input('RepairDate', sql.Date, RepairDate || null);
        request.input('IssueDescription', sql.NVarChar(1000), IssueDescription || null);
        request.input('ActionTaken', sql.NVarChar(1000), ActionTaken || null);
        request.input('RepairedBy', sql.NVarChar(255), RepairedBy || null);
        request.input('RepairCost', sql.Decimal(18, 2), RepairCost || null);
        request.input('VendorName', sql.NVarChar(255), VendorName || null);
        request.input('Status', sql.NVarChar(50), Status || null);
        request.input('Notes', sql.NVarChar(500), Notes || null);

        const result = await request.query`
            INSERT INTO IT_DeviceRepairedHistory (AssetId, RepairDate, IssueDescription, ActionTaken, RepairedBy, RepairCost, VendorName, Status, Notes)
            OUTPUT INSERTED.RepairId
            VALUES (@AssetId, @RepairDate, @IssueDescription, @ActionTaken, @RepairedBy, @RepairCost, @VendorName, @Status, @Notes)
        `;

        res.json({ success: true, message: 'Repair record added successfully', id: result.recordset[0].RepairId });
    } catch (err) {
        logger.error('Error adding repair record:', err);
        res.status(500).json({ error: 'Failed to add repair record' });
    }
});

// PUT /assets/device-repaired/:id - Update repair record
router.put('/device-repaired/:id', async (req, res) => {
    const { id } = req.params;
    const { AssetId, RepairDate, IssueDescription, ActionTaken, RepairedBy, RepairCost, VendorName, Status, Notes } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('AssetId', sql.Int, AssetId);
        request.input('RepairDate', sql.Date, RepairDate || null);
        request.input('IssueDescription', sql.NVarChar(1000), IssueDescription || null);
        request.input('ActionTaken', sql.NVarChar(1000), ActionTaken || null);
        request.input('RepairedBy', sql.NVarChar(255), RepairedBy || null);
        request.input('RepairCost', sql.Decimal(18, 2), RepairCost || null);
        request.input('VendorName', sql.NVarChar(255), VendorName || null);
        request.input('Status', sql.NVarChar(50), Status || null);
        request.input('Notes', sql.NVarChar(500), Notes || null);

        const result = await request.query`
            UPDATE IT_DeviceRepairedHistory SET
                AssetId = @AssetId, RepairDate = @RepairDate, IssueDescription = @IssueDescription,
                ActionTaken = @ActionTaken, RepairedBy = @RepairedBy, RepairCost = @RepairCost,
                VendorName = @VendorName, Status = @Status, Notes = @Notes, UpdatedAt = SYSDATETIME()
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

// DELETE /assets/device-repaired/:id
router.delete('/device-repaired/:id', async (req, res) => {
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

// =============================================
// Single Asset by ID (MUST be after specific routes)
// =============================================

// GET /assets/:id - Get single asset
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM IT_Asset WHERE AssetId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching asset:', err);
        res.status(500).json({ error: 'Failed to fetch asset' });
    }
});

// POST /assets - Create new asset
router.post('/', validateBody(itAssetSchema), async (req, res) => {
    const {
        AssetTagNumber, AssetName, AssetType, Category, Manufacturer, Model,
        SerialNumber, Hostname, Location, Processor, RAM, StorageTypeCapacity,
        OperatingSystem, OSVersion, MACAddress, FirmwareVersion, NetworkSegmentVLAN,
        ServerType, PurchaseDate, VendorName, PONumber, InvoiceNumber, PurchaseCost,
        WarrantyStartDate, WarrantyEndDate, AMCDetails, AssetStatus, DeploymentDate,
        RetirementDate, DisposalMethod, SupportVendor, SupportContactDetails, Remark,
        LicenseDetails, AdditionalRemarks, CreatedBy, CreatedDate, ApprovedBy, ApprovalDate
    } = req.body;

    try {
        // Check for duplicate AssetTagNumber
        if (AssetTagNumber) {
            const checkRequest = new sql.Request(req.db);
            checkRequest.input('AssetTagNumber', sql.NVarChar(50), AssetTagNumber);
            const existingCheck = await checkRequest.query`
                SELECT AssetId FROM IT_Asset WHERE AssetTagNumber = @AssetTagNumber
            `;
            if (existingCheck.recordset.length > 0) {
                return res.status(400).json({ error: 'An asset with this Tag Number already exists.' });
            }
        }

        const request = new sql.Request(req.db);

        request.input('AssetTagNumber', sql.NVarChar(50), AssetTagNumber || null);
        request.input('AssetName', sql.NVarChar(255), AssetName || null);
        request.input('AssetType', sql.NVarChar(50), AssetType || null);
        request.input('Category', sql.NVarChar(50), Category || null);
        request.input('Manufacturer', sql.NVarChar(100), Manufacturer || null);
        request.input('Model', sql.NVarChar(100), Model || null);
        request.input('SerialNumber', sql.NVarChar(100), SerialNumber || null);
        request.input('Hostname', sql.NVarChar(100), Hostname || null);
        request.input('Location', sql.NVarChar(255), Location || null);
        request.input('Processor', sql.NVarChar(100), Processor || null);
        request.input('RAM', sql.NVarChar(50), RAM || null);
        request.input('StorageTypeCapacity', sql.NVarChar(100), StorageTypeCapacity || null);
        request.input('OperatingSystem', sql.NVarChar(100), OperatingSystem || null);
        request.input('OSVersion', sql.NVarChar(50), OSVersion || null);
        request.input('MACAddress', sql.NVarChar(50), MACAddress || null);
        request.input('FirmwareVersion', sql.NVarChar(50), FirmwareVersion || null);
        request.input('NetworkSegmentVLAN', sql.NVarChar(50), NetworkSegmentVLAN || null);
        request.input('ServerType', sql.NVarChar(50), ServerType || null);
        request.input('PurchaseDate', sql.Date, PurchaseDate || null);
        request.input('VendorName', sql.NVarChar(255), VendorName || null);
        request.input('PONumber', sql.NVarChar(100), PONumber || null);
        request.input('InvoiceNumber', sql.NVarChar(100), InvoiceNumber || null);
        request.input('PurchaseCost', sql.Decimal(18, 2), PurchaseCost || null);
        request.input('WarrantyStartDate', sql.Date, WarrantyStartDate || null);
        request.input('WarrantyEndDate', sql.Date, WarrantyEndDate || null);
        request.input('AMCDetails', sql.NVarChar(500), AMCDetails || null);
        request.input('AssetStatus', sql.NVarChar(50), AssetStatus || null);
        request.input('DeploymentDate', sql.Date, DeploymentDate || null);
        request.input('RetirementDate', sql.Date, RetirementDate || null);
        request.input('DisposalMethod', sql.NVarChar(50), DisposalMethod || null);
        request.input('SupportVendor', sql.NVarChar(255), SupportVendor || null);
        request.input('SupportContactDetails', sql.NVarChar(255), SupportContactDetails || null);
        request.input('Remark', sql.NVarChar(500), Remark || null);
        request.input('LicenseDetails', sql.NVarChar(500), LicenseDetails || null);
        request.input('AdditionalRemarks', sql.NVarChar(1000), AdditionalRemarks || null);
        request.input('CreatedBy', sql.NVarChar(100), CreatedBy || null);
        request.input('CreatedDate', sql.DateTime2, CreatedDate || null);
        request.input('ApprovedBy', sql.NVarChar(100), ApprovedBy || null);
        request.input('ApprovalDate', sql.DateTime2, ApprovalDate || null);

        const result = await request.query`
            INSERT INTO IT_Asset (
                AssetTagNumber, AssetName, AssetType, Category, Manufacturer, Model,
                SerialNumber, Hostname, Location, Processor, RAM, StorageTypeCapacity,
                OperatingSystem, OSVersion, MACAddress, FirmwareVersion, NetworkSegmentVLAN,
                ServerType, PurchaseDate, VendorName, PONumber, InvoiceNumber, PurchaseCost,
                WarrantyStartDate, WarrantyEndDate, AMCDetails, AssetStatus, DeploymentDate,
                RetirementDate, DisposalMethod, SupportVendor, SupportContactDetails, Remark,
                LicenseDetails, AdditionalRemarks, CreatedBy, CreatedDate, ApprovedBy, ApprovalDate
            )
            OUTPUT INSERTED.AssetId
            VALUES (
                @AssetTagNumber, @AssetName, @AssetType, @Category, @Manufacturer, @Model,
                @SerialNumber, @Hostname, @Location, @Processor, @RAM, @StorageTypeCapacity,
                @OperatingSystem, @OSVersion, @MACAddress, @FirmwareVersion, @NetworkSegmentVLAN,
                @ServerType, @PurchaseDate, @VendorName, @PONumber, @InvoiceNumber, @PurchaseCost,
                @WarrantyStartDate, @WarrantyEndDate, @AMCDetails, @AssetStatus, @DeploymentDate,
                @RetirementDate, @DisposalMethod, @SupportVendor, @SupportContactDetails, @Remark,
                @LicenseDetails, @AdditionalRemarks, @CreatedBy, @CreatedDate, @ApprovedBy, @ApprovalDate
            )
        `;

        const newId = result.recordset[0].AssetId;
        res.json({
            success: true,
            message: 'Asset added successfully',
            id: newId
        });
    } catch (err) {
        logger.error('Error adding asset:', err);
        res.status(500).json({ error: 'Failed to add asset' });
    }
});

// PUT /assets/:id - Update asset
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        AssetTagNumber, AssetName, AssetType, Category, Manufacturer, Model,
        SerialNumber, Hostname, Location, Processor, RAM, StorageTypeCapacity,
        OperatingSystem, OSVersion, MACAddress, FirmwareVersion, NetworkSegmentVLAN,
        ServerType, PurchaseDate, VendorName, PONumber, InvoiceNumber, PurchaseCost,
        WarrantyStartDate, WarrantyEndDate, AMCDetails, AssetStatus, DeploymentDate,
        RetirementDate, DisposalMethod, SupportVendor, SupportContactDetails, Remark,
        LicenseDetails, AdditionalRemarks, CreatedBy, CreatedDate, ApprovedBy, ApprovalDate
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        request.input('AssetTagNumber', sql.NVarChar(50), AssetTagNumber || null);
        request.input('AssetName', sql.NVarChar(255), AssetName || null);
        request.input('AssetType', sql.NVarChar(50), AssetType || null);
        request.input('Category', sql.NVarChar(50), Category || null);
        request.input('Manufacturer', sql.NVarChar(100), Manufacturer || null);
        request.input('Model', sql.NVarChar(100), Model || null);
        request.input('SerialNumber', sql.NVarChar(100), SerialNumber || null);
        request.input('Hostname', sql.NVarChar(100), Hostname || null);
        request.input('Location', sql.NVarChar(255), Location || null);
        request.input('Processor', sql.NVarChar(100), Processor || null);
        request.input('RAM', sql.NVarChar(50), RAM || null);
        request.input('StorageTypeCapacity', sql.NVarChar(100), StorageTypeCapacity || null);
        request.input('OperatingSystem', sql.NVarChar(100), OperatingSystem || null);
        request.input('OSVersion', sql.NVarChar(50), OSVersion || null);
        request.input('MACAddress', sql.NVarChar(50), MACAddress || null);
        request.input('FirmwareVersion', sql.NVarChar(50), FirmwareVersion || null);
        request.input('NetworkSegmentVLAN', sql.NVarChar(50), NetworkSegmentVLAN || null);
        request.input('ServerType', sql.NVarChar(50), ServerType || null);
        request.input('PurchaseDate', sql.Date, PurchaseDate || null);
        request.input('VendorName', sql.NVarChar(255), VendorName || null);
        request.input('PONumber', sql.NVarChar(100), PONumber || null);
        request.input('InvoiceNumber', sql.NVarChar(100), InvoiceNumber || null);
        request.input('PurchaseCost', sql.Decimal(18, 2), PurchaseCost || null);
        request.input('WarrantyStartDate', sql.Date, WarrantyStartDate || null);
        request.input('WarrantyEndDate', sql.Date, WarrantyEndDate || null);
        request.input('AMCDetails', sql.NVarChar(500), AMCDetails || null);
        request.input('AssetStatus', sql.NVarChar(50), AssetStatus || null);
        request.input('DeploymentDate', sql.Date, DeploymentDate || null);
        request.input('RetirementDate', sql.Date, RetirementDate || null);
        request.input('DisposalMethod', sql.NVarChar(50), DisposalMethod || null);
        request.input('SupportVendor', sql.NVarChar(255), SupportVendor || null);
        request.input('SupportContactDetails', sql.NVarChar(255), SupportContactDetails || null);
        request.input('Remark', sql.NVarChar(500), Remark || null);
        request.input('LicenseDetails', sql.NVarChar(500), LicenseDetails || null);
        request.input('AdditionalRemarks', sql.NVarChar(1000), AdditionalRemarks || null);
        request.input('CreatedBy', sql.NVarChar(100), CreatedBy || null);
        request.input('CreatedDate', sql.DateTime2, CreatedDate || null);
        request.input('ApprovedBy', sql.NVarChar(100), ApprovedBy || null);
        request.input('ApprovalDate', sql.DateTime2, ApprovalDate || null);

        const result = await request.query`
            UPDATE IT_Asset SET
                AssetTagNumber = @AssetTagNumber, AssetName = @AssetName, AssetType = @AssetType,
                Category = @Category, Manufacturer = @Manufacturer, Model = @Model,
                SerialNumber = @SerialNumber, Hostname = @Hostname, Location = @Location,
                Processor = @Processor, RAM = @RAM, StorageTypeCapacity = @StorageTypeCapacity,
                OperatingSystem = @OperatingSystem, OSVersion = @OSVersion, MACAddress = @MACAddress,
                FirmwareVersion = @FirmwareVersion, NetworkSegmentVLAN = @NetworkSegmentVLAN,
                ServerType = @ServerType, PurchaseDate = @PurchaseDate, VendorName = @VendorName,
                PONumber = @PONumber, InvoiceNumber = @InvoiceNumber, PurchaseCost = @PurchaseCost,
                WarrantyStartDate = @WarrantyStartDate, WarrantyEndDate = @WarrantyEndDate,
                AMCDetails = @AMCDetails, AssetStatus = @AssetStatus, DeploymentDate = @DeploymentDate,
                RetirementDate = @RetirementDate, DisposalMethod = @DisposalMethod,
                SupportVendor = @SupportVendor, SupportContactDetails = @SupportContactDetails,
                Remark = @Remark, LicenseDetails = @LicenseDetails, AdditionalRemarks = @AdditionalRemarks,
                CreatedBy = @CreatedBy, CreatedDate = @CreatedDate, ApprovedBy = @ApprovedBy,
                ApprovalDate = @ApprovalDate, UpdatedAt = SYSDATETIME()
            WHERE AssetId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({ success: true, message: 'Asset updated successfully' });
    } catch (err) {
        logger.error('Error updating asset:', err);
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// DELETE /assets/:id - Delete asset
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM IT_Asset WHERE AssetId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Asset not found' });
        }

        res.json({ success: true, message: 'Asset deleted successfully' });
    } catch (err) {
        logger.error('Error deleting asset:', err);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});


module.exports = router;

