const express = require('express');
const router = express.Router();
const { sql } = require('../../config/db');
const multer = require('multer');
const ExcelJS = require('exceljs');
const { cacheMiddleware } = require('../../utils/cache');
const { validateBody, physicalPropertiesSchema, chemistrySchema, microstructureSchema, sandPropertiesSchema, mouldHardnessSchema } = require('../../utils/validators');
const logger = require('../../utils/logger');

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to get cell value as string
const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    if (typeof cell.value === 'object' && cell.value.richText) {
        return cell.value.richText.map(r => r.text).join('');
    }
    // Handle date objects
    if (cell.value instanceof Date) {
        return cell.value;
    }
    return String(cell.value).trim();
};

// Helper to parse date from Excel
const parseExcelDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    // Try parsing string date
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

// ==================== UNIQUE GRADES (Shared across tabs) ====================

// GET unique Grade values from all Quality & Lab tables (cached for 5 minutes)
router.get('/grades', cacheMiddleware('qualityLab-grades', 300), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        
        // Query unique grades from all 3 tables using UNION
        const result = await request.query`
            SELECT DISTINCT Grade FROM (
                SELECT Grade FROM Lab_PhysicalProperties WHERE Grade IS NOT NULL AND Grade != ''
                UNION
                SELECT Grade FROM Lab_Micro WHERE Grade IS NOT NULL AND Grade != ''
                UNION
                SELECT Grade FROM Lab_Spectro WHERE Grade IS NOT NULL AND Grade != ''
            ) AS AllGrades
            ORDER BY Grade
        `;
        
        res.json(result.recordset.map(r => r.Grade));
    } catch (err) {
        logger.error('Error fetching grades:', err);
        res.status(500).json({ error: 'Failed to fetch grades' });
    }
});

// GET unique Melting Supervisors from Lab_Spectro (cached for 5 minutes)
router.get('/melting-supervisors', cacheMiddleware('qualityLab-meltingSupervisors', 300), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        const result = await request.query`
            SELECT DISTINCT MeltingSupervisor FROM Lab_Spectro 
            WHERE MeltingSupervisor IS NOT NULL AND MeltingSupervisor != ''
            ORDER BY MeltingSupervisor
        `;
        res.json(result.recordset.map(r => r.MeltingSupervisor));
    } catch (err) {
        logger.error('Error fetching melting supervisors:', err);
        res.status(500).json({ error: 'Failed to fetch melting supervisors' });
    }
});

// GET unique Lab Supervisors from Lab_Spectro (cached for 5 minutes)
router.get('/lab-supervisors', cacheMiddleware('qualityLab-labSupervisors', 300), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        const result = await request.query`
            SELECT DISTINCT LabSupervisor FROM Lab_Spectro 
            WHERE LabSupervisor IS NOT NULL AND LabSupervisor != ''
            ORDER BY LabSupervisor
        `;
        res.json(result.recordset.map(r => r.LabSupervisor));
    } catch (err) {
        logger.error('Error fetching lab supervisors:', err);
        res.status(500).json({ error: 'Failed to fetch lab supervisors' });
    }
});

// GET unique Heat Nos from all Quality & Lab tables for Reports filter
router.get('/heat-nos', async (req, res) => {
    try {
        const { type } = req.query;
        const request = new sql.Request(req.db);
        
        let query;
        
        // If type is specified, get heat nos only from that specific table
        if (type) {
            const tableMap = {
                'physical': 'Lab_PhysicalProperties',
                'microstructure': 'Lab_Micro',
                'sand': 'Lab_Sand',
                'chemistry': 'Lab_Spectro',
                'mould': 'MouldHardness'
            };
            
            const tableName = tableMap[type];
            if (!tableName) {
                logger.warn(`Invalid report type requested: ${type}`);
                return res.status(400).json({ error: 'Invalid report type' });
            }
            
            logger.info(`Fetching heat nos for report type: ${type}, table: ${tableName}`);
            
            // Use parameterized query to prevent SQL injection
            const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
            
            query = `
                SELECT DISTINCT LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) as HeatNo 
                FROM ${safeTableName} 
                WHERE HeatNo IS NOT NULL AND LTRIM(RTRIM(HeatNo)) != ''
                ORDER BY HeatNo
            `;
            
            logger.info(`Executing query: ${query}`);
        } else {
            // Get heat nos from all tables (original behavior)
            query = `
                SELECT DISTINCT LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) as HeatNo FROM (
                    SELECT HeatNo FROM Lab_PhysicalProperties WHERE HeatNo IS NOT NULL AND LTRIM(RTRIM(HeatNo)) != ''
                    UNION
                    SELECT HeatNo FROM Lab_Micro WHERE HeatNo IS NOT NULL AND LTRIM(RTRIM(HeatNo)) != ''
                    UNION
                    SELECT HeatNo FROM Lab_Sand WHERE HeatNo IS NOT NULL AND LTRIM(RTRIM(HeatNo)) != ''
                    UNION
                    SELECT HeatNo FROM Lab_Spectro WHERE HeatNo IS NOT NULL AND LTRIM(RTRIM(HeatNo)) != ''
                    UNION
                    SELECT HeatNo FROM MouldHardness WHERE HeatNo IS NOT NULL AND LTRIM(RTRIM(HeatNo)) != ''
                ) AS AllHeatNos
                ORDER BY HeatNo
            `;
        }
        
        const result = await request.query(query);
        
        logger.info(`Found ${result.recordset.length} heat nos${type ? ` for type: ${type}` : ''}`);
        
        // Filter out any remaining empty strings or nulls
        const heatNos = result.recordset
            .map(r => r.HeatNo)
            .filter(h => h && h.trim().length > 0);
        
        // Add cache-control headers to prevent browser caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
            
        res.json(heatNos);
    } catch (err) {
        logger.error('Error fetching heat nos:', err);
        res.status(500).json({ error: 'Failed to fetch heat nos' });
    }
});

// GET unique Part Nos from all Quality & Lab tables for Reports filter
router.get('/part-nos', cacheMiddleware('qualityLab-partNos', 300), async (req, res) => {
    try {
        const request = new sql.Request(req.db);
        const result = await request.query`
            SELECT DISTINCT PartNo FROM (
                SELECT PartNo FROM Lab_PhysicalProperties WHERE PartNo IS NOT NULL AND PartNo != ''
                UNION
                SELECT PartNo FROM Lab_Micro WHERE PartNo IS NOT NULL AND PartNo != ''
                UNION
                SELECT PartNo FROM Lab_Sand WHERE PartNo IS NOT NULL AND PartNo != ''
                UNION
                SELECT PartNo FROM Lab_Spectro WHERE PartNo IS NOT NULL AND PartNo != ''
                UNION
                SELECT PartNo FROM MouldHardness WHERE PartNo IS NOT NULL AND PartNo != ''
            ) AS AllPartNos
            ORDER BY PartNo
        `;
        res.json(result.recordset.map(r => r.PartNo));
    } catch (err) {
        logger.error('Error fetching part nos:', err);
        res.status(500).json({ error: 'Failed to fetch part nos' });
    }
});


// ==================== PHYSICAL PROPERTIES (Lab_PhysicalProperties) ====================

// GET all physical properties records (current month by default or filtered)
router.get('/physical-properties', async (req, res) => {
    try {
        const { search, heatNo, partNo, allTime, startDate, endDate } = req.query;
        const request = new sql.Request(req.db);
        
        let query = `SELECT * FROM Lab_PhysicalProperties WHERE 1=1`;
        
        // Apply date filter only when no specific filters are requested
        const hasSpecificFilters = (heatNo && heatNo.trim() !== '') || (partNo && partNo.trim() !== '') || search || allTime || startDate || endDate;
        if (!hasSpecificFilters) {
            query += ` AND MONTH(Date) = MONTH(GETDATE()) AND YEAR(Date) = YEAR(GETDATE())`;
        }
        if (startDate) {
            query += ` AND Date >= @startDate`;
            request.input('startDate', sql.DateTime, new Date(startDate));
        }
        if (endDate) {
            query += ` AND Date < DATEADD(day, 1, @endDate)`;
            request.input('endDate', sql.DateTime, new Date(endDate));
        }

        if (heatNo && heatNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) = @heatNo`;
            request.input('heatNo', sql.NVarChar, heatNo.trim());
        }
        if (partNo && partNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(PartNo AS NVARCHAR(MAX)))) = @partNo`;
            request.input('partNo', sql.NVarChar, partNo.trim());
        }
        if (search) {
            query += ` AND (HeatNo LIKE @search OR Grade LIKE @search OR PartNo LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        query += ` ORDER BY Date DESC`;
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching physical properties:', err);
        res.status(500).json({ error: 'Failed to fetch physical properties records' });
    }
});

// POST new physical properties record
router.post('/physical-properties', validateBody(physicalPropertiesSchema), async (req, res) => {
    const { Date: RecordDate, HeatNo, Grade, PartNo, UTS, YieldStress, Elongation, Impact } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('Date', sql.DateTime, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('Grade', sql.NVarChar(50), Grade || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || null);
        request.input('UTS', sql.NVarChar(50), UTS || null);
        request.input('YieldStress', sql.NVarChar(50), YieldStress || null);
        request.input('Elongation', sql.NVarChar(50), Elongation || null);
        request.input('Impact', sql.NVarChar(50), Impact || null);
        
        const result = await request.query`
            INSERT INTO Lab_PhysicalProperties 
            (Date, HeatNo, Grade, PartNo, [UTS N/mm²], [Yield Stress N/mm²], [Elongation %], [Impact In Joule(J)])
            OUTPUT INSERTED.Id
            VALUES (@Date, @HeatNo, @Grade, @PartNo, @UTS, @YieldStress, @Elongation, @Impact)
        `;
        
        res.json({ success: true, message: 'Physical properties record added', id: result.recordset[0].Id });
    } catch (err) {
        logger.error('Error adding physical properties:', err);
        res.status(500).json({ error: 'Failed to add physical properties record' });
    }
});

// PUT update physical properties record
router.put('/physical-properties/:id', async (req, res) => {
    const { id } = req.params;
    const { Date: RecordDate, HeatNo, Grade, PartNo, UTS, YieldStress, Elongation, Impact } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Date', sql.DateTime, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('Grade', sql.NVarChar(50), Grade || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || null);
        request.input('UTS', sql.NVarChar(50), UTS || null);
        request.input('YieldStress', sql.NVarChar(50), YieldStress || null);
        request.input('Elongation', sql.NVarChar(50), Elongation || null);
        request.input('Impact', sql.NVarChar(50), Impact || null);
        
        const result = await request.query`
            UPDATE Lab_PhysicalProperties SET
            Date = @Date, HeatNo = @HeatNo, Grade = @Grade, PartNo = @PartNo,
            [UTS N/mm²] = @UTS, [Yield Stress N/mm²] = @YieldStress,
            [Elongation %] = @Elongation, [Impact In Joule(J)] = @Impact
            WHERE Id = @id
        `;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Physical properties record updated' });
    } catch (err) {
        logger.error('Error updating physical properties:', err);
        res.status(500).json({ error: 'Failed to update physical properties record' });
    }
});

// DELETE physical properties record
router.delete('/physical-properties/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        
        const result = await request.query`DELETE FROM Lab_PhysicalProperties WHERE Id = @id`;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Physical properties record deleted' });
    } catch (err) {
        logger.error('Error deleting physical properties:', err);
        res.status(500).json({ error: 'Failed to delete physical properties record' });
    }
});

// ==================== MICROSTRUCTURE & HARDNESS (Lab_Micro) ====================

// GET all microstructure records (current month by default or filtered)
router.get('/microstructure', async (req, res) => {
    try {
        const { search, heatNo, partNo, allTime, startDate, endDate } = req.query;
        const request = new sql.Request(req.db);
        
        let query = `SELECT * FROM Lab_Micro WHERE 1=1`;

        const hasSpecificFilters = (heatNo && heatNo.trim() !== '') || (partNo && partNo.trim() !== '') || search || allTime || startDate || endDate;
        if (!hasSpecificFilters) {
            query += ` AND MONTH(Date) = MONTH(GETDATE()) AND YEAR(Date) = YEAR(GETDATE())`;
        }
        if (startDate) {
            query += ` AND Date >= @startDate`;
            request.input('startDate', sql.DateTime, new Date(startDate));
        }
        if (endDate) {
            query += ` AND Date < DATEADD(day, 1, @endDate)`;
            request.input('endDate', sql.DateTime, new Date(endDate));
        }
        
        if (heatNo && heatNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) = @heatNo`;
            request.input('heatNo', sql.NVarChar, heatNo.trim());
        }
        if (partNo && partNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(PartNo AS NVARCHAR(MAX)))) = @partNo`;
            request.input('partNo', sql.NVarChar, partNo.trim());
        }
        if (search) {
            query += ` AND (HeatNo LIKE @search OR Grade LIKE @search OR PartNo LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        query += ` ORDER BY Date DESC`;
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching microstructure records:', err);
        res.status(500).json({ error: 'Failed to fetch microstructure records' });
    }
});

// POST new microstructure record
router.post('/microstructure', validateBody(microstructureSchema), async (req, res) => {
    const { 
        Date: RecordDate, HeatNo, Grade, PartNo, Nodularity, Graphitetype,
        NodularityCount, GraphiteSize, Pearlite, Ferrite, Carbide, CastingHardness 
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('Date', sql.DateTime2, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('Grade', sql.NVarChar(50), Grade || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || null);
        request.input('Nodularity', sql.NVarChar(50), Nodularity || null);
        request.input('Graphitetype', sql.NVarChar(50), Graphitetype || null);
        request.input('NodularityCount', sql.NVarChar(50), NodularityCount || null);
        request.input('GraphiteSize', sql.NVarChar(50), GraphiteSize || null);
        request.input('Pearlite', sql.NVarChar(50), Pearlite || null);
        request.input('Ferrite', sql.NVarChar(50), Ferrite || null);
        request.input('Carbide', sql.NVarChar(50), Carbide || null);
        request.input('CastingHardness', sql.NVarChar(50), CastingHardness || null);
        
        const result = await request.query`
            INSERT INTO Lab_Micro 
            (Date, HeatNo, Grade, PartNo, Nodularity, Graphitetype, NodularityCount, GraphiteSize, Pearlite, Ferrite, Carbide, CastingHardness)
            OUTPUT INSERTED.ID
            VALUES (@Date, @HeatNo, @Grade, @PartNo, @Nodularity, @Graphitetype, @NodularityCount, @GraphiteSize, @Pearlite, @Ferrite, @Carbide, @CastingHardness)
        `;
        
        res.json({ success: true, message: 'Microstructure record added', id: result.recordset[0].ID });
    } catch (err) {
        logger.error('Error adding microstructure record:', err);
        res.status(500).json({ error: 'Failed to add microstructure record' });
    }
});

// PUT update microstructure record
router.put('/microstructure/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        Date: RecordDate, HeatNo, Grade, PartNo, Nodularity, Graphitetype,
        NodularityCount, GraphiteSize, Pearlite, Ferrite, Carbide, CastingHardness 
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Date', sql.DateTime2, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('Grade', sql.NVarChar(50), Grade || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || null);
        request.input('Nodularity', sql.NVarChar(50), Nodularity || null);
        request.input('Graphitetype', sql.NVarChar(50), Graphitetype || null);
        request.input('NodularityCount', sql.NVarChar(50), NodularityCount || null);
        request.input('GraphiteSize', sql.NVarChar(50), GraphiteSize || null);
        request.input('Pearlite', sql.NVarChar(50), Pearlite || null);
        request.input('Ferrite', sql.NVarChar(50), Ferrite || null);
        request.input('Carbide', sql.NVarChar(50), Carbide || null);
        request.input('CastingHardness', sql.NVarChar(50), CastingHardness || null);
        
        const result = await request.query`
            UPDATE Lab_Micro SET
            Date = @Date, HeatNo = @HeatNo, Grade = @Grade, PartNo = @PartNo,
            Nodularity = @Nodularity, Graphitetype = @Graphitetype, NodularityCount = @NodularityCount,
            GraphiteSize = @GraphiteSize, Pearlite = @Pearlite, Ferrite = @Ferrite, Carbide = @Carbide, CastingHardness = @CastingHardness
            WHERE ID = @id
        `;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Microstructure record updated' });
    } catch (err) {
        logger.error('Error updating microstructure record:', err);
        res.status(500).json({ error: 'Failed to update microstructure record' });
    }
});

// DELETE microstructure record
router.delete('/microstructure/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        
        const result = await request.query`DELETE FROM Lab_Micro WHERE ID = @id`;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Microstructure record deleted' });
    } catch (err) {
        logger.error('Error deleting microstructure record:', err);
        res.status(500).json({ error: 'Failed to delete microstructure record' });
    }
});

// ==================== SAND PROPERTIES (Lab_Sand) ====================

// GET all sand properties records (current month by default or filtered)
router.get('/sand', async (req, res) => {
    try {
        const { search, heatNo, partNo, allTime, startDate, endDate } = req.query;
        const request = new sql.Request(req.db);
        
        let query = `SELECT * FROM Lab_Sand WHERE 1=1`;

        const hasSpecificFilters = (heatNo && heatNo.trim() !== '') || (partNo && partNo.trim() !== '') || search || allTime || startDate || endDate;
        if (!hasSpecificFilters) {
            query += ` AND MONTH(Date) = MONTH(GETDATE()) AND YEAR(Date) = YEAR(GETDATE())`;
        }
        if (startDate) {
            const parsedStartDate = parseDateString(startDate);
            if (parsedStartDate) {
                query += ` AND Date >= @startDate`;
                request.input('startDate', sql.DateTime, parsedStartDate);
            }
        }
        if (endDate) {
            const parsedEndDate = parseDateString(endDate);
            if (parsedEndDate) {
                query += ` AND Date < DATEADD(day, 1, @endDate)`;
                request.input('endDate', sql.DateTime, parsedEndDate);
            }
        }
        
        if (heatNo && heatNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) = @heatNo`;
            request.input('heatNo', sql.NVarChar, heatNo.trim());
        }
        if (partNo && partNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(PartNo AS NVARCHAR(MAX)))) = @partNo`;
            request.input('partNo', sql.NVarChar, partNo.trim());
        }
        if (search) {
            query += ` AND (HeatNo LIKE @search OR PartNo LIKE @search OR PartName LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        query += ` ORDER BY Date DESC, InspectionTime ASC`;
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching sand properties:', err);
        res.status(500).json({ error: 'Failed to fetch sand properties records' });
    }
});

// POST new sand properties record
router.post('/sand', validateBody(sandPropertiesSchema), async (req, res) => {
    const { 
        Date: RecordDate, Shift, InspectionTime, HeatNo, PartNo, PartName,
        Moisture, Compactability, Permeability, GreenCompressionStrength, ReturnSandTemp,
        TotalClay, ActiveClay, DeadClay, VolatileMatter, LossOnIgnition, AFSNo
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('Date', sql.DateTime, RecordDate ? new Date(RecordDate) : null);
        request.input('Shift', sql.NVarChar(50), Shift || '');
        request.input('InspectionTime', sql.NVarChar(50), InspectionTime || '');
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || '');
        request.input('PartName', sql.NVarChar(50), PartName || '');
        request.input('Moisture', sql.Float, Moisture ? parseFloat(Moisture) : 0);
        request.input('Compactability', sql.Float, Compactability ? parseFloat(Compactability) : 0);
        request.input('Permeability', sql.NVarChar(50), Permeability || '');
        request.input('GreenCompressionStrength', sql.NVarChar(50), GreenCompressionStrength || '');
        request.input('ReturnSandTemp', sql.Numeric(18, 0), ReturnSandTemp ? parseInt(ReturnSandTemp) : 0);
        request.input('TotalClay', sql.Float, TotalClay ? parseFloat(TotalClay) : null);
        request.input('ActiveClay', sql.Float, ActiveClay ? parseFloat(ActiveClay) : null);
        request.input('DeadClay', sql.Float, DeadClay ? parseFloat(DeadClay) : null);
        request.input('VolatileMatter', sql.Float, VolatileMatter ? parseFloat(VolatileMatter) : null);
        request.input('LossOnIgnition', sql.Float, LossOnIgnition ? parseFloat(LossOnIgnition) : null);
        request.input('AFSNo', sql.Float, AFSNo ? parseFloat(AFSNo) : null);
        
        const result = await request.query`
            INSERT INTO Lab_Sand 
            (Date, Shift, InspectionTime, HeatNo, PartNo, PartName, [Moisture In %], [Compactability In %], 
            [Permeability In No], [Green Compression Strength], [Return Sand Temp],
            [TOTAL CLAY 11.0 - 14.50%], [ACTIVE CLAY 7.0 - 9.0%], [DEAD CLAY 3.0 - 4.50%],
            [VOLATILE MATTER 2.30 - 3.50%], [LOSS ON IGNITION 4.0 - 7.0%], [AFS No  45 - 55])
            OUTPUT INSERTED.Id
            VALUES (@Date, @Shift, @InspectionTime, @HeatNo, @PartNo, @PartName, @Moisture, @Compactability,
            @Permeability, @GreenCompressionStrength, @ReturnSandTemp, @TotalClay, @ActiveClay, @DeadClay,
            @VolatileMatter, @LossOnIgnition, @AFSNo)
        `;
        
        res.json({ success: true, message: 'Sand properties record added', id: result.recordset[0].Id });
    } catch (err) {
        logger.error('Error adding sand properties:', err);
        res.status(500).json({ error: 'Failed to add sand properties record' });
    }
});

// PUT update sand properties record
router.put('/sand/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        Date: RecordDate, Shift, InspectionTime, HeatNo, PartNo, PartName,
        Moisture, Compactability, Permeability, GreenCompressionStrength, ReturnSandTemp,
        TotalClay, ActiveClay, DeadClay, VolatileMatter, LossOnIgnition, AFSNo
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Date', sql.DateTime, RecordDate ? new Date(RecordDate) : null);
        request.input('Shift', sql.NVarChar(50), Shift || '');
        request.input('InspectionTime', sql.NVarChar(50), InspectionTime || '');
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || '');
        request.input('PartName', sql.NVarChar(50), PartName || '');
        request.input('Moisture', sql.Float, Moisture ? parseFloat(Moisture) : 0);
        request.input('Compactability', sql.Float, Compactability ? parseFloat(Compactability) : 0);
        request.input('Permeability', sql.NVarChar(50), Permeability || '');
        request.input('GreenCompressionStrength', sql.NVarChar(50), GreenCompressionStrength || '');
        request.input('ReturnSandTemp', sql.Numeric(18, 0), ReturnSandTemp ? parseInt(ReturnSandTemp) : 0);
        request.input('TotalClay', sql.Float, TotalClay ? parseFloat(TotalClay) : null);
        request.input('ActiveClay', sql.Float, ActiveClay ? parseFloat(ActiveClay) : null);
        request.input('DeadClay', sql.Float, DeadClay ? parseFloat(DeadClay) : null);
        request.input('VolatileMatter', sql.Float, VolatileMatter ? parseFloat(VolatileMatter) : null);
        request.input('LossOnIgnition', sql.Float, LossOnIgnition ? parseFloat(LossOnIgnition) : null);
        request.input('AFSNo', sql.Float, AFSNo ? parseFloat(AFSNo) : null);
        
        const result = await request.query`
            UPDATE Lab_Sand SET
            Date = @Date, Shift = @Shift, InspectionTime = @InspectionTime, HeatNo = @HeatNo,
            PartNo = @PartNo, PartName = @PartName, [Moisture In %] = @Moisture, [Compactability In %] = @Compactability,
            [Permeability In No] = @Permeability, [Green Compression Strength] = @GreenCompressionStrength,
            [Return Sand Temp] = @ReturnSandTemp, [TOTAL CLAY 11.0 - 14.50%] = @TotalClay,
            [ACTIVE CLAY 7.0 - 9.0%] = @ActiveClay, [DEAD CLAY 3.0 - 4.50%] = @DeadClay,
            [VOLATILE MATTER 2.30 - 3.50%] = @VolatileMatter, [LOSS ON IGNITION 4.0 - 7.0%] = @LossOnIgnition,
            [AFS No  45 - 55] = @AFSNo
            WHERE Id = @id
        `;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Sand properties record updated' });
    } catch (err) {
        logger.error('Error updating sand properties:', err);
        res.status(500).json({ error: 'Failed to update sand properties record' });
    }
});

// DELETE sand properties record
router.delete('/sand/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        
        const result = await request.query`DELETE FROM Lab_Sand WHERE Id = @id`;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Sand properties record deleted' });
    } catch (err) {
        logger.error('Error deleting sand properties:', err);
        res.status(500).json({ error: 'Failed to delete sand properties record' });
    }
});

// ==================== CHEMISTRY / SPECTRO (Lab_Spectro) ====================

// GET all chemistry records (current month by default or filtered)
router.get('/chemistry', async (req, res) => {
    try {
        const { search, heatNo, partNo, allTime, startDate, endDate } = req.query;
        const request = new sql.Request(req.db);
        
        let query = `SELECT * FROM Lab_Spectro WHERE 1=1`;

        const hasSpecificFilters = (heatNo && heatNo.trim() !== '') || (partNo && partNo.trim() !== '') || search || allTime || startDate || endDate;
        if (!hasSpecificFilters) {
            query += ` AND MONTH(Date) = MONTH(GETDATE()) AND YEAR(Date) = YEAR(GETDATE())`;
        }
        if (startDate) {
            query += ` AND Date >= @startDate`;
            request.input('startDate', sql.DateTime, new Date(startDate));
        }
        if (endDate) {
            query += ` AND Date < DATEADD(day, 1, @endDate)`;
            request.input('endDate', sql.DateTime, new Date(endDate));
        }

        if (heatNo && heatNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) = @heatNo`;
            request.input('heatNo', sql.NVarChar, heatNo.trim());
        }
        if (partNo && partNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(PartNo AS NVARCHAR(MAX)))) = @partNo`;
            request.input('partNo', sql.NVarChar, partNo.trim());
        }
        if (search) {
            query += ` AND (HeatNo LIKE @search OR Grade LIKE @search OR PartNo LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        query += ` ORDER BY Date DESC`;
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching chemistry records:', err);
        res.status(500).json({ error: 'Failed to fetch chemistry records' });
    }
});

// POST new chemistry record
router.post('/chemistry', validateBody(chemistrySchema), async (req, res) => {
    const { 
        Date: RecordDate, HeatNo, Grade, PartNo, CE, C, Si, Mn, P, S,
        Cu, Cr, Al, Pb, Sn, Ti, Mg, Mo, MeltingSupervisor, LabSupervisor
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('Date', sql.DateTime, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || '');
        request.input('Grade', sql.NVarChar(50), Grade || '');
        request.input('PartNo', sql.NVarChar(50), PartNo || '');
        request.input('CE', sql.NVarChar(50), CE || '');
        request.input('C', sql.NVarChar(50), C || '');
        request.input('Si', sql.NVarChar(50), Si || '');
        request.input('Mn', sql.NVarChar(50), Mn || '');
        request.input('P', sql.NVarChar(50), P || '');
        request.input('S', sql.NVarChar(50), S || '');
        request.input('Cu', sql.NVarChar(50), Cu || '');
        request.input('Cr', sql.NVarChar(50), Cr || '');
        request.input('Al', sql.NVarChar(50), Al || '');
        request.input('Pb', sql.NVarChar(50), Pb || '');
        request.input('Sn', sql.NVarChar(50), Sn || '');
        request.input('Ti', sql.NVarChar(50), Ti || '');
        request.input('Mg', sql.NVarChar(50), Mg || '');
        request.input('Mo', sql.NVarChar(50), Mo || null);
        request.input('MeltingSupervisor', sql.NVarChar(50), MeltingSupervisor || null);
        request.input('LabSupervisor', sql.NVarChar(50), LabSupervisor || null);
        
        const result = await request.query`
            INSERT INTO Lab_Spectro 
            (Date, HeatNo, Grade, PartNo, CE, C, Si, Mn, P, S, Cu, Cr, Al, Pb, Sn, Ti, Mg, Mo, MeltingSupervisor, LabSupervisor)
            OUTPUT INSERTED.Id
            VALUES (@Date, @HeatNo, @Grade, @PartNo, @CE, @C, @Si, @Mn, @P, @S, @Cu, @Cr, @Al, @Pb, @Sn, @Ti, @Mg, @Mo, @MeltingSupervisor, @LabSupervisor)
        `;
        
        res.json({ success: true, message: 'Chemistry record added', id: result.recordset[0].Id });
    } catch (err) {
        logger.error('Error adding chemistry record:', err);
        res.status(500).json({ error: 'Failed to add chemistry record' });
    }
});

// PUT update chemistry record
router.put('/chemistry/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        Date: RecordDate, HeatNo, Grade, PartNo, CE, C, Si, Mn, P, S,
        Cu, Cr, Al, Pb, Sn, Ti, Mg, Mo, MeltingSupervisor, LabSupervisor
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Date', sql.DateTime, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || '');
        request.input('Grade', sql.NVarChar(50), Grade || '');
        request.input('PartNo', sql.NVarChar(50), PartNo || '');
        request.input('CE', sql.NVarChar(50), CE || '');
        request.input('C', sql.NVarChar(50), C || '');
        request.input('Si', sql.NVarChar(50), Si || '');
        request.input('Mn', sql.NVarChar(50), Mn || '');
        request.input('P', sql.NVarChar(50), P || '');
        request.input('S', sql.NVarChar(50), S || '');
        request.input('Cu', sql.NVarChar(50), Cu || '');
        request.input('Cr', sql.NVarChar(50), Cr || '');
        request.input('Al', sql.NVarChar(50), Al || '');
        request.input('Pb', sql.NVarChar(50), Pb || '');
        request.input('Sn', sql.NVarChar(50), Sn || '');
        request.input('Ti', sql.NVarChar(50), Ti || '');
        request.input('Mg', sql.NVarChar(50), Mg || '');
        request.input('Mo', sql.NVarChar(50), Mo || null);
        request.input('MeltingSupervisor', sql.NVarChar(50), MeltingSupervisor || null);
        request.input('LabSupervisor', sql.NVarChar(50), LabSupervisor || null);
        
        const result = await request.query`
            UPDATE Lab_Spectro SET
            Date = @Date, HeatNo = @HeatNo, Grade = @Grade, PartNo = @PartNo,
            CE = @CE, C = @C, Si = @Si, Mn = @Mn, P = @P, S = @S,
            Cu = @Cu, Cr = @Cr, Al = @Al, Pb = @Pb, Sn = @Sn, Ti = @Ti, Mg = @Mg, Mo = @Mo,
            MeltingSupervisor = @MeltingSupervisor, LabSupervisor = @LabSupervisor
            WHERE Id = @id
        `;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Chemistry record updated' });
    } catch (err) {
        logger.error('Error updating chemistry record:', err);
        res.status(500).json({ error: 'Failed to update chemistry record' });
    }
});

// DELETE chemistry record
router.delete('/chemistry/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        
        const result = await request.query`DELETE FROM Lab_Spectro WHERE Id = @id`;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Chemistry record deleted' });
    } catch (err) {
        logger.error('Error deleting chemistry record:', err);
        res.status(500).json({ error: 'Failed to delete chemistry record' });
    }
});

// ==================== MOULD HARDNESS (MouldHardness) ====================

// GET all mould hardness records (current month by default or filtered)
router.get('/mould-hardness', async (req, res) => {
    try {
        const { search, heatNo, partNo, allTime, startDate, endDate } = req.query;
        const request = new sql.Request(req.db);
        
        let query = `SELECT * FROM MouldHardness WHERE 1=1`;

        const hasSpecificFilters = (heatNo && heatNo.trim() !== '') || (partNo && partNo.trim() !== '') || search || allTime || startDate || endDate;
        if (!hasSpecificFilters) {
            query += ` AND MONTH(Date) = MONTH(GETDATE()) AND YEAR(Date) = YEAR(GETDATE())`;
        }
        if (startDate) {
            query += ` AND Date >= @startDate`;
            request.input('startDate', sql.DateTime, new Date(startDate));
        }
        if (endDate) {
            query += ` AND Date < DATEADD(day, 1, @endDate)`;
            request.input('endDate', sql.DateTime, new Date(endDate));
        }

        if (heatNo && heatNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) = @heatNo`;
            request.input('heatNo', sql.NVarChar, heatNo.trim());
        }
        if (partNo && partNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(PartNo AS NVARCHAR(MAX)))) = @partNo`;
            request.input('partNo', sql.NVarChar, partNo.trim());
        }
        if (search) {
            query += ` AND (HeatNo LIKE @search OR PartNo LIKE @search)`;
            request.input('search', sql.NVarChar, `%${search}%`);
        }
        query += ` ORDER BY Date DESC`;
        
        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        logger.error('Error fetching mould hardness records:', err);
        res.status(500).json({ error: 'Failed to fetch mould hardness records' });
    }
});

// POST new mould hardness record
router.post('/mould-hardness', validateBody(mouldHardnessSchema), async (req, res) => {
    const { 
        Date: RecordDate, HeatNo, PartNo,
        BoxNo1, BoxNo2, BoxNo3, BoxNo4, BoxNo5, BoxNo6, BoxNo7, BoxNo8, BoxNo9, BoxNo10,
        BoxNo11, BoxNo12, BoxNo13, BoxNo14, BoxNo15, BoxNo16, BoxNo17, BoxNo18, BoxNo19, BoxNo20,
        BoxNo21, BoxNo22, BoxNo23, BoxNo24, BoxNo25
    } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('Date', sql.DateTime2, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || null);
        
        // Add all box inputs
        for (let i = 1; i <= 25; i++) {
            const boxValue = req.body[`BoxNo${i}`] || null;
            request.input(`BoxNo${i}`, sql.NVarChar(50), boxValue);
        }
        
        const result = await request.query`
            INSERT INTO MouldHardness 
            (Date, HeatNo, PartNo, BoxNo1, BoxNo2, BoxNo3, BoxNo4, BoxNo5, BoxNo6, BoxNo7, BoxNo8, BoxNo9, BoxNo10,
            BoxNo11, BoxNo12, BoxNo13, BoxNo14, BoxNo15, BoxNo16, BoxNo17, BoxNo18, BoxNo19, BoxNo20,
            BoxNo21, BoxNo22, BoxNo23, BoxNo24, BoxNo25)
            OUTPUT INSERTED.Id
            VALUES (@Date, @HeatNo, @PartNo, @BoxNo1, @BoxNo2, @BoxNo3, @BoxNo4, @BoxNo5, @BoxNo6, @BoxNo7, @BoxNo8, @BoxNo9, @BoxNo10,
            @BoxNo11, @BoxNo12, @BoxNo13, @BoxNo14, @BoxNo15, @BoxNo16, @BoxNo17, @BoxNo18, @BoxNo19, @BoxNo20,
            @BoxNo21, @BoxNo22, @BoxNo23, @BoxNo24, @BoxNo25)
        `;
        
        res.json({ success: true, message: 'Mould hardness record added', id: result.recordset[0].Id });
    } catch (err) {
        logger.error('Error adding mould hardness record:', err);
        res.status(500).json({ error: 'Failed to add mould hardness record' });
    }
});

// PUT update mould hardness record
router.put('/mould-hardness/:id', async (req, res) => {
    const { id } = req.params;
    const { Date: RecordDate, HeatNo, PartNo } = req.body;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Date', sql.DateTime2, RecordDate ? new Date(RecordDate) : null);
        request.input('HeatNo', sql.NVarChar(50), HeatNo || null);
        request.input('PartNo', sql.NVarChar(50), PartNo || null);
        
        // Add all box inputs
        for (let i = 1; i <= 25; i++) {
            const boxValue = req.body[`BoxNo${i}`] || null;
            request.input(`BoxNo${i}`, sql.NVarChar(50), boxValue);
        }
        
        const result = await request.query`
            UPDATE MouldHardness SET
            Date = @Date, HeatNo = @HeatNo, PartNo = @PartNo,
            BoxNo1 = @BoxNo1, BoxNo2 = @BoxNo2, BoxNo3 = @BoxNo3, BoxNo4 = @BoxNo4, BoxNo5 = @BoxNo5,
            BoxNo6 = @BoxNo6, BoxNo7 = @BoxNo7, BoxNo8 = @BoxNo8, BoxNo9 = @BoxNo9, BoxNo10 = @BoxNo10,
            BoxNo11 = @BoxNo11, BoxNo12 = @BoxNo12, BoxNo13 = @BoxNo13, BoxNo14 = @BoxNo14, BoxNo15 = @BoxNo15,
            BoxNo16 = @BoxNo16, BoxNo17 = @BoxNo17, BoxNo18 = @BoxNo18, BoxNo19 = @BoxNo19, BoxNo20 = @BoxNo20,
            BoxNo21 = @BoxNo21, BoxNo22 = @BoxNo22, BoxNo23 = @BoxNo23, BoxNo24 = @BoxNo24, BoxNo25 = @BoxNo25
            WHERE Id = @id
        `;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Mould hardness record updated' });
    } catch (err) {
        logger.error('Error updating mould hardness record:', err);
        res.status(500).json({ error: 'Failed to update mould hardness record' });
    }
});

// DELETE mould hardness record
router.delete('/mould-hardness/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        
        const result = await request.query`DELETE FROM MouldHardness WHERE Id = @id`;
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }
        res.json({ success: true, message: 'Mould hardness record deleted' });
    } catch (err) {
        logger.error('Error deleting mould hardness record:', err);
        res.status(500).json({ error: 'Failed to delete mould hardness record' });
    }
});

// ==================== EXCEL IMPORT ENDPOINTS ====================

// POST /physical-properties/import-excel
router.post('/physical-properties/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        let successCount = 0, skippedCount = 0, errorCount = 0;
        const skippedRows = [];
        const errors = [];

        // Process data starting from row 2
        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Check if row has any meaningful data (check first few columns)
            const dateVal = parseExcelDate(getCellValue(row.getCell(1)));
            const heatNo = getCellValue(row.getCell(2));
            const grade = getCellValue(row.getCell(3));
            const partNo = getCellValue(row.getCell(4));
            
            // Skip truly empty rows - no date AND no heatNo
            if (!dateVal && !heatNo && !grade && !partNo) continue;

            try {
                if (!heatNo) { 
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Missing HeatNo`); 
                    continue; 
                }

                // Get all column values
                const uts = getCellValue(row.getCell(5));
                const yieldStress = getCellValue(row.getCell(6));
                const elongation = getCellValue(row.getCell(7));
                const impact = getCellValue(row.getCell(8));

                // Check for duplicate using ALL columns
                const checkReq = new sql.Request(req.db);
                checkReq.input('Date', sql.DateTime, dateVal);
                checkReq.input('HeatNo', sql.NVarChar(50), heatNo);
                checkReq.input('Grade', sql.NVarChar(50), grade || '');
                checkReq.input('PartNo', sql.NVarChar(50), partNo || '');
                checkReq.input('UTS', sql.NVarChar(50), uts || '');
                checkReq.input('YieldStress', sql.NVarChar(50), yieldStress || '');
                checkReq.input('Elongation', sql.NVarChar(50), elongation || '');
                checkReq.input('Impact', sql.NVarChar(50), impact || '');
                const existing = await checkReq.query`
                    SELECT Id FROM Lab_PhysicalProperties 
                    WHERE ((@Date IS NULL AND Date IS NULL) OR Date = @Date)
                    AND ISNULL(HeatNo, '') = @HeatNo 
                    AND ISNULL(Grade, '') = @Grade
                    AND ISNULL(PartNo, '') = @PartNo
                    AND ISNULL([UTS N/mm²], '') = @UTS
                    AND ISNULL([Yield Stress N/mm²], '') = @YieldStress
                    AND ISNULL([Elongation %], '') = @Elongation
                    AND ISNULL([Impact In Joule(J)], '') = @Impact
                `;
                
                if (existing.recordset.length > 0) {
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Exact duplicate found`); 
                    continue;
                }

                const request = new sql.Request(req.db);
                request.input('Date', sql.DateTime, dateVal);
                request.input('HeatNo', sql.NVarChar(50), heatNo);
                request.input('Grade', sql.NVarChar(50), grade);
                request.input('PartNo', sql.NVarChar(50), partNo);
                request.input('UTS', sql.NVarChar(50), uts);
                request.input('YieldStress', sql.NVarChar(50), yieldStress);
                request.input('Elongation', sql.NVarChar(50), elongation);
                request.input('Impact', sql.NVarChar(50), impact);

                await request.query`INSERT INTO Lab_PhysicalProperties (Date, HeatNo, Grade, PartNo, [UTS N/mm²], [Yield Stress N/mm²], [Elongation %], [Impact In Joule(J)]) VALUES (@Date, @HeatNo, @Grade, @PartNo, @UTS, @YieldStress, @Elongation, @Impact)`;
                successCount++;
            } catch (rowErr) { 
                errorCount++; 
                logger.error(`Row ${rowNumber} error:`, rowErr.message);
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Import completed. ${successCount} new, ${skippedCount} skipped, ${errorCount} errors.`, 
            successCount, 
            skippedCount, 
            errorCount, 
            skippedRows: skippedRows.slice(0, 20),
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        logger.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

// POST /microstructure/import-excel
router.post('/microstructure/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        let successCount = 0, skippedCount = 0, errorCount = 0;
        const skippedRows = [];
        const errors = [];

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Check if row has any meaningful data
            const dateVal = parseExcelDate(getCellValue(row.getCell(1)));
            const heatNo = getCellValue(row.getCell(2));
            const grade = getCellValue(row.getCell(3));
            const partNo = getCellValue(row.getCell(4));
            
            // Skip truly empty rows
            if (!dateVal && !heatNo && !grade && !partNo) continue;

            try {
                if (!heatNo) { 
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Missing HeatNo`); 
                    continue; 
                }

                // Get all column values
                const nodularity = getCellValue(row.getCell(5));
                const graphiteType = getCellValue(row.getCell(6));
                const nodularityCount = getCellValue(row.getCell(7));
                const graphiteSize = getCellValue(row.getCell(8));
                const pearlite = getCellValue(row.getCell(9));
                const ferrite = getCellValue(row.getCell(10));
                const carbide = getCellValue(row.getCell(11));
                const castingHardness = getCellValue(row.getCell(12));

                // Check for duplicate using ALL columns
                const checkReq = new sql.Request(req.db);
                checkReq.input('Date', sql.DateTime2, dateVal);
                checkReq.input('HeatNo', sql.NVarChar(50), heatNo);
                checkReq.input('Grade', sql.NVarChar(50), grade || '');
                checkReq.input('PartNo', sql.NVarChar(50), partNo || '');
                checkReq.input('Nodularity', sql.NVarChar(50), nodularity || '');
                checkReq.input('Graphitetype', sql.NVarChar(50), graphiteType || '');
                checkReq.input('NodularityCount', sql.NVarChar(50), nodularityCount || '');
                checkReq.input('GraphiteSize', sql.NVarChar(50), graphiteSize || '');
                checkReq.input('Pearlite', sql.NVarChar(50), pearlite || '');
                checkReq.input('Ferrite', sql.NVarChar(50), ferrite || '');
                checkReq.input('Carbide', sql.NVarChar(50), carbide || '');
                checkReq.input('CastingHardness', sql.NVarChar(50), castingHardness || '');
                const existing = await checkReq.query`
                    SELECT ID FROM Lab_Micro 
                    WHERE ((@Date IS NULL AND Date IS NULL) OR Date = @Date)
                    AND ISNULL(HeatNo, '') = @HeatNo 
                    AND ISNULL(Grade, '') = @Grade
                    AND ISNULL(PartNo, '') = @PartNo
                    AND ISNULL(Nodularity, '') = @Nodularity
                    AND ISNULL(Graphitetype, '') = @Graphitetype
                    AND ISNULL(NodularityCount, '') = @NodularityCount
                    AND ISNULL(GraphiteSize, '') = @GraphiteSize
                    AND ISNULL(Pearlite, '') = @Pearlite
                    AND ISNULL(Ferrite, '') = @Ferrite
                    AND ISNULL(Carbide, '') = @Carbide
                    AND ISNULL(CastingHardness, '') = @CastingHardness
                `;
                
                if (existing.recordset.length > 0) {
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Exact duplicate found`); 
                    continue;
                }

                const request = new sql.Request(req.db);
                request.input('Date', sql.DateTime2, dateVal);
                request.input('HeatNo', sql.NVarChar(50), heatNo);
                request.input('Grade', sql.NVarChar(50), grade);
                request.input('PartNo', sql.NVarChar(50), partNo);
                request.input('Nodularity', sql.NVarChar(50), nodularity);
                request.input('Graphitetype', sql.NVarChar(50), graphiteType);
                request.input('NodularityCount', sql.NVarChar(50), nodularityCount);
                request.input('GraphiteSize', sql.NVarChar(50), graphiteSize);
                request.input('Pearlite', sql.NVarChar(50), pearlite);
                request.input('Ferrite', sql.NVarChar(50), ferrite);
                request.input('Carbide', sql.NVarChar(50), carbide);
                request.input('CastingHardness', sql.NVarChar(50), castingHardness);

                await request.query`INSERT INTO Lab_Micro (Date, HeatNo, Grade, PartNo, Nodularity, Graphitetype, NodularityCount, GraphiteSize, Pearlite, Ferrite, Carbide, CastingHardness) VALUES (@Date, @HeatNo, @Grade, @PartNo, @Nodularity, @Graphitetype, @NodularityCount, @GraphiteSize, @Pearlite, @Ferrite, @Carbide, @CastingHardness)`;
                successCount++;
            } catch (rowErr) { 
                errorCount++; 
                logger.error(`Row ${rowNumber} error:`, rowErr.message);
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Import completed. ${successCount} new, ${skippedCount} skipped, ${errorCount} errors.`, 
            successCount, 
            skippedCount, 
            errorCount, 
            skippedRows: skippedRows.slice(0, 20),
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        logger.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

// POST /sand/import-excel
router.post('/sand/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        let successCount = 0, skippedCount = 0, errorCount = 0;
        const skippedRows = [];
        const errors = [];

        const parseFloat2 = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
        const parseInt2 = (v) => { const n = parseInt(v); return isNaN(n) ? 0 : n; };

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Check if row has any meaningful data
            const dateVal = parseExcelDate(getCellValue(row.getCell(1)));
            const shift = getCellValue(row.getCell(2));
            const inspectionTime = getCellValue(row.getCell(3));
            const heatNo = getCellValue(row.getCell(4));
            const partNo = getCellValue(row.getCell(5));
            
            // Skip truly empty rows
            if (!dateVal && !shift && !heatNo && !partNo) continue;

            try {
                if (!shift) { 
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Missing Shift`); 
                    continue; 
                }

                // Get all column values
                const partName = getCellValue(row.getCell(6)) || '';
                const moisture = parseFloat2(getCellValue(row.getCell(7)));
                const compactability = parseFloat2(getCellValue(row.getCell(8)));
                const permeability = getCellValue(row.getCell(9)) || '';
                const gcs = getCellValue(row.getCell(10)) || '';
                const returnSandTemp = parseInt2(getCellValue(row.getCell(11)));
                const totalClay = parseFloat2(getCellValue(row.getCell(12)));
                const activeClay = parseFloat2(getCellValue(row.getCell(13)));
                const deadClay = parseFloat2(getCellValue(row.getCell(14)));
                const volatileMatter = parseFloat2(getCellValue(row.getCell(15)));
                const lossOnIgnition = parseFloat2(getCellValue(row.getCell(16)));
                const afsNo = parseFloat2(getCellValue(row.getCell(17)));

                // Check for duplicate using ALL key columns
                const checkReq = new sql.Request(req.db);
                checkReq.input('Date', sql.DateTime, dateVal);
                checkReq.input('Shift', sql.NVarChar(50), shift);
                checkReq.input('HeatNo', sql.NVarChar(50), heatNo || '');
                checkReq.input('PartNo', sql.NVarChar(50), partNo || '');
                checkReq.input('PartName', sql.NVarChar(50), partName);
                checkReq.input('Moisture', sql.Float, moisture);
                checkReq.input('Compactability', sql.Float, compactability);
                const existing = await checkReq.query`
                    SELECT Id FROM Lab_Sand 
                    WHERE ((@Date IS NULL AND Date IS NULL) OR Date = @Date)
                    AND ISNULL(Shift, '') = @Shift 
                    AND ISNULL(HeatNo, '') = @HeatNo 
                    AND ISNULL(PartNo, '') = @PartNo
                    AND ISNULL(PartName, '') = @PartName
                    AND ISNULL([Moisture In %], 0) = @Moisture
                    AND ISNULL([Compactability In %], 0) = @Compactability
                `;
                
                if (existing.recordset.length > 0) {
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Exact duplicate found`); 
                    continue;
                }

                const request = new sql.Request(req.db);
                request.input('Date', sql.DateTime, dateVal);
                request.input('Shift', sql.NVarChar(50), shift);
                request.input('InspectionTime', sql.NVarChar(50), inspectionTime || '');
                request.input('HeatNo', sql.NVarChar(50), heatNo);
                request.input('PartNo', sql.NVarChar(50), partNo || '');
                request.input('PartName', sql.NVarChar(50), partName);
                request.input('Moisture', sql.Float, moisture);
                request.input('Compactability', sql.Float, compactability);
                request.input('Permeability', sql.NVarChar(50), permeability);
                request.input('GCS', sql.NVarChar(50), gcs);
                request.input('ReturnSandTemp', sql.Numeric(18,0), returnSandTemp);
                request.input('TotalClay', sql.Float, totalClay);
                request.input('ActiveClay', sql.Float, activeClay);
                request.input('DeadClay', sql.Float, deadClay);
                request.input('VolatileMatter', sql.Float, volatileMatter);
                request.input('LossOnIgnition', sql.Float, lossOnIgnition);
                request.input('AFSNo', sql.Float, afsNo);

                await request.query`INSERT INTO Lab_Sand (Date, Shift, InspectionTime, HeatNo, PartNo, PartName, [Moisture In %], [Compactability In %], [Permeability In No], [Green Compression Strength], [Return Sand Temp], [TOTAL CLAY 11.0 - 14.50%], [ACTIVE CLAY 7.0 - 9.0%], [DEAD CLAY 3.0 - 4.50%], [VOLATILE MATTER 2.30 - 3.50%], [LOSS ON IGNITION 4.0 - 7.0%], [AFS No  45 - 55]) VALUES (@Date, @Shift, @InspectionTime, @HeatNo, @PartNo, @PartName, @Moisture, @Compactability, @Permeability, @GCS, @ReturnSandTemp, @TotalClay, @ActiveClay, @DeadClay, @VolatileMatter, @LossOnIgnition, @AFSNo)`;
                successCount++;
            } catch (rowErr) { 
                errorCount++; 
                logger.error(`Row ${rowNumber} error:`, rowErr.message);
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Import completed. ${successCount} new, ${skippedCount} skipped, ${errorCount} errors.`, 
            successCount, 
            skippedCount, 
            errorCount, 
            skippedRows: skippedRows.slice(0, 20),
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        logger.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

// POST /chemistry/import-excel
router.post('/chemistry/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        let successCount = 0, skippedCount = 0, errorCount = 0;
        const skippedRows = [];
        const errors = [];

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Check if row has any meaningful data
            const dateVal = parseExcelDate(getCellValue(row.getCell(1)));
            const heatNo = getCellValue(row.getCell(2));
            const grade = getCellValue(row.getCell(3));
            const partNo = getCellValue(row.getCell(4));
            
            // Skip truly empty rows
            if (!dateVal && !heatNo && !grade && !partNo) continue;

            try {
                if (!heatNo) { 
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Missing HeatNo`); 
                    continue; 
                }

                // Get all column values
                const ce = getCellValue(row.getCell(5)) || '';
                const c = getCellValue(row.getCell(6)) || '';
                const si = getCellValue(row.getCell(7)) || '';
                const mn = getCellValue(row.getCell(8)) || '';
                const p = getCellValue(row.getCell(9)) || '';
                const s = getCellValue(row.getCell(10)) || '';
                const cu = getCellValue(row.getCell(11)) || '';
                const cr = getCellValue(row.getCell(12)) || '';
                const al = getCellValue(row.getCell(13)) || '';
                const pb = getCellValue(row.getCell(14)) || '';
                const sn = getCellValue(row.getCell(15)) || '';
                const ti = getCellValue(row.getCell(16)) || '';
                const mg = getCellValue(row.getCell(17)) || '';
                const mo = getCellValue(row.getCell(18)) || null;
                const meltingSupervisor = getCellValue(row.getCell(19)) || null;
                const labSupervisor = getCellValue(row.getCell(20)) || null;

                // Check for duplicate using key identifying columns plus core chemistry values
                const checkReq = new sql.Request(req.db);
                checkReq.input('Date', sql.DateTime, dateVal);
                checkReq.input('HeatNo', sql.NVarChar(50), heatNo);
                checkReq.input('Grade', sql.NVarChar(50), grade || '');
                checkReq.input('PartNo', sql.NVarChar(50), partNo || '');
                checkReq.input('CE', sql.NVarChar(50), ce);
                checkReq.input('C', sql.NVarChar(50), c);
                checkReq.input('Si', sql.NVarChar(50), si);
                checkReq.input('Mn', sql.NVarChar(50), mn);
                const existing = await checkReq.query`
                    SELECT Id FROM Lab_Spectro 
                    WHERE ((@Date IS NULL AND Date IS NULL) OR Date = @Date)
                    AND ISNULL(HeatNo, '') = @HeatNo 
                    AND ISNULL(Grade, '') = @Grade
                    AND ISNULL(PartNo, '') = @PartNo
                    AND ISNULL(CE, '') = @CE
                    AND ISNULL(C, '') = @C
                    AND ISNULL(Si, '') = @Si
                    AND ISNULL(Mn, '') = @Mn
                `;
                
                if (existing.recordset.length > 0) {
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Exact duplicate found`); 
                    continue;
                }

                const request = new sql.Request(req.db);
                request.input('Date', sql.DateTime, dateVal);
                request.input('HeatNo', sql.NVarChar(50), heatNo);
                request.input('Grade', sql.NVarChar(50), grade || '');
                request.input('PartNo', sql.NVarChar(50), partNo || '');
                request.input('CE', sql.NVarChar(50), ce);
                request.input('C', sql.NVarChar(50), c);
                request.input('Si', sql.NVarChar(50), si);
                request.input('Mn', sql.NVarChar(50), mn);
                request.input('P', sql.NVarChar(50), p);
                request.input('S', sql.NVarChar(50), s);
                request.input('Cu', sql.NVarChar(50), cu);
                request.input('Cr', sql.NVarChar(50), cr);
                request.input('Al', sql.NVarChar(50), al);
                request.input('Pb', sql.NVarChar(50), pb);
                request.input('Sn', sql.NVarChar(50), sn);
                request.input('Ti', sql.NVarChar(50), ti);
                request.input('Mg', sql.NVarChar(50), mg);
                request.input('Mo', sql.NVarChar(50), mo);
                request.input('MeltingSupervisor', sql.NVarChar(50), meltingSupervisor);
                request.input('LabSupervisor', sql.NVarChar(50), labSupervisor);

                await request.query`INSERT INTO Lab_Spectro (Date, HeatNo, Grade, PartNo, CE, C, Si, Mn, P, S, Cu, Cr, Al, Pb, Sn, Ti, Mg, Mo, MeltingSupervisor, LabSupervisor) VALUES (@Date, @HeatNo, @Grade, @PartNo, @CE, @C, @Si, @Mn, @P, @S, @Cu, @Cr, @Al, @Pb, @Sn, @Ti, @Mg, @Mo, @MeltingSupervisor, @LabSupervisor)`;
                successCount++;
            } catch (rowErr) { 
                errorCount++; 
                logger.error(`Row ${rowNumber} error:`, rowErr.message);
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Import completed. ${successCount} new, ${skippedCount} skipped, ${errorCount} errors.`, 
            successCount, 
            skippedCount, 
            errorCount, 
            skippedRows: skippedRows.slice(0, 20),
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        logger.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

// POST /mould-hardness/import-excel
router.post('/mould-hardness/import-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount < 2) {
            return res.status(400).json({ error: 'Excel file is empty or has no data rows' });
        }

        let successCount = 0, skippedCount = 0, errorCount = 0;
        const skippedRows = [];
        const errors = [];

        for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
            const row = worksheet.getRow(rowNumber);
            
            // Check if row has any meaningful data
            const dateVal = parseExcelDate(getCellValue(row.getCell(1)));
            const heatNo = getCellValue(row.getCell(2));
            const partNo = getCellValue(row.getCell(3));
            
            // Skip truly empty rows
            if (!dateVal && !heatNo && !partNo) continue;

            try {
                // Get box values
                const boxValues = [];
                for (let i = 1; i <= 25; i++) {
                    boxValues[i] = getCellValue(row.getCell(3 + i)) || '';
                }

                // Check for duplicate using Date, HeatNo, PartNo plus first few box values
                const checkReq = new sql.Request(req.db);
                checkReq.input('Date', sql.DateTime2, dateVal);
                checkReq.input('HeatNo', sql.NVarChar(50), heatNo || '');
                checkReq.input('PartNo', sql.NVarChar(50), partNo || '');
                checkReq.input('BoxNo1', sql.NVarChar(50), boxValues[1]);
                checkReq.input('BoxNo2', sql.NVarChar(50), boxValues[2]);
                checkReq.input('BoxNo3', sql.NVarChar(50), boxValues[3]);
                const existing = await checkReq.query`
                    SELECT Id FROM MouldHardness 
                    WHERE ((@Date IS NULL AND Date IS NULL) OR Date = @Date)
                    AND ISNULL(HeatNo, '') = @HeatNo 
                    AND ISNULL(PartNo, '') = @PartNo
                    AND ISNULL(BoxNo1, '') = @BoxNo1
                    AND ISNULL(BoxNo2, '') = @BoxNo2
                    AND ISNULL(BoxNo3, '') = @BoxNo3
                `;
                
                if (existing.recordset.length > 0) {
                    skippedCount++; 
                    skippedRows.push(`Row ${rowNumber}: Exact duplicate found`); 
                    continue;
                }

                const request = new sql.Request(req.db);
                request.input('Date', sql.DateTime2, dateVal);
                request.input('HeatNo', sql.NVarChar(50), heatNo);
                request.input('PartNo', sql.NVarChar(50), partNo);
                
                // BoxNo1-BoxNo25 using pre-extracted values
                for (let i = 1; i <= 25; i++) {
                    request.input(`BoxNo${i}`, sql.NVarChar(50), boxValues[i]);
                }

                await request.query`INSERT INTO MouldHardness (Date, HeatNo, PartNo, BoxNo1, BoxNo2, BoxNo3, BoxNo4, BoxNo5, BoxNo6, BoxNo7, BoxNo8, BoxNo9, BoxNo10, BoxNo11, BoxNo12, BoxNo13, BoxNo14, BoxNo15, BoxNo16, BoxNo17, BoxNo18, BoxNo19, BoxNo20, BoxNo21, BoxNo22, BoxNo23, BoxNo24, BoxNo25) VALUES (@Date, @HeatNo, @PartNo, @BoxNo1, @BoxNo2, @BoxNo3, @BoxNo4, @BoxNo5, @BoxNo6, @BoxNo7, @BoxNo8, @BoxNo9, @BoxNo10, @BoxNo11, @BoxNo12, @BoxNo13, @BoxNo14, @BoxNo15, @BoxNo16, @BoxNo17, @BoxNo18, @BoxNo19, @BoxNo20, @BoxNo21, @BoxNo22, @BoxNo23, @BoxNo24, @BoxNo25)`;
                successCount++;
            } catch (rowErr) { 
                errorCount++; 
                logger.error(`Row ${rowNumber} error:`, rowErr.message);
                errors.push(`Row ${rowNumber}: ${rowErr.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Import completed. ${successCount} new, ${skippedCount} skipped, ${errorCount} errors.`, 
            successCount, 
            skippedCount, 
            errorCount, 
            skippedRows: skippedRows.slice(0, 20),
            errors: errors.slice(0, 10)
        });
    } catch (err) {
        logger.error('Error importing Excel:', err);
        res.status(500).json({ error: 'Failed to import Excel file: ' + err.message });
    }
});

// ==================== PROCESS CAPABILITY ANALYSIS (Lab_Sand) ====================

/**
 * Process Capability Analysis for Sand Testing Parameters
 * Calculates Count, Average, Std Dev, Cp, and Cpk for each parameter
 * 
 * Formulas:
 * - Count (n): Number of observations
 * - Average (x̄): Sum of values / n
 * - Std Dev (s): sqrt(Σ(xi - x̄)² / (n-1))
 * - Cp: (USL - LSL) / (6 * s)
 * - Cpu: (USL - x̄) / (3 * s)
 * - Cpl: (x̄ - LSL) / (3 * s)
 * - Cpk: min(Cpu, Cpl)
 */

// Default specification limits for sand testing parameters
// These are the standard specification limits for the foundry
const DEFAULT_SPEC_LIMITS = {
    moisture: { LSL: 3.5, USL: 4.5 },                    // Moisture Content: 3.5% to 4.5%
    compactability: { LSL: 38, USL: 46 },                 // Compactibility: 38% to 46%
    permeability: { LSL: 110, USL: 160 },                 // Permeability: 110 to 160
    greenCompressionStrength: { LSL: 1100, USL: 1500 }    // Green Compressive Strength: 1100 to 1500 gm/cm²
};

// Helper function to calculate standard deviation
const calculateStdDev = (values, mean) => {
    if (values.length < 2) return 0;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
    return Math.sqrt(variance);
};

// Helper function to calculate process capability metrics
const calculateProcessCapability = (values, LSL, USL) => {
    const count = values.length;
    
    if (count === 0) {
        return {
            count: 0,
            average: null,
            stdDev: null,
            cp: null,
            cpu: null,
            cpl: null,
            cpk: null
        };
    }
    
    // Calculate average (mean)
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / count;
    
    // Calculate standard deviation
    const stdDev = calculateStdDev(values, average);
    
    // If stdDev is 0 or not enough data, return basic stats only
    if (stdDev === 0 || count < 2) {
        return {
            count,
            average: parseFloat(average.toFixed(4)),
            stdDev: 0,
            cp: null,
            cpu: null,
            cpl: null,
            cpk: null
        };
    }
    
    // Calculate Cp (Process Capability Index)
    const cp = (USL - LSL) / (6 * stdDev);
    
    // Calculate Cpu (Upper capability)
    const cpu = (USL - average) / (3 * stdDev);
    
    // Calculate Cpl (Lower capability)
    const cpl = (average - LSL) / (3 * stdDev);
    
    // Calculate Cpk (Centered Capability - minimum of Cpu and Cpl)
    const cpk = Math.min(cpu, cpl);
    
    return {
        count,
        average: parseFloat(average.toFixed(4)),
        stdDev: parseFloat(stdDev.toFixed(4)),
        cp: parseFloat(cp.toFixed(4)),
        cpu: parseFloat(cpu.toFixed(4)),
        cpl: parseFloat(cpl.toFixed(4)),
        cpk: parseFloat(cpk.toFixed(4)),
        LSL,
        USL
    };
};

// Helper function to parse date from various formats (DD-MM-YYYY, YYYY-MM-DD, etc.)
const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    
    // Try DD-MM-YYYY format first
    const ddmmyyyyPattern = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const match = dateStr.match(ddmmyyyyPattern);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) return date;
    }
    
    // Try standard ISO format or other formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    return null;
};

// Helper function to safely parse numeric values from strings
const parseNumericValue = (value) => {
    if (value === null || value === undefined) return NaN;
    // Remove any non-numeric characters except decimal point and minus
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return parsed;
};

// GET process capability analysis for sand testing data
router.get('/sand/process-capability', async (req, res) => {
    try {
        const { 
            startDate, endDate, heatNo, partNo,
            moistureLSL, moistureUSL,
            compactabilityLSL, compactabilityUSL,
            permeabilityLSL, permeabilityUSL,
            greenCompressionLSL, greenCompressionUSL
        } = req.query;
        
        // Parse specification limits from query parameters (use defaults if not provided)
        const specLimits = {
            moisture: {
                LSL: moistureLSL ? parseFloat(moistureLSL) : DEFAULT_SPEC_LIMITS.moisture.LSL,
                USL: moistureUSL ? parseFloat(moistureUSL) : DEFAULT_SPEC_LIMITS.moisture.USL
            },
            compactability: {
                LSL: compactabilityLSL ? parseFloat(compactabilityLSL) : DEFAULT_SPEC_LIMITS.compactability.LSL,
                USL: compactabilityUSL ? parseFloat(compactabilityUSL) : DEFAULT_SPEC_LIMITS.compactability.USL
            },
            permeability: {
                LSL: permeabilityLSL ? parseFloat(permeabilityLSL) : DEFAULT_SPEC_LIMITS.permeability.LSL,
                USL: permeabilityUSL ? parseFloat(permeabilityUSL) : DEFAULT_SPEC_LIMITS.permeability.USL
            },
            greenCompressionStrength: {
                LSL: greenCompressionLSL ? parseFloat(greenCompressionLSL) : DEFAULT_SPEC_LIMITS.greenCompressionStrength.LSL,
                USL: greenCompressionUSL ? parseFloat(greenCompressionUSL) : DEFAULT_SPEC_LIMITS.greenCompressionStrength.USL
            }
        };
        
        // Build query with optional filters
        let query = `
            SELECT 
                [Moisture In %] as Moisture,
                [Compactability In %] as Compactability,
                [Permeability In No] as Permeability,
                [Green Compression Strength] as GreenCompressionStrength
            FROM Lab_Sand 
            WHERE 1=1
        `;
        
        const request = new sql.Request(req.db);
        
        // Apply date filters with proper parsing
        if (startDate) {
            const parsedStartDate = parseDateString(startDate);
            if (parsedStartDate) {
                query += ` AND Date >= @startDate`;
                request.input('startDate', sql.DateTime, parsedStartDate);
            }
        }
        if (endDate) {
            const parsedEndDate = parseDateString(endDate);
            if (parsedEndDate) {
                query += ` AND Date < DATEADD(day, 1, @endDate)`;
                request.input('endDate', sql.DateTime, parsedEndDate);
            }
        }
        
        // Apply other filters
        if (heatNo && heatNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(HeatNo AS NVARCHAR(MAX)))) = @heatNo`;
            request.input('heatNo', sql.NVarChar, heatNo.trim());
        }
        if (partNo && partNo.trim() !== '') {
            query += ` AND LTRIM(RTRIM(CAST(PartNo AS NVARCHAR(MAX)))) = @partNo`;
            request.input('partNo', sql.NVarChar, partNo.trim());
        }
        
        query += ` ORDER BY Date DESC`;
        
        const result = await request.query(query);
        const records = result.recordset;
        
        // Extract values for each parameter with proper parsing
        const moistureValues = records
            .map(r => parseNumericValue(r.Moisture))
            .filter(v => !isNaN(v));
        
        const compactabilityValues = records
            .map(r => parseNumericValue(r.Compactability))
            .filter(v => !isNaN(v));
        
        const permeabilityValues = records
            .map(r => parseNumericValue(r.Permeability))
            .filter(v => !isNaN(v));
        
        const greenCompressionValues = records
            .map(r => parseNumericValue(r.GreenCompressionStrength))
            .filter(v => !isNaN(v));
        
        // Debug logging
        logger.info(`Process Capability Query: ${query}`);
        logger.info(`Total records found: ${records.length}`);
        logger.info(`Moisture values: ${moistureValues.length}, Sample: ${moistureValues.slice(0, 3)}`);
        logger.info(`Compactability values: ${compactabilityValues.length}, Sample: ${compactabilityValues.slice(0, 3)}`);
        logger.info(`Permeability values: ${permeabilityValues.length}, Sample: ${permeabilityValues.slice(0, 3)}`);
        logger.info(`Green Compression values: ${greenCompressionValues.length}, Sample: ${greenCompressionValues.slice(0, 3)}`);
        
        // Calculate process capability for each parameter
        const analysis = {
            totalRecords: records.length,
            filters: {
                startDate: startDate || null,
                endDate: endDate || null,
                heatNo: heatNo || null,
                partNo: partNo || null
            },
            specificationLimits: specLimits,
            parameters: {
                moisture: calculateProcessCapability(
                    moistureValues, 
                    specLimits.moisture.LSL, 
                    specLimits.moisture.USL
                ),
                compactability: calculateProcessCapability(
                    compactabilityValues, 
                    specLimits.compactability.LSL, 
                    specLimits.compactability.USL
                ),
                permeability: calculateProcessCapability(
                    permeabilityValues, 
                    specLimits.permeability.LSL, 
                    specLimits.permeability.USL
                ),
                greenCompressionStrength: calculateProcessCapability(
                    greenCompressionValues, 
                    specLimits.greenCompressionStrength.LSL, 
                    specLimits.greenCompressionStrength.USL
                )
            }
        };
        
        // Add interpretation guidelines
        analysis.interpretation = {
            cp: {
                description: "Process Capability Index - measures potential capability assuming process is centered",
                ratings: {
                    "<1": "Not capable",
                    "1-1.33": "Barely capable",
                    ">1.33": "Good",
                    ">1.67": "Excellent"
                }
            },
            cpk: {
                description: "Centered Capability - accounts for process shift from center (min of Cpu and Cpl)",
                ratings: {
                    "<1": "Not capable",
                    "1-1.33": "Barely capable",
                    ">1.33": "Good",
                    ">1.67": "Excellent"
                }
            }
        };
        
        res.json(analysis);
        
    } catch (err) {
        logger.error('Error calculating process capability:', err);
        res.status(500).json({ error: 'Failed to calculate process capability analysis', details: err.message });
    }
});

module.exports = router;
