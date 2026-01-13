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
