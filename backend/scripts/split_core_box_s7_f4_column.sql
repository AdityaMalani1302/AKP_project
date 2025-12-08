-- Script to split Core_Box_S7_F4_No_Date column into two separate columns
-- Database: IcSoftVer3

USE IcSoftVer3;
GO

-- Step 1: Add two new columns
ALTER TABLE PatternMaster
ADD Core_Box_S7_F4_No VARCHAR(255) NULL,
    Core_Box_S7_F4_Date DATE NULL;
GO

-- Step 2: Migrate existing data from the old column to new columns
-- This splits the pipe-separated values
UPDATE PatternMaster
SET 
    Core_Box_S7_F4_No = LTRIM(RTRIM(REPLACE(SUBSTRING(Core_Box_S7_F4_No_Date, 1, CHARINDEX('|', Core_Box_S7_F4_No_Date + '|') - 1), 'No:', ''))),
    Core_Box_S7_F4_Date = CASE 
        WHEN ISDATE(LTRIM(RTRIM(REPLACE(SUBSTRING(Core_Box_S7_F4_No_Date, CHARINDEX('|', Core_Box_S7_F4_No_Date) + 1, LEN(Core_Box_S7_F4_No_Date)), 'Date:', '')))) = 1 
        THEN CONVERT(DATE, LTRIM(RTRIM(REPLACE(SUBSTRING(Core_Box_S7_F4_No_Date, CHARINDEX('|', Core_Box_S7_F4_No_Date) + 1, LEN(Core_Box_S7_F4_No_Date)), 'Date:', ''))))
        ELSE NULL
    END
WHERE Core_Box_S7_F4_No_Date IS NOT NULL AND Core_Box_S7_F4_No_Date <> '';
GO

-- Step 3: Drop the old column (OPTIONAL - only if you're sure you don't need it)
-- Uncomment the lines below if you want to remove the old column
-- ALTER TABLE PatternMaster
-- DROP COLUMN Core_Box_S7_F4_No_Date;
-- GO

-- Verify the changes
SELECT 
    Core_Box_S7_F4_No,
    Core_Box_S7_F4_Date,
    Core_Box_S7_F4_No_Date AS Old_Column
FROM PatternMaster
WHERE Core_Box_S7_F4_No IS NOT NULL OR Core_Box_S7_F4_Date IS NOT NULL;
GO

PRINT 'Column split completed successfully!';
PRINT 'Review the data above to verify the migration.';
PRINT 'If everything looks good, you can uncomment the DROP COLUMN statement to remove the old column.';
