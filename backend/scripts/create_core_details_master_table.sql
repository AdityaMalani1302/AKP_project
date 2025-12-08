-- Migration Script: Create CoreDetailsMaster Table
-- Date: 2025-12-04
-- Description: Creates table to store multiple core details per pattern with quantity fields

-- Create CoreDetailsMaster table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'CoreDetailsMaster')
BEGIN
    CREATE TABLE CoreDetailsMaster (
        CoreRowId INT IDENTITY(1,1) PRIMARY KEY,
        PatternId NUMERIC(18, 0),
        shell_qty INT NULL,
        cold_box_qty INT NULL,
        no_bake_qty INT NULL,
        main_core_qty INT NULL,
        side_core_qty INT NULL,
        loose_core_qty INT NULL,
        FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
    );
    PRINT 'Table CoreDetailsMaster created successfully';
END
ELSE
BEGIN
    PRINT 'Table CoreDetailsMaster already exists';
END

PRINT 'Migration completed: CoreDetailsMaster table ready';
