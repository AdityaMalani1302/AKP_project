-- Migration Script: Create LabMaster Table
-- Database: IcSoftVer3
-- Date: 2025-12-08
-- Description: Creates the LabMaster table for storing lab chemistry data
-- All fields are VARCHAR/NVARCHAR for flexibility

USE IcSoftVer3;
GO

-- Create LabMaster table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LabMaster')
BEGIN
    CREATE TABLE LabMaster (
        LabMasterId INT IDENTITY(1,1) PRIMARY KEY,
        
        -- 1. Details Section
        Customer NVARCHAR(255) NULL,
        DrgNo NVARCHAR(100) NULL,
        Description NVARCHAR(500) NULL,
        Grade NVARCHAR(100) NULL,
        PartWeight NVARCHAR(100) NULL,
        MinMaxThickness NVARCHAR(100) NULL,
        ThicknessGroup NVARCHAR(100) NULL,
        BaseChe_C NVARCHAR(50) NULL,
        BaseChe_Si NVARCHAR(50) NULL,
        
        -- 2. Final Control Chemistry Section
        C NVARCHAR(50) NULL,
        Si NVARCHAR(50) NULL,
        Mn NVARCHAR(50) NULL,
        P NVARCHAR(50) NULL,
        S NVARCHAR(50) NULL,
        Cr NVARCHAR(50) NULL,
        Cu NVARCHAR(50) NULL,
        Mg_Chem NVARCHAR(50) NULL,
        CE NVARCHAR(50) NULL,
        Nickel NVARCHAR(50) NULL,
        Moly NVARCHAR(50) NULL,
        
        -- 3. Charge Mix Section
        CRCA NVARCHAR(100) NULL,
        RR NVARCHAR(100) NULL,
        PIG NVARCHAR(100) NULL,
        MS NVARCHAR(100) NULL,
        Mg_Mix NVARCHAR(100) NULL,
        
        -- 4. Others Section
        RegularCritical NVARCHAR(50) NULL,
        LastBoxTemp NVARCHAR(100) NULL,
        Remarks NVARCHAR(2000) NULL,
        
        -- Audit Fields
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL
    );
    
    PRINT 'LabMaster table created successfully';
END
ELSE
BEGIN
    PRINT 'LabMaster table already exists';
END
GO

-- Create index on Customer for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LabMaster_Customer' AND object_id = OBJECT_ID('LabMaster'))
BEGIN
    CREATE INDEX IX_LabMaster_Customer ON LabMaster(Customer);
    PRINT 'Index IX_LabMaster_Customer created';
END
GO

-- Create index on Grade for faster lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LabMaster_Grade' AND object_id = OBJECT_ID('LabMaster'))
BEGIN
    CREATE INDEX IX_LabMaster_Grade ON LabMaster(Grade);
    PRINT 'Index IX_LabMaster_Grade created';
END
GO

PRINT 'LabMaster table migration completed successfully';
