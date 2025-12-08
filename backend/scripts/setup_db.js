const { sql, connectSQL } = require('../config/db');

const setupDB = async () => {
    try {
        await connectSQL();

        // 1. Create SQLQueries table
        console.log('Creating SQLQueries table...');
        await sql.query`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SQLQueries' AND xtype='U')
            CREATE TABLE SQLQueries (
                id INT PRIMARY KEY IDENTITY(1,1),
                query_text NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE()
            )
        `;

        // 2. Insert Sample Queries
        console.log('Seeding sample queries...');
        const countResult = await sql.query`SELECT COUNT(*) as count FROM SQLQueries`;
        if (countResult.recordset[0].count === 0) {
            await sql.query`
                INSERT INTO SQLQueries (query_text) VALUES 
                ('SELECT * FROM Users WHERE age > 25'),
                ('SELECT name, email FROM Users WHERE role = ''admin'''),
                ('SELECT u.name, o.order_date FROM Users u JOIN Orders o ON u.id = o.user_id'),
                ('SELECT category, COUNT(*) FROM Products GROUP BY category')
            `;
            console.log('Inserted sample queries.');
        } else {
            console.log('SQLQueries table already has data.');
        }

        console.log('Setup completed successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Setup failed:', err);
        process.exit(1);
    }
};

setupDB();
