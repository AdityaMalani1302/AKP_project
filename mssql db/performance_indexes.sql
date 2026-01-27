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
-- Invoice/Sales Tables Indexes (Sales Dashboard)
-- ============================================
-- NOTE: InvoiceQuery is a VIEW, not a table. 
-- Create indexes on underlying tables instead.
-- Common underlying tables: Invoice, InvoiceDetail, etc.
-- Adjust table names based on your actual schema.

-- Index on Invoice table for date-based queries (if table exists)
IF OBJECT_ID('Invoice', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoice_InvDate1' AND object_id = OBJECT_ID('Invoice'))
    BEGIN
        -- Check if column exists before creating index
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoice') AND name = 'InvDate1')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_Invoice_InvDate1 
            ON Invoice (InvDate1);
            PRINT 'Created index: IX_Invoice_InvDate1';
        END
    END

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoice_CustId' AND object_id = OBJECT_ID('Invoice'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoice') AND name = 'CustId')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_Invoice_CustId 
            ON Invoice (CustId);
            PRINT 'Created index: IX_Invoice_CustId';
        END
    END

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Invoice_DateDone' AND object_id = OBJECT_ID('Invoice'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoice') AND name = 'InvDate1')
           AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoice') AND name = 'InvDone')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_Invoice_DateDone 
            ON Invoice (InvDate1, InvDone);
            PRINT 'Created index: IX_Invoice_DateDone';
        END
    END
END
GO

-- Index on InvoiceDetail table (if exists)
IF OBJECT_ID('InvoiceDetail', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_InvoiceDetail_InvoiceId' AND object_id = OBJECT_ID('InvoiceDetail'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('InvoiceDetail') AND name = 'InvoiceId')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_InvoiceDetail_InvoiceId 
            ON InvoiceDetail (InvoiceId);
            PRINT 'Created index: IX_InvoiceDetail_InvoiceId';
        END
    END
END
GO

-- Index on Sales_Invoice table (alternative name, if exists)
IF OBJECT_ID('Sales_Invoice', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Sales_Invoice_InvDate1' AND object_id = OBJECT_ID('Sales_Invoice'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Sales_Invoice') AND name = 'InvDate1')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_Sales_Invoice_InvDate1 
            ON Sales_Invoice (InvDate1);
            PRINT 'Created index: IX_Sales_Invoice_InvDate1';
        END
    END
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
-- Statistics Update (IcSoftVer3)
-- ============================================

PRINT '';
PRINT 'Updating table statistics for query optimizer...';

UPDATE STATISTICS PatternMaster;
IF OBJECT_ID('PatternCavityMaster') IS NOT NULL UPDATE STATISTICS PatternCavityMaster;
IF OBJECT_ID('SleeveMaster') IS NOT NULL UPDATE STATISTICS SleeveMaster;
IF OBJECT_ID('Customer') IS NOT NULL UPDATE STATISTICS Customer;
IF OBJECT_ID('Invoice', 'U') IS NOT NULL UPDATE STATISTICS Invoice;
IF OBJECT_ID('InvoiceDetail', 'U') IS NOT NULL UPDATE STATISTICS InvoiceDetail;
IF OBJECT_ID('Sales_Invoice', 'U') IS NOT NULL UPDATE STATISTICS Sales_Invoice;
IF OBJECT_ID('RawMaterial') IS NOT NULL UPDATE STATISTICS RawMaterial;
IF OBJECT_ID('PlanningEntry') IS NOT NULL UPDATE STATISTICS PlanningEntry;
IF OBJECT_ID('LabMaster') IS NOT NULL UPDATE STATISTICS LabMaster;

PRINT 'Statistics updated for IcSoftVer3.';
GO

-- ============================================
-- ============================================
-- LEDGER DATABASE INDEXES (IcSoftLedgerVer3)
-- ============================================
-- These indexes optimize the Finance Dashboard
-- which queries the transactions table heavily
-- ============================================

USE IcSoftLedgerVer3;
GO

PRINT '';
PRINT '============================================';
PRINT 'Creating Ledger Database Indexes...';
PRINT '============================================';

-- ============================================
-- Transactions Table Indexes (Finance Dashboard)
-- ============================================

-- Primary composite index for date-based finance queries
-- This is the most critical index for Finance Dashboard performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transactions_DatePerformance' AND object_id = OBJECT_ID('transactions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Transactions_DatePerformance 
    ON transactions (TransactionDate, accountid)
    INCLUDE (Amount, DrCr, approved, edited, trtypeno);
    PRINT 'Created index: IX_Transactions_DatePerformance';
END
GO

-- Index for account-based filtering (used in WHERE clauses with accountid)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transactions_AccountId' AND object_id = OBJECT_ID('transactions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Transactions_AccountId 
    ON transactions (accountid)
    INCLUDE (TransactionDate, Amount, DrCr);
    PRINT 'Created index: IX_Transactions_AccountId';
END
GO

-- Index for approved transactions filtering (common WHERE clause filter)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transactions_Approved' AND object_id = OBJECT_ID('transactions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Transactions_Approved 
    ON transactions (approved, edited, trtypeno)
    INCLUDE (TransactionDate, accountid, Amount, DrCr);
    PRINT 'Created index: IX_Transactions_Approved';
END
GO

-- Composite index optimized for Finance Dashboard date range + status filters
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Transactions_FinanceDashboard' AND object_id = OBJECT_ID('transactions'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Transactions_FinanceDashboard 
    ON transactions (TransactionDate, approved, edited, trtypeno)
    INCLUDE (accountid, Amount, DrCr);
    PRINT 'Created index: IX_Transactions_FinanceDashboard';
END
GO

-- ============================================
-- Accounts Table Indexes
-- ============================================

-- Index on id for JOIN with transactions
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Accounts_Id' AND object_id = OBJECT_ID('accounts'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Accounts_Id 
    ON accounts (id)
    INCLUDE (accountid, Name);
    PRINT 'Created index: IX_Accounts_Id';
END
GO

-- Index on AccountID for JOIN with accountheads and WHERE filters
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Accounts_AccountID' AND object_id = OBJECT_ID('accounts'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Accounts_AccountID 
    ON accounts (AccountID)
    INCLUDE (id, Name);
    PRINT 'Created index: IX_Accounts_AccountID';
END
GO

-- ============================================
-- AccountHeads Table Indexes
-- ============================================

-- Index on AccountID for JOIN operations
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AccountHeads_AccountID' AND object_id = OBJECT_ID('accountheads'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_AccountHeads_AccountID 
    ON accountheads (AccountID)
    INCLUDE (AccountName);
    PRINT 'Created index: IX_AccountHeads_AccountID';
END
GO

-- ============================================
-- AR Dashboard Indexes (Ledger Database)
-- ============================================
-- AccountReceivables view uses: transactions, accounts, 
-- accountheads, adjustment, transactiontype
-- CustomerRecovery view uses: TransactionsQuery, Adjustment

-- Index on Adjustment table for AR calculations
IF OBJECT_ID('Adjustment', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Adjustment_TransactionID' AND object_id = OBJECT_ID('Adjustment'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Adjustment_TransactionID 
        ON Adjustment (TransactionID)
        INCLUDE (AdAmount, AdTransactionID);
        PRINT 'Created index: IX_Adjustment_TransactionID';
    END

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Adjustment_AdTransactionID' AND object_id = OBJECT_ID('Adjustment'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Adjustment_AdTransactionID 
        ON Adjustment (AdTransactionID)
        INCLUDE (AdAmount, TransactionID);
        PRINT 'Created index: IX_Adjustment_AdTransactionID';
    END
END
GO

-- Index on TransactionsQuery for CustomerRecovery view
IF OBJECT_ID('TransactionsQuery', 'V') IS NULL AND OBJECT_ID('TransactionsQuery', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TransactionsQuery_DateApproved' AND object_id = OBJECT_ID('TransactionsQuery'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('TransactionsQuery') AND name = 'TransactionDate')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_TransactionsQuery_DateApproved 
            ON TransactionsQuery (TransactionDate, Approved)
            INCLUDE (TransactionType, TransactionNumber, TransactionID, DrCr, OLevelID, AccountID);
            PRINT 'Created index: IX_TransactionsQuery_DateApproved';
        END
    END
END
GO

-- Index on TransactionType table
IF OBJECT_ID('transactiontype', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TransactionType_TrTypeNo' AND object_id = OBJECT_ID('transactiontype'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TransactionType_TrTypeNo 
        ON transactiontype (transtypeno);
        PRINT 'Created index: IX_TransactionType_TrTypeNo';
    END
END
GO

-- ============================================
-- Statistics Update (Ledger Database)
-- ============================================

PRINT '';
PRINT 'Updating table statistics for Ledger database...';

IF OBJECT_ID('transactions') IS NOT NULL UPDATE STATISTICS transactions;
IF OBJECT_ID('accounts') IS NOT NULL UPDATE STATISTICS accounts;
IF OBJECT_ID('accountheads') IS NOT NULL UPDATE STATISTICS accountheads;
IF OBJECT_ID('Adjustment') IS NOT NULL UPDATE STATISTICS Adjustment;
IF OBJECT_ID('transactiontype') IS NOT NULL UPDATE STATISTICS transactiontype;

PRINT 'Statistics updated for IcSoftLedgerVer3.';
GO

-- ============================================
-- ============================================
-- PRODUCTION DASHBOARD INDEXES (IcSoftVer3)
-- ============================================
-- MeltingDashboard uses: ProdnForgingStages, Machine, RawMaterial
-- ProductionDashboard uses: View_productionSummary (underlying tables)
-- ============================================

USE IcSoftVer3;
GO

PRINT '';
PRINT '============================================';
PRINT 'Creating Production Dashboard Indexes...';
PRINT '============================================';

-- ============================================
-- ProdnForgingStages Indexes (Melting Dashboard)
-- ============================================

IF OBJECT_ID('ProdnForgingStages', 'U') IS NOT NULL
BEGIN
    -- Index on StgDate for date-based filtering
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProdnForgingStages_StgDate' AND object_id = OBJECT_ID('ProdnForgingStages'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ProdnForgingStages_StgDate 
        ON ProdnForgingStages (StgDate)
        INCLUDE (GroupBatchNo, OkWt, ProdID, MachID);
        PRINT 'Created index: IX_ProdnForgingStages_StgDate';
    END

    -- Index on ProdID for JOIN with RawMaterial
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProdnForgingStages_ProdID' AND object_id = OBJECT_ID('ProdnForgingStages'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ProdnForgingStages_ProdID 
        ON ProdnForgingStages (ProdID);
        PRINT 'Created index: IX_ProdnForgingStages_ProdID';
    END

    -- Index on MachID for JOIN with Machine
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProdnForgingStages_MachID' AND object_id = OBJECT_ID('ProdnForgingStages'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ProdnForgingStages_MachID 
        ON ProdnForgingStages (MachID);
        PRINT 'Created index: IX_ProdnForgingStages_MachID';
    END

    -- Composite index for Melting Dashboard query
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_ProdnForgingStages_MeltingDashboard' AND object_id = OBJECT_ID('ProdnForgingStages'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_ProdnForgingStages_MeltingDashboard 
        ON ProdnForgingStages (StgDate, ProdID)
        INCLUDE (GroupBatchNo, OkWt, MachID);
        PRINT 'Created index: IX_ProdnForgingStages_MeltingDashboard';
    END
END
GO

-- ============================================
-- Machine Table Indexes
-- ============================================

IF OBJECT_ID('Machine', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Machine_MachID' AND object_id = OBJECT_ID('Machine'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Machine_MachID 
        ON Machine (MachID)
        INCLUDE (MachName);
        PRINT 'Created index: IX_Machine_MachID';
    END
END
GO

-- ============================================
-- RawMaterial Indexes for Melting Dashboard
-- ============================================

IF OBJECT_ID('RawMaterial', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_RawMaterial_GrnTypeId' AND object_id = OBJECT_ID('RawMaterial'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_RawMaterial_GrnTypeId 
        ON RawMaterial (GrnTypeId)
        INCLUDE (RawMatID, RawMatName, RawMatCode);
        PRINT 'Created index: IX_RawMaterial_GrnTypeId';
    END
END
GO

-- ============================================
-- AR Dashboard Indexes (IcSoftVer3)
-- ============================================
-- AccountReceivables also uses Customer, CustomerCrPeriod,
-- AgingTypeDetail tables from IcSoftVer3

-- Index on Customer.AccID for JOIN with transactions
IF OBJECT_ID('Customer', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Customer_AccID' AND object_id = OBJECT_ID('Customer'))
    BEGIN
        IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customer') AND name = 'AccID')
        BEGIN
            CREATE NONCLUSTERED INDEX IX_Customer_AccID 
            ON Customer (AccID)
            INCLUDE (CustId, CustName);
            PRINT 'Created index: IX_Customer_AccID';
        END
    END
END
GO

-- Index on CustomerCrPeriod for credit period lookups
IF OBJECT_ID('CustomerCrPeriod', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_CustomerCrPeriod_CustomerId' AND object_id = OBJECT_ID('CustomerCrPeriod'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_CustomerCrPeriod_CustomerId 
        ON CustomerCrPeriod (CustomerId)
        INCLUDE (CreditPeriod);
        PRINT 'Created index: IX_CustomerCrPeriod_CustomerId';
    END
END
GO

-- Index on AgingTypeDetail for aging calculations
IF OBJECT_ID('AgingTypeDetail', 'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AgingTypeDetail_Type' AND object_id = OBJECT_ID('AgingTypeDetail'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_AgingTypeDetail_Type 
        ON AgingTypeDetail (type)
        INCLUDE (start, endto, id, olevelid);
        PRINT 'Created index: IX_AgingTypeDetail_Type';
    END
END
GO

-- ============================================
-- Statistics Update (Production & AR tables)
-- ============================================

PRINT '';
PRINT 'Updating table statistics for Production & AR tables...';

IF OBJECT_ID('ProdnForgingStages') IS NOT NULL UPDATE STATISTICS ProdnForgingStages;
IF OBJECT_ID('Machine') IS NOT NULL UPDATE STATISTICS Machine;
IF OBJECT_ID('CustomerCrPeriod') IS NOT NULL UPDATE STATISTICS CustomerCrPeriod;
IF OBJECT_ID('AgingTypeDetail') IS NOT NULL UPDATE STATISTICS AgingTypeDetail;

PRINT 'Statistics updated.';

PRINT '';
PRINT '============================================';
PRINT 'All indexes created successfully!';
PRINT '============================================';
GO
