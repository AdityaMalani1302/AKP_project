-- =============================================
-- Report Automation Feature - Database Setup
-- Database: IcSoftVer3
-- Created: 2025-12-11
-- =============================================

-- Table 1: Store report SQL templates
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReportTemplates')
BEGIN
    CREATE TABLE ReportTemplates (
        ReportId INT IDENTITY(1,1) PRIMARY KEY,
        ReportName NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500),
        SqlQuery NVARCHAR(MAX) NOT NULL,
        DatabaseName NVARCHAR(50) DEFAULT 'IcSoftVer3',
        CreatedBy INT,
        CreatedAt DATETIME DEFAULT GETDATE(),
        UpdatedAt DATETIME DEFAULT GETDATE(),
        IsActive BIT DEFAULT 1
    );
    PRINT 'Created table: ReportTemplates';
END
ELSE
    PRINT 'Table ReportTemplates already exists';
GO

-- Table 2: Store recipients (for future WhatsApp/Email)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReportRecipients')
BEGIN
    CREATE TABLE ReportRecipients (
        RecipientId INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(100) NOT NULL,
        Department NVARCHAR(100),
        PhoneNumber NVARCHAR(20),
        Email NVARCHAR(100),
        IsActive BIT DEFAULT 1,
        CreatedAt DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created table: ReportRecipients';
END
ELSE
    PRINT 'Table ReportRecipients already exists';
GO

-- Table 3: Report schedules (daily/weekly/monthly)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReportSchedules')
BEGIN
    CREATE TABLE ReportSchedules (
        ScheduleId INT IDENTITY(1,1) PRIMARY KEY,
        ReportId INT NOT NULL,
        ScheduleName NVARCHAR(100),
        Frequency NVARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
        DayOfWeek INT,                    -- 0-6 for weekly (0=Sunday)
        DayOfMonth INT,                   -- 1-31 for monthly
        TimeOfDay TIME NOT NULL,          -- e.g., '08:00:00'
        IsActive BIT DEFAULT 1,
        LastRun DATETIME,
        NextRun DATETIME,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CONSTRAINT FK_Schedule_Report FOREIGN KEY (ReportId) 
            REFERENCES ReportTemplates(ReportId) ON DELETE CASCADE
    );
    PRINT 'Created table: ReportSchedules';
END
ELSE
    PRINT 'Table ReportSchedules already exists';
GO

-- Table 4: Link schedules to recipients (many-to-many)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ScheduleRecipients')
BEGIN
    CREATE TABLE ScheduleRecipients (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        ScheduleId INT NOT NULL,
        RecipientId INT NOT NULL,
        CONSTRAINT FK_SR_Schedule FOREIGN KEY (ScheduleId) 
            REFERENCES ReportSchedules(ScheduleId) ON DELETE CASCADE,
        CONSTRAINT FK_SR_Recipient FOREIGN KEY (RecipientId) 
            REFERENCES ReportRecipients(RecipientId) ON DELETE CASCADE
    );
    PRINT 'Created table: ScheduleRecipients';
END
ELSE
    PRINT 'Table ScheduleRecipients already exists';
GO

-- Table 5: Report execution logs
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ReportLogs')
BEGIN
    CREATE TABLE ReportLogs (
        LogId INT IDENTITY(1,1) PRIMARY KEY,
        ReportId INT NOT NULL,
        ScheduleId INT,
        ExecutedAt DATETIME DEFAULT GETDATE(),
        ExecutedBy INT,                    -- User ID if manual, NULL if scheduled
        Status NVARCHAR(20) NOT NULL,      -- 'success', 'failed', 'pending'
        PdfFileName NVARCHAR(255),
        RecordCount INT,
        ExecutionTimeMs INT,
        ErrorMessage NVARCHAR(MAX),
        CONSTRAINT FK_Log_Report FOREIGN KEY (ReportId) 
            REFERENCES ReportTemplates(ReportId) ON DELETE CASCADE
    );
    PRINT 'Created table: ReportLogs';
END
ELSE
    PRINT 'Table ReportLogs already exists';
GO

-- Create index for faster log queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ReportLogs_ExecutedAt')
BEGIN
    CREATE INDEX IX_ReportLogs_ExecutedAt ON ReportLogs(ExecutedAt DESC);
    PRINT 'Created index: IX_ReportLogs_ExecutedAt';
END
GO

PRINT '=============================================';
PRINT 'Report Automation tables setup complete!';
PRINT '=============================================';
