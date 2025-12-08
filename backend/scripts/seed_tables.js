const { sql, connectSQL } = require('../config/db');

const seedTables = async () => {
    try {
        await connectSQL();

        console.log('Creating Users table...');
        await sql.query`
            IF OBJECT_ID('Users', 'U') IS NULL
            CREATE TABLE Users (
                id INT PRIMARY KEY IDENTITY(1,1),
                name NVARCHAR(100),
                email NVARCHAR(100),
                age INT,
                role NVARCHAR(50)
            )
        `;

        const userCount = await sql.query`SELECT COUNT(*) as count FROM Users`;
        if (userCount.recordset[0].count === 0) {
            await sql.query`
                INSERT INTO Users (name, email, age, role) VALUES 
                ('Alice', 'alice@example.com', 30, 'admin'),
                ('Bob', 'bob@example.com', 22, 'user'),
                ('Charlie', 'charlie@example.com', 28, 'user')
            `;
            console.log('Seeded Users.');
        }

        console.log('Creating Products table...');
        await sql.query`
            IF OBJECT_ID('Products', 'U') IS NULL
            CREATE TABLE Products (
                id INT PRIMARY KEY IDENTITY(1,1),
                name NVARCHAR(100),
                category NVARCHAR(50),
                price DECIMAL(10, 2)
            )
        `;

        const productCount = await sql.query`SELECT COUNT(*) as count FROM Products`;
        if (productCount.recordset[0].count === 0) {
            await sql.query`
                INSERT INTO Products (name, category, price) VALUES 
                ('Laptop', 'Electronics', 1200.00),
                ('Mouse', 'Electronics', 25.00),
                ('Chair', 'Furniture', 150.00),
                ('Desk', 'Furniture', 300.00)
            `;
            console.log('Seeded Products.');
        }

        console.log('Creating Orders table...');
        await sql.query`
            IF OBJECT_ID('Orders', 'U') IS NULL
            CREATE TABLE Orders (
                id INT PRIMARY KEY IDENTITY(1,1),
                user_id INT,
                order_date DATETIME DEFAULT GETDATE(),
                total DECIMAL(10, 2)
            )
        `;

        const orderCount = await sql.query`SELECT COUNT(*) as count FROM Orders`;
        if (orderCount.recordset[0].count === 0) {
            await sql.query`
                INSERT INTO Orders (user_id, total) VALUES 
                (1, 1225.00),
                (2, 150.00),
                (1, 300.00)
            `;
            console.log('Seeded Orders.');
        }

        console.log('Data seeding completed.');
        process.exit(0);

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
};

seedTables();
