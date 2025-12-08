-- Migration Script: Add Core Type Quantity Columns
-- Date: 2025-12-04
-- Description: Adds shell_qty, coldBox_qty, and noBake_qty columns to PatternMaster table

-- Add shell_qty column
IF COL_LENGTH('PatternMaster', 'shell_qty') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD shell_qty INT NULL;
    PRINT 'Column shell_qty added successfully';
END
ELSE
BEGIN
    PRINT 'Column shell_qty already exists';
END

-- Add coldBox_qty column
IF COL_LENGTH('PatternMaster', 'coldBox_qty') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD coldBox_qty INT NULL;
    PRINT 'Column coldBox_qty added successfully';
END
ELSE
BEGIN
    PRINT 'Column coldBox_qty already exists';
END

-- Add noBake_qty column
IF COL_LENGTH('PatternMaster', 'noBake_qty') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD noBake_qty INT NULL;
    PRINT 'Column noBake_qty added successfully';
END
ELSE
BEGIN
    PRINT 'Column noBake_qty already exists';
END

PRINT 'Migration completed: Core type quantity columns ready';
