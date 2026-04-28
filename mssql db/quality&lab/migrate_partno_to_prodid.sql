-- Migration Script: Update Quality Lab tables PartNo from InternalPartNo string to ProdId
-- Run this once to normalize existing data

USE [IcSoftVer3]
GO

-- 1. Update Lab_PhysicalProperties
UPDATE lp SET lp.PartNo = p.ProdId
FROM Lab_PhysicalProperties lp
INNER JOIN Product p ON LTRIM(RTRIM(p.InternalPartNo)) = LTRIM(RTRIM(lp.PartNo))
WHERE ISNUMERIC(lp.PartNo) = 0;  -- Only update string-based PartNo (not already numeric)

-- 2. Update Lab_Micro
UPDATE lm SET lm.PartNo = p.ProdId
FROM Lab_Micro lm
INNER JOIN Product p ON LTRIM(RTRIM(p.InternalPartNo)) = LTRIM(RTRIM(lm.PartNo))
WHERE ISNUMERIC(lm.PartNo) = 0;

-- 3. Update Lab_Sand
UPDATE ls SET ls.PartNo = p.ProdId
FROM Lab_Sand ls
INNER JOIN Product p ON LTRIM(RTRIM(p.InternalPartNo)) = LTRIM(RTRIM(ls.PartNo))
WHERE ISNUMERIC(ls.PartNo) = 0;

-- 4. Update Lab_Spectro
UPDATE lsp SET lsp.PartNo = p.ProdId
FROM Lab_Spectro lsp
INNER JOIN Product p ON LTRIM(RTRIM(p.InternalPartNo)) = LTRIM(RTRIM(lsp.PartNo))
WHERE ISNUMERIC(lsp.PartNo) = 0;

-- 5. Update MouldHardness
UPDATE mh SET mh.PartNo = p.ProdId
FROM MouldHardness mh
INNER JOIN Product p ON LTRIM(RTRIM(p.InternalPartNo)) = LTRIM(RTRIM(mh.PartNo))
WHERE ISNUMERIC(mh.PartNo) = 0;

-- Verification queries (optional - run these to see the results)
-- SELECT 'Lab_PhysicalProperties' AS TableName, COUNT(*) AS TotalRecords, SUM(CASE WHEN ISNUMERIC(PartNo) = 1 THEN 1 ELSE 0 END) AS NumericPartNo FROM Lab_PhysicalProperties
-- SELECT 'Lab_Micro' AS TableName, COUNT(*) AS TotalRecords, SUM(CASE WHEN ISNUMERIC(PartNo) = 1 THEN 1 ELSE 0 END) AS NumericPartNo FROM Lab_Micro
-- SELECT 'Lab_Sand' AS TableName, COUNT(*) AS TotalRecords, SUM(CASE WHEN ISNUMERIC(PartNo) = 1 THEN 1 ELSE 0 END) AS NumericPartNo FROM Lab_Sand
-- SELECT 'Lab_Spectro' AS TableName, COUNT(*) AS TotalRecords, SUM(CASE WHEN ISNUMERIC(PartNo) = 1 THEN 1 ELSE 0 END) AS NumericPartNo FROM Lab_Spectro
-- SELECT 'MouldHardness' AS TableName, COUNT(*) AS TotalRecords, SUM(CASE WHEN ISNUMERIC(PartNo) = 1 THEN 1 ELSE 0 END) AS NumericPartNo FROM MouldHardness

PRINT 'Migration completed successfully'
GO
