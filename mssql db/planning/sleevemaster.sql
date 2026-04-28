-- Migration Script: Create SleeveMaster Table
-- Date: 2025-12-04
-- Description: Creates table to store multiple sleeves per pattern

-- Create SleeveMaster table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleeveMaster')
BEGIN
    CREATE TABLE SleeveMaster (
        SleeveRowId INT IDENTITY(1,1) PRIMARY KEY,
        PatternId NUMERIC(18, 0),
        sleeve_name NVARCHAR(255) NULL,
        sleeve_type_size NVARCHAR(255) NULL,
        quantity INT NULL,
        FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
    );
    PRINT 'Table SleeveMaster created successfully';
END
ELSE
BEGIN
    PRINT 'Table SleeveMaster already exists';
END

PRINT 'Migration completed: SleeveMaster table ready';
