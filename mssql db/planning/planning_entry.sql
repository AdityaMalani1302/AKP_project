-- Create PlanningEntry Table with VARCHAR columns for flexibility
-- Note: If the table already exists with different data types, you must DROP it first.
-- DROP TABLE PlanningEntry;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PlanningEntry')
CREATE TABLE PlanningEntry (
    EntryId INT IDENTITY(1,1) PRIMARY KEY,
    PlanDate DATE NULL,
    PatternId VARCHAR(255) NULL,
    PatternNo VARCHAR(255) NULL,
    CustomerName VARCHAR(255) NULL,
    PartRowId VARCHAR(255) NULL,
    PartNo VARCHAR(255) NULL,
    PartName VARCHAR(255) NULL,
    Cavity VARCHAR(255) NULL,
    CoreType VARCHAR(255) NULL,
    ProductionQty VARCHAR(255) NULL,
    PlateQty VARCHAR(255) NULL,
    CastWeight VARCHAR(255) NULL,
    TotalWeight VARCHAR(255) NULL,
    BoxesPerHeat VARCHAR(255) NULL,
    NoOfHeats VARCHAR(255) NULL,
    Sleeves VARCHAR(500) NULL,
    Shift VARCHAR(255) NULL,
    MouldBoxSize VARCHAR(255) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);