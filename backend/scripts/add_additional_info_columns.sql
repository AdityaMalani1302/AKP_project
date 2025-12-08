-- Migration Script: Add Additional Information Columns
-- Date: 2025-12-04
-- Description: Adds additional information columns to PatternMaster table

-- Add rev_no_status column
IF COL_LENGTH('PatternMaster', 'rev_no_status') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD rev_no_status VARCHAR(255) NULL;
    PRINT 'Column rev_no_status added successfully';
END
ELSE
BEGIN
    PRINT 'Column rev_no_status already exists';
END

-- Add date column
IF COL_LENGTH('PatternMaster', 'date') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD [date] DATE NULL;
    PRINT 'Column date added successfully';
END
ELSE
BEGIN
    PRINT 'Column date already exists';
END

-- Add comment column
IF COL_LENGTH('PatternMaster', 'comment') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD [comment] VARCHAR(8000) NULL;
    PRINT 'Column comment added successfully';
END
ELSE
BEGIN
    PRINT 'Column comment already exists';
END

PRINT 'Migration completed: All additional information columns ready';
