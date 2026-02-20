-- ============================================
-- DATABASE VERIFICATION SCRIPT
-- ============================================
-- Run this script in SQL Server Management Studio
-- against the IcSoftVer3 database to verify:
--   1. All expected tables exist
--   2. All expected columns exist with correct types
--   3. Foreign key constraints are in place
--   4. Indexes exist for performance
--   5. Views are created
--   6. Identify any mismatches or missing objects
-- ============================================

USE IcSoftVer3;
GO

SET NOCOUNT ON;

PRINT '============================================';
PRINT 'DATABASE VERIFICATION REPORT';
PRINT 'Generated: ' + CONVERT(VARCHAR, GETDATE(), 120);
PRINT '============================================';
PRINT '';

-- ============================================
-- 1. TABLES VERIFICATION
-- ============================================
PRINT '=== 1. TABLES VERIFICATION ===';
PRINT '';

-- Define expected tables
DECLARE @ExpectedTables TABLE (TableName NVARCHAR(128), Category NVARCHAR(50));
INSERT INTO @ExpectedTables VALUES
    -- Pattern Master Module
    ('PatternMaster', 'Pattern'),
    ('PatternCavityMaster', 'Pattern'),
    ('PatternReturnHistory', 'Pattern'),
    ('PatternReturnParts', 'Pattern'),
    -- Planning Module
    ('SleeveMaster', 'Planning'),
    ('PlanningEntry', 'Planning'),
    ('SleeveRequirement', 'Planning'),
    -- Lab Master Module
    ('LabMaster', 'Lab'),
    ('DrawingMaster', 'Lab'),
    -- Quality & Lab Module
    ('Lab_Spectro', 'Quality'),
    ('Lab_PhysicalProperties', 'Quality'),
    ('Lab_Micro', 'Quality'),
    ('Lab_Sand', 'Quality'),
    ('MouldHardness', 'Quality'),
    -- Users Module
    ('Users', 'Users'),
    -- Core Tables (existing in DB)
    ('Customer', 'Core'),
    ('Product', 'Core'),
    ('Invent_Supplier', 'Core'),
    ('RawMaterial', 'Core'),
    -- IT Management (IT_ prefix)
    ('IT_Asset', 'IT'),
    ('IT_SystemUserDetails', 'IT'),
    ('IT_SoftwareList', 'IT'),
    ('IT_DeviceRepairedHistory', 'IT'),
    ('IT_Complaint', 'IT'),
    -- Reports
    ('ReportTemplates', 'Reports'),
    ('ReportSchedules', 'Reports'),
    ('ReportRecipients', 'Reports');

-- Check for existing and missing tables
PRINT 'Expected Tables Status:';
PRINT '------------------------';

SELECT 
    et.TableName,
    et.Category,
    CASE WHEN t.name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS Status
FROM @ExpectedTables et
LEFT JOIN sys.tables t ON t.name = et.TableName
ORDER BY et.Category, et.TableName;

-- Count summary
DECLARE @TotalExpected INT, @TotalExists INT, @TotalMissing INT;
SELECT @TotalExpected = COUNT(*) FROM @ExpectedTables;
SELECT @TotalExists = COUNT(*) FROM @ExpectedTables et JOIN sys.tables t ON t.name = et.TableName;
SET @TotalMissing = @TotalExpected - @TotalExists;

PRINT '';
PRINT 'Summary: ' + CAST(@TotalExists AS VARCHAR) + '/' + CAST(@TotalExpected AS VARCHAR) + ' tables exist, ' + CAST(@TotalMissing AS VARCHAR) + ' missing';
PRINT '';

-- ============================================
-- 2. PATTERNMASTER COLUMNS VERIFICATION
-- ============================================
PRINT '';
PRINT '=== 2. PATTERNMASTER COLUMNS VERIFICATION ===';
PRINT '';

DECLARE @ExpectedPMColumns TABLE (ColumnName NVARCHAR(128), DataType NVARCHAR(50), Category NVARCHAR(50));
INSERT INTO @ExpectedPMColumns VALUES
    -- Main Details
    ('PatternId', 'numeric', 'Main'),
    ('PatternNo', 'varchar', 'Main'),
    ('Customer', 'numeric', 'Main'),
    ('Part_No', 'numeric', 'Main'),
    ('Product_Name', 'numeric', 'Main'),
    ('Box_Per_Heat', 'varchar', 'Main'),
    ('Total_Weight', 'varchar', 'Main'),
    ('Asset_No', 'varchar', 'Main'),
    ('Customer_Po_No', 'varchar', 'Main'),
    ('Tooling_PO_Date', 'date', 'Main'),
    ('Purchase_No', 'varchar', 'Main'),
    ('Purchase_Date', 'date', 'Main'),
    ('Pattern_Received_Date', 'date', 'Main'),
    ('Quoted_Estimated_Weight', 'varchar', 'Main'),
    ('Pattern_Maker', 'numeric', 'Main'),
    ('Serial_No', 'varchar', 'Main'),
    -- Pattern Details
    ('Pattern_Material_Details', 'varchar', 'Pattern'),
    ('No_Of_Patterns_Set', 'varchar', 'Pattern'),
    ('Pattern_Pieces', 'varchar', 'Pattern'),
    ('Rack_Location', 'varchar', 'Pattern'),
    -- Core Box Details
    ('Core_Box_Material_Details', 'varchar', 'CoreBox'),
    ('Core_Box_Location', 'varchar', 'CoreBox'),
    ('Core_Box_S7_F4_No', 'varchar', 'CoreBox'),
    ('Core_Box_S7_F4_Date', 'date', 'CoreBox'),
    ('No_Of_Core_Box_Set', 'varchar', 'CoreBox'),
    ('Core_Box_Pieces', 'varchar', 'CoreBox'),
    -- Core Details
    ('Core_Wt', 'varchar', 'Core'),
    ('shell_qty', 'int', 'Core'),
    ('coldBox_qty', 'int', 'Core'),
    ('noBake_qty', 'int', 'Core'),
    ('Main_Core', 'varchar', 'Core'),
    ('Side_Core', 'varchar', 'Core'),
    ('Loose_Core', 'varchar', 'Core'),
    ('mainCore_qty', 'varchar', 'Core'),
    ('sideCore_qty', 'varchar', 'Core'),
    ('looseCore_qty', 'varchar', 'Core'),
    ('Core_Type', 'varchar', 'Core'),
    -- Casting Details
    ('Moulding_Box_Size', 'varchar', 'Casting'),
    ('Bunch_Wt', 'varchar', 'Casting'),
    ('YieldPercent', 'varchar', 'Casting'),
    -- Chaplets & Chills
    ('Chaplets_COPE', 'varchar', 'Chaplets'),
    ('Chaplets_DRAG', 'varchar', 'Chaplets'),
    ('Chills_COPE', 'varchar', 'Chaplets'),
    ('Chills_DRAG', 'varchar', 'Chaplets'),
    -- Mould Vents
    ('Mould_Vents_Size', 'varchar', 'Mould'),
    ('Mould_Vents_No', 'varchar', 'Mould'),
    -- Moulding Section
    ('breaker_core_size', 'varchar', 'Moulding'),
    ('down_sprue_size', 'varchar', 'Moulding'),
    ('foam_filter_size', 'varchar', 'Moulding'),
    ('sand_riser_size', 'varchar', 'Moulding'),
    ('no_of_sand_riser', 'varchar', 'Moulding'),
    ('ingate_size', 'varchar', 'Moulding'),
    ('no_of_ingate', 'varchar', 'Moulding'),
    ('runner_bar_size', 'varchar', 'Moulding'),
    ('runner_bar_no', 'varchar', 'Moulding'),
    -- Additional Info
    ('rev_no_status', 'varchar', 'Info'),
    ('date', 'date', 'Info'),
    ('comment', 'varchar', 'Info');

-- Check PatternMaster columns
IF OBJECT_ID('PatternMaster') IS NOT NULL
BEGIN
    PRINT 'PatternMaster Columns Status:';
    PRINT '------------------------------';
    
    SELECT 
        ec.ColumnName,
        ec.DataType AS ExpectedType,
        COALESCE(c.DATA_TYPE, 'MISSING') AS ActualType,
        CASE 
            WHEN c.COLUMN_NAME IS NULL THEN 'MISSING'
            WHEN c.DATA_TYPE <> ec.DataType THEN 'TYPE MISMATCH'
            ELSE 'OK'
        END AS Status,
        ec.Category
    FROM @ExpectedPMColumns ec
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS c 
        ON c.TABLE_NAME = 'PatternMaster' AND c.COLUMN_NAME = ec.ColumnName
    ORDER BY ec.Category, ec.ColumnName;
    
    -- Summary
    DECLARE @PMTotal INT, @PMOK INT, @PMMissing INT, @PMMismatch INT;
    SELECT @PMTotal = COUNT(*) FROM @ExpectedPMColumns;
    SELECT @PMOK = COUNT(*) FROM @ExpectedPMColumns ec 
        JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = 'PatternMaster' AND c.COLUMN_NAME = ec.ColumnName AND c.DATA_TYPE = ec.DataType;
    SELECT @PMMissing = COUNT(*) FROM @ExpectedPMColumns ec 
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = 'PatternMaster' AND c.COLUMN_NAME = ec.ColumnName
        WHERE c.COLUMN_NAME IS NULL;
    SET @PMMismatch = @PMTotal - @PMOK - @PMMissing;
    
    PRINT '';
    PRINT 'Summary: ' + CAST(@PMOK AS VARCHAR) + ' OK, ' + CAST(@PMMissing AS VARCHAR) + ' missing, ' + CAST(@PMMismatch AS VARCHAR) + ' type mismatches';
END
ELSE
BEGIN
    PRINT 'ERROR: PatternMaster table does not exist!';
END

PRINT '';

-- ============================================
-- 2B. DRAWINGMASTER COLUMNS VERIFICATION
-- ============================================
PRINT '';
PRINT '=== 2B. DRAWINGMASTER COLUMNS VERIFICATION ===';
PRINT '';

DECLARE @ExpectedDMColumns TABLE (ColumnName NVARCHAR(128), DataType NVARCHAR(50), Category NVARCHAR(50));
INSERT INTO @ExpectedDMColumns VALUES
    -- Primary Key
    ('DrawingMasterId', 'int', 'Key'),
    -- Serial No (user-defined)
    ('No', 'nvarchar', 'Main'),
    -- Main Details
    ('Customer', 'nvarchar', 'Main'),
    ('DrawingNo', 'nvarchar', 'Main'),
    ('RevNo', 'nvarchar', 'Main'),
    ('Description', 'nvarchar', 'Main'),
    -- Grade Details
    ('CustomerGrade', 'nvarchar', 'Grade'),
    ('AKPGrade', 'nvarchar', 'Grade'),
    -- Additional Info
    ('Remarks', 'nvarchar', 'Info'),
    ('Comments', 'nvarchar', 'Info'),
    -- Attachment
    ('AttachmentPath', 'nvarchar', 'Attachment'),
    ('AttachmentName', 'nvarchar', 'Attachment'),
    -- Timestamps
    ('CreatedAt', 'datetime', 'Timestamp'),
    ('UpdatedAt', 'datetime', 'Timestamp');

-- Check DrawingMaster columns
IF OBJECT_ID('DrawingMaster') IS NOT NULL
BEGIN
    PRINT 'DrawingMaster Columns Status:';
    PRINT '------------------------------';
    
    SELECT 
        ec.ColumnName,
        ec.DataType AS ExpectedType,
        COALESCE(c.DATA_TYPE, 'MISSING') AS ActualType,
        CASE 
            WHEN c.COLUMN_NAME IS NULL THEN 'MISSING'
            WHEN c.DATA_TYPE <> ec.DataType THEN 'TYPE MISMATCH'
            ELSE 'OK'
        END AS Status,
        ec.Category
    FROM @ExpectedDMColumns ec
    LEFT JOIN INFORMATION_SCHEMA.COLUMNS c 
        ON c.TABLE_NAME = 'DrawingMaster' AND c.COLUMN_NAME = ec.ColumnName
    ORDER BY ec.Category, ec.ColumnName;
    
    -- Summary
    DECLARE @DMTotal INT, @DMOK INT, @DMMissing INT, @DMMismatch INT;
    SELECT @DMTotal = COUNT(*) FROM @ExpectedDMColumns;
    SELECT @DMOK = COUNT(*) FROM @ExpectedDMColumns ec 
        JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = 'DrawingMaster' AND c.COLUMN_NAME = ec.ColumnName AND c.DATA_TYPE = ec.DataType;
    SELECT @DMMissing = COUNT(*) FROM @ExpectedDMColumns ec 
        LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = 'DrawingMaster' AND c.COLUMN_NAME = ec.ColumnName
        WHERE c.COLUMN_NAME IS NULL;
    SET @DMMismatch = @DMTotal - @DMOK - @DMMissing;
    
    PRINT '';
    PRINT 'Summary: ' + CAST(@DMOK AS VARCHAR) + ' OK, ' + CAST(@DMMissing AS VARCHAR) + ' missing, ' + CAST(@DMMismatch AS VARCHAR) + ' type mismatches';
END
ELSE
BEGIN
    PRINT 'ERROR: DrawingMaster table does not exist!';
END

PRINT '';

-- ============================================
-- 3. FOREIGN KEY VERIFICATION
-- ============================================
PRINT '';
PRINT '=== 3. FOREIGN KEY VERIFICATION ===';
PRINT '';

DECLARE @ExpectedFKs TABLE (FKName NVARCHAR(128), ParentTable NVARCHAR(128), ParentColumn NVARCHAR(128), RefTable NVARCHAR(128), RefColumn NVARCHAR(128));
INSERT INTO @ExpectedFKs VALUES
    -- PatternMaster FKs
    ('FK_PatternMaster_Customer', 'PatternMaster', 'Customer', 'Customer', 'CustId'),
    ('FK_PatternMaster_Part', 'PatternMaster', 'Part_No', 'Product', 'ProdId'),
    ('FK_PatternMaster_Product', 'PatternMaster', 'Product_Name', 'Product', 'ProdId'),
    ('FK_PatternMaster_PatternMaker', 'PatternMaster', 'Pattern_Maker', 'Invent_Supplier', 'SupId'),
    -- PatternCavityMaster FKs
    ('FK_PatternCavityMaster_Pattern', 'PatternCavityMaster', 'PatternId', 'PatternMaster', 'PatternId'),
    -- SleeveMaster FKs
    ('FK_SleeveMaster_Pattern', 'SleeveMaster', 'PatternId', 'PatternMaster', 'PatternId'),
    -- PatternReturnParts FKs
    ('FK_PatternReturnParts_Return', 'PatternReturnParts', 'ReturnId', 'PatternReturnHistory', 'ReturnId');

PRINT 'Foreign Key Relationships (checked by relationship, not name):';
PRINT '--------------------------------------------------------------';

-- Check FK by relationship (parent table + column + ref table) instead of name
-- This handles auto-generated FK names like FK__PatternCa__Patte__6B116A39
SELECT 
    efk.FKName AS ExpectedFKName,
    efk.ParentTable + '.' + efk.ParentColumn AS Relationship,
    efk.RefTable + '.' + efk.RefColumn AS ReferencesTo,
    CASE WHEN fk.name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS Status,
    COALESCE(fk.name, '') AS ActualFKName
FROM @ExpectedFKs efk
LEFT JOIN sys.foreign_keys fk 
    ON OBJECT_NAME(fk.parent_object_id) = efk.ParentTable
LEFT JOIN sys.foreign_key_columns fkc 
    ON fk.object_id = fkc.constraint_object_id
    AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = efk.ParentColumn
    AND OBJECT_NAME(fk.referenced_object_id) = efk.RefTable
ORDER BY efk.ParentTable;

PRINT '';
PRINT 'All Foreign Keys in Database (for reference):';
PRINT '----------------------------------------------';

SELECT 
    fk.name AS ForeignKeyName,
    OBJECT_NAME(fk.parent_object_id) AS ParentTable,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ParentColumn,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) IN ('PatternMaster', 'PatternCavityMaster', 'SleeveMaster', 'PatternReturnParts')
ORDER BY ParentTable, ForeignKeyName;

PRINT '';

-- ============================================
-- 4. INDEX VERIFICATION
-- ============================================
PRINT '';
PRINT '=== 4. INDEX VERIFICATION ===';
PRINT '';

DECLARE @ExpectedIndexes TABLE (IndexName NVARCHAR(128), TableName NVARCHAR(128));
INSERT INTO @ExpectedIndexes VALUES
    -- PatternMaster
    ('IX_PatternMaster_Customer', 'PatternMaster'),
    ('IX_PatternMaster_PatternMaker', 'PatternMaster'),
    ('IX_PatternMaster_PatternNo', 'PatternMaster'),
    ('IX_PatternMaster_SerialNo', 'PatternMaster'),
    -- PatternCavityMaster
    ('IX_PatternCavityMaster_PatternId', 'PatternCavityMaster'),
    -- SleeveMaster
    ('IX_SleeveMaster_PatternId', 'SleeveMaster'),
    -- Customer
    ('IX_Customer_CustName', 'Customer'),
    ('IX_Customer_CTypeID', 'Customer'),
    -- Lab Tables
    ('IX_LabMaster_Customer', 'LabMaster'),
    ('IX_LabMaster_Grade', 'LabMaster'),
    ('IX_Lab_Spectro_HeatNo', 'Lab_Spectro'),
    ('IX_Lab_Sand_Date', 'Lab_Sand'),
    ('IX_MouldHardness_Date', 'MouldHardness'),
    -- PlanningEntry
    ('IX_PlanningEntry_PatternId', 'PlanningEntry'),
    ('IX_PlanningEntry_PlanDate', 'PlanningEntry');
    -- NOTE: InvoiceQuery is a VIEW, not a table, so indexes cannot be created on it

PRINT 'Expected Indexes Status:';
PRINT '------------------------';

SELECT 
    ei.IndexName,
    ei.TableName,
    CASE WHEN i.name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS Status
FROM @ExpectedIndexes ei
LEFT JOIN sys.indexes i ON i.name = ei.IndexName
ORDER BY ei.TableName, ei.IndexName;

PRINT '';
PRINT 'All User Indexes in Database:';
PRINT '-----------------------------';

SELECT 
    t.name AS TableName,
    i.name AS IndexName,
    i.type_desc AS IndexType,
    CASE WHEN i.is_unique = 1 THEN 'Yes' ELSE 'No' END AS IsUnique
FROM sys.indexes i
JOIN sys.tables t ON i.object_id = t.object_id
WHERE i.name IS NOT NULL 
    AND i.type > 0  -- Exclude heap
    AND t.is_ms_shipped = 0
ORDER BY t.name, i.name;

PRINT '';

-- ============================================
-- 5. VIEWS VERIFICATION
-- ============================================
PRINT '';
PRINT '=== 5. VIEWS VERIFICATION ===';
PRINT '';

DECLARE @ExpectedViews TABLE (ViewName NVARCHAR(128), Category NVARCHAR(50));
INSERT INTO @ExpectedViews VALUES
    ('vw_Pattern_Summary', 'Pattern'),
    ('SalesDashboard', 'Dashboard'),
    ('FinanceDashboard', 'Dashboard'),
    ('ProductionDashboard', 'Dashboard'),
    ('MeltingDashboard', 'Dashboard'),
    ('AccountReceivables', 'Finance'),
    ('CustomerRecovery', 'Finance'),
    ('InvoiceQuery', 'Core');

PRINT 'Expected Views Status:';
PRINT '----------------------';

SELECT 
    ev.ViewName,
    ev.Category,
    CASE WHEN v.name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END AS Status
FROM @ExpectedViews ev
LEFT JOIN sys.views v ON v.name = ev.ViewName
ORDER BY ev.Category, ev.ViewName;

PRINT '';
PRINT 'All Views in Database:';
PRINT '----------------------';

SELECT 
    name AS ViewName,
    create_date AS CreatedDate,
    modify_date AS LastModified
FROM sys.views
WHERE is_ms_shipped = 0
ORDER BY name;

PRINT '';

-- ============================================
-- 6. ADDITIONAL TABLES COLUMNS CHECK
-- ============================================
PRINT '';
PRINT '=== 6. USERS TABLE COLUMNS ===';
PRINT '';

IF OBJECT_ID('Users') IS NOT NULL
BEGIN
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Users'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT 'Users table does not exist';
END

PRINT '';
PRINT '=== 7. LABMASTER TABLE COLUMNS ===';
PRINT '';

IF OBJECT_ID('LabMaster') IS NOT NULL
BEGIN
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'LabMaster'
    ORDER BY ORDINAL_POSITION;
END
ELSE
BEGIN
    PRINT 'LabMaster table does not exist';
END

PRINT '';

-- ============================================
-- 7. SUMMARY REPORT
-- ============================================
PRINT '';
PRINT '============================================';
PRINT 'VERIFICATION COMPLETE';
PRINT '============================================';
PRINT '';
PRINT 'Review the above results for:';
PRINT '  - MISSING tables, columns, FKs, indexes, or views';
PRINT '  - TYPE MISMATCH warnings for column data types';
PRINT '  - Unexpected objects that may need cleanup';
PRINT '';
PRINT 'To fix missing objects, run the appropriate';
PRINT 'migration scripts from the mssql db folder.';
PRINT '============================================';
GO
