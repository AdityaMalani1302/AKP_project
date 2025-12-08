-- Migration Script: Remove Legacy Core_Type Columns
-- Date: 2025-12-04
-- Description: Drops the 3 unused legacy core_type columns from PatternMaster table

USE IcSoftVer3;
GO

PRINT '=== Removing Legacy Core_Type Columns ===';
PRINT '';

-- Drop core_type_shell column
IF COL_LENGTH('PatternMaster', 'core_type_shell') IS NOT NULL
BEGIN
    ALTER TABLE PatternMaster DROP COLUMN core_type_shell;
    PRINT '✓ Column core_type_shell dropped successfully';
END
ELSE
BEGIN
    PRINT '⚠ Column core_type_shell does not exist';
END

-- Drop core_type_cold_box column
IF COL_LENGTH('PatternMaster', 'core_type_cold_box') IS NOT NULL
BEGIN
    ALTER TABLE PatternMaster DROP COLUMN core_type_cold_box;
    PRINT '✓ Column core_type_cold_box dropped successfully';
END
ELSE
BEGIN
    PRINT '⚠ Column core_type_cold_box does not exist';
END

-- Drop core_type_no_bake column
IF COL_LENGTH('PatternMaster', 'core_type_no_bake') IS NOT NULL
BEGIN
    ALTER TABLE PatternMaster DROP COLUMN core_type_no_bake;
    PRINT '✓ Column core_type_no_bake dropped successfully';
END
ELSE
BEGIN
    PRINT '⚠ Column core_type_no_bake does not exist';
END

PRINT '';
PRINT '=== Migration Complete ===';
PRINT '';
PRINT 'Summary:';
PRINT '  - Removed 3 unused legacy columns';
PRINT '  - Core_Type column retained (still in use)';
PRINT '  - shell_qty, coldBox_qty, noBake_qty retained (actively used)';
GO
