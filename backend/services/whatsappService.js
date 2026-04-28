/**
 * WhatsApp Cloud API Service
 * Handles sending text messages and documents (PDF/Excel) via WhatsApp Cloud API
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// WhatsApp Cloud API configuration
const WA_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}`;

// Template configuration
const WA_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'scheduled_data_export';
const WA_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en';

/**
 * Check if WhatsApp is configured
 * @returns {boolean}
 */
function isConfigured() {
    return !!(WA_PHONE_NUMBER_ID && WA_ACCESS_TOKEN);
}

/**
 * Get authorization headers for WhatsApp API
 * @returns {Object}
 */
function getHeaders() {
    return {
        'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Normalize phone number to WhatsApp format (digits only, with country code, no +)
 * e.g., "+91 98765 43210" → "919876543210"
 * @param {string} phoneNumber
 * @returns {string}
 */
function normalizePhoneNumber(phoneNumber) {
    // Remove all non-digit characters (spaces, dashes, brackets, +)
    return String(phoneNumber).replace(/\D/g, '');
}

/**
 * Send a text message via WhatsApp (only works within 24h conversation window)
 * @param {string} phoneNumber - Recipient phone number (e.g., 919876543210)
 * @param {string} message - Text message body
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendTextMessage(phoneNumber, message) {
    if (!isConfigured()) {
        return { success: false, error: 'WhatsApp API is not configured. Check environment variables.' };
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    try {
        const response = await axios.post(`${WA_BASE_URL}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedPhone,
            type: 'text',
            text: {
                preview_url: false,
                body: message
            }
        }, { headers: getHeaders() });

        const messageId = response.data?.messages?.[0]?.id;
        logger.info(`[WhatsApp] Text message sent to ${phoneNumber}, ID: ${messageId}`);

        return { success: true, messageId };
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        logger.error(`[WhatsApp] Failed to send text to ${phoneNumber}: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

/**
 * Upload media (PDF/Excel) to WhatsApp Cloud API
 * @param {string} filePath - Absolute path to the file
 * @param {string} mimeType - MIME type (application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 * @returns {Promise<{success: boolean, mediaId?: string, error?: string}>}
 */
async function uploadMedia(filePath, mimeType) {
    if (!isConfigured()) {
        return { success: false, error: 'WhatsApp API is not configured.' };
    }

    if (!fs.existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
    }

    try {
        const form = new FormData();
        form.append('messaging_product', 'whatsapp');
        form.append('type', mimeType);
        form.append('file', fs.createReadStream(filePath), {
            contentType: mimeType,
            filename: path.basename(filePath)
        });

        const response = await axios.post(
            `${WA_BASE_URL}/media`,
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${WA_ACCESS_TOKEN}`
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        const mediaId = response.data?.id;
        logger.info(`[WhatsApp] Media uploaded: ${path.basename(filePath)}, ID: ${mediaId}`);
        return { success: true, mediaId };
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        logger.error(`[WhatsApp] Media upload failed: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

/**
 * Send a document message via WhatsApp (using previously uploaded media ID)
 * NOTE: This only works within a 24h conversation window. For first-contact, use sendTemplateWithDocument.
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} mediaId - Media ID from uploadMedia()
 * @param {string} filename - Display filename for the recipient
 * @param {string} [caption] - Optional caption text
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendDocument(phoneNumber, mediaId, filename, caption) {
    if (!isConfigured()) {
        return { success: false, error: 'WhatsApp API is not configured.' };
    }

    try {
        const documentPayload = {
            id: mediaId,
            filename: filename
        };
        if (caption) {
            documentPayload.caption = caption;
        }

        const response = await axios.post(`${WA_BASE_URL}/messages`, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizePhoneNumber(phoneNumber),
            type: 'document',
            document: documentPayload
        }, { headers: getHeaders() });

        const messageId = response.data?.messages?.[0]?.id;
        logger.info(`[WhatsApp] Document "${filename}" sent to ${phoneNumber}, ID: ${messageId}`);
        return { success: true, messageId };
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        logger.error(`[WhatsApp] Failed to send document to ${phoneNumber}: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

/**
 * Send a template message with document via WhatsApp Cloud API.
 * Uses the pre-approved 'scheduled_data_export' template which includes:
 *   - Header: Document (PDF/Excel)
 *   - Body: "Auto Generated Report : *{{1}}*\nby ICSoft Server"
 *   - Footer: "Sent by ICSoft Report Server"
 * This works even if the recipient has NOT messaged the business number before.
 *
 * @param {string} phoneNumber - Recipient phone number (e.g., 919876543210)
 * @param {string} mediaId - Media ID from uploadMedia()
 * @param {string} filename - Display filename for the recipient
 * @param {string} reportName - Report name to fill the {{1}} variable in template body
 * @param {string} [templateName] - Template name (defaults to env config)
 * @param {string} [languageCode] - Template language code (defaults to env config)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendTemplateMessage(phoneNumber, mediaId, filename, reportName, templateName, languageCode) {
    if (!isConfigured()) {
        return { success: false, error: 'WhatsApp API is not configured. Check environment variables.' };
    }

    const tplName = templateName || WA_TEMPLATE_NAME;
    const tplLang = languageCode || WA_TEMPLATE_LANG;

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    try {
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: normalizedPhone,
            type: 'template',
            template: {
                name: tplName,
                language: { code: tplLang },
                components: [
                    {
                        type: 'header',
                        parameters: [
                            {
                                type: 'document',
                                document: {
                                    id: mediaId,
                                    filename: filename
                                }
                            }
                        ]
                    },
                    {
                        type: 'body',
                        parameters: [
                            {
                                type: 'text',
                                text: reportName
                            }
                        ]
                    }
                ]
            }
        };

        const response = await axios.post(`${WA_BASE_URL}/messages`, payload, { headers: getHeaders() });

        const messageId = response.data?.messages?.[0]?.id;
        logger.info(`[WhatsApp] Template "${tplName}" with doc "${filename}" sent to ${phoneNumber}, ID: ${messageId}`);
        return { success: true, messageId };
    } catch (error) {
        const errMsg = error.response?.data?.error?.message || error.message;
        logger.error(`[WhatsApp] Failed to send template to ${phoneNumber}: ${errMsg}`);
        return { success: false, error: errMsg };
    }
}

/**
 * High-level: Upload a file and send it via template message in a single step.
 * Uploads the document, then sends the 'scheduled_data_export' template with
 * the document attached in the header and report name in the body {{1}} variable.
 *
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} filePath - Absolute path to PDF or Excel file
 * @param {string} fileName - Display filename
 * @param {string} reportName - Report name (fills the template {{1}} variable)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
async function sendReportViaWhatsApp(phoneNumber, filePath, fileName, reportName) {
    // Determine MIME type from extension
    const ext = path.extname(filePath).toLowerCase();
    let mimeType;
    if (ext === '.pdf') {
        mimeType = 'application/pdf';
    } else if (ext === '.xlsx') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (ext === '.xls') {
        mimeType = 'application/vnd.ms-excel';
    } else {
        return { success: false, error: `Unsupported file type: ${ext}` };
    }

    // Step 1: Upload media
    const uploadResult = await uploadMedia(filePath, mimeType);
    if (!uploadResult.success) {
        return uploadResult;
    }

    // Step 2: Try template message first (works for first-contact recipients)
    const templateResult = await sendTemplateMessage(phoneNumber, uploadResult.mediaId, fileName, reportName);
    if (templateResult.success) {
        return templateResult;
    }

    // Step 3: Fallback to direct document (works within 24h conversation window)
    const caption = `📊 ${reportName}\nGenerated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    return await sendDocument(phoneNumber, uploadResult.mediaId, fileName, caption);
}

/**
 * Get WhatsApp configuration status
 * @returns {Object}
 */
function getConfigStatus() {
    return {
        configured: isConfigured(),
        phoneNumberId: WA_PHONE_NUMBER_ID ? '***' + WA_PHONE_NUMBER_ID.slice(-4) : null,
        apiVersion: WA_API_VERSION,
        templateName: WA_TEMPLATE_NAME,
        templateLang: WA_TEMPLATE_LANG
    };
}

module.exports = {
    isConfigured,
    sendTextMessage,
    uploadMedia,
    sendDocument,
    sendTemplateMessage,
    sendReportViaWhatsApp,
    getConfigStatus
};
