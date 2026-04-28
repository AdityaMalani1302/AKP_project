/**
 * WhatsApp Routes
 * API endpoints for WhatsApp Cloud API integration
 * Manages contacts, sending messages/documents, and delivery logs
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../config/db');
const { requireRole } = require('../middleware/authMiddleware');
const { validateBody } = require('../utils/validators');
const { whatsappContactSchema, whatsappSendTextSchema, whatsappSendReportSchema } = require('../utils/validators');
const { sendTextMessage, sendReportViaWhatsApp, sendTemplateMessage, getConfigStatus } = require('../services/whatsappService');
const { generatePDF } = require('../services/pdfService');
const { generateExcel } = require('../services/excelService');
const logger = require('../utils/logger');
const { DB } = require('../config/constants');

// All routes require admin role
router.use(requireRole('admin'));

// ==========================================
// CONFIG STATUS
// ==========================================

/**
 * GET /api/whatsapp/config
 * Check if WhatsApp API is configured
 */
router.get('/config', (req, res) => {
    res.json(getConfigStatus());
});

/**
 * GET /api/whatsapp/verify-token
 * Validates the WhatsApp access token against the Meta Graph API
 */
router.get('/verify-token', async (req, res) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!token) return res.status(400).json({ valid: false, error: 'No token configured' });

    try {
        const axios = require('axios');
        const response = await axios.get(`https://graph.facebook.com/debug_token`, {
            params: {
                input_token: token,
                access_token: token
            }
        });
        const data = response.data?.data;
        const expiresAt = data?.expires_at ? new Date(data.expires_at * 1000).toISOString() : null;
        const isValid = data?.is_valid === true;
        const isExpired = expiresAt && new Date(expiresAt) < new Date();

        res.json({
            valid: isValid,
            expired: isExpired,
            expiresAt,
            neverExpires: data?.expires_at === 0,
            appName: data?.application,
            error: isValid ? null : (data?.error?.message || 'Token is invalid')
        });
    } catch (error) {
        logger.error('WhatsApp token verification failed:', error.response?.data || error.message);
        res.status(500).json({ valid: false, error: 'Token verification failed' });
    }
});

/**
 * GET /api/whatsapp/check-number/:phone
 * Checks if a phone number is a valid WhatsApp user
 */
router.get('/check-number/:phone', async (req, res) => {
    const { isConfigured, sendTemplateMessage } = require('../services/whatsappService');
    const axios = require('axios');
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';

    const phone = req.params.phone.replace(/\D/g, '');
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    try {
        const response = await axios.get(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/phone_numbers`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // Try sending a test check via contacts endpoint
        const contactsResponse = await axios.post(
            `https://graph.facebook.com/${apiVersion}/contacts`,
            { blocking: 'wait', contacts: [`+${phone}`], force_check: false },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        res.json({ phone, result: contactsResponse.data });
    } catch (error) {
        logger.error('WhatsApp number check failed:', error.response?.data || error.message);
        res.status(500).json({ phone, error: 'Number check failed' });
    }
});

/**
 * GET /api/whatsapp/test-send/:phone
 * Sends the 'scheduled_data_export' template to a phone number for testing.
 * Returns the FULL Meta API response for debugging delivery issues.
 */
router.get('/test-send/:phone', async (req, res) => {
    const axios = require('axios');
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'scheduled_data_export';
    const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';
    const phone = req.params.phone.replace(/\D/g, '');

    try {
        // Send template WITHOUT document header (just body param) for quick testing
        const response = await axios.post(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
            {
                messaging_product: 'whatsapp',
                to: phone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: templateLang },
                    components: [
                        {
                            type: 'body',
                            parameters: [
                                { type: 'text', text: 'Test Report' }
                            ]
                        }
                    ]
                }
            },
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        res.json({ phone, template: templateName, lang: templateLang, fullResponse: response.data });
    } catch (error) {
        logger.error('WhatsApp test send failed:', error.response?.data || error.message);
        res.status(500).json({
            phone,
            template: templateName,
            lang: templateLang,
            error: 'Test send failed'
        });
    }
});

// ==========================================
// CONTACTS CRUD
// ==========================================

/**
 * GET /api/whatsapp/contacts
 * List all WhatsApp contacts
 */
router.get('/contacts', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        const result = await pool.request().query(`
            SELECT ContactId, Name, PhoneNumber, Department, IsActive, CreatedAt
            FROM WhatsAppContacts
            ORDER BY Name
        `);
        res.json(result.recordset);
    } catch (error) {
        logger.error('Error fetching WhatsApp contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

/**
 * POST /api/whatsapp/contacts
 * Add a new WhatsApp contact
 */
router.post('/contacts', validateBody(whatsappContactSchema), async (req, res) => {
    try {
        const { Name, PhoneNumber, Department } = req.body;
        const pool = getPool(DB.DEFAULT_POOL);

        // Check for duplicate phone number
        const existingCheck = await pool.request()
            .input('PhoneNumber', PhoneNumber)
            .query('SELECT ContactId FROM WhatsAppContacts WHERE PhoneNumber = @PhoneNumber');

        if (existingCheck.recordset.length > 0) {
            return res.status(400).json({ error: 'A contact with this phone number already exists' });
        }

        const result = await pool.request()
            .input('Name', Name)
            .input('PhoneNumber', PhoneNumber)
            .input('Department', Department || null)
            .query(`
                INSERT INTO WhatsAppContacts (Name, PhoneNumber, Department)
                OUTPUT INSERTED.ContactId
                VALUES (@Name, @PhoneNumber, @Department)
            `);

        res.status(201).json({
            success: true,
            message: 'Contact added',
            contactId: result.recordset[0].ContactId
        });
    } catch (error) {
        logger.error('Error adding WhatsApp contact:', error);
        res.status(500).json({ error: 'Failed to add contact' });
    }
});

/**
 * PUT /api/whatsapp/contacts/:id
 * Update a WhatsApp contact
 */
router.put('/contacts/:id', validateBody(whatsappContactSchema), async (req, res) => {
    try {
        const { Name, PhoneNumber, Department } = req.body;
        const pool = getPool(DB.DEFAULT_POOL);

        // Check for duplicate phone number (exclude current contact)
        const existingCheck = await pool.request()
            .input('PhoneNumber', PhoneNumber)
            .input('ContactId', req.params.id)
            .query('SELECT ContactId FROM WhatsAppContacts WHERE PhoneNumber = @PhoneNumber AND ContactId != @ContactId');

        if (existingCheck.recordset.length > 0) {
            return res.status(400).json({ error: 'Another contact with this phone number already exists' });
        }

        await pool.request()
            .input('ContactId', req.params.id)
            .input('Name', Name)
            .input('PhoneNumber', PhoneNumber)
            .input('Department', Department || null)
            .query(`
                UPDATE WhatsAppContacts 
                SET Name = @Name, PhoneNumber = @PhoneNumber, Department = @Department
                WHERE ContactId = @ContactId
            `);

        res.json({ success: true, message: 'Contact updated' });
    } catch (error) {
        logger.error('Error updating WhatsApp contact:', error);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

/**
 * DELETE /api/whatsapp/contacts/:id
 * Remove a WhatsApp contact
 */
router.delete('/contacts/:id', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);

        const scheduleCheck = await pool.request()
            .input('ContactId', req.params.id)
            .query('SELECT TOP 1 ScheduleId FROM ScheduleWhatsAppContacts WHERE ContactId = @ContactId');
        if (scheduleCheck.recordset.length > 0) {
            return res.status(409).json({
                error: 'Cannot delete this contact — it is linked to report schedule(s). Remove the contact from schedules first.'
            });
        }

        await pool.request()
            .input('ContactId', req.params.id)
            .query('DELETE FROM WhatsAppContacts WHERE ContactId = @ContactId');

        res.json({ success: true, message: 'Contact deleted' });
    } catch (error) {
        logger.error('Error deleting WhatsApp contact:', error);
        res.status(500).json({ error: 'Failed to delete contact' });
    }
});

// ==========================================
// SEND MESSAGES
// ==========================================

/**
 * POST /api/whatsapp/send-text
 * Send an ad-hoc text message to selected contacts
 */
router.post('/send-text', validateBody(whatsappSendTextSchema), async (req, res) => {
    try {
        const { ContactIds, Message } = req.body;
        const pool = getPool(DB.DEFAULT_POOL);

        // Fetch contacts using parameterized query
        let query = 'SELECT ContactId, Name, PhoneNumber FROM WhatsAppContacts WHERE IsActive = 1 AND ContactId IN (';
        const request = pool.request();
        ContactIds.forEach((id, i) => {
            request.input(`C${i}`, id);
            query += (i > 0 ? ',' : '') + `@C${i}`;
        });
        query += ')';
        const contacts = (await request.query(query)).recordset;

        if (contacts.length === 0) {
            return res.status(400).json({ error: 'No valid contacts found' });
        }

        const results = [];
        for (const contact of contacts) {
            const result = await sendTextMessage(contact.PhoneNumber, Message);

            // Log the attempt
            await pool.request()
                .input('ContactId', contact.ContactId)
                .input('PhoneNumber', contact.PhoneNumber)
                .input('MessageType', 'text')
                .input('Status', result.success ? 'sent' : 'failed')
                .input('WhatsAppMessageId', result.messageId || null)
                .input('ErrorMessage', result.error || null)
                .query(`
                    INSERT INTO WhatsAppLogs (ContactId, PhoneNumber, MessageType, Status, WhatsAppMessageId, ErrorMessage)
                    VALUES (@ContactId, @PhoneNumber, @MessageType, @Status, @WhatsAppMessageId, @ErrorMessage)
                `);

            results.push({
                contact: contact.Name,
                phone: contact.PhoneNumber,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            success: true,
            message: `Sent to ${successCount}/${contacts.length} contacts`,
            results
        });
    } catch (error) {
        logger.error('Error sending WhatsApp text:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * POST /api/whatsapp/send-report
 * Generate a report and send it via WhatsApp to selected contacts
 */
router.post('/send-report', validateBody(whatsappSendReportSchema), async (req, res) => {
    try {
        const { ReportId, ContactIds, Format } = req.body;
        const pool = getPool(DB.DEFAULT_POOL);

        // Get report template
        const reportResult = await pool.request()
            .input('ReportId', ReportId)
            .query('SELECT * FROM ReportTemplates WHERE ReportId = @ReportId AND IsActive = 1');

        if (reportResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const report = reportResult.recordset[0];

        // Get target database pool
        const targetPool = getPool(report.DatabaseName || DB.DEFAULT_POOL);
        if (!targetPool) {
            return res.status(500).json({ error: `Database ${report.DatabaseName} not connected` });
        }

        // Execute the SQL query
        const dataResult = await targetPool.request().query(report.SqlQuery);
        const data = dataResult.recordset;

        // Generate the file based on format
        let filePath, fileName;
        if (Format === 'excel') {
            const result = await generateExcel({
                reportName: report.ReportName,
                data,
                description: report.Description
            });
            filePath = result.filePath;
            fileName = result.fileName;
        } else {
            // Default to PDF
            const result = await generatePDF({
                reportName: report.ReportName,
                data,
                description: report.Description
            });
            filePath = result.filePath;
            fileName = result.fileName;
        }

        // Fetch contacts
        const request = pool.request();
        let contactQuery = 'SELECT ContactId, Name, PhoneNumber FROM WhatsAppContacts WHERE IsActive = 1 AND ContactId IN (';
        ContactIds.forEach((id, i) => {
            request.input(`C${i}`, id);
            contactQuery += (i > 0 ? ',' : '') + `@C${i}`;
        });
        contactQuery += ')';
        const contacts = (await request.query(contactQuery)).recordset;

        if (contacts.length === 0) {
            return res.status(400).json({ error: 'No valid contacts found' });
        }

        // Send to each contact using template message
        const results = [];

        for (const contact of contacts) {
            const result = await sendReportViaWhatsApp(
                contact.PhoneNumber,
                filePath,
                fileName,
                report.ReportName
            );

            // Log the attempt
            await pool.request()
                .input('ContactId', contact.ContactId)
                .input('PhoneNumber', contact.PhoneNumber)
                .input('MessageType', 'template')
                .input('FileName', fileName)
                .input('Status', result.success ? 'sent' : 'failed')
                .input('WhatsAppMessageId', result.messageId || null)
                .input('ErrorMessage', result.error || null)
                .query(`
                    INSERT INTO WhatsAppLogs (ContactId, PhoneNumber, MessageType, FileName, Status, WhatsAppMessageId, ErrorMessage)
                    VALUES (@ContactId, @PhoneNumber, @MessageType, @FileName, @Status, @WhatsAppMessageId, @ErrorMessage)
                `);

            results.push({
                contact: contact.Name,
                phone: contact.PhoneNumber,
                ...result
            });
        }

        const successCount = results.filter(r => r.success).length;
        res.json({
            success: true,
            message: `Report sent to ${successCount}/${contacts.length} contacts`,
            fileName,
            results
        });
    } catch (error) {
        logger.error('Error sending WhatsApp report:', error);
        res.status(500).json({ error: 'Failed to send report' });
    }
});

// ==========================================
// DELIVERY LOGS
// ==========================================

/**
 * GET /api/whatsapp/logs
 * Fetch recent WhatsApp delivery logs
 */
router.get('/logs', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        const result = await pool.request().query(`
            SELECT TOP 50 
                l.LogId, l.PhoneNumber, l.MessageType, l.FileName, l.Status, 
                l.WhatsAppMessageId, l.ErrorMessage, l.SentAt,
                c.Name AS ContactName
            FROM WhatsAppLogs l
            LEFT JOIN WhatsAppContacts c ON l.ContactId = c.ContactId
            ORDER BY l.SentAt DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        logger.error('Error fetching WhatsApp logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

// ==========================================
// SCHEDULE-CONTACT LINKING
// ==========================================

/**
 * GET /api/whatsapp/schedule-contacts/:scheduleId
 * Get contacts linked to a schedule
 */
router.get('/schedule-contacts/:scheduleId', async (req, res) => {
    try {
        const pool = getPool(DB.DEFAULT_POOL);
        const result = await pool.request()
            .input('ScheduleId', req.params.scheduleId)
            .query(`
                SELECT c.ContactId, c.Name, c.PhoneNumber, c.Department
                FROM ScheduleWhatsAppContacts sc
                JOIN WhatsAppContacts c ON sc.ContactId = c.ContactId
                WHERE sc.ScheduleId = @ScheduleId
            `);
        res.json(result.recordset);
    } catch (error) {
        logger.error('Error fetching schedule contacts:', error);
        res.status(500).json({ error: 'Failed to fetch schedule contacts' });
    }
});

/**
 * PUT /api/whatsapp/schedule-contacts/:scheduleId
 * Update contacts linked to a schedule
 */
router.put('/schedule-contacts/:scheduleId', async (req, res) => {
    try {
        const { ContactIds, WhatsAppEnabled, ReportFormat } = req.body;
        const pool = getPool(DB.DEFAULT_POOL);

        // Update schedule WhatsApp settings
        if (WhatsAppEnabled !== undefined || ReportFormat) {
            const updateReq = pool.request().input('ScheduleId', req.params.scheduleId);
            let updateQuery = 'UPDATE ReportSchedules SET ';
            const updates = [];
            if (WhatsAppEnabled !== undefined) {
                updateReq.input('WhatsAppEnabled', WhatsAppEnabled ? 1 : 0);
                updates.push('WhatsAppEnabled = @WhatsAppEnabled');
            }
            if (ReportFormat) {
                updateReq.input('ReportFormat', ReportFormat);
                updates.push('ReportFormat = @ReportFormat');
            }
            updateQuery += updates.join(', ') + ' WHERE ScheduleId = @ScheduleId';
            await updateReq.query(updateQuery);
        }

        // Clear existing links and re-insert
        if (ContactIds && Array.isArray(ContactIds)) {
            await pool.request()
                .input('ScheduleId', req.params.scheduleId)
                .query('DELETE FROM ScheduleWhatsAppContacts WHERE ScheduleId = @ScheduleId');

            for (const contactId of ContactIds) {
                await pool.request()
                    .input('ScheduleId', req.params.scheduleId)
                    .input('ContactId', contactId)
                    .query('INSERT INTO ScheduleWhatsAppContacts (ScheduleId, ContactId) VALUES (@ScheduleId, @ContactId)');
            }
        }

        res.json({ success: true, message: 'Schedule WhatsApp settings updated' });
    } catch (error) {
        logger.error('Error updating schedule contacts:', error);
        res.status(500).json({ error: 'Failed to update schedule contacts' });
    }
});

module.exports = router;
