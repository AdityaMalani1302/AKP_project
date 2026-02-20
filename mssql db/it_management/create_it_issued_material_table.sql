-- Create IT_IssuedMaterial table for tracking issued IT materials
-- Run this script on the database to create the table

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='IT_IssuedMaterial' AND xtype='U')
BEGIN
    CREATE TABLE IT_IssuedMaterial (
        IssuedMaterialId INT IDENTITY(1,1) PRIMARY KEY,
        MaterialName NVARCHAR(255) NOT NULL,
        MaterialType NVARCHAR(100) NULL,
        Quantity INT NULL,
        Unit NVARCHAR(50) NULL,
        IssuedTo NVARCHAR(255) NOT NULL,
        IssuedBy NVARCHAR(255) NULL,
        IssueDate DATE NULL,
        Department NVARCHAR(100) NULL,
        Purpose NVARCHAR(500) NULL,
        ReturnDate DATE NULL,
        Status NVARCHAR(50) DEFAULT 'Issued',
        Remarks NVARCHAR(500) NULL,
        CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2 DEFAULT SYSDATETIME()
    );
    
    PRINT 'IT_IssuedMaterial table created successfully.';
END
ELSE
BEGIN
    PRINT 'IT_IssuedMaterial table already exists.';
END
GO
