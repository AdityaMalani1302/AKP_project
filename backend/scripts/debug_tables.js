const { sql, connectSQL } = require('../config/db');

const debugTables = async () => {
    try {
        await connectSQL();

        console.log('Querying INFORMATION_SCHEMA.TABLES...');
        const r1 = await sql.query`SELECT * FROM INFORMATION_SCHEMA.TABLES`;
        console.log('Rows:', r1.recordset.length);
        if (r1.recordset.length > 0) {
            console.log(r1.recordset.map(r => r.TABLE_NAME));
        }

        console.log('Querying sys.tables...');
        const r2 = await sql.query`SELECT * FROM sys.tables`;
        console.log('Rows:', r2.recordset.length);
        if (r2.recordset.length > 0) {
            console.log(r2.recordset.map(r => r.name));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debugTables();
