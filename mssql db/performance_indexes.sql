-- ============================================
-- Performance Optimization: Database Indexes
-- ============================================
-- Run this script in SQL Server Management Studio
-- against the IcSoftVer3 database
--
-- These indexes improve query performance for
-- commonly accessed tables and columns.
-- ============================================

USE IcSoftVer3;
GO

-- ============================================
-- PatternMaster Indexes
-- ============================================

-- Index on Customer for JOIN operations
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PatternMaster_Customer' AND object_id = OBJECT_ID('PatternMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatternMaster_Customer 
    ON PatternMaster (Customer);
    PRINT 'Created index: IX_PatternMaster_Customer';
END
GO

-- Index on Pattern_Maker for JOIN operations
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PatternMaster_PatternMaker' AND object_id = OBJECT_ID('PatternMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatternMaster_PatternMaker 
    ON PatternMaster (Pattern_Maker);
    PRINT 'Created index: IX_PatternMaster_PatternMaker';
END
GO

-- Index on PatternNo for search operations
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PatternMaster_PatternNo' AND object_id = OBJECT_ID('PatternMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatternMaster_PatternNo 
    ON PatternMaster (PatternNo);
    PRINT 'Created index: IX_PatternMaster_PatternNo';
END
GO

-- Index on Serial_No for search operations  
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PatternMaster_SerialNo' AND object_id = OBJECT_ID('PatternMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatternMaster_SerialNo 
    ON PatternMaster (Serial_No);
    PRINT 'Created index: IX_PatternMaster_SerialNo';
END
GO

-- ============================================
-- PatternCavityMaster Indexes
-- ============================================

-- Index on PatternId for subquery lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PatternCavityMaster_PatternId' AND object_id = OBJECT_ID('PatternCavityMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PatternCavityMaster_PatternId 
    ON PatternCavityMaster (PatternId)
    INCLUDE (Qty, Weight, MaterialGrade);
    PRINT 'Created index: IX_PatternCavityMaster_PatternId';
END
GO

-- ============================================
-- SleeveMaster Indexes
-- ============================================

-- Index on PatternId for subquery lookups
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SleeveMaster_PatternId' AND object_id = OBJECT_ID('SleeveMaster'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_SleeveMaster_PatternId 
    ON SleeveMaster (PatternId)
    INCLUDE (sleeve_name, sleeve_type_size, quantity);
    PRINT 'Created index: IX_SleeveMaster_PatternId';
END
GO

-- ============================================
-- Customer Indexes
-- ============================================

-- Index on CustName for search operations
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customer_CustName' AND object_id = OBJECT_ID('Customer'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Customer_CustName 
    ON Customer (CustName);
    PRINT 'Created index: IX_Customer_CustName';
END
GO

-- Index on CTypeID for dashboard queries (Customer Type)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customer_CTypeID' AND object_id = OBJECT_ID('Customer'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Customer_CTypeID 
    ON Customer (CTypeID)
    INCLUDE (CustName);
    PRINT 'Created index: IX_Customer_CTypeID';
END
GO

-- ============================================
-- InvoiceQuery Indexes (Sales Dashboard)
-- ============================================

-- Composite index for date-based dashboard queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceQuery_DatePerformance' AND object_id = OBJECT_ID('InvoiceQuery'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceQuery_DatePerformance 
    ON InvoiceQuery (InvDate1, InvDone)
    INCLUDE (CustId, ProdId, DespatchQty, ALTUOMDespQty, Price, Disc, Pack, ExRate);
    PRINT 'Created index: IX_InvoiceQuery_DatePerformance';
END
GO

-- Index for customer-based grouping queries (top customers report)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceQuery_CustomerAgg' AND object_id = OBJECT_ID('InvoiceQuery'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceQuery_CustomerAgg 
    ON InvoiceQuery (CustId, InvDone)
    INCLUDE (InvDate1, DespatchQty, Price);
    PRINT 'Created index: IX_InvoiceQuery_CustomerAgg';
END
GO

-- Single column indexes for simpler queries
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceQuery_InvDate1' AND object_id = OBJECT_ID('InvoiceQuery'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceQuery_InvDate1 
    ON InvoiceQuery (InvDate1);
    PRINT 'Created index: IX_InvoiceQuery_InvDate1';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceQuery_CustId' AND object_id = OBJECT_ID('InvoiceQuery'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_InvoiceQuery_CustId 
    ON InvoiceQuery (CustId);
    PRINT 'Created index: IX_InvoiceQuery_CustId';
END
GO

-- ============================================
-- Lab Tables Indexes (Quality & Lab)
-- ============================================

-- LabMaster - Date index
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'LabMaster')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LabMaster_Date' AND object_id = OBJECT_ID('LabMaster'))
    BEGIN
        -- Check if Date column exists before creating index (just in case)
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LabMaster') AND name = 'Date')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_LabMaster_Date ON LabMaster(Date);
            PRINT 'Created index: IX_LabMaster_Date';
        END
        ELSE IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LabMaster') AND name = 'CreatedAt')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_LabMaster_CreatedAt ON LabMaster(CreatedAt);
            PRINT 'Created index: IX_LabMaster_CreatedAt';
        END
    END

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LabMaster_HeatNo' AND object_id = OBJECT_ID('LabMaster'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('LabMaster') AND name = 'HeatNo')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_LabMaster_HeatNo ON LabMaster(HeatNo);
            PRINT 'Created index: IX_LabMaster_HeatNo';
        END
    END
END
GO

-- Lab_Spectro (Chemistry) - HeatNo for search
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Lab_Spectro')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Lab_Spectro_HeatNo' AND object_id = OBJECT_ID('Lab_Spectro'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Lab_Spectro_HeatNo 
        ON Lab_Spectro (HeatNo);
        PRINT 'Created index: IX_Lab_Spectro_HeatNo';
    END
END
GO

-- Lab_Sand - Date index
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'Lab_Sand')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Lab_Sand_Date' AND object_id = OBJECT_ID('Lab_Sand'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Lab_Sand_Date 
        ON Lab_Sand (Date);
        PRINT 'Created index: IX_Lab_Sand_Date';
    END
END
GO

-- MouldHardness - Date index
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'MouldHardness')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_MouldHardness_Date' AND object_id = OBJECT_ID('MouldHardness'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_MouldHardness_Date 
        ON MouldHardness (Date);
        PRINT 'Created index: IX_MouldHardness_Date';
    END
END
GO

-- ============================================
-- PlanningEntry Indexes
-- ============================================

-- Index on Pattern for JOIN operations
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanningEntry_PatternId' AND object_id = OBJECT_ID('PlanningEntry'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PlanningEntry_PatternId 
    ON PlanningEntry (PatternId);
    PRINT 'Created index: IX_PlanningEntry_PatternId';
END
GO

-- Index on PlanDate for date-based filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanningEntry_PlanDate' AND object_id = OBJECT_ID('PlanningEntry'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_PlanningEntry_PlanDate 
    ON PlanningEntry (PlanDate);
    PRINT 'Created index: IX_PlanningEntry_PlanDate';
END
GO

-- ============================================
-- RawMaterial Indexes
-- ============================================

-- Index for weight lookups (used in sales calculations)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RawMaterial_Weight' AND object_id = OBJECT_ID('RawMaterial'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_RawMaterial_Weight 
    ON RawMaterial (RawMatID)
    INCLUDE (Weight);
    PRINT 'Created index: IX_RawMaterial_Weight';
END
GO

-- ============================================
-- Supplier Indexes
-- ============================================

-- Index for supplier name search
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invent_Supplier_SupName' AND object_id = OBJECT_ID('Invent_Supplier'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Invent_Supplier_SupName 
    ON Invent_Supplier (SupName);
    PRINT 'Created index: IX_Invent_Supplier_SupName';
END
GO

-- ============================================
-- Product Indexes
-- ============================================

-- Index for InternalPartNo search (if column exists)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Product' AND COLUMN_NAME = 'InternalPartNo')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Product_InternalPartNo' AND object_id = OBJECT_ID('Product'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Product_InternalPartNo 
        ON Product (InternalPartNo);
        PRINT 'Created index: IX_Product_InternalPartNo';
    END
END
GO

-- ============================================
-- Statistics Update
-- ============================================

PRINT '';
PRINT 'Updating table statistics for query optimizer...';

UPDATE STATISTICS PatternMaster;
IF OBJECT_ID('PatternCavityMaster') IS NOT NULL UPDATE STATISTICS PatternCavityMaster;
IF OBJECT_ID('SleeveMaster') IS NOT NULL UPDATE STATISTICS SleeveMaster;
IF OBJECT_ID('Customer') IS NOT NULL UPDATE STATISTICS Customer;
IF OBJECT_ID('InvoiceQuery') IS NOT NULL UPDATE STATISTICS InvoiceQuery;
IF OBJECT_ID('RawMaterial') IS NOT NULL UPDATE STATISTICS RawMaterial;
IF OBJECT_ID('PlanningEntry') IS NOT NULL UPDATE STATISTICS PlanningEntry;
IF OBJECT_ID('LabMaster') IS NOT NULL UPDATE STATISTICS LabMaster;

PRINT 'Statistics updated.';

PRINT '';
PRINT '============================================';
PRINT 'All indexes created successfully!';
PRINT '============================================';
GO
