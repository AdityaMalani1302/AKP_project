-- Migration Script: Add Cascade Constraints for Child Tables
-- Date: 2025-12-04
-- Description: Adds ON DELETE CASCADE to PatternCavityMaster and SleeveMaster foreign keys

USE IcSoftVer3;
GO

PRINT '=== Adding Cascade Constraints for Child Tables ===';
PRINT '';

-- =============================================
-- PatternCavityMaster: Add CASCADE constraint
-- =============================================

PRINT 'Processing PatternCavityMaster table...';

-- Check if FK exists and drop it if it does
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_PatternCavityMaster_PatternMaster' 
    AND parent_object_id = OBJECT_ID('PatternCavityMaster')
)
BEGIN
    PRINT '  - Dropping existing FK constraint';
    ALTER TABLE PatternCavityMaster 
    DROP CONSTRAINT FK_PatternCavityMaster_PatternMaster;
END

-- Recreate with CASCADE
IF OBJECT_ID('PatternCavityMaster', 'U') IS NOT NULL
BEGIN
    PRINT '  - Adding FK constraint with ON DELETE CASCADE';
    ALTER TABLE PatternCavityMaster
    ADD CONSTRAINT FK_PatternCavityMaster_PatternMaster
    FOREIGN KEY (PatternId) 
    REFERENCES PatternMaster(PatternId)
    ON DELETE CASCADE;
    
    PRINT '  ✓ PatternCavityMaster: CASCADE constraint added';
END
ELSE
BEGIN
    PRINT '  ⚠ PatternCavityMaster table does not exist yet';
END

PRINT '';

-- =============================================
-- SleeveMaster: Add CASCADE constraint
-- =============================================

PRINT 'Processing SleeveMaster table...';

-- Check if FK exists and drop it if it does
IF EXISTS (
    SELECT 1 FROM sys.foreign_keys 
    WHERE name = 'FK_SleeveMaster_PatternMaster' 
    AND parent_object_id = OBJECT_ID('SleeveMaster')
)
BEGIN
    PRINT '  - Dropping existing FK constraint';
    ALTER TABLE SleeveMaster 
    DROP CONSTRAINT FK_SleeveMaster_PatternMaster;
END

-- Recreate with CASCADE
IF OBJECT_ID('SleeveMaster', 'U') IS NOT NULL
BEGIN
    PRINT '  - Adding FK constraint with ON DELETE CASCADE';
    ALTER TABLE SleeveMaster
    ADD CONSTRAINT FK_SleeveMaster_PatternMaster
    FOREIGN KEY (PatternId) 
    REFERENCES PatternMaster(PatternId)
    ON DELETE CASCADE;
    
    PRINT '  ✓ SleeveMaster: CASCADE constraint added';
END
ELSE
BEGIN
    PRINT '  ⚠ SleeveMaster table does not exist yet';
END

PRINT '';
PRINT '=== Migration Complete ===';
PRINT '';
PRINT 'Benefits:';
PRINT '  - Deleting a pattern will automatically delete related cavity records';
PRINT '  - Deleting a pattern will automatically delete related sleeve records';
PRINT '  - Maintains referential integrity automatically';
GO
