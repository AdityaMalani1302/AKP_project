-- Migration Script: Add Main/Side/Loose Core Quantity Columns
-- Date: 2025-12-04
-- Description: Adds mainCore_qty, sideCore_qty, and looseCore_qty columns to PatternMaster table

-- Add mainCore_qty column
IF COL_LENGTH('PatternMaster', 'mainCore_qty') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD mainCore_qty VARCHAR(255) NULL;
    PRINT 'Column mainCore_qty added successfully';
END
ELSE
BEGIN
    PRINT 'Column mainCore_qty already exists';
END

-- Add sideCore_qty column
IF COL_LENGTH('PatternMaster', 'sideCore_qty') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD sideCore_qty VARCHAR(255) NULL;
    PRINT 'Column sideCore_qty added successfully';
END
ELSE
BEGIN
    PRINT 'Column sideCore_qty already exists';
END

-- Add looseCore_qty column
IF COL_LENGTH('PatternMaster', 'looseCore_qty') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD looseCore_qty VARCHAR(255) NULL;
    PRINT 'Column looseCore_qty added successfully';
END
ELSE
BEGIN
    PRINT 'Column looseCore_qty already exists';
END

PRINT 'Migration completed: Main/Side/Loose Core quantity columns ready';
