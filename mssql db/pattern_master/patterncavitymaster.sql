-- 2. Create PatternParts table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternCavityMaster')
BEGIN
    CREATE TABLE PatternCavityMaster (
        PartRowId INT IDENTITY(1,1) PRIMARY KEY,
        PatternId NUMERIC(18, 0),
        PartNo INT,
        ProductName NVARCHAR(255),
        Qty INT,
        Weight DECIMAL(18,2),
        MaterialGrade NVARCHAR(255),
        FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
    );
END