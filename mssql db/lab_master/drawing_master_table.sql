-- Create DrawingMaster table for storing drawing master records
-- Run this script in SQL Server Management Studio on the IcSoftVer3 database

-- Check if table exists and create if not
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[DrawingMaster]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[DrawingMaster] (
        [DrawingMasterId] INT IDENTITY(1,1) PRIMARY KEY,
        [Customer] NVARCHAR(255) NOT NULL,
        [DrawingNo] NVARCHAR(100) NOT NULL,
        [RevNo] NVARCHAR(50) NULL,
        [Description] NVARCHAR(500) NULL,
        [CustomerGrade] NVARCHAR(100) NULL,
        [AKPGrade] NVARCHAR(100) NULL,
        [Remarks] NVARCHAR(1000) NULL,
        [Comments] NVARCHAR(2000) NULL,
        [CreatedAt] DATETIME DEFAULT GETDATE(),
        [UpdatedAt] DATETIME DEFAULT GETDATE()
    );

    -- Create unique index on DrawingNo to prevent duplicates
    CREATE UNIQUE INDEX [IX_DrawingMaster_DrawingNo] ON [dbo].[DrawingMaster] ([DrawingNo]);

    -- Create index on Customer for faster searches
    CREATE INDEX [IX_DrawingMaster_Customer] ON [dbo].[DrawingMaster] ([Customer]);

    PRINT 'DrawingMaster table created successfully!';
END
ELSE
BEGIN
    PRINT 'DrawingMaster table already exists.';
END
GO

-- Add No column to existing DrawingMaster table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DrawingMaster]') AND name = 'No')
BEGIN
    ALTER TABLE [dbo].[DrawingMaster]
    ADD [No] NVARCHAR(50) NULL;
    
    PRINT 'No column added to DrawingMaster table.';
END
ELSE
BEGIN
    PRINT 'No column already exists in DrawingMaster table.';
END
GO

-- Add AttachmentName column for storing uploaded file names
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DrawingMaster]') AND name = 'AttachmentName')
BEGIN
    ALTER TABLE [dbo].[DrawingMaster]
    ADD [AttachmentName] NVARCHAR(255) NULL;
    
    PRINT 'AttachmentName column added to DrawingMaster table.';
END
ELSE
BEGIN
    PRINT 'AttachmentName column already exists in DrawingMaster table.';
END
GO

-- Add AttachmentPath column for storing file paths
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[DrawingMaster]') AND name = 'AttachmentPath')
BEGIN
    ALTER TABLE [dbo].[DrawingMaster]
    ADD [AttachmentPath] NVARCHAR(500) NULL;
    
    PRINT 'AttachmentPath column added to DrawingMaster table.';
END
ELSE
BEGIN
    PRINT 'AttachmentPath column already exists in DrawingMaster table.';
END
GO
