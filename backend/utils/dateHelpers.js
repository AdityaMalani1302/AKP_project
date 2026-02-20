/**
 * Date Helper Utilities for Dashboard Routes
 * Shared date parsing and month range building functions
 */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Parse date range from query parameters with financial year defaults
 * @param {string} fromDate - Start date string (YYYY-MM-DD format)
 * @param {string} toDate - End date string (YYYY-MM-DD format)
 * @returns {{ fromDateValue: Date, toDateValue: Date }} Parsed date objects
 */
const parseDateRange = (fromDate, toDate) => {
    const today = new Date();
    const fyStartMonth = 3; // April (0-indexed)
    const fyStartYear = today.getMonth() >= fyStartMonth ? today.getFullYear() : today.getFullYear() - 1;

    let fromDateValue, toDateValue;

    if (fromDate) {
        const parts = fromDate.split('-');
        fromDateValue = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
        fromDateValue = new Date(fyStartYear, 3, 1); // April 1st of FY start
    }

    if (toDate) {
        const parts = toDate.split('-');
        toDateValue = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
        toDateValue = today;
    }

    return { fromDateValue, toDateValue };
};

/**
 * Build list of months in a date range
 * @param {Date} fromDate - Start date
 * @param {Date} toDate - End date
 * @returns {string[]} Array of month strings in "MonthName - Year" format
 */
const buildMonthsInRange = (fromDate, toDate) => {
    const monthsInRange = [];
    const current = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const end = new Date(toDate.getFullYear(), toDate.getMonth(), 1);

    while (current <= end) {
        const monthName = MONTH_NAMES[current.getMonth()];
        const year = current.getFullYear();
        monthsInRange.push(`${monthName} - ${year}`);
        current.setMonth(current.getMonth() + 1);
    }

    return monthsInRange;
};

/**
 * Build SQL WHERE clause conditions for month filtering
 * @param {object} request - SQL request object
 * @param {string[]} monthsInRange - Array of month strings
 * @param {object} sql - mssql module reference
 * @returns {string} SQL WHERE clause condition string
 */
const buildMonthConditions = (request, monthsInRange, sql) => {
    return monthsInRange.map((m, i) => {
        request.input(`month${i}`, sql.NVarChar, m);
        return `Month = @month${i}`;
    }).join(' OR ');
};

module.exports = {
    MONTH_NAMES,
    parseDateRange,
    buildMonthsInRange,
    buildMonthConditions
};

