const { connectSQL, getPool } = require('../config/db');

const testProductQuery = async () => {
    try {
        await connectSQL();
        const pool = getPool('IcSoftVer3');

        console.log('\n=== Testing Product Query ===\n');

        // Test the exact query used in the API
        const result = await pool.request().query(`
            SELECT TOP 10
                ProdId, 
                ProdName, 
                InternalPartNo,
                LTRIM(RTRIM(ISNULL(InternalPartNo, ''))) as CleanedInternalPartNo,
                LEN(InternalPartNo) as OriginalLength,
                LEN(LTRIM(RTRIM(ISNULL(InternalPartNo, '')))) as CleanedLength
            FROM Product 
            ORDER BY 
                CASE 
                    WHEN InternalPartNo IS NULL OR InternalPartNo = '' THEN 1 
                    ELSE 0 
                END,
                InternalPartNo
        `);

        console.log('Sample Products:');
        console.log('================');
        result.recordset.forEach((product, index) => {
            console.log(`\n${index + 1}. ProdId: ${product.ProdId}`);
            console.log(`   ProdName: ${product.ProdName}`);
            console.log(`   InternalPartNo (raw): "${product.InternalPartNo}"`);
            console.log(`   InternalPartNo (cleaned): "${product.CleanedInternalPartNo}"`);
            console.log(`   Original Length: ${product.OriginalLength}`);
            console.log(`   Cleaned Length: ${product.CleanedLength}`);
        });

        console.log('\n');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

testProductQuery();
