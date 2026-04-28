const { parseDateRange, buildMonthsInRange, buildMonthConditions } = require('../utils/dateHelpers');
const sql = require('mssql');

describe('dateHelpers - parseDateRange', () => {
  test('uses financial year start when no fromDate provided', () => {
    const result = parseDateRange(null, '2024-12-31');
    expect(result.fromDateValue).toBeInstanceOf(Date);
    expect(result.fromDateValue.getMonth()).toBe(3); // April
    expect(result.fromDateValue.getDate()).toBe(1);
  });

  test('uses today when no toDate provided', () => {
    const result = parseDateRange('2024-04-01', null);
    expect(result.toDateValue).toBeInstanceOf(Date);
    const today = new Date();
    expect(result.toDateValue.getFullYear()).toBe(today.getFullYear());
  });

  test('parses both dates correctly', () => {
    const result = parseDateRange('2024-04-01', '2024-12-31');
    expect(result.fromDateValue.getFullYear()).toBe(2024);
    expect(result.fromDateValue.getMonth()).toBe(3);
    expect(result.toDateValue.getFullYear()).toBe(2024);
    expect(result.toDateValue.getMonth()).toBe(11);
  });

  test('handles single day range', () => {
    const result = parseDateRange('2024-06-15', '2024-06-15');
    expect(result.fromDateValue.getTime()).toBe(result.toDateValue.getTime());
  });

  test('defaults both dates when neither provided', () => {
    const result = parseDateRange(null, null);
    expect(result.fromDateValue).toBeInstanceOf(Date);
    expect(result.toDateValue).toBeInstanceOf(Date);
  });

  test('calculates FY start year correctly for months before April', () => {
    const realDate = new Date();
    const currentMonth = realDate.getMonth();
    const result = parseDateRange(null, null);
    if (currentMonth < 3) {
      expect(result.fromDateValue.getFullYear()).toBe(realDate.getFullYear() - 1);
    } else {
      expect(result.fromDateValue.getFullYear()).toBe(realDate.getFullYear());
    }
  });
});

describe('dateHelpers - buildMonthsInRange', () => {
  test('generates month strings between two dates', () => {
    const from = new Date('2024-04-01');
    const to = new Date('2024-06-30');
    const months = buildMonthsInRange(from, to);
    expect(months).toEqual(['April - 2024', 'May - 2024', 'June - 2024']);
  });

  test('returns single month when from and to are the same month', () => {
    const from = new Date('2024-04-01');
    const to = new Date('2024-04-30');
    const months = buildMonthsInRange(from, to);
    expect(months).toEqual(['April - 2024']);
  });

  test('handles year boundary', () => {
    const from = new Date('2024-11-01');
    const to = new Date('2025-02-28');
    const months = buildMonthsInRange(from, to);
    expect(months).toEqual([
      'November - 2024', 'December - 2024',
      'January - 2025', 'February - 2025',
    ]);
  });

  test('returns empty array if from is after to', () => {
    const from = new Date('2024-06-01');
    const to = new Date('2024-04-01');
    const months = buildMonthsInRange(from, to);
    expect(months).toEqual([]);
  });
});

describe('dateHelpers - buildMonthConditions', () => {
  test('creates parameterized SQL conditions', () => {
    const mockRequest = { input: jest.fn().mockReturnThis() };
    const months = ['April - 2024', 'May - 2024'];
    const result = buildMonthConditions(mockRequest, months, sql);
    expect(result).toContain("Month = @month0");
    expect(result).toContain("Month = @month1");
    expect(result).toContain("OR");
    expect(mockRequest.input).toHaveBeenCalledTimes(2);
  });

  test('handles single month', () => {
    const mockRequest = { input: jest.fn().mockReturnThis() };
    const months = ['April - 2024'];
    const result = buildMonthConditions(mockRequest, months, sql);
    expect(result).toBe("Month = @month0");
    expect(mockRequest.input).toHaveBeenCalledTimes(1);
  });

  test('handles empty months array', () => {
    const mockRequest = { input: jest.fn().mockReturnThis() };
    const result = buildMonthConditions(mockRequest, [], sql);
    expect(result).toBe('');
    expect(mockRequest.input).not.toHaveBeenCalled();
  });
});