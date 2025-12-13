const { sql, connectSQL, getPool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('Connecting to database...');
        await connectSQL();
        
        const pool = getPool('IcSoftVer3');
        if (!pool) {
            throw new Error('Pool not found for IcSoftVer3');
        }

        const sqlContent = fs.readFileSync(path.join(__dirname, 'alter_pattern_tables.sql'), 'utf8');
        
        console.log('Running migration on IcSoftVer3...');
        const request = new sql.Request(pool); 
        
        await request.query(sqlContent);
        console.log('Migration successful.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
