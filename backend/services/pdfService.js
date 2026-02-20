/**
 * PDF Generation Service
 * Generates PDF reports from SQL query results
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Ensure reports directory exists
const REPORTS_DIR = path.join(__dirname, '../reports');
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate a PDF report from query results
 * @param {Object} options
 * @param {string} options.reportName - Name of the report
 * @param {Array} options.data - Array of objects (query results)
 * @param {Array} options.columns - Column headers (optional, auto-detected from data)
 * @param {string} options.description - Report description
 * @returns {Promise<{filePath: string, fileName: string}>}
 */
async function generatePDF({ reportName, data, columns, description }) {
    return new Promise((resolve, reject) => {
        try {
            // Generate unique filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
            const filePath = path.join(REPORTS_DIR, fileName);

            // Create PDF document
            const doc = new PDFDocument({ 
                margin: 40,
                size: 'A4',
                layout: 'landscape' // Better for tables
            });

            // Pipe to file
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Header
            doc.fontSize(20).font('Helvetica-Bold').text(reportName, { align: 'center' });
            doc.moveDown(0.5);
            
            // Date and description
            doc.fontSize(10).font('Helvetica');
            doc.text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, { align: 'center' });
            if (description) {
                doc.moveDown(0.3);
                doc.text(description, { align: 'center' });
            }
            doc.moveDown(1);

            // Handle empty data
            if (!data || data.length === 0) {
                doc.fontSize(12).text('No data available for this report.', { align: 'center' });
                doc.end();
                stream.on('finish', () => resolve({ filePath, fileName }));
                return;
            }

            // Auto-detect columns from first row if not provided
            const cols = columns || Object.keys(data[0]);
            
            // Calculate column widths
            const pageWidth = doc.page.width - 80; // Margins
            const colWidth = Math.min(pageWidth / cols.length, 150);
            const tableWidth = colWidth * cols.length;
            const startX = (doc.page.width - tableWidth) / 2;

            // Table header
            let y = doc.y;
            doc.font('Helvetica-Bold').fontSize(9);
            
            // Header background
            doc.rect(startX, y, tableWidth, 20).fill('#2c3e50');
            doc.fillColor('white');
            
            cols.forEach((col, i) => {
                const x = startX + (i * colWidth);
                doc.text(String(col).substring(0, 20), x + 5, y + 5, { 
                    width: colWidth - 10, 
                    align: 'left',
                    lineBreak: false
                });
            });
            
            doc.fillColor('black');
            y += 25;

            // Table rows
            doc.font('Helvetica').fontSize(8);
            let rowCount = 0;
            const maxRowsPerPage = 25;

            data.forEach((row, rowIndex) => {
                // Check if new page needed
                if (rowCount >= maxRowsPerPage) {
                    doc.addPage();
                    y = 50;
                    rowCount = 0;
                    
                    // Re-draw header on new page
                    doc.font('Helvetica-Bold').fontSize(9);
                    doc.rect(startX, y, tableWidth, 20).fill('#2c3e50');
                    doc.fillColor('white');
                    cols.forEach((col, i) => {
                        const x = startX + (i * colWidth);
                        doc.text(String(col).substring(0, 20), x + 5, y + 5, { 
                            width: colWidth - 10, 
                            align: 'left',
                            lineBreak: false
                        });
                    });
                    doc.fillColor('black');
                    y += 25;
                    doc.font('Helvetica').fontSize(8);
                }

                // Alternating row colors
                if (rowIndex % 2 === 0) {
                    doc.rect(startX, y, tableWidth, 18).fill('#f8f9fa');
                    doc.fillColor('black');
                }

                // Row data
                cols.forEach((col, i) => {
                    const x = startX + (i * colWidth);
                    let value = row[col];
                    
                    // Format values
                    if (value === null || value === undefined) {
                        value = '-';
                    } else if (typeof value === 'number') {
                        value = value.toLocaleString('en-IN');
                    } else if (value instanceof Date) {
                        value = value.toLocaleDateString('en-IN');
                    } else {
                        value = String(value).substring(0, 25);
                    }

                    doc.text(value, x + 5, y + 4, { 
                        width: colWidth - 10, 
                        align: 'left',
                        lineBreak: false
                    });
                });

                y += 18;
                rowCount++;
            });

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).fillColor('gray');
            doc.text(`Total Records: ${data.length}`, { align: 'right' });

            // Finalize PDF
            doc.end();

            stream.on('finish', () => {
                resolve({ filePath, fileName });
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Get list of generated reports
 * @returns {Array} List of report files
 */
function getGeneratedReports() {
    if (!fs.existsSync(REPORTS_DIR)) {
        return [];
    }
    
    const files = fs.readdirSync(REPORTS_DIR)
        .filter(f => f.endsWith('.pdf'))
        .map(f => {
            const filePath = path.join(REPORTS_DIR, f);
            const stats = fs.statSync(filePath);
            return {
                fileName: f,
                filePath,
                size: stats.size,
                createdAt: stats.birthtime
            };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    
    return files;
}

/**
 * Delete a generated report
 * @param {string} fileName 
 */
function deleteReport(fileName) {
    const filePath = path.join(REPORTS_DIR, fileName);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}

module.exports = {
    generatePDF,
    getGeneratedReports,
    deleteReport,
    REPORTS_DIR
};
