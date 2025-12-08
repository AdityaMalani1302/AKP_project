-- SQL Migration: Add Serial_No, runner_bar_size, runner_bar_no columns to PatternMaster
-- Run this script on your SQL Server database to add the new columns

-- Add Serial_No column (beside Customer Name)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'Serial_No' AND Object_ID = Object_ID(N'PatternMaster'))
BEGIN
    ALTER TABLE PatternMaster ADD Serial_No VARCHAR(255) NULL;
    PRINT 'Column Serial_No added successfully.';
END
ELSE
BEGIN
    PRINT 'Column Serial_No already exists.';
END
GO

-- Add runner_bar_size column (in Moulding section)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'runner_bar_size' AND Object_ID = Object_ID(N'PatternMaster'))
BEGIN
    ALTER TABLE PatternMaster ADD runner_bar_size VARCHAR(255) NULL;
    PRINT 'Column runner_bar_size added successfully.';
END
ELSE
BEGIN
    PRINT 'Column runner_bar_size already exists.';
END
GO

-- Add runner_bar_no column (in Moulding section)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'runner_bar_no' AND Object_ID = Object_ID(N'PatternMaster'))
BEGIN
    ALTER TABLE PatternMaster ADD runner_bar_no VARCHAR(255) NULL;
    PRINT 'Column runner_bar_no added successfully.';
END
ELSE
BEGIN
    PRINT 'Column runner_bar_no already exists.';
END
GO

PRINT 'Migration completed successfully!';
