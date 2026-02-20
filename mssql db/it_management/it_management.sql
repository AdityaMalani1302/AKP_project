-- =============================================
-- IT Management Module - Database Tables
-- Database: IcSoftVer3
-- Date: 2025-12-18
-- Description: Creates 6 tables for IT Management module
-- =============================================

USE IcSoftVer3;
GO

-- =============================================
-- 1. IT_Asset - Master table for all IT assets
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IT_Asset')
BEGIN
    CREATE TABLE IT_Asset (
        AssetId INT IDENTITY(1,1) PRIMARY KEY,
        AssetTagNumber NVARCHAR(50) NOT NULL UNIQUE,  -- User-defined Asset Tag
        AssetName NVARCHAR(255) NOT NULL,
        AssetType NVARCHAR(50) NULL,                  -- Server/Laptop/Desktop/Network Device/Printer/Storage/Firewall/Other
        Category NVARCHAR(50) NULL,                   -- Hardware/Software/Network/Cloud
        Manufacturer NVARCHAR(100) NULL,
        Model NVARCHAR(100) NULL,
        SerialNumber NVARCHAR(100) NULL,
        Hostname NVARCHAR(100) NULL,
        Location NVARCHAR(255) NULL,
        
        -- Technical Specifications
        Processor NVARCHAR(100) NULL,
        RAM NVARCHAR(50) NULL,
        StorageTypeCapacity NVARCHAR(100) NULL,
        OperatingSystem NVARCHAR(100) NULL,
        OSVersion NVARCHAR(50) NULL,
        MACAddress NVARCHAR(50) NULL,
        FirmwareVersion NVARCHAR(50) NULL,
        NetworkSegmentVLAN NVARCHAR(50) NULL,
        ServerType NVARCHAR(50) NULL,                 -- Physical/Virtual/Cloud
        
        -- Procurement & Financial
        PurchaseDate DATE NULL,
        VendorName NVARCHAR(255) NULL,
        PONumber NVARCHAR(100) NULL,
        InvoiceNumber NVARCHAR(100) NULL,
        PurchaseCost DECIMAL(18,2) NULL,
        WarrantyStartDate DATE NULL,
        WarrantyEndDate DATE NULL,
        AMCDetails NVARCHAR(500) NULL,
        
        -- Lifecycle & Status
        AssetStatus NVARCHAR(50) NULL,                -- In Use/In Stock/Under Repair/Disposed
        DeploymentDate DATE NULL,
        RetirementDate DATE NULL,
        DisposalMethod NVARCHAR(50) NULL,             -- Resale/Scrap/Return/Secure Wipe
        
        -- Maintenance & Support
        SupportVendor NVARCHAR(255) NULL,
        SupportContactDetails NVARCHAR(255) NULL,
        Remark NVARCHAR(500) NULL,
        
        -- Attachments & Notes
        LicenseDetails NVARCHAR(500) NULL,
        AdditionalRemarks NVARCHAR(1000) NULL,
        
        -- Approval & Audit
        CreatedBy NVARCHAR(100) NULL,
        CreatedDate DATETIME2 NULL,
        ApprovedBy NVARCHAR(100) NULL,
        ApprovalDate DATETIME2 NULL,
        
        -- System Audit
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL
    );
    
    PRINT 'IT_Asset table created successfully';
END
ELSE
BEGIN
    PRINT 'IT_Asset table already exists';
END
GO

-- Create indexes for IT_Asset
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_Asset_AssetTagNumber' AND object_id = OBJECT_ID('IT_Asset'))
BEGIN
    CREATE INDEX IX_IT_Asset_AssetTagNumber ON IT_Asset(AssetTagNumber);
    PRINT 'Index IX_IT_Asset_AssetTagNumber created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_Asset_AssetStatus' AND object_id = OBJECT_ID('IT_Asset'))
BEGIN
    CREATE INDEX IX_IT_Asset_AssetStatus ON IT_Asset(AssetStatus);
    PRINT 'Index IX_IT_Asset_AssetStatus created';
END
GO

-- =============================================
-- 2. IT_SystemUserDetails - Asset assignments to users
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IT_SystemUserDetails')
BEGIN
    CREATE TABLE IT_SystemUserDetails (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        AssetId INT NOT NULL,
        AssignedUser NVARCHAR(255) NOT NULL,
        SystemName NVARCHAR(100) NULL,
        IPAddress NVARCHAR(50) NULL,
        AssetOwner NVARCHAR(255) NULL,               -- Department/Business Unit
        Descriptions NVARCHAR(500) NULL,
        IssueDate DATE NULL,
        
        -- System Audit
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        
        -- Foreign Key
        CONSTRAINT FK_SystemUserDetails_Asset FOREIGN KEY (AssetId) REFERENCES IT_Asset(AssetId)
    );
    
    PRINT 'IT_SystemUserDetails table created successfully';
END
ELSE
BEGIN
    PRINT 'IT_SystemUserDetails table already exists';
END
GO

-- Create index for IT_SystemUserDetails
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_SystemUserDetails_AssetId' AND object_id = OBJECT_ID('IT_SystemUserDetails'))
BEGIN
    CREATE INDEX IX_IT_SystemUserDetails_AssetId ON IT_SystemUserDetails(AssetId);
    PRINT 'Index IX_IT_SystemUserDetails_AssetId created';
END
GO

-- =============================================
-- 3. IT_SoftwareList - Software licenses and installations
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IT_SoftwareList')
BEGIN
    CREATE TABLE IT_SoftwareList (
        SoftwareId INT IDENTITY(1,1) PRIMARY KEY,
        SoftwareName NVARCHAR(255) NOT NULL,
        VendorPublisher NVARCHAR(255) NULL,
        Category NVARCHAR(50) NULL,                  -- OS/Application/Database/Security/SaaS
        Version NVARCHAR(50) NULL,
        
        -- Licensing
        LicenseType NVARCHAR(50) NULL,               -- Per User/Per Device/Subscription
        LicenseCountPurchased INT NULL,
        LicenseCountInUse INT NULL,
        LicenseStatus NVARCHAR(50) NULL,             -- Active/Expired
        LicenseExpiryDate DATE NULL,
        
        -- Deployment
        InstalledOnAssetId INT NULL,                 -- FK to IT_Asset
        Department NVARCHAR(100) NULL,
        
        -- Status & Notes
        SoftwareStatus NVARCHAR(50) NULL,            -- Active/Inactive
        Owner NVARCHAR(255) NULL,
        Notes NVARCHAR(500) NULL,
        UpdateDate DATE NULL,
        
        -- Optional
        POContractReference NVARCHAR(100) NULL,
        Cost NVARCHAR(100) NULL,
        
        -- System Audit
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        
        -- Foreign Key (optional link to asset)
        CONSTRAINT FK_SoftwareList_Asset FOREIGN KEY (InstalledOnAssetId) REFERENCES IT_Asset(AssetId)
    );
    
    PRINT 'IT_SoftwareList table created successfully';
END
ELSE
BEGIN
    PRINT 'IT_SoftwareList table already exists';
END
GO

-- Create indexes for IT_SoftwareList
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_SoftwareList_SoftwareName' AND object_id = OBJECT_ID('IT_SoftwareList'))
BEGIN
    CREATE INDEX IX_IT_SoftwareList_SoftwareName ON IT_SoftwareList(SoftwareName);
    PRINT 'Index IX_IT_SoftwareList_SoftwareName created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_SoftwareList_LicenseStatus' AND object_id = OBJECT_ID('IT_SoftwareList'))
BEGIN
    CREATE INDEX IX_IT_SoftwareList_LicenseStatus ON IT_SoftwareList(LicenseStatus);
    PRINT 'Index IX_IT_SoftwareList_LicenseStatus created';
END
GO

-- =============================================
-- 4. IT_DeviceRepairedHistory - Repair history
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IT_DeviceRepairedHistory')
BEGIN
    CREATE TABLE IT_DeviceRepairedHistory (
        RepairId INT IDENTITY(1,1) PRIMARY KEY,
        AssetId INT NOT NULL,
        IssuedUserName NVARCHAR(255) NULL,
        IssuedDepartment NVARCHAR(100) NULL,
        IssuedBy NVARCHAR(255) NULL,
        Date DATE NULL,
        IssueVendorName NVARCHAR(255) NULL,
        DescriptionOfIssue NVARCHAR(1000) NULL,
        Remark NVARCHAR(500) NULL,
        
        -- System Audit
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        
        -- Foreign Key
        CONSTRAINT FK_DeviceRepairedHistory_Asset FOREIGN KEY (AssetId) REFERENCES IT_Asset(AssetId)
    );
    
    PRINT 'IT_DeviceRepairedHistory table created successfully';
END
ELSE
BEGIN
    PRINT 'IT_DeviceRepairedHistory table already exists';
END
GO

-- Create index for IT_DeviceRepairedHistory
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_DeviceRepairedHistory_AssetId' AND object_id = OBJECT_ID('IT_DeviceRepairedHistory'))
BEGIN
    CREATE INDEX IX_IT_DeviceRepairedHistory_AssetId ON IT_DeviceRepairedHistory(AssetId);
    PRINT 'Index IX_IT_DeviceRepairedHistory_AssetId created';
END
GO

-- =============================================
-- 5. IT_Complaint - IT complaints/tickets
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IT_Complaint')
BEGIN
    CREATE TABLE IT_Complaint (
        TicketId INT IDENTITY(1,1) PRIMARY KEY,
        TicketNumber NVARCHAR(50) NOT NULL UNIQUE,   -- Format: TKT-YYYYMMDD-XXX
        DateTimeSubmitted DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        EmployeeName NVARCHAR(255) NOT NULL,
        Department NVARCHAR(100) NULL,
        ContactNumber NVARCHAR(100) NULL,
        DeviceName NVARCHAR(100) NULL,
        IssueType NVARCHAR(50) NULL,                 -- Hardware/Software/Network/Email/Access/Other
        ShortIssueTitle NVARCHAR(255) NOT NULL,
        ProblemDescription NVARCHAR(2000) NULL,
        ScreenshotPath NVARCHAR(500) NULL,
        Status NVARCHAR(50) NULL DEFAULT 'Open',     -- Open/In Progress/Resolved/Closed
        
        -- System Audit
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL
    );
    
    PRINT 'IT_Complaint table created successfully';
END
ELSE
BEGIN
    PRINT 'IT_Complaint table already exists';
END
GO

-- Create indexes for IT_Complaint
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_Complaint_TicketNumber' AND object_id = OBJECT_ID('IT_Complaint'))
BEGIN
    CREATE INDEX IX_IT_Complaint_TicketNumber ON IT_Complaint(TicketNumber);
    PRINT 'Index IX_IT_Complaint_TicketNumber created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_Complaint_Status' AND object_id = OBJECT_ID('IT_Complaint'))
BEGIN
    CREATE INDEX IX_IT_Complaint_Status ON IT_Complaint(Status);
    PRINT 'Index IX_IT_Complaint_Status created';
END
GO

-- =============================================
-- 6. IT_Resolved - Resolved IT issues
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'IT_Resolved')
BEGIN
    CREATE TABLE IT_Resolved (
        ResolvedId INT IDENTITY(1,1) PRIMARY KEY,
        TicketId INT NULL,                           -- Optional FK to IT_Complaint
        ResolvedNumber NVARCHAR(50) NOT NULL UNIQUE, -- Format: RES-YYYYMMDD-XXX
        Date DATE NOT NULL,
        ShortIssueTitle NVARCHAR(255) NOT NULL,
        Description NVARCHAR(2000) NULL,
        
        -- System Audit
        CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 NULL,
        
        -- Foreign Key (optional)
        CONSTRAINT FK_Resolved_Complaint FOREIGN KEY (TicketId) REFERENCES IT_Complaint(TicketId)
    );
    
    PRINT 'IT_Resolved table created successfully';
END
ELSE
BEGIN
    PRINT 'IT_Resolved table already exists';
END
GO

-- Create index for IT_Resolved
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_Resolved_TicketId' AND object_id = OBJECT_ID('IT_Resolved'))
BEGIN
    CREATE INDEX IX_IT_Resolved_TicketId ON IT_Resolved(TicketId);
    PRINT 'Index IX_IT_Resolved_TicketId created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_IT_Resolved_ResolvedNumber' AND object_id = OBJECT_ID('IT_Resolved'))
BEGIN
    CREATE INDEX IX_IT_Resolved_ResolvedNumber ON IT_Resolved(ResolvedNumber);
    PRINT 'Index IX_IT_Resolved_ResolvedNumber created';
END
GO

PRINT '=============================================';
PRINT 'IT Management tables migration completed successfully';
PRINT '=============================================';
PRINT 'Tables created:';
PRINT '  1. IT_Asset (Primary)';
PRINT '  2. IT_SystemUserDetails (FK: AssetId)';
PRINT '  3. IT_SoftwareList (FK: InstalledOnAssetId)';
PRINT '  4. IT_DeviceRepairedHistory (FK: AssetId)';
PRINT '  5. IT_Complaint';
PRINT '  6. IT_Resolved (FK: TicketId)';
PRINT '=============================================';
