-- Migration Script: Add Pattern_Received_Date to PatternMaster Table
-- Database: IcSoftVer3

IF NOT EXISTS (
  SELECT * 
  FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[PatternMaster]') 
  AND name = 'Pattern_Received_Date'
)
BEGIN
    ALTER TABLE PatternMaster
    ADD Pattern_Received_Date DATE NULL;
    PRINT 'Column Pattern_Received_Date added to PatternMaster table.';
END
ELSE
BEGIN
    PRINT 'Column Pattern_Received_Date already exists in PatternMaster table.';
END
GO
