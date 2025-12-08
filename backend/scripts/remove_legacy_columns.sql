-- Script to remove legacy columns from PatternMaster table
-- Database: IcSoftVer3

USE IcSoftVer3;
GO

-- All legacy columns that are no longer used in the application
ALTER TABLE PatternMaster
DROP COLUMN 
    Good_Wt_Per_Box,
    Sleeve_Size,
    No_Of_Sleeves,
    No_Of_BoxesPer_Heat,
    Filter_Size,
    No_Of_Filters,
    Moulding_Type,
    No_Of_Cores,
    Shell_Core,
    Cold_Box,
    Chill_Used,
    Chaplet,
    Comment,
    Customer_Tooling_Inv_No;
GO

PRINT 'All legacy columns removed successfully!';

-- Verify remaining columns
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'PatternMaster'
ORDER BY ORDINAL_POSITION;
GO
