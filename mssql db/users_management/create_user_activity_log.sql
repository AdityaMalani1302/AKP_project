-- Migration Script: Create UserActivityLog Table
-- Database: IcSoftVer3
-- Purpose: Store user activity logs for tracking login/logout and other activities

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'UserActivityLog')
BEGIN
    CREATE TABLE UserActivityLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NOT NULL,
        ActivityType NVARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, LOGIN_FAILED, PAGE_ACCESS, CREATE, UPDATE, DELETE
        ActivityDescription NVARCHAR(500) NULL,
        Status NVARCHAR(20) DEFAULT 'SUCCESS', -- SUCCESS, FAILURE
        Details NVARCHAR(MAX) NULL, -- JSON field for additional details
        IPAddress NVARCHAR(45) NULL,
        UserAgent NVARCHAR(500) NULL,
        CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
        
        -- Foreign key constraint
        CONSTRAINT FK_UserActivityLog_Users FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );

    -- Create indexes for faster queries
    CREATE INDEX IX_UserActivityLog_UserId ON UserActivityLog(UserId);
    CREATE INDEX IX_UserActivityLog_ActivityType ON UserActivityLog(ActivityType);
    CREATE INDEX IX_UserActivityLog_CreatedAt ON UserActivityLog(CreatedAt DESC);

    PRINT 'UserActivityLog table created successfully';
END
ELSE
BEGIN
    PRINT 'UserActivityLog table already exists';
END
GO
