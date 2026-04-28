-- Create or Update Marketing_RFQMaster table
-- This table tracks the full RFQ lifecycle from customer inquiry through tooling and samples

-- First drop the table if it exists (since we need to change the SrNo column from computed to regular)
-- IMPORTANT: Only run this if the table was just created and has no data, 
-- otherwise you need to migrate data first
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Marketing_RFQMaster')
BEGIN
    -- Check if SrNo is a computed column
    IF EXISTS (SELECT * FROM sys.computed_columns WHERE object_id = OBJECT_ID('Marketing_RFQMaster') AND name = 'SrNo')
    BEGIN
        -- Drop indexes first
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Marketing_RFQMaster_AKPRFQNo' AND object_id = OBJECT_ID('Marketing_RFQMaster'))
            DROP INDEX IX_Marketing_RFQMaster_AKPRFQNo ON Marketing_RFQMaster;
        IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Marketing_RFQMaster_CustomerName' AND object_id = OBJECT_ID('Marketing_RFQMaster'))
            DROP INDEX IX_Marketing_RFQMaster_CustomerName ON Marketing_RFQMaster;
        
        -- Drop and recreate table
        DROP TABLE Marketing_RFQMaster;
        PRINT 'Dropped old Marketing_RFQMaster table with computed SrNo column.';
    END
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Marketing_RFQMaster')
BEGIN
    CREATE TABLE Marketing_RFQMaster (
        RFQMasterId INT IDENTITY(1,1) PRIMARY KEY,
        SrNo NVARCHAR(50),  -- User-editable serial number
        Status NVARCHAR(50) DEFAULT 'Active',
        AKPRFQNo NVARCHAR(50) NOT NULL,  -- Links to Marketing_RFQ.RFQNo
        RFQId INT,  -- Foreign key to Marketing_RFQ
        CustomerName NVARCHAR(255),
        RFQDate DATE,
        ProjectReference NVARCHAR(255),
        RFQParts NVARCHAR(500),
        AnnualVolume DECIMAL(18, 2),
        Weight DECIMAL(18, 4),
        MonthlyTonnage DECIMAL(18, 4),
        PatternQuoteDate DATE,
        MachiningQuoteDate DATE,
        QuoteSentDate DATE,
        RevisedQuoteSentDate DATE,
        GoAheadConfirmDate DATE,
        PartPODate DATE,
        PartNo NVARCHAR(100),
        ToolingPODate DATE,
        ToolingNo NVARCHAR(100),
        AmortizationDate DATE,
        GAAToolingDate DATE,
        GAAMachiningDate DATE,
        SampleSubmittedDate DATE,
        Remarks NVARCHAR(MAX),
        CreatedBy NVARCHAR(100),
        CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 DEFAULT SYSDATETIME()
    );

    PRINT 'Marketing_RFQMaster table created successfully.';
END
GO

-- Create index on AKPRFQNo for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Marketing_RFQMaster_AKPRFQNo' AND object_id = OBJECT_ID('Marketing_RFQMaster'))
BEGIN
    CREATE INDEX IX_Marketing_RFQMaster_AKPRFQNo ON Marketing_RFQMaster(AKPRFQNo);
    PRINT 'Index IX_Marketing_RFQMaster_AKPRFQNo created.';
END
GO

-- Create index on CustomerName for search performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Marketing_RFQMaster_CustomerName' AND object_id = OBJECT_ID('Marketing_RFQMaster'))
BEGIN
    CREATE INDEX IX_Marketing_RFQMaster_CustomerName ON Marketing_RFQMaster(CustomerName);
    PRINT 'Index IX_Marketing_RFQMaster_CustomerName created.';
END
GO

-- Create index on RFQId for foreign key performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Marketing_RFQMaster_RFQId' AND object_id = OBJECT_ID('Marketing_RFQMaster'))
BEGIN
    CREATE INDEX IX_Marketing_RFQMaster_RFQId ON Marketing_RFQMaster(RFQId);
    PRINT 'Index IX_Marketing_RFQMaster_RFQId created.';
END
GO
