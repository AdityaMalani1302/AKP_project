-- Migration Script: Update PlanningEntry PartNo and SleeveRequirement SleeveType from name strings to IDs
-- Run this once to normalize existing data

USE [IcSoftVer3]
GO

-- 1. Update PlanningEntry.PartNo from InternalPartNo string to ProdId
-- Only updates rows where PartNo matches InternalPartNo
UPDATE pe SET pe.PartNo = p.ProdId
FROM PlanningEntry pe
INNER JOIN Product p ON LTRIM(RTRIM(p.InternalPartNo)) = LTRIM(RTRIM(pe.PartNo))
WHERE ISNUMERIC(pe.PartNo) = 0;

-- 2. Update SleeveRequirement.SleeveType from RawMatName to RawMatID
-- Only updates rows where SleeveType matches RawMatName
UPDATE sr SET sr.SleeveType = CAST(rm.RawMatID AS NVARCHAR(255))
FROM SleeveRequirement sr
INNER JOIN RawMaterial rm ON LTRIM(RTRIM(rm.RawMatName)) = LTRIM(RTRIM(sr.SleeveType))
WHERE ISNUMERIC(sr.SleeveType) = 0;

-- Verification queries (optional)
-- SELECT 'PlanningEntry' AS TableName, COUNT(*) AS TotalRecords, 
--        SUM(CASE WHEN ISNUMERIC(PartNo) = 1 THEN 1 ELSE 0 END) AS NumericPartNo 
-- FROM PlanningEntry;
-- SELECT 'SleeveRequirement' AS TableName, COUNT(*) AS TotalRecords,
--        SUM(CASE WHEN ISNUMERIC(SleeveType) = 1 THEN 1 ELSE 0 END) AS NumericSleeveType
-- FROM SleeveRequirement;

PRINT 'Planning Entry and Sleeve Requirement migration completed'
GO
