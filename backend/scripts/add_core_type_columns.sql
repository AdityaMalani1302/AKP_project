-- Migration Script: Add Core Type Columns to PatternMaster Table
-- Date: 2025-12-04
-- Description: Adds three separate columns for core type checkboxes (Shell, Cold Box, No-Bake)

-- Add core_type_shell column
IF COL_LENGTH('PatternMaster', 'core_type_shell') IS NULL 
BEGIN
    ALTER TABLE PatternMaster ADD core_type_shell VARCHAR(255);
    PRINT 'Column core_type_shell added successfully';
END
ELSE
BEGIN
    PRINT 'Column core_type_shell already exists';
END

-- Add core_type_cold_box column
IF COL_LENGTH('PatternMaster', 'core_type_cold_box') IS NULL 
BEGIN
    ALTER TABLE PatternMaster ADD core_type_cold_box VARCHAR(255);
    PRINT 'Column core_type_cold_box added successfully';
END
ELSE
BEGIN
    PRINT 'Column core_type_cold_box already exists';
END

-- Add core_type_no_bake column
IF COL_LENGTH('PatternMaster', 'core_type_no_bake') IS NULL 
BEGIN
    ALTER TABLE PatternMaster ADD core_type_no_bake VARCHAR(255);
    PRINT 'Column core_type_no_bake added successfully';
END
ELSE
BEGIN
    PRINT 'Column core_type_no_bake already exists';
END

PRINT 'Migration completed: Core type columns added to PatternMaster table';
