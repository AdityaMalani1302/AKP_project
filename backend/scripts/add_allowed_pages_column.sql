-- Add AllowedPages column to Users table for page-level access control
-- Run this script on the IcSoftVer3 database

-- Add the AllowedPages column if it doesn't exist
IF NOT EXISTS (
    SELECT * FROM sys.columns 
    WHERE object_id = OBJECT_ID('Users') AND name = 'AllowedPages'
)
BEGIN
    ALTER TABLE Users ADD AllowedPages VARCHAR(500) NULL;
    PRINT 'AllowedPages column added successfully';
END
ELSE
BEGIN
    PRINT 'AllowedPages column already exists';
END
GO

-- Update existing admin users to have 'all' access
UPDATE Users SET AllowedPages = 'all' WHERE Role = 'admin';
PRINT 'Updated admin users with full access';
GO

-- Update existing employee users to have full access by default (backward compatibility)
UPDATE Users SET AllowedPages = 'dashboard,pattern-master,planning-master,lab-master,melting,database-explorer' 
WHERE Role = 'employee' AND (AllowedPages IS NULL OR AllowedPages = '');
PRINT 'Updated existing employees with full access (backward compatibility)';
GO
