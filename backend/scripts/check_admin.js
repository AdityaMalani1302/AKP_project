const { connectSQL, getPool } = require('../config/db');

const checkAdminUser = async () => {
    try {
        await connectSQL();
        const pool = getPool('IcSoftVer3');

        const result = await pool.request()
            .query("SELECT Id, Username, FullName, Role, IsActive, CreatedAt FROM Users WHERE Role = 'admin'");

        console.log('\n=== Admin Users in Database ===\n');
        if (result.recordset.length === 0) {
            console.log('No admin users found.');
        } else {
            result.recordset.forEach(user => {
                console.log(`ID: ${user.Id}`);
                console.log(`Username: ${user.Username}`);
                console.log(`Full Name: ${user.FullName}`);
                console.log(`Role: ${user.Role}`);
                console.log(`Active: ${user.IsActive ? 'Yes' : 'No'}`);
                console.log(`Created: ${user.CreatedAt}`);
                console.log('---');
            });
        }
        console.log('');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

checkAdminUser();
