/**
 * Migration Script: Create DrawingMasterAttachments table and migrate existing data.
 * 
 * Run with: node scripts/migrate_drawing_attachments.js
 */
const { connectSQL, getPool, closeSQL, sql } = require('../config/db');

async function migrate() {
    console.log('Starting migration: DrawingMasterAttachments...');
    
    await connectSQL();
    const pool = getPool('IcSoftVer3');
    
    if (!pool) {
        console.error('FATAL: Could not get database pool');
        process.exit(1);
    }

    try {
        // Step 1: Create DrawingMasterAttachments table if it doesn't exist
        console.log('Step 1: Creating DrawingMasterAttachments table...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'DrawingMasterAttachments')
            BEGIN
                CREATE TABLE DrawingMasterAttachments (
                    AttachmentId INT IDENTITY(1,1) PRIMARY KEY,
                    DrawingMasterId INT NOT NULL,
                    AttachmentPath NVARCHAR(500) NOT NULL,
                    AttachmentName NVARCHAR(255) NOT NULL,
                    CreatedAt DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_DrawingMasterAttachments_DrawingMaster
                        FOREIGN KEY (DrawingMasterId)
                        REFERENCES DrawingMaster(DrawingMasterId)
                        ON DELETE CASCADE
                );
                
                CREATE INDEX IX_DrawingMasterAttachments_DrawingMasterId
                    ON DrawingMasterAttachments(DrawingMasterId);
                    
                PRINT 'Table DrawingMasterAttachments created successfully.';
            END
            ELSE
            BEGIN
                PRINT 'Table DrawingMasterAttachments already exists. Skipping creation.';
            END
        `);
        console.log('  ✓ Table created (or already existed).');

        // Step 2: Migrate existing single-attachment data from DrawingMaster
        console.log('Step 2: Migrating existing attachment data...');
        const migrateResult = await pool.request().query(`
            INSERT INTO DrawingMasterAttachments (DrawingMasterId, AttachmentPath, AttachmentName, CreatedAt)
            SELECT DrawingMasterId, AttachmentPath, AttachmentName, GETDATE()
            FROM DrawingMaster
            WHERE AttachmentPath IS NOT NULL
              AND AttachmentName IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM DrawingMasterAttachments da
                  WHERE da.DrawingMasterId = DrawingMaster.DrawingMasterId
                    AND da.AttachmentPath = DrawingMaster.AttachmentPath
              )
        `);
        console.log(`  ✓ Migrated ${migrateResult.rowsAffected[0]} existing attachment(s).`);

        console.log('\nMigration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    } finally {
        await closeSQL();
    }
}

migrate();
