const { sql, connectSQL } = require('../config/db');

const createIcsoftTable = async () => {
    try {
        await connectSQL();

        console.log('Creating ICSOFT table...');
        await sql.query`
            IF OBJECT_ID('ICSOFT', 'U') IS NULL
            CREATE TABLE ICSOFT (
                EmpId INT PRIMARY KEY,
                EmpName NVARCHAR(100),
                Dept NVARCHAR(50),
                updatedAt DATETIME DEFAULT GETDATE()
            )
        `;

        console.log('ICSOFT table ready.');
        process.exit(0);

    } catch (err) {
        console.error('Failed to create ICSOFT table:', err);
        process.exit(1);
    }
};

createIcsoftTable();
