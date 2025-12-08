const { sql, connectSQL } = require('../config/db');

const createAuthTable = async () => {
    try {
        await connectSQL();

        console.log('Creating AppUsers table...');
        await sql.query`
            IF OBJECT_ID('AppUsers', 'U') IS NULL
            CREATE TABLE AppUsers (
                id INT PRIMARY KEY IDENTITY(1,1),
                username NVARCHAR(50) UNIQUE NOT NULL,
                password_hash NVARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT GETDATE()
            )
        `;
        console.log('AppUsers table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to create AppUsers table:', err);
        process.exit(1);
    }
};

createAuthTable();
