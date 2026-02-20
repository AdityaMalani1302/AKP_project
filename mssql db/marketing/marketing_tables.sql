-- Marketing Module Tables
-- Creates Marketing_RFQ, Marketing_Laboratory, Marketing_Patternshop tables
-- Run this script on the IcSoftVer3 database

-- =====================================================
-- Table 1: Marketing_RFQ (Main RFQ Entry)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Marketing_RFQ' AND xtype='U')
BEGIN
    CREATE TABLE Marketing_RFQ (
        RFQId INT IDENTITY(1,1) PRIMARY KEY,
        RFQNo NVARCHAR(50) NOT NULL UNIQUE,
        PartNo NVARCHAR(100) NULL,
        MachiningDrawingNo NVARCHAR(100) NULL,
        PartName NVARCHAR(255) NULL,
        DrawingMatGrade NVARCHAR(100) NULL,
        BOMQty DECIMAL(18,2) NULL,
        FY2026 NVARCHAR(100) NULL,
        DrgWt DECIMAL(18,4) NULL,
        CastingPartWt DECIMAL(18,4) NULL,
        Status NVARCHAR(50) DEFAULT 'Active',
        CreatedBy NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 DEFAULT SYSDATETIME()
    );
    
    -- Create index on RFQNo for faster lookups
    CREATE INDEX IX_Marketing_RFQ_RFQNo ON Marketing_RFQ(RFQNo);
    
    PRINT 'Marketing_RFQ table created successfully.';
END
ELSE
BEGIN
    PRINT 'Marketing_RFQ table already exists.';
END
GO

-- =====================================================
-- Table 2: Marketing_Laboratory (Laboratory data linked to RFQ)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Marketing_Laboratory' AND xtype='U')
BEGIN
    CREATE TABLE Marketing_Laboratory (
        LaboratoryId INT IDENTITY(1,1) PRIMARY KEY,
        RFQId INT NOT NULL,
        -- Equivalent AKP Mat Grade
        FGSG NVARCHAR(100) NULL,
        AlloyAddition NVARCHAR(255) NULL,
        -- Special Treatment
        RT NVARCHAR(100) NULL,
        UT NVARCHAR(100) NULL,
        MPI NVARCHAR(100) NULL,
        HT NVARCHAR(100) NULL,
        DPTest NVARCHAR(100) NULL,
        NABL NVARCHAR(100) NULL,
        ImpactTest NVARCHAR(100) NULL,
        Millipore NVARCHAR(100) NULL,
        CutSection NVARCHAR(100) NULL,
        InducingHardening NVARCHAR(100) NULL,
        -- Laboratory Requirements
        LaboratoryRequirements NVARCHAR(MAX) NULL,
        -- Metadata
        FilledBy NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 DEFAULT SYSDATETIME(),
        -- Foreign Key
        CONSTRAINT FK_Laboratory_RFQ FOREIGN KEY (RFQId) REFERENCES Marketing_RFQ(RFQId) ON DELETE CASCADE
    );
    
    -- Create unique index to ensure one laboratory entry per RFQ
    CREATE UNIQUE INDEX IX_Marketing_Laboratory_RFQId ON Marketing_Laboratory(RFQId);
    
    PRINT 'Marketing_Laboratory table created successfully.';
END
ELSE
BEGIN
    PRINT 'Marketing_Laboratory table already exists.';
END
GO

-- =====================================================
-- Table 3: Marketing_Patternshop (Patternshop/Development data linked to RFQ)
-- =====================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Marketing_Patternshop' AND xtype='U')
BEGIN
    CREATE TABLE Marketing_Patternshop (
        PatternshopId INT IDENTITY(1,1) PRIMARY KEY,
        RFQId INT NOT NULL,
        -- Basic Information
        LineBox NVARCHAR(100) NULL,
        Cavity NVARCHAR(100) NULL,
        CoreWt NVARCHAR(100) NULL,
        -- Match Plate
        MatchPlateSpecial NVARCHAR(255) NULL,
        MatchPlateRegular NVARCHAR(255) NULL,
        -- Core Type
        ShellCoreWt NVARCHAR(100) NULL,
        ColdBoxWt NVARCHAR(100) NULL,
        -- Casting Tolerance CGCT
        CustomerRequirement NVARCHAR(255) NULL,
        OurFeasibilityCastingTolerance NVARCHAR(255) NULL,
        -- NPD Foundry Requirements
        NPDFoundryRequirements NVARCHAR(MAX) NULL,
        -- Metadata
        FilledBy NVARCHAR(100) NULL,
        CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 DEFAULT SYSDATETIME(),
        -- Foreign Key
        CONSTRAINT FK_Patternshop_RFQ FOREIGN KEY (RFQId) REFERENCES Marketing_RFQ(RFQId) ON DELETE CASCADE
    );
    
    -- Create unique index to ensure one patternshop entry per RFQ
    CREATE UNIQUE INDEX IX_Marketing_Patternshop_RFQId ON Marketing_Patternshop(RFQId);
    
    PRINT 'Marketing_Patternshop table created successfully.';
END
ELSE
BEGIN
    PRINT 'Marketing_Patternshop table already exists.';
END
GO

-- =====================================================
-- Seed initial RFQ counter (optional)
-- =====================================================
-- If you need to start from a specific RFQ number, you can use:
-- DBCC CHECKIDENT ('Marketing_RFQ', RESEED, 0);
-- This will make the next RFQId start from 1

PRINT 'Marketing module tables setup complete.';
GO
