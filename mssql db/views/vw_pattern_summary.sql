-- ============================================
-- SQL VIEW: vw_Pattern_Summary
-- ============================================
-- Purpose: Provides unified pattern data with aggregated parts and sleeves counts
-- Compatible with SQL Server 2008 R2+
-- Uses subqueries to avoid Cartesian product issues
-- ============================================

-- Drop existing view if it exists
IF OBJECT_ID('vw_Pattern_Summary', 'V') IS NOT NULL
    DROP VIEW vw_Pattern_Summary;
GO

CREATE VIEW vw_Pattern_Summary
AS
SELECT
    pm.PatternId,
    pm.PatternNo,
    pm.Customer,
    pm.Serial_No,
    pm.date AS PatternDate,
    c.CustName AS CustomerName,
    s.SupName AS Pattern_Maker_Name,
    pm.Box_Per_Heat,
    pm.Total_Weight,
    pm.Moulding_Box_Size,
    pm.Bunch_Wt,
    pm.YieldPercent,
    pm.Rack_Location,
    pm.Asset_No,
    pm.Customer_Po_No,
    
    -- Parts/Cavity aggregation using subqueries (no Cartesian product)
    (SELECT COUNT(*) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalParts,
    (SELECT SUM(ISNULL(Qty, 0)) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalPartQty,
    (SELECT SUM(ISNULL(Weight, 0)) FROM PatternCavityMaster WHERE PatternId = pm.PatternId) AS TotalPartWeight,
    
    -- Sleeve aggregation using subqueries (no Cartesian product)
    (SELECT COUNT(*) FROM SleeveMaster WHERE PatternId = pm.PatternId) AS TotalSleeveTypes,
    (SELECT SUM(ISNULL(quantity, 0)) FROM SleeveMaster WHERE PatternId = pm.PatternId) AS TotalSleeveQty

FROM PatternMaster pm
LEFT JOIN Customer c ON pm.Customer = c.CustId
LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId;
GO

PRINT 'View vw_Pattern_Summary created successfully';
GO
