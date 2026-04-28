const {
  parseExcelFile,
  getCellValue,
  parseExcelDate,
  extractHeaders,
  buildColumnMapping,
  getMappedValue,
} = require('../utils/excelImport');
const ExcelJS = require('exceljs');

describe('excelImport - getCellValue', () => {
  test('returns null for null cell', () => {
    expect(getCellValue(null)).toBeNull();
  });

  test('returns null for undefined cell', () => {
    expect(getCellValue(undefined)).toBeNull();
  });

  test('returns trimmed string for string value', () => {
    const cell = { value: '  hello world  ' };
    expect(getCellValue(cell)).toBe('hello world');
  });

  test('returns string for numeric value', () => {
    const cell = { value: 42 };
    expect(getCellValue(cell)).toBe('42');
  });

  test('returns Date object for Date value', () => {
    const date = new Date('2024-01-15');
    const cell = { value: date };
    expect(getCellValue(cell)).toBe(date);
  });

  test('joins richText segments', () => {
    const cell = { value: { richText: [{ text: 'Hello ' }, { text: 'World' }] } };
    expect(getCellValue(cell)).toBe('Hello World');
  });

  test('returns text property for hyperlink objects', () => {
    const cell = { value: { text: 'link text' } };
    expect(getCellValue(cell)).toBe('link text');
  });

  test('returns result property for formula cells', () => {
    const cell = { value: { result: 42 } };
    expect(getCellValue(cell)).toBe('42');
  });

  test('handles generic objects by calling toString', () => {
    const cell = { value: { toString: () => 'custom' } };
    expect(getCellValue(cell)).toBe('custom');
  });

  test('returns empty string for generic [object Object]', () => {
    const cell = { value: {} };
    expect(getCellValue(cell)).toBe('');
  });

  test('returns boolean as string', () => {
    const cell = { value: true };
    expect(getCellValue(cell)).toBe('true');
  });
});

describe('excelImport - parseExcelDate', () => {
  test('returns null for null input', () => {
    expect(parseExcelDate(null)).toBeNull();
  });

  test('returns null for undefined input', () => {
    expect(parseExcelDate(undefined)).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseExcelDate('')).toBeNull();
  });

  test('returns Date for valid ISO date string', () => {
    const result = parseExcelDate('2024-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result.getFullYear()).toBe(2024);
  });

  test('returns Date object unchanged', () => {
    const date = new Date('2024-06-01');
    expect(parseExcelDate(date)).toBe(date);
  });

  test('returns null for invalid date string', () => {
    expect(parseExcelDate('not-a-date')).toBeNull();
  });

test('returns null for non-standard date format (DD-MM-YYYY)', () => {
    expect(parseExcelDate('15-01-2024')).toBeNull();
  });
});

describe('excelImport - buildColumnMapping', () => {
  const columnMap = {
    'customer': 'Customer',
    'drg no': 'DrgNo',
    'description': 'Description',
  };

  test('maps recognized headers to db fields', () => {
    const headers = { 1: 'customer', 2: 'drg no', 3: 'description' };
    const result = buildColumnMapping(headers, columnMap);
    expect(result[1]).toBe('Customer');
    expect(result[2]).toBe('DrgNo');
    expect(result[3]).toBe('Description');
  });

  test('does not map unrecognized headers', () => {
    const headers = { 1: 'customer', 2: 'unknown column' };
    const result = buildColumnMapping(headers, columnMap);
    expect(result[1]).toBe('Customer');
    expect(result[2]).toBeUndefined();
  });

  test('overrides take precedence over column map', () => {
    const headers = { 1: 'customer' };
    const overrides = { 1: 'OverrideField' };
    const result = buildColumnMapping(headers, columnMap, overrides);
    expect(result[1]).toBe('OverrideField');
  });

  test('returns empty object for empty headers', () => {
    const result = buildColumnMapping({}, columnMap);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('excelImport - extractHeaders', () => {
  const columnMap = { 'name': 'Name', 'age': 'Age', 'city': 'City' };

  test('extracts headers from first matching row', () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Name', 'Age', 'City']);
    worksheet.addRow(['John', '25', 'NYC']);

    const result = extractHeaders(worksheet, columnMap);
    expect(result.headerRowNum).toBe(1);
    expect(result.headers[1]).toBe('name');
  });

  test('uses minMatches threshold', () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Unrelated', 'Data', 'Here']);
    worksheet.addRow(['Name', 'Age', 'City']);

    const result = extractHeaders(worksheet, columnMap, { minMatches: 3 });
    expect(result.headerRowNum).toBe(2);
  });

  test('falls back to last row when no match meets threshold', () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Something']);
    worksheet.addRow(['Other']);

    const result = extractHeaders(worksheet, columnMap, { minMatches: 5 });
    expect(result).toBeDefined();
    expect(result.headerRowNum).toBe(2);
  });
});

describe('excelImport - getMappedValue', () => {
  test('returns cell value for a mapped field', () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Name', 'Age']);
    worksheet.addRow(['John', '25']);
    const columnMap = { 1: 'Name', 2: 'Age' };
    const row = worksheet.getRow(2);
    expect(getMappedValue(row, columnMap, 'Name')).toBe('John');
    expect(getMappedValue(row, columnMap, 'Age')).toBe('25');
  });

  test('returns null for unmapped field', () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Name']);
    worksheet.addRow(['John']);
    const columnMap = { 1: 'Name' };
    const row = worksheet.getRow(2);
    expect(getMappedValue(row, columnMap, 'NonExistent')).toBeNull();
  });
});

describe('excelImport - parseExcelFile', () => {
  test('throws error when no file provided', async () => {
    await expect(parseExcelFile(null)).rejects.toThrow('No file uploaded');
  });

  test('throws error when buffer is invalid', async () => {
    await expect(parseExcelFile({ buffer: Buffer.from('not-excel') })).rejects.toThrow();
  });

  test('parses valid Excel file', async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');
    worksheet.addRow(['Name', 'Age']);
    worksheet.addRow(['John', 25]);

    const buffer = await workbook.xlsx.writeBuffer();
    const result = await parseExcelFile({ buffer });
    expect(result.workbook).toBeDefined();
    expect(result.worksheet).toBeDefined();
  });

  test('throws error for empty worksheet', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Empty');

    const buffer = await workbook.xlsx.writeBuffer();
    await expect(parseExcelFile({ buffer })).rejects.toThrow(/empty/i);
  });
});