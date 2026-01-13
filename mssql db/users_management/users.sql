-- Migration Script: Create Users Table
-- Database: IcSoftVer3

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(255) NOT NULL,
        FullName NVARCHAR(100) NOT NULL,
        Role NVARCHAR(20) DEFAULT 'employee', -- 'admin' or 'employee'
        IsActive BIT DEFAULT 1,
        AllowedPages NVARCHAR(MAX) NULL, -- Comma separated list of pages like 'dashboard,pattern-master'
        CreatedAt DATETIME2 DEFAULT SYSDATETIME()
    );
    PRINT 'Users table created successfully';

    -- Create default admin user if not exists (Optional, good for setup)
    -- This requires a hashed password. This is just a placeholder or you can leave it out.
    -- INSERT INTO Users (Username, PasswordHash, FullName, Role, AllowedPages) VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'System Admin', 'admin', 'all');
END
ELSE
BEGIN
    PRINT 'Users table already exists';
END
GO
