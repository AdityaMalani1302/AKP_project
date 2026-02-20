/**
 * Application Constants
 * Centralized location for magic numbers, strings, and configuration values.
 */

module.exports = {
    JWT: {
        EXPIRES_IN: '8h'
    },
    DB: {
        POOLS: {
            ERP: 'IcSoftVer3',
            REPORT: 'IcSoftReportVer3',
            LEDGER: 'IcSoftLedgerVer3',
            BIZSPOT: 'BizSpot'
        },
        DEFAULT_POOL: 'IcSoftVer3'
    },
    SQL_ERROR_CODES: {
        UNIQUE_CONSTRAINT_VIOLATION: 2627
    }
};
