const { connectSQL, getPool, closeSQL } = require('../config/db');

const verifyConnections = async () => {
    console.log('\n=== Starting Database Connection Verification ===\n');

    try {
        await connectSQL();
    } catch (err) {
        console.error('❌ FATAL: Failed to initialize database connections');
        console.error('Error:', err.message);
        process.exit(1);
    }

    const databases = ['IcSoftVer3', 'IcSoftReportVer3', 'IcSoftLedgerVer3', 'BizSpot'];
    let allSuccess = true;

    for (const dbName of databases) {
        try {
            const pool = getPool(dbName);
            if (!pool) {
                console.error(`❌ [FAILURE] Could not get connection pool for database: ${dbName}`);
                allSuccess = false;
                continue;
            }

            const result = await pool.request().query('SELECT 1 as val');
            if (result.recordset[0].val === 1) {
                console.log(`✅ [SUCCESS] Database "${dbName}" - Connected and query executed successfully`);
            } else {
                console.error(`❌ [FAILURE] Database "${dbName}" - Query returned unexpected result`);
                allSuccess = false;
            }
        } catch (err) {
            console.error(`❌ [FAILURE] Database "${dbName}" - Error: ${err.message}`);
            allSuccess = false;
        }
    }

    await closeSQL();

    console.log('\n=== Verification Complete ===\n');

    if (allSuccess) {
        console.log('✅ All database connections verified successfully.');
        process.exit(0);
    } else {
        console.error('❌ Some database connections failed.');
        process.exit(1);
    }
};

verifyConnections();
