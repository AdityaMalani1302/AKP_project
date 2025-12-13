/**
 * Report Routes
 * CRUD operations for report templates + execution
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getPool } = require('../config/db');
const { generatePDF, getGeneratedReports, deleteReport, REPORTS_DIR } = require('../services/pdfService');
const { requireRole } = require('../middleware/authMiddleware');

// All routes require admin role
router.use(requireRole('admin'));

// =============================================
// REPORT TEMPLATES
// =============================================

/**
 * GET /api/reports
 * Get all report templates
 */
router.get('/', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        const result = await pool.request().query(`
            SELECT r.*, u.FullName as CreatedByName
            FROM ReportTemplates r
            LEFT JOIN Users u ON r.CreatedBy = u.Id
            WHERE r.IsActive = 1
            ORDER BY r.CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

/**
 * GET /api/reports/:id
 * Get single report template
 */
router.get('/:id', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        const result = await pool.request()
            .input('ReportId', req.params.id)
            .query('SELECT * FROM ReportTemplates WHERE ReportId = @ReportId');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching report:', error);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
});

/**
 * POST /api/reports
 * Create new report template
 */
router.post('/', async (req, res) => {
    try {
        const { ReportName, Description, SqlQuery, DatabaseName } = req.body;
        
        if (!ReportName || !SqlQuery) {
            return res.status(400).json({ error: 'ReportName and SqlQuery are required' });
        }

        const pool = getPool('IcSoftVer3');
        const result = await pool.request()
            .input('ReportName', ReportName)
            .input('Description', Description || null)
            .input('SqlQuery', SqlQuery)
            .input('DatabaseName', DatabaseName || 'IcSoftVer3')
            .input('CreatedBy', req.user.id)
            .query(`
                INSERT INTO ReportTemplates (ReportName, Description, SqlQuery, DatabaseName, CreatedBy)
                OUTPUT INSERTED.ReportId
                VALUES (@ReportName, @Description, @SqlQuery, @DatabaseName, @CreatedBy)
            `);

        res.status(201).json({
            success: true,
            message: 'Report created successfully',
            reportId: result.recordset[0].ReportId
        });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Failed to create report' });
    }
});

/**
 * PUT /api/reports/:id
 * Update report template
 */
router.put('/:id', async (req, res) => {
    try {
        const { ReportName, Description, SqlQuery, DatabaseName } = req.body;
        const pool = getPool('IcSoftVer3');
        
        await pool.request()
            .input('ReportId', req.params.id)
            .input('ReportName', ReportName)
            .input('Description', Description || null)
            .input('SqlQuery', SqlQuery)
            .input('DatabaseName', DatabaseName || 'IcSoftVer3')
            .query(`
                UPDATE ReportTemplates 
                SET ReportName = @ReportName, Description = @Description, 
                    SqlQuery = @SqlQuery, DatabaseName = @DatabaseName,
                    UpdatedAt = GETDATE()
                WHERE ReportId = @ReportId
            `);

        res.json({ success: true, message: 'Report updated successfully' });
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: 'Failed to update report' });
    }
});

/**
 * DELETE /api/reports/:id
 * Soft delete report template
 */
router.delete('/:id', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        await pool.request()
            .input('ReportId', req.params.id)
            .query('UPDATE ReportTemplates SET IsActive = 0 WHERE ReportId = @ReportId');

        res.json({ success: true, message: 'Report deleted successfully' });
    } catch (error) {
        console.error('Error deleting report:', error);
        res.status(500).json({ error: 'Failed to delete report' });
    }
});

// =============================================
// REPORT EXECUTION
// =============================================

/**
 * POST /api/reports/:id/preview
 * Preview report data (execute query, return JSON)
 */
router.post('/:id/preview', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        const reportResult = await pool.request()
            .input('ReportId', req.params.id)
            .query('SELECT * FROM ReportTemplates WHERE ReportId = @ReportId');
        
        if (reportResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reportResult.recordset[0];
        const targetPool = getPool(report.DatabaseName || 'IcSoftVer3');
        
        if (!targetPool) {
            return res.status(400).json({ error: `Database ${report.DatabaseName} not connected` });
        }

        // Execute query with limit for preview
        const dataResult = await targetPool.request().query(report.SqlQuery);
        
        res.json({
            reportName: report.ReportName,
            description: report.Description,
            rowCount: dataResult.recordset.length,
            columns: dataResult.recordset.length > 0 ? Object.keys(dataResult.recordset[0]) : [],
            data: dataResult.recordset.slice(0, 100) // Limit preview to 100 rows
        });
    } catch (error) {
        console.error('Error previewing report:', error);
        res.status(500).json({ error: `Query execution failed: ${error.message}` });
    }
});

/**
 * POST /api/reports/:id/execute
 * Execute report and generate PDF
 */
router.post('/:id/execute', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const pool = getPool('IcSoftVer3');
        const reportResult = await pool.request()
            .input('ReportId', req.params.id)
            .query('SELECT * FROM ReportTemplates WHERE ReportId = @ReportId');
        
        if (reportResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reportResult.recordset[0];
        const targetPool = getPool(report.DatabaseName || 'IcSoftVer3');
        
        if (!targetPool) {
            return res.status(400).json({ error: `Database ${report.DatabaseName} not connected` });
        }

        // Execute query
        const dataResult = await targetPool.request().query(report.SqlQuery);
        const data = dataResult.recordset;

        // Generate PDF
        const { filePath, fileName } = await generatePDF({
            reportName: report.ReportName,
            data: data,
            description: report.Description
        });

        const executionTime = Date.now() - startTime;

        // Log execution
        await pool.request()
            .input('ReportId', req.params.id)
            .input('ExecutedBy', req.user.id)
            .input('Status', 'success')
            .input('PdfFileName', fileName)
            .input('RecordCount', data.length)
            .input('ExecutionTimeMs', executionTime)
            .query(`
                INSERT INTO ReportLogs (ReportId, ExecutedBy, Status, PdfFileName, RecordCount, ExecutionTimeMs)
                VALUES (@ReportId, @ExecutedBy, @Status, @PdfFileName, @RecordCount, @ExecutionTimeMs)
            `);

        res.json({
            success: true,
            message: 'Report generated successfully',
            fileName,
            rowCount: data.length,
            executionTime: `${executionTime}ms`,
            downloadUrl: `/api/reports/download/${fileName}`
        });

    } catch (error) {
        console.error('Error executing report:', error);
        
        // Log failure
        try {
            const pool = getPool('IcSoftVer3');
            await pool.request()
                .input('ReportId', req.params.id)
                .input('ExecutedBy', req.user.id)
                .input('Status', 'failed')
                .input('ErrorMessage', error.message)
                .input('ExecutionTimeMs', Date.now() - startTime)
                .query(`
                    INSERT INTO ReportLogs (ReportId, ExecutedBy, Status, ErrorMessage, ExecutionTimeMs)
                    VALUES (@ReportId, @ExecutedBy, @Status, @ErrorMessage, @ExecutionTimeMs)
                `);
        } catch (logError) {
            console.error('Failed to log error:', logError);
        }

        res.status(500).json({ error: `Report execution failed: ${error.message}` });
    }
});

// =============================================
// PDF DOWNLOADS
// =============================================

/**
 * GET /api/reports/files
 * List all generated PDF files
 */
router.get('/files/list', async (req, res) => {
    try {
        const files = getGeneratedReports();
        res.json(files);
    } catch (error) {
        console.error('Error listing files:', error);
        res.status(500).json({ error: 'Failed to list files' });
    }
});

/**
 * GET /api/reports/download/:fileName
 * Download a generated PDF
 */
router.get('/download/:fileName', (req, res) => {
    try {
        const fileName = req.params.fileName;
        const filePath = path.join(REPORTS_DIR, fileName);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, fileName);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});

/**
 * DELETE /api/reports/files/:fileName
 * Delete a generated PDF
 */
router.delete('/files/:fileName', (req, res) => {
    try {
        const deleted = deleteReport(req.params.fileName);
        if (deleted) {
            res.json({ success: true, message: 'File deleted' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// =============================================
// REPORT LOGS
// =============================================

/**
 * GET /api/reports/logs
 * Get report execution logs
 */
router.get('/logs/all', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        const result = await pool.request().query(`
            SELECT TOP 100 l.*, r.ReportName, u.FullName as ExecutedByName
            FROM ReportLogs l
            JOIN ReportTemplates r ON l.ReportId = r.ReportId
            LEFT JOIN Users u ON l.ExecutedBy = u.Id
            ORDER BY l.ExecutedAt DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;
