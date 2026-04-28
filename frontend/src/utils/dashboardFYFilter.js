/**
 * Shared fiscal-year options and date range helpers for dashboard period filters
 * (Indian FY: April → March).
 * FY combobox: current FY and the single previous FY only.
 */

export function generateDashboardFYOptions() {
    const today = new Date();
    const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const prevFYStart = currentFYStart - 1;
    const opt = (year) => ({
        label: `FY ${year}-${String(year + 1).slice(-2)}`,
        value: year
    });
    return [opt(currentFYStart), opt(prevFYStart)];
}

/**
 * @param {number} fyStartYear - Calendar year in which FY starts (April)
 * @param {Date} [today]
 * @returns {{ fromDate: Date, toDate: Date }}
 */
export function getFyApiDateRange(fyStartYear, today = new Date()) {
    const fromDate = new Date(fyStartYear, 3, 1);
    const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const toDate =
        fyStartYear === currentFYStart ? today : new Date(fyStartYear + 1, 2, 31);
    return { fromDate, toDate };
}

/** Inline styles for FY <select>, aligned with RejectionDashboard */
export const DASHBOARD_FY_SELECT_STYLE = {
    padding: '0.5rem 2rem 0.5rem 1rem',
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '0.875rem',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none',
    backgroundImage:
        'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23374151%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem top 50%',
    backgroundSize: '0.65rem auto'
};
