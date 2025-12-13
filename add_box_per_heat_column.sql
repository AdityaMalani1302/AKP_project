-- Script to add Box_Per_Heat column to PatternMaster table
-- Run this script on your SQL Server database before using the new field

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'PatternMaster' 
    AND COLUMN_NAME = 'Box_Per_Heat'
)
BEGIN
    ALTER TABLE PatternMaster
    ADD Box_Per_Heat VARCHAR(255) NULL;
    PRINT 'Column Box_Per_Heat added successfully to PatternMaster table.';
END
ELSE
BEGIN
    PRINT 'Column Box_Per_Heat already exists in PatternMaster table.';
END
