const { connectSQL, getPool } = require('../config/db');
const bcrypt = require('bcryptjs');

const createAdminUser = async () => {
    try {
        await connectSQL();

        // Get the IcSoftVer3 database pool
        const pool = getPool('IcSoftVer3');

        if (!pool) {
            throw new Error('IcSoftVer3 database pool not found');
        }

        // Admin credentials
        const username = process.env.ADMIN_USERNAME || 'admin';
        // Generate a secure random password if not provided via environment variable
        const password = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        const fullName = 'System Administrator';
        const role = 'admin';

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('Creating admin user...');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log('---');

        // Check if admin already exists
        const checkResult = await pool.request()
            .input('username', username)
            .query('SELECT Id FROM Users WHERE Username = @username');

        if (checkResult.recordset.length > 0) {
            console.log('⚠️  Admin user already exists!');
            console.log('If you need to reset the password, delete the existing user first.');
            process.exit(0);
        }

        // Insert admin user
        const result = await pool.request()
            .input('username', username)
            .input('passwordHash', hashedPassword)
            .input('fullName', fullName)
            .input('role', role)
            .query(`
                INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive)
                OUTPUT INSERTED.Id
                VALUES (@username, @passwordHash, @fullName, @role, 1)
            `);

        const userId = result.recordset[0].Id;

        console.log('✓ Admin user created successfully!');
        console.log(`User ID: ${userId}`);
        console.log('');
        console.log('Login Credentials:');
        console.log('==================');
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log('==================');
        console.log('');
        console.log('⚠️  IMPORTANT: Change the password after first login!');

        process.exit(0);
    } catch (err) {
        console.error('Failed to create admin user:', err);
        process.exit(1);
    }
};

createAdminUser();
