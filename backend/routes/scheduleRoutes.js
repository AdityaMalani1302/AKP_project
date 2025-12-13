/**
 * Schedule Routes
 * CRUD for report schedules
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { requireRole } = require('../middleware/authMiddleware');
const { startSchedule, stopSchedule, reloadSchedules, getSchedulerStatus } = require('../services/schedulerService');

// All routes require admin role
router.use(requireRole('admin'));

/**
 * GET /api/schedules
 * Get all schedules with report info
 */
router.get('/', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        const result = await pool.request().query(`
            SELECT s.*, r.ReportName, r.Description as ReportDescription
            FROM ReportSchedules s
            JOIN ReportTemplates r ON s.ReportId = r.ReportId
            WHERE r.IsActive = 1
            ORDER BY s.IsActive DESC, s.CreatedAt DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
});

/**
 * POST /api/schedules
 * Create new schedule
 */
router.post('/', async (req, res) => {
    try {
        const { ReportId, ScheduleName, Frequency, DayOfWeek, DayOfMonth, TimeOfDay } = req.body;
        
        if (!ReportId || !Frequency || !TimeOfDay) {
            return res.status(400).json({ error: 'ReportId, Frequency, and TimeOfDay are required' });
        }

        // Validate frequency
        if (!['daily', 'weekly', 'monthly'].includes(Frequency.toLowerCase())) {
            return res.status(400).json({ error: 'Frequency must be daily, weekly, or monthly' });
        }

        const pool = getPool('IcSoftVer3');
        const result = await pool.request()
            .input('ReportId', ReportId)
            .input('ScheduleName', ScheduleName || null)
            .input('Frequency', Frequency.toLowerCase())
            .input('DayOfWeek', DayOfWeek !== undefined ? DayOfWeek : null)
            .input('DayOfMonth', DayOfMonth !== undefined ? DayOfMonth : null)
            .input('TimeOfDay', TimeOfDay)
            .query(`
                INSERT INTO ReportSchedules (ReportId, ScheduleName, Frequency, DayOfWeek, DayOfMonth, TimeOfDay)
                OUTPUT INSERTED.ScheduleId
                VALUES (@ReportId, @ScheduleName, @Frequency, @DayOfWeek, @DayOfMonth, @TimeOfDay)
            `);

        const scheduleId = result.recordset[0].ScheduleId;

        // Get full schedule info and start it
        const scheduleResult = await pool.request()
            .input('ScheduleId', scheduleId)
            .query(`
                SELECT s.*, r.ReportName, r.SqlQuery, r.DatabaseName, r.Description
                FROM ReportSchedules s
                JOIN ReportTemplates r ON s.ReportId = r.ReportId
                WHERE s.ScheduleId = @ScheduleId
            `);

        if (scheduleResult.recordset.length > 0) {
            startSchedule(scheduleResult.recordset[0]);
        }

        res.status(201).json({
            success: true,
            message: 'Schedule created successfully',
            scheduleId
        });
    } catch (error) {
        console.error('Error creating schedule:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
});

/**
 * PUT /api/schedules/:id
 * Update schedule
 */
router.put('/:id', async (req, res) => {
    try {
        const { ScheduleName, Frequency, DayOfWeek, DayOfMonth, TimeOfDay, IsActive } = req.body;
        const pool = getPool('IcSoftVer3');
        
        await pool.request()
            .input('ScheduleId', req.params.id)
            .input('ScheduleName', ScheduleName || null)
            .input('Frequency', Frequency ? Frequency.toLowerCase() : null)
            .input('DayOfWeek', DayOfWeek !== undefined ? DayOfWeek : null)
            .input('DayOfMonth', DayOfMonth !== undefined ? DayOfMonth : null)
            .input('TimeOfDay', TimeOfDay)
            .input('IsActive', IsActive !== undefined ? IsActive : 1)
            .query(`
                UPDATE ReportSchedules 
                SET ScheduleName = COALESCE(@ScheduleName, ScheduleName),
                    Frequency = COALESCE(@Frequency, Frequency),
                    DayOfWeek = @DayOfWeek,
                    DayOfMonth = @DayOfMonth,
                    TimeOfDay = COALESCE(@TimeOfDay, TimeOfDay),
                    IsActive = @IsActive
                WHERE ScheduleId = @ScheduleId
            `);

        // Reload schedules to apply changes
        await reloadSchedules();

        res.json({ success: true, message: 'Schedule updated successfully' });
    } catch (error) {
        console.error('Error updating schedule:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

/**
 * DELETE /api/schedules/:id
 * Delete schedule
 */
router.delete('/:id', async (req, res) => {
    try {
        // Stop the cron job first
        stopSchedule(parseInt(req.params.id));

        const pool = getPool('IcSoftVer3');
        await pool.request()
            .input('ScheduleId', req.params.id)
            .query('DELETE FROM ReportSchedules WHERE ScheduleId = @ScheduleId');

        res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
        console.error('Error deleting schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
});

/**
 * POST /api/schedules/:id/toggle
 * Enable/disable schedule
 */
router.post('/:id/toggle', async (req, res) => {
    try {
        const pool = getPool('IcSoftVer3');
        
        // Toggle IsActive
        await pool.request()
            .input('ScheduleId', req.params.id)
            .query(`
                UPDATE ReportSchedules 
                SET IsActive = CASE WHEN IsActive = 1 THEN 0 ELSE 1 END
                WHERE ScheduleId = @ScheduleId
            `);

        // Reload schedules
        await reloadSchedules();

        res.json({ success: true, message: 'Schedule toggled successfully' });
    } catch (error) {
        console.error('Error toggling schedule:', error);
        res.status(500).json({ error: 'Failed to toggle schedule' });
    }
});

/**
 * GET /api/schedules/status
 * Get scheduler status
 */
router.get('/status/info', async (req, res) => {
    try {
        const status = getSchedulerStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting status:', error);
        res.status(500).json({ error: 'Failed to get status' });
    }
});

/**
 * POST /api/schedules/reload
 * Reload all schedules
 */
router.post('/reload', async (req, res) => {
    try {
        await reloadSchedules();
        const status = getSchedulerStatus();
        res.json({ 
            success: true, 
            message: 'Schedules reloaded',
            activeJobs: status.activeJobs
        });
    } catch (error) {
        console.error('Error reloading schedules:', error);
        res.status(500).json({ error: 'Failed to reload schedules' });
    }
});

module.exports = router;
