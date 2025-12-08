const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    requestTimeout: 60000,  // 60 seconds for query execution
    connectionTimeout: 30000,  // 30 seconds for connection
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const databases = {
    'IcSoftVer3': process.env.DB_NAME_1,
    'IcSoftReportVer3': process.env.DB_NAME_2,
    'IcSoftLedgerVer3': process.env.DB_NAME_3,
    'BizSpot': process.env.DB_NAME_4
};

const pools = {};

const connectSQL = async () => {
    try {
        for (const [key, dbName] of Object.entries(databases)) {
            const config = {
                ...dbConfig,
                database: dbName
            };
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            pools[key] = pool;
            console.log(`Connected to SQL Server Database: ${dbName}`);
        }
    } catch (err) {
        console.error('SQL Server Connection Failed:', err);
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

const closeSQL = async () => {
    for (const pool of Object.values(pools)) {
        await pool.close();
    }
};

module.exports = { connectSQL, closeSQL, getPool, sql };
