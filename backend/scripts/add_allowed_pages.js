const { connectSQL, getPool } = require('../config/db');

const addAllowedPagesColumn = async () => {
    try {
        await connectSQL();

        // Get the IcSoftVer3 database pool
        const pool = getPool('IcSoftVer3');

        if (!pool) {
            throw new Error('IcSoftVer3 database pool not found');
        }

        console.log('Adding AllowedPages column to Users table...');

        // Check if column exists and add if not
        const checkResult = await pool.request().query(`
            SELECT COUNT(*) as columnExists 
            FROM sys.columns 
            WHERE object_id = OBJECT_ID('Users') AND name = 'AllowedPages'
        `);

        if (checkResult.recordset[0].columnExists === 0) {
            await pool.request().query(`
                ALTER TABLE Users ADD AllowedPages VARCHAR(500) NULL
            `);
            console.log('✓ AllowedPages column added successfully');
        } else {
            console.log('✓ AllowedPages column already exists');
        }

        // Update existing admin users to have 'all' access
        const adminResult = await pool.request().query(`
            UPDATE Users SET AllowedPages = 'all' WHERE Role = 'admin'
        `);
        console.log(`✓ Updated ${adminResult.rowsAffected[0]} admin user(s) with full access`);

        // Update existing employee users with full access for backward compatibility
        const employeeResult = await pool.request().query(`
            UPDATE Users 
            SET AllowedPages = 'dashboard,pattern-master,planning-master,lab-master,melting,database-explorer' 
            WHERE Role = 'employee' AND (AllowedPages IS NULL OR AllowedPages = '')
        `);
        console.log(`✓ Updated ${employeeResult.rowsAffected[0]} existing employee(s) with full access (backward compatibility)`);

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

addAllowedPagesColumn();
