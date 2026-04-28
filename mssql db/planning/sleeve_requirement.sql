-- Table to store submitted sleeve requirements from Planning Master
-- Created: 2025-12-25

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleeveRequirement')
BEGIN
    CREATE TABLE SleeveRequirement (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        PlanDate DATE NOT NULL,
        Shift INT NOT NULL,
        PatternNo VARCHAR(255),
        PlateQty INT,
        SleeveType VARCHAR(255),
        SleeveQty INT,
        TotalSleeves INT,
        SubmittedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Table SleeveRequirement created successfully';
END
ELSE
BEGIN
    PRINT 'Table SleeveRequirement already exists';
END
