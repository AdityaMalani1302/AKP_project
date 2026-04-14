const ExcelJS = require('exceljs');

const parseExcelFile = async (file, { selectWorksheet = 'auto' } = {}) => {
    if (!file) {
        throw new Error('No file uploaded');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    let worksheet = null;

    if (selectWorksheet === 'auto') {
        for (const ws of workbook.worksheets) {
            if (ws.actualRowCount > 0) {
                worksheet = ws;
                break;
            }
        }
        if (!worksheet) {
            worksheet = workbook.worksheets[0];
        }
    } else {
        worksheet = workbook.worksheets[0];
    }

    if (!worksheet || worksheet.rowCount < 2) {
        throw new Error('Excel file is empty or has no data rows');
    }

    return { workbook, worksheet };
};

const getCellValue = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return null;
    const val = cell.value;

    if (val instanceof Date) return val;

    if (typeof val === 'object' && val.richText) {
        return val.richText.map(r => r.text).join('').trim();
    }
    if (typeof val === 'object' && val.text) {
        return String(val.text).trim();
    }
    if (typeof val === 'object' && val.result !== undefined) {
        return String(val.result).trim();
    }
    if (typeof val === 'object') {
        const str = val.toString();
        return str === '[object Object]' ? '' : str.trim();
    }
    return String(val).trim();
};

const parseExcelDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const extractHeaders = (worksheet, columnMap, { startRows = [1, 2], minMatches = 3 } = {}) => {
    const knownHeaders = Object.keys(columnMap).map(h => h.toLowerCase());

    for (const rowNum of startRows) {
        const row = worksheet.getRow(rowNum);
        const headers = {};
        let matchCount = 0;

        row.eachCell((cell, colNumber) => {
            let value = getCellValue(cell);
            if (value) {
                value = String(value).trim().replace(/\s+/g, ' ').replace(/\./g, '').toLowerCase();
                headers[colNumber] = value;
                if (knownHeaders.includes(value)) {
                    matchCount++;
                }
            }
        });

        if (matchCount >= minMatches) {
            return { headers, headerRowNum: rowNum };
        }
    }

    const headerRow = worksheet.getRow(startRows[startRows.length - 1] || 2);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
        let value = getCellValue(cell);
        if (value) {
            headers[colNumber] = String(value).trim().replace(/\s+/g, ' ').replace(/\./g, '').toLowerCase();
        }
    });
    return { headers, headerRowNum: startRows[startRows.length - 1] || 2 };
};

const buildColumnMapping = (headers, columnMap, overrides = {}) => {
    const columnIndexToField = { ...overrides };
    for (const [colNumber, header] of Object.entries(headers)) {
        if (overrides[colNumber]) continue;
        const dbField = columnMap[header];
        if (dbField) {
            columnIndexToField[colNumber] = dbField;
        }
    }
    return columnIndexToField;
};

const getMappedValue = (row, columnMap, dbField) => {
    for (const [colNumber, field] of Object.entries(columnMap)) {
        if (field === dbField) {
            return getCellValue(row.getCell(parseInt(colNumber)));
        }
    }
    return null;
};

module.exports = {
    parseExcelFile,
    getCellValue,
    parseExcelDate,
    extractHeaders,
    buildColumnMapping,
    getMappedValue
};