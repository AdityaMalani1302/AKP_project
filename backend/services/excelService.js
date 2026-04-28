/**
 * Excel Generation Service
 * Generates Excel reports from SQL query results using ExcelJS
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// Reuse the same reports directory as PDF service
const REPORTS_DIR = path.join(__dirname, '../reports');
if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generate an Excel report from query results
 * @param {Object} options
 * @param {string} options.reportName - Name of the report
 * @param {Array} options.data - Array of objects (query results)
 * @param {Array} options.columns - Column headers (optional, auto-detected from data)
 * @param {string} options.description - Report description
 * @returns {Promise<{filePath: string, fileName: string}>}
 */
async function generateExcel({ reportName, data, columns, description }) {
    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${reportName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;
    const filePath = path.join(REPORTS_DIR, fileName);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AKP Foundries ERP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(reportName.substring(0, 31)); // Max 31 chars for sheet name

    // Title row
    const cols = columns || (data.length > 0 ? Object.keys(data[0]) : []);
    
    // Merge cells for title
    if (cols.length > 0) {
        worksheet.mergeCells(1, 1, 1, cols.length);
        const titleCell = worksheet.getCell('A1');
        titleCell.value = reportName;
        titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        worksheet.getRow(1).height = 35;

        // Description / date row
        worksheet.mergeCells(2, 1, 2, cols.length);
        const dateCell = worksheet.getCell('A2');
        dateCell.value = `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}${description ? ' | ' + description : ''}`;
        dateCell.font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };
        dateCell.alignment = { horizontal: 'center' };
        worksheet.getRow(2).height = 22;
    }

    // Empty row
    worksheet.addRow([]);

    // Handle empty data
    if (!data || data.length === 0) {
        worksheet.addRow(['No data available for this report.']);
        await workbook.xlsx.writeFile(filePath);
        return { filePath, fileName };
    }

    // Header row (row 4)
    const headerRow = worksheet.addRow(cols);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0081A7' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });
    headerRow.height = 28;

    // Data rows
    data.forEach((row, rowIndex) => {
        const values = cols.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            if (val instanceof Date) return val.toLocaleDateString('en-IN');
            return val;
        });
        const dataRow = worksheet.addRow(values);
        
        // Alternating row colors
        const bgColor = rowIndex % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
        dataRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
            };
        });
    });

    // Auto-fit column widths
    cols.forEach((col, i) => {
        const colObj = worksheet.getColumn(i + 1);
        let maxLen = col.length;
        data.forEach(row => {
            const val = row[col];
            if (val !== null && val !== undefined) {
                const len = String(val).length;
                if (len > maxLen) maxLen = len;
            }
        });
        colObj.width = Math.min(Math.max(maxLen + 4, 10), 50);
    });

    // Footer row
    const footerRowNum = worksheet.lastRow.number + 2;
    worksheet.getCell(`A${footerRowNum}`).value = `Total Records: ${data.length}`;
    worksheet.getCell(`A${footerRowNum}`).font = { italic: true, size: 9, color: { argb: 'FF6B7280' } };

    // Write file
    await workbook.xlsx.writeFile(filePath);
    return { filePath, fileName };
}

module.exports = {
    generateExcel,
    REPORTS_DIR
};
