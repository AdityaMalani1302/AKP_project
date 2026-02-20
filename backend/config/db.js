const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    requestTimeout: 60000,  // 60 seconds for query execution
    connectionTimeout: 30000,  // 30 seconds for connection
    pool: {
        max: 10,                    // Maximum connections in pool
        min: 2,                     // Minimum connections to maintain
        idleTimeoutMillis: 30000    // Close idle connections after 30s
    },
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const databases = {
    'IcSoftVer3': process.env.DB_NAME_1,
    'IcSoftReportVer3': process.env.DB_NAME_2,
    'IcSoftLedgerVer3': process.env.DB_NAME_3,
};

const pools = {};

const connectSQL = async () => {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 5000; // 5 seconds

    for (const [key, dbName] of Object.entries(databases)) {
        let retries = 0;
        while (retries < MAX_RETRIES) {
            try {
                const config = {
                    ...dbConfig,
                    database: dbName
                };
                const pool = new sql.ConnectionPool(config);
                await pool.connect();
                pools[key] = pool;
                console.log(`Connected to SQL Server Database: ${dbName}`);
                break; // Connection successful, move to next DB
            } catch (err) {
                retries++;
                console.error(`SQL Server Connection Failed for ${dbName} (Attempt ${retries}/${MAX_RETRIES}):`, err.message);
                if (retries >= MAX_RETRIES) {
                    console.error(`FATAL: Could not connect to ${dbName} after ${MAX_RETRIES} attempts.`);
                    // We might want to exit or continue depending on criticality. 
                    // For now, we log fatal.
                } else {
                    await new Promise(res => setTimeout(res, RETRY_DELAY));
                }
            }
        }
    }
};

const getPool = (dbName) => {
    if (pools[dbName]) {
        return pools[dbName];
    }
    // Default to first one if not found or throw error? 
    // For now, let's return null if not found
    return null;
};

/**
 * Get the default ERP database pool (IcSoftVer3).
 * Use this for non-request contexts (startup scripts, background jobs).
 * For HTTP request handlers, use req.db instead.
 * @returns {import('mssql').ConnectionPool} The database connection pool.
 * @throws {Error} If the database connection is not established.
 */
const getDefaultPool = () => {
    const pool = pools['IcSoftVer3'];
    if (!pool) {
        throw new Error('Database connection not established');
    }
    return pool;
};

const closeSQL = async () => {
    for (const pool of Object.values(pools)) {
        await pool.close();
    }
};

module.exports = { connectSQL, closeSQL, getPool, getDefaultPool, sql };

