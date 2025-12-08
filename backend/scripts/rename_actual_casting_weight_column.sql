-- Script to rename Actual_Casting_Weight column to Total_Weight in PatternMaster table
-- Database: IcSoftVer3

USE IcSoftVer3;
GO

-- Rename the column
EXEC sp_rename 'PatternMaster.Actual_Casting_Weight', 'Total_Weight', 'COLUMN';
GO

-- Verify the change
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PatternMaster' AND COLUMN_NAME = 'Total_Weight';
GO

PRINT 'Column renamed successfully from Actual_Casting_Weight to Total_Weight';
