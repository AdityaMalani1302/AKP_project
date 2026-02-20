/**
 * Marketing Module Routes
 * CRUD operations for Marketing_RFQ, Marketing_Laboratory, Marketing_Patternshop tables
 */
const express = require('express');
const router = express.Router();
const { sql } = require('../config/db');
const logger = require('../utils/logger');
const { 
    validateBody, 
    marketingRFQSchema, 
    marketingLaboratorySchema, 
    marketingPatternshopSchema, 
    marketingRFQMasterSchema 
} = require('../utils/validators');

// =====================================================
// RFQ ROUTES
// =====================================================

// GET /rfq/next-number - Get next RFQ number (MUST be before /rfq/:id)
router.get('/rfq/next-number', async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT ISNULL(MAX(RFQId), 0) + 1 AS NextNumber FROM Marketing_RFQ
        `);
        const nextNumber = result.recordset[0].NextNumber;
        const rfqNo = `RFQ-${String(nextNumber).padStart(3, '0')}`;
        res.json({ nextNumber, rfqNo });
    } catch (err) {
        logger.error('Error getting next RFQ number:', err);
        res.status(500).json({ error: 'Failed to get next RFQ number' });
    }
});

// GET /rfq - Get all RFQs
router.get('/rfq', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                RFQId, RFQNo, PartNo, MachiningDrawingNo, PartName,
                DrawingMatGrade, BOMQty, FY2026, DrgWt, CastingPartWt,
                Status, CreatedBy, CreatedAt, UpdatedAt
            FROM Marketing_RFQ
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                RFQNo LIKE @search OR 
                PartNo LIKE @search OR 
                PartName LIKE @search OR
                DrawingMatGrade LIKE @search
            `;
        }

        query += ' ORDER BY RFQId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching RFQs:', err);
        res.status(500).json({ error: 'Failed to fetch RFQs' });
    }
});

// GET /rfq/:id - Get single RFQ
router.get('/rfq/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM Marketing_RFQ WHERE RFQId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'RFQ not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching RFQ:', err);
        res.status(500).json({ error: 'Failed to fetch RFQ' });
    }
});

// POST /rfq - Create new RFQ
router.post('/rfq', validateBody(marketingRFQSchema), async (req, res) => {
    const {
        RFQNo, PartNo, MachiningDrawingNo, PartName,
        DrawingMatGrade, BOMQty, FY2026, DrgWt, CastingPartWt
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('RFQNo', sql.NVarChar(50), RFQNo);
        request.input('PartNo', sql.NVarChar(100), PartNo || null);
        request.input('MachiningDrawingNo', sql.NVarChar(100), MachiningDrawingNo || null);
        request.input('PartName', sql.NVarChar(255), PartName || null);
        request.input('DrawingMatGrade', sql.NVarChar(100), DrawingMatGrade || null);
        request.input('BOMQty', sql.Decimal(18, 2), BOMQty || null);
        request.input('FY2026', sql.NVarChar(100), FY2026 || null);
        request.input('DrgWt', sql.Decimal(18, 4), DrgWt || null);
        request.input('CastingPartWt', sql.Decimal(18, 4), CastingPartWt || null);
        request.input('CreatedBy', sql.NVarChar(100), req.user?.username || null);

        const result = await request.query`
            INSERT INTO Marketing_RFQ (
                RFQNo, PartNo, MachiningDrawingNo, PartName,
                DrawingMatGrade, BOMQty, FY2026, DrgWt, CastingPartWt, CreatedBy
            )
            OUTPUT INSERTED.RFQId, INSERTED.RFQNo
            VALUES (
                @RFQNo, @PartNo, @MachiningDrawingNo, @PartName,
                @DrawingMatGrade, @BOMQty, @FY2026, @DrgWt, @CastingPartWt, @CreatedBy
            )
        `;

        res.json({ 
            success: true, 
            message: 'RFQ created successfully', 
            id: result.recordset[0].RFQId,
            rfqNo: result.recordset[0].RFQNo
        });
    } catch (err) {
        logger.error('Error creating RFQ:', err);
        if (err.message.includes('UNIQUE KEY')) {
            return res.status(400).json({ error: 'RFQ No already exists' });
        }
        res.status(500).json({ error: 'Failed to create RFQ' });
    }
});

// PUT /rfq/:id - Update RFQ
router.put('/rfq/:id', async (req, res) => {
    const { id } = req.params;
    const {
        PartNo, MachiningDrawingNo, PartName,
        DrawingMatGrade, BOMQty, FY2026, DrgWt, CastingPartWt, Status
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('PartNo', sql.NVarChar(100), PartNo || null);
        request.input('MachiningDrawingNo', sql.NVarChar(100), MachiningDrawingNo || null);
        request.input('PartName', sql.NVarChar(255), PartName || null);
        request.input('DrawingMatGrade', sql.NVarChar(100), DrawingMatGrade || null);
        request.input('BOMQty', sql.Decimal(18, 2), BOMQty || null);
        request.input('FY2026', sql.NVarChar(100), FY2026 || null);
        request.input('DrgWt', sql.Decimal(18, 4), DrgWt || null);
        request.input('CastingPartWt', sql.Decimal(18, 4), CastingPartWt || null);
        request.input('Status', sql.NVarChar(50), Status || 'Active');

        const result = await request.query`
            UPDATE Marketing_RFQ SET
                PartNo = @PartNo,
                MachiningDrawingNo = @MachiningDrawingNo,
                PartName = @PartName,
                DrawingMatGrade = @DrawingMatGrade,
                BOMQty = @BOMQty,
                FY2026 = @FY2026,
                DrgWt = @DrgWt,
                CastingPartWt = @CastingPartWt,
                Status = @Status,
                UpdatedAt = SYSDATETIME()
            WHERE RFQId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'RFQ not found' });
        }

        res.json({ success: true, message: 'RFQ updated successfully' });
    } catch (err) {
        logger.error('Error updating RFQ:', err);
        res.status(500).json({ error: 'Failed to update RFQ' });
    }
});

// DELETE /rfq/:id
router.delete('/rfq/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM Marketing_RFQ WHERE RFQId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'RFQ not found' });
        }

        res.json({ success: true, message: 'RFQ deleted successfully' });
    } catch (err) {
        logger.error('Error deleting RFQ:', err);
        res.status(500).json({ error: 'Failed to delete RFQ' });
    }
});

// =====================================================
// LABORATORY ROUTES
// =====================================================

// GET /laboratory - Get all laboratory entries (with RFQ details)
router.get('/laboratory', async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT 
                l.*,
                r.RFQNo, r.PartNo, r.PartName, r.DrawingMatGrade
            FROM Marketing_Laboratory l
            INNER JOIN Marketing_RFQ r ON l.RFQId = r.RFQId
            ORDER BY l.LaboratoryId DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching laboratory entries:', err);
        res.status(500).json({ error: 'Failed to fetch laboratory entries' });
    }
});

// GET /laboratory/by-rfq/:rfqId - Get laboratory entry for a specific RFQ
router.get('/laboratory/by-rfq/:rfqId', async (req, res) => {
    const { rfqId } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('rfqId', sql.Int, parseInt(rfqId));

        const result = await request.query`
            SELECT * FROM Marketing_Laboratory WHERE RFQId = @rfqId
        `;

        if (result.recordset.length === 0) {
            return res.json(null); // No laboratory data yet for this RFQ
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching laboratory entry:', err);
        res.status(500).json({ error: 'Failed to fetch laboratory entry' });
    }
});

// POST /laboratory - Create or Update laboratory entry for an RFQ (Upsert)
router.post('/laboratory', validateBody(marketingLaboratorySchema), async (req, res) => {
    const {
        RFQId, FGSG, AlloyAddition, RT, UT, MPI, HT, DPTest,
        NABL, ImpactTest, Millipore, CutSection, InducingHardening,
        LaboratoryRequirements
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('RFQId', sql.Int, parseInt(RFQId));
        request.input('FGSG', sql.NVarChar(100), FGSG || null);
        request.input('AlloyAddition', sql.NVarChar(255), AlloyAddition || null);
        request.input('RT', sql.NVarChar(100), RT || null);
        request.input('UT', sql.NVarChar(100), UT || null);
        request.input('MPI', sql.NVarChar(100), MPI || null);
        request.input('HT', sql.NVarChar(100), HT || null);
        request.input('DPTest', sql.NVarChar(100), DPTest || null);
        request.input('NABL', sql.NVarChar(100), NABL || null);
        request.input('ImpactTest', sql.NVarChar(100), ImpactTest || null);
        request.input('Millipore', sql.NVarChar(100), Millipore || null);
        request.input('CutSection', sql.NVarChar(100), CutSection || null);
        request.input('InducingHardening', sql.NVarChar(100), InducingHardening || null);
        request.input('LaboratoryRequirements', sql.NVarChar(sql.MAX), LaboratoryRequirements || null);
        request.input('FilledBy', sql.NVarChar(100), req.user?.username || null);

        // Upsert: Check if entry exists, then update or insert
        const result = await request.query(`
            MERGE Marketing_Laboratory AS target
            USING (SELECT @RFQId AS RFQId) AS source
            ON target.RFQId = source.RFQId
            WHEN MATCHED THEN
                UPDATE SET
                    FGSG = @FGSG,
                    AlloyAddition = @AlloyAddition,
                    RT = @RT,
                    UT = @UT,
                    MPI = @MPI,
                    HT = @HT,
                    DPTest = @DPTest,
                    NABL = @NABL,
                    ImpactTest = @ImpactTest,
                    Millipore = @Millipore,
                    CutSection = @CutSection,
                    InducingHardening = @InducingHardening,
                    LaboratoryRequirements = @LaboratoryRequirements,
                    FilledBy = @FilledBy,
                    UpdatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (RFQId, FGSG, AlloyAddition, RT, UT, MPI, HT, DPTest, NABL, 
                        ImpactTest, Millipore, CutSection, InducingHardening, 
                        LaboratoryRequirements, FilledBy)
                VALUES (@RFQId, @FGSG, @AlloyAddition, @RT, @UT, @MPI, @HT, @DPTest, @NABL,
                        @ImpactTest, @Millipore, @CutSection, @InducingHardening,
                        @LaboratoryRequirements, @FilledBy)
            OUTPUT $action AS ActionTaken, INSERTED.LaboratoryId;
        `);

        const action = result.recordset[0]?.ActionTaken;
        res.json({ 
            success: true, 
            message: action === 'UPDATE' ? 'Laboratory data updated successfully' : 'Laboratory data saved successfully',
            id: result.recordset[0]?.LaboratoryId
        });
    } catch (err) {
        logger.error('Error saving laboratory data:', err);
        res.status(500).json({ error: 'Failed to save laboratory data' });
    }
});

// DELETE /laboratory/:id
router.delete('/laboratory/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM Marketing_Laboratory WHERE LaboratoryId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Laboratory entry not found' });
        }

        res.json({ success: true, message: 'Laboratory entry deleted successfully' });
    } catch (err) {
        logger.error('Error deleting laboratory entry:', err);
        res.status(500).json({ error: 'Failed to delete laboratory entry' });
    }
});

// =====================================================
// PATTERNSHOP ROUTES
// =====================================================

// GET /patternshop - Get all patternshop entries (with RFQ details)
router.get('/patternshop', async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT 
                p.*,
                r.RFQNo, r.PartNo, r.PartName, r.DrawingMatGrade
            FROM Marketing_Patternshop p
            INNER JOIN Marketing_RFQ r ON p.RFQId = r.RFQId
            ORDER BY p.PatternshopId DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching patternshop entries:', err);
        res.status(500).json({ error: 'Failed to fetch patternshop entries' });
    }
});

// GET /patternshop/by-rfq/:rfqId - Get patternshop entry for a specific RFQ
router.get('/patternshop/by-rfq/:rfqId', async (req, res) => {
    const { rfqId } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('rfqId', sql.Int, parseInt(rfqId));

        const result = await request.query`
            SELECT * FROM Marketing_Patternshop WHERE RFQId = @rfqId
        `;

        if (result.recordset.length === 0) {
            return res.json(null); // No patternshop data yet for this RFQ
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching patternshop entry:', err);
        res.status(500).json({ error: 'Failed to fetch patternshop entry' });
    }
});

// POST /patternshop - Create or Update patternshop entry for an RFQ (Upsert)
router.post('/patternshop', validateBody(marketingPatternshopSchema), async (req, res) => {
    const {
        RFQId, LineBox, Cavity, CoreWt, MatchPlateSpecial, MatchPlateRegular,
        ShellCoreWt, ColdBoxWt, CustomerRequirement, OurFeasibilityCastingTolerance,
        NPDFoundryRequirements
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('RFQId', sql.Int, parseInt(RFQId));
        request.input('LineBox', sql.NVarChar(100), LineBox || null);
        request.input('Cavity', sql.NVarChar(100), Cavity || null);
        request.input('CoreWt', sql.NVarChar(100), CoreWt || null);
        request.input('MatchPlateSpecial', sql.NVarChar(255), MatchPlateSpecial || null);
        request.input('MatchPlateRegular', sql.NVarChar(255), MatchPlateRegular || null);
        request.input('ShellCoreWt', sql.NVarChar(100), ShellCoreWt || null);
        request.input('ColdBoxWt', sql.NVarChar(100), ColdBoxWt || null);
        request.input('CustomerRequirement', sql.NVarChar(255), CustomerRequirement || null);
        request.input('OurFeasibilityCastingTolerance', sql.NVarChar(255), OurFeasibilityCastingTolerance || null);
        request.input('NPDFoundryRequirements', sql.NVarChar(sql.MAX), NPDFoundryRequirements || null);
        request.input('FilledBy', sql.NVarChar(100), req.user?.username || null);

        // Upsert: Check if entry exists, then update or insert
        const result = await request.query(`
            MERGE Marketing_Patternshop AS target
            USING (SELECT @RFQId AS RFQId) AS source
            ON target.RFQId = source.RFQId
            WHEN MATCHED THEN
                UPDATE SET
                    LineBox = @LineBox,
                    Cavity = @Cavity,
                    CoreWt = @CoreWt,
                    MatchPlateSpecial = @MatchPlateSpecial,
                    MatchPlateRegular = @MatchPlateRegular,
                    ShellCoreWt = @ShellCoreWt,
                    ColdBoxWt = @ColdBoxWt,
                    CustomerRequirement = @CustomerRequirement,
                    OurFeasibilityCastingTolerance = @OurFeasibilityCastingTolerance,
                    NPDFoundryRequirements = @NPDFoundryRequirements,
                    FilledBy = @FilledBy,
                    UpdatedAt = SYSDATETIME()
            WHEN NOT MATCHED THEN
                INSERT (RFQId, LineBox, Cavity, CoreWt, MatchPlateSpecial, MatchPlateRegular,
                        ShellCoreWt, ColdBoxWt, CustomerRequirement, OurFeasibilityCastingTolerance,
                        NPDFoundryRequirements, FilledBy)
                VALUES (@RFQId, @LineBox, @Cavity, @CoreWt, @MatchPlateSpecial, @MatchPlateRegular,
                        @ShellCoreWt, @ColdBoxWt, @CustomerRequirement, @OurFeasibilityCastingTolerance,
                        @NPDFoundryRequirements, @FilledBy)
            OUTPUT $action AS ActionTaken, INSERTED.PatternshopId;
        `);

        const action = result.recordset[0]?.ActionTaken;
        res.json({ 
            success: true, 
            message: action === 'UPDATE' ? 'Patternshop data updated successfully' : 'Patternshop data saved successfully',
            id: result.recordset[0]?.PatternshopId
        });
    } catch (err) {
        logger.error('Error saving patternshop data:', err);
        res.status(500).json({ error: 'Failed to save patternshop data' });
    }
});

// DELETE /patternshop/:id
router.delete('/patternshop/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM Marketing_Patternshop WHERE PatternshopId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Patternshop entry not found' });
        }

        res.json({ success: true, message: 'Patternshop entry deleted successfully' });
    } catch (err) {
        logger.error('Error deleting patternshop entry:', err);
        res.status(500).json({ error: 'Failed to delete patternshop entry' });
    }
});

// =====================================================
// COMBINED VIEW - Get RFQ with Laboratory and Patternshop status
// =====================================================
router.get('/rfq-status', async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT 
                r.*,
                CASE WHEN l.LaboratoryId IS NOT NULL THEN 1 ELSE 0 END AS HasLaboratoryData,
                CASE WHEN p.PatternshopId IS NOT NULL THEN 1 ELSE 0 END AS HasPatternshopData,
                l.FilledBy AS LaboratoryFilledBy,
                l.UpdatedAt AS LaboratoryUpdatedAt,
                p.FilledBy AS PatternshopFilledBy,
                p.UpdatedAt AS PatternshopUpdatedAt
            FROM Marketing_RFQ r
            LEFT JOIN Marketing_Laboratory l ON r.RFQId = l.RFQId
            LEFT JOIN Marketing_Patternshop p ON r.RFQId = p.RFQId
            ORDER BY r.RFQId DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching RFQ status:', err);
        res.status(500).json({ error: 'Failed to fetch RFQ status' });
    }
});

// =====================================================
// RFQ MASTER ROUTES
// =====================================================

// GET /rfq-master - Get all RFQ Master records
router.get('/rfq-master', async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                RFQMasterId, SrNo, Status, AKPRFQNo, RFQId, CustomerName, RFQDate,
                ProjectReference, RFQParts, AnnualVolume, Weight, MonthlyTonnage,
                PatternQuoteDate, MachiningQuoteDate, QuoteSentDate, RevisedQuoteSentDate,
                GoAheadConfirmDate, PartPODate, PartNo, ToolingPODate, ToolingNo,
                AmortizationDate, GAAToolingDate, GAAMachiningDate, SampleSubmittedDate,
                Remarks, CreatedBy, CreatedAt, UpdatedAt
            FROM Marketing_RFQMaster
        `;

        const request = req.db.request();
        if (search) {
            request.input('search', sql.NVarChar, `%${search}%`);
            query += ` WHERE 
                AKPRFQNo LIKE @search OR 
                SrNo LIKE @search OR
                CustomerName LIKE @search OR 
                ProjectReference LIKE @search OR
                PartNo LIKE @search OR
                ToolingNo LIKE @search
            `;
        }

        query += ' ORDER BY RFQMasterId DESC';

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching RFQ Master records:', err);
        res.status(500).json({ error: 'Failed to fetch RFQ Master records' });
    }
});

// GET /rfq-master/:id - Get single RFQ Master record
router.get('/rfq-master/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM Marketing_RFQMaster WHERE RFQMasterId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'RFQ Master record not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching RFQ Master record:', err);
        res.status(500).json({ error: 'Failed to fetch RFQ Master record' });
    }
});

// POST /rfq-master - Create new RFQ Master record
router.post('/rfq-master', validateBody(marketingRFQMasterSchema), async (req, res) => {
    const {
        SrNo, AKPRFQNo, RFQId, Status, CustomerName, RFQDate, ProjectReference, RFQParts,
        AnnualVolume, Weight, MonthlyTonnage, PatternQuoteDate, MachiningQuoteDate,
        QuoteSentDate, RevisedQuoteSentDate, GoAheadConfirmDate, PartPODate, PartNo,
        ToolingPODate, ToolingNo, AmortizationDate, GAAToolingDate, GAAMachiningDate,
        SampleSubmittedDate, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('SrNo', sql.NVarChar(50), SrNo || null);
        request.input('AKPRFQNo', sql.NVarChar(50), AKPRFQNo);
        request.input('RFQId', sql.Int, RFQId || null);
        request.input('Status', sql.NVarChar(50), Status || 'Active');
        request.input('CustomerName', sql.NVarChar(255), CustomerName || null);
        request.input('RFQDate', sql.Date, RFQDate || null);
        request.input('ProjectReference', sql.NVarChar(255), ProjectReference || null);
        request.input('RFQParts', sql.NVarChar(500), RFQParts || null);
        request.input('AnnualVolume', sql.Decimal(18, 2), AnnualVolume || null);
        request.input('Weight', sql.Decimal(18, 4), Weight || null);
        request.input('MonthlyTonnage', sql.Decimal(18, 4), MonthlyTonnage || null);
        request.input('PatternQuoteDate', sql.Date, PatternQuoteDate || null);
        request.input('MachiningQuoteDate', sql.Date, MachiningQuoteDate || null);
        request.input('QuoteSentDate', sql.Date, QuoteSentDate || null);
        request.input('RevisedQuoteSentDate', sql.Date, RevisedQuoteSentDate || null);
        request.input('GoAheadConfirmDate', sql.Date, GoAheadConfirmDate || null);
        request.input('PartPODate', sql.Date, PartPODate || null);
        request.input('PartNo', sql.NVarChar(100), PartNo || null);
        request.input('ToolingPODate', sql.Date, ToolingPODate || null);
        request.input('ToolingNo', sql.NVarChar(100), ToolingNo || null);
        request.input('AmortizationDate', sql.Date, AmortizationDate || null);
        request.input('GAAToolingDate', sql.Date, GAAToolingDate || null);
        request.input('GAAMachiningDate', sql.Date, GAAMachiningDate || null);
        request.input('SampleSubmittedDate', sql.Date, SampleSubmittedDate || null);
        request.input('Remarks', sql.NVarChar(sql.MAX), Remarks || null);
        request.input('CreatedBy', sql.NVarChar(100), req.user?.username || null);

        const result = await request.query`
            INSERT INTO Marketing_RFQMaster (
                SrNo, AKPRFQNo, RFQId, Status, CustomerName, RFQDate, ProjectReference, RFQParts,
                AnnualVolume, Weight, MonthlyTonnage, PatternQuoteDate, MachiningQuoteDate,
                QuoteSentDate, RevisedQuoteSentDate, GoAheadConfirmDate, PartPODate, PartNo,
                ToolingPODate, ToolingNo, AmortizationDate, GAAToolingDate, GAAMachiningDate,
                SampleSubmittedDate, Remarks, CreatedBy
            )
            OUTPUT INSERTED.RFQMasterId, INSERTED.AKPRFQNo, INSERTED.SrNo
            VALUES (
                @SrNo, @AKPRFQNo, @RFQId, @Status, @CustomerName, @RFQDate, @ProjectReference, @RFQParts,
                @AnnualVolume, @Weight, @MonthlyTonnage, @PatternQuoteDate, @MachiningQuoteDate,
                @QuoteSentDate, @RevisedQuoteSentDate, @GoAheadConfirmDate, @PartPODate, @PartNo,
                @ToolingPODate, @ToolingNo, @AmortizationDate, @GAAToolingDate, @GAAMachiningDate,
                @SampleSubmittedDate, @Remarks, @CreatedBy
            )
        `;

        res.json({ 
            success: true, 
            message: 'RFQ Master record created successfully', 
            id: result.recordset[0].RFQMasterId,
            akpRfqNo: result.recordset[0].AKPRFQNo,
            srNo: result.recordset[0].SrNo
        });
    } catch (err) {
        logger.error('Error creating RFQ Master record:', err);
        res.status(500).json({ error: 'Failed to create RFQ Master record' });
    }
});

// PUT /rfq-master/:id - Update RFQ Master record
router.put('/rfq-master/:id', async (req, res) => {
    const { id } = req.params;
    const {
        SrNo, AKPRFQNo, RFQId, Status, CustomerName, RFQDate, ProjectReference, RFQParts,
        AnnualVolume, Weight, MonthlyTonnage, PatternQuoteDate, MachiningQuoteDate,
        QuoteSentDate, RevisedQuoteSentDate, GoAheadConfirmDate, PartPODate, PartNo,
        ToolingPODate, ToolingNo, AmortizationDate, GAAToolingDate, GAAMachiningDate,
        SampleSubmittedDate, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('SrNo', sql.NVarChar(50), SrNo || null);
        request.input('AKPRFQNo', sql.NVarChar(50), AKPRFQNo);
        request.input('RFQId', sql.Int, RFQId || null);
        request.input('Status', sql.NVarChar(50), Status || 'Active');
        request.input('CustomerName', sql.NVarChar(255), CustomerName || null);
        request.input('RFQDate', sql.Date, RFQDate || null);
        request.input('ProjectReference', sql.NVarChar(255), ProjectReference || null);
        request.input('RFQParts', sql.NVarChar(500), RFQParts || null);
        request.input('AnnualVolume', sql.Decimal(18, 2), AnnualVolume || null);
        request.input('Weight', sql.Decimal(18, 4), Weight || null);
        request.input('MonthlyTonnage', sql.Decimal(18, 4), MonthlyTonnage || null);
        request.input('PatternQuoteDate', sql.Date, PatternQuoteDate || null);
        request.input('MachiningQuoteDate', sql.Date, MachiningQuoteDate || null);
        request.input('QuoteSentDate', sql.Date, QuoteSentDate || null);
        request.input('RevisedQuoteSentDate', sql.Date, RevisedQuoteSentDate || null);
        request.input('GoAheadConfirmDate', sql.Date, GoAheadConfirmDate || null);
        request.input('PartPODate', sql.Date, PartPODate || null);
        request.input('PartNo', sql.NVarChar(100), PartNo || null);
        request.input('ToolingPODate', sql.Date, ToolingPODate || null);
        request.input('ToolingNo', sql.NVarChar(100), ToolingNo || null);
        request.input('AmortizationDate', sql.Date, AmortizationDate || null);
        request.input('GAAToolingDate', sql.Date, GAAToolingDate || null);
        request.input('GAAMachiningDate', sql.Date, GAAMachiningDate || null);
        request.input('SampleSubmittedDate', sql.Date, SampleSubmittedDate || null);
        request.input('Remarks', sql.NVarChar(sql.MAX), Remarks || null);

        const result = await request.query`
            UPDATE Marketing_RFQMaster SET
                SrNo = @SrNo,
                AKPRFQNo = @AKPRFQNo,
                RFQId = @RFQId,
                Status = @Status,
                CustomerName = @CustomerName,
                RFQDate = @RFQDate,
                ProjectReference = @ProjectReference,
                RFQParts = @RFQParts,
                AnnualVolume = @AnnualVolume,
                Weight = @Weight,
                MonthlyTonnage = @MonthlyTonnage,
                PatternQuoteDate = @PatternQuoteDate,
                MachiningQuoteDate = @MachiningQuoteDate,
                QuoteSentDate = @QuoteSentDate,
                RevisedQuoteSentDate = @RevisedQuoteSentDate,
                GoAheadConfirmDate = @GoAheadConfirmDate,
                PartPODate = @PartPODate,
                PartNo = @PartNo,
                ToolingPODate = @ToolingPODate,
                ToolingNo = @ToolingNo,
                AmortizationDate = @AmortizationDate,
                GAAToolingDate = @GAAToolingDate,
                GAAMachiningDate = @GAAMachiningDate,
                SampleSubmittedDate = @SampleSubmittedDate,
                Remarks = @Remarks,
                UpdatedAt = SYSDATETIME()
            WHERE RFQMasterId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'RFQ Master record not found' });
        }

        res.json({ success: true, message: 'RFQ Master record updated successfully' });
    } catch (err) {
        logger.error('Error updating RFQ Master record:', err);
        res.status(500).json({ error: 'Failed to update RFQ Master record' });
    }
});

// GET /rfq-master/:id - Get single RFQ Master record
router.get('/rfq-master/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM Marketing_RFQMaster WHERE RFQMasterId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'RFQ Master record not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        logger.error('Error fetching RFQ Master record:', err);
        res.status(500).json({ error: 'Failed to fetch RFQ Master record' });
    }
});

// DELETE /rfq-master/:id
router.delete('/rfq-master/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`DELETE FROM Marketing_RFQMaster WHERE RFQMasterId = @id`;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'RFQ Master record not found' });
        }

        res.json({ success: true, message: 'RFQ Master record deleted successfully' });
    } catch (err) {
        logger.error('Error deleting RFQ Master record:', err);
        res.status(500).json({ error: 'Failed to delete RFQ Master record' });
    }
});

module.exports = router;
