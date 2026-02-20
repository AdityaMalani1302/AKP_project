/**
 * Scheduler Service
 * Manages scheduled report execution using node-cron
 */

const cron = require('node-cron');
const { getPool } = require('../config/db');
const { generatePDF } = require('./pdfService');
const { DB } = require('../config/constants');

// Store active cron jobs
const activeJobs = new Map();

/**
 * Convert schedule settings to cron expression
 * @param {Object} schedule 
 * @returns {string} Cron expression
 */
function toCronExpression(schedule) {
    const { Frequency, DayOfWeek, DayOfMonth, TimeOfDay } = schedule;
    
    // Parse time (HH:MM:SS or HH:MM)
    const timeParts = TimeOfDay.split(':');
    const hour = parseInt(timeParts[0], 10);
    const minute = parseInt(timeParts[1] || 0, 10);

    switch (Frequency.toLowerCase()) {
        case 'daily':
            // Run every day at specified time
            return `${minute} ${hour} * * *`;
        
        case 'weekly':
            // Run on specific day of week (0-6, 0=Sunday)
            const dow = DayOfWeek !== null ? DayOfWeek : 1; // Default Monday
            return `${minute} ${hour} * * ${dow}`;
        
        case 'monthly':
            // Run on specific day of month (1-31)
            const dom = DayOfMonth !== null ? DayOfMonth : 1; // Default 1st
            return `${minute} ${hour} ${dom} * *`;
        
        default:
            throw new Error(`Unknown frequency: ${Frequency}`);
    }
}

/**
 * Execute a scheduled report
 * @param {Object} schedule - Schedule record from database
 */
async function executeScheduledReport(schedule) {
    const pool = getPool(DB.DEFAULT_POOL);
    if (!pool) {
        console.error('[Scheduler] Database not connected');
        return;
    }

    const startTime = Date.now();
    let logId = null;

    try {
        console.log(`[Scheduler] Executing report: ${schedule.ReportName} (Schedule ID: ${schedule.ScheduleId})`);

        // Create pending log entry
        const logResult = await pool.request()
            .input('ReportId', schedule.ReportId)
            .input('ScheduleId', schedule.ScheduleId)
            .input('Status', 'pending')
            .query(`
                INSERT INTO ReportLogs (ReportId, ScheduleId, Status)
                OUTPUT INSERTED.LogId
                VALUES (@ReportId, @ScheduleId, @Status)
            `);
        logId = logResult.recordset[0].LogId;

        // Get the report template
        const reportResult = await pool.request()
            .input('ReportId', schedule.ReportId)
            .query('SELECT * FROM ReportTemplates WHERE ReportId = @ReportId');
        
        if (reportResult.recordset.length === 0) {
            throw new Error('Report template not found');
        }

        const report = reportResult.recordset[0];

        // Determine which database to use
        const targetPool = getPool(report.DatabaseName || DB.DEFAULT_POOL);
        if (!targetPool) {
            throw new Error(`Database ${report.DatabaseName} not connected`);
        }

        // Execute the SQL query
        const dataResult = await targetPool.request().query(report.SqlQuery);
        const data = dataResult.recordset;

        // Generate PDF
        const { filePath, fileName } = await generatePDF({
            reportName: report.ReportName,
            data: data,
            description: report.Description
        });

        const executionTime = Date.now() - startTime;

        // Update log with success
        await pool.request()
            .input('LogId', logId)
            .input('Status', 'success')
            .input('PdfFileName', fileName)
            .input('RecordCount', data.length)
            .input('ExecutionTimeMs', executionTime)
            .query(`
                UPDATE ReportLogs 
                SET Status = @Status, PdfFileName = @PdfFileName, 
                    RecordCount = @RecordCount, ExecutionTimeMs = @ExecutionTimeMs
                WHERE LogId = @LogId
            `);

        // Update schedule's LastRun
        await pool.request()
            .input('ScheduleId', schedule.ScheduleId)
            .query(`
                UPDATE ReportSchedules 
                SET LastRun = GETDATE()
                WHERE ScheduleId = @ScheduleId
            `);

        console.log(`[Scheduler] Report generated successfully: ${fileName} (${data.length} rows, ${executionTime}ms)`);

    } catch (error) {
        console.error(`[Scheduler] Error executing report:`, error.message);
        
        // Update log with error
        if (logId) {
            try {
                await pool.request()
                    .input('LogId', logId)
                    .input('Status', 'failed')
                    .input('ErrorMessage', error.message)
                    .input('ExecutionTimeMs', Date.now() - startTime)
                    .query(`
                        UPDATE ReportLogs 
                        SET Status = @Status, ErrorMessage = @ErrorMessage, ExecutionTimeMs = @ExecutionTimeMs
                        WHERE LogId = @LogId
                    `);
            } catch (logError) {
                console.error('[Scheduler] Failed to update log:', logError.message);
            }
        }
    }
}

/**
 * Load and start all active schedules
 */
async function initScheduler() {
    console.log('[Scheduler] Initializing scheduler service...');
    
    // Wait for database connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const pool = getPool(DB.DEFAULT_POOL);
    if (!pool) {
        console.error('[Scheduler] Database not connected, scheduler not started');
        return;
    }

    try {
        // Check if tables exist
        const tableCheck = await pool.request().query(`
            SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'ReportSchedules'
        `);
        
        if (tableCheck.recordset.length === 0) {
            console.log('[Scheduler] ReportSchedules table not found, skipping scheduler init');
            return;
        }

        // Load active schedules
        const result = await pool.request().query(`
            SELECT s.*, r.ReportName, r.SqlQuery, r.DatabaseName, r.Description
            FROM ReportSchedules s
            JOIN ReportTemplates r ON s.ReportId = r.ReportId
            WHERE s.IsActive = 1 AND r.IsActive = 1
        `);

        const schedules = result.recordset;
        console.log(`[Scheduler] Found ${schedules.length} active schedule(s)`);

        // Create cron jobs for each schedule
        for (const schedule of schedules) {
            try {
                startSchedule(schedule);
            } catch (error) {
                console.error(`[Scheduler] Failed to start schedule ${schedule.ScheduleId}:`, error.message);
            }
        }

        console.log('[Scheduler] Scheduler service initialized');

    } catch (error) {
        console.error('[Scheduler] Error initializing scheduler:', error.message);
    }
}

/**
 * Start a single schedule
 * @param {Object} schedule 
 */
function startSchedule(schedule) {
    const cronExpr = toCronExpression(schedule);
    
    // Stop existing job if any
    if (activeJobs.has(schedule.ScheduleId)) {
        activeJobs.get(schedule.ScheduleId).stop();
    }

    // Create new cron job
    const job = cron.schedule(cronExpr, () => {
        executeScheduledReport(schedule);
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });

    activeJobs.set(schedule.ScheduleId, job);
    console.log(`[Scheduler] Started schedule ${schedule.ScheduleId}: "${schedule.ScheduleName || schedule.ReportName}" (${schedule.Frequency} at ${schedule.TimeOfDay})`);
}

/**
 * Stop a schedule
 * @param {number} scheduleId 
 */
function stopSchedule(scheduleId) {
    if (activeJobs.has(scheduleId)) {
        activeJobs.get(scheduleId).stop();
        activeJobs.delete(scheduleId);
        console.log(`[Scheduler] Stopped schedule ${scheduleId}`);
        return true;
    }
    return false;
}

/**
 * Reload all schedules from database
 */
async function reloadSchedules() {
    // Stop all existing jobs
    for (const [id, job] of activeJobs) {
        job.stop();
    }
    activeJobs.clear();

    // Re-initialize
    await initScheduler();
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
    return {
        activeJobs: activeJobs.size,
        jobIds: Array.from(activeJobs.keys())
    };
}

module.exports = {
    initScheduler,
    startSchedule,
    stopSchedule,
    reloadSchedules,
    executeScheduledReport,
    getSchedulerStatus
};
