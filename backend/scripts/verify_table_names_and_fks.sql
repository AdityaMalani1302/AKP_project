-- Script to verify FK table names and constraints
-- This will help identify any table name mismatches

USE IcSoftVer3;
GO

PRINT '=== Checking Referenced Table Names ===';
PRINT '';

-- Check if Customer table exists
IF OBJECT_ID('Customer', 'U') IS NOT NULL
    PRINT '✓ Table "Customer" exists';
ELSE IF OBJECT_ID('CustomerMaster', 'U') IS NOT NULL
    PRINT '⚠ Table "CustomerMaster" exists (not Customer)';
ELSE
    PRINT '✗ Neither "Customer" nor "CustomerMaster" exists';

-- Check if Product table exists
IF OBJECT_ID('Product', 'U') IS NOT NULL
    PRINT '✓ Table "Product" exists';
ELSE IF OBJECT_ID('ProductMaster', 'U') IS NOT NULL
    PRINT '⚠ Table "ProductMaster" exists (not Product)';
ELSE
    PRINT '✗ Neither "Product" nor "ProductMaster" exists';

-- Check if PartMaster table exists
IF OBJECT_ID('PartMaster', 'U') IS NOT NULL
    PRINT '✓ Table "PartMaster" exists';
ELSE
    PRINT '✗ Table "PartMaster" does not exist';

-- Check if Invent_Supplier table exists
IF OBJECT_ID('Invent_Supplier', 'U') IS NOT NULL
    PRINT '✓ Table "Invent_Supplier" exists';
ELSE
    PRINT '✗ Table "Invent_Supplier" does not exist';

-- Check if RawMaterial table exists
IF OBJECT_ID('RawMaterial', 'U') IS NOT NULL
    PRINT '✓ Table "RawMaterial" exists';
ELSE
    PRINT '✗ Table "RawMaterial" does not exist';

PRINT '';
PRINT '=== Current FK Constraints on PatternMaster ===';
PRINT '';

SELECT 
    fk.name AS ConstraintName,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fkc 
    ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'PatternMaster'
ORDER BY fk.name;

PRINT '';
PRINT '=== Current FK Constraints on PatternCavityMaster ===';
PRINT '';

SELECT 
    fk.name AS ConstraintName,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn,
    fk.delete_referential_action_desc AS DeleteAction,
    fk.update_referential_action_desc AS UpdateAction
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fkc 
    ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'PatternCavityMaster'
ORDER BY fk.name;

PRINT '';
PRINT '=== Current FK Constraints on SleeveMaster ===';
PRINT '';

SELECT 
    fk.name AS ConstraintName,
    OBJECT_NAME(fk.parent_object_id) AS TableName,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS ColumnName,
    OBJECT_NAME(fk.referenced_object_id) AS ReferencedTable,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ReferencedColumn,
    fk.delete_referential_action_desc AS DeleteAction,
    fk.update_referential_action_desc AS UpdateAction
FROM sys.foreign_keys AS fk
INNER JOIN sys.foreign_key_columns AS fkc 
    ON fk.object_id = fkc.constraint_object_id
WHERE OBJECT_NAME(fk.parent_object_id) = 'SleeveMaster'
ORDER BY fk.name;
