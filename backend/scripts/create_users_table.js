const { connectSQL, getPool } = require('../config/db');

const createUsersTable = async () => {
    try {
        await connectSQL();

        // Get the IcSoftVer3 database pool
        const pool = getPool('IcSoftVer3');

        if (!pool) {
            throw new Error('IcSoftVer3 database pool not found');
        }

        console.log('Creating Users table in IcSoftVer3...');

        await pool.request().query(`
            IF OBJECT_ID('Users', 'U') IS NULL
            BEGIN
                CREATE TABLE Users (
                    Id INT IDENTITY(1,1) PRIMARY KEY,
                    Username VARCHAR(50) UNIQUE NOT NULL,
                    PasswordHash VARCHAR(255) NOT NULL,
                    FullName VARCHAR(100) NOT NULL,
                    Role VARCHAR(20) NOT NULL,
                    IsActive BIT NOT NULL DEFAULT 1,
                    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
                );
                PRINT 'Users table created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Users table already exists.';
            END
        `);

        console.log('✓ Users table setup complete in IcSoftVer3');
        process.exit(0);
    } catch (err) {
        console.error('Failed to create Users table:', err);
        process.exit(1);
    }
};

createUsersTable();
