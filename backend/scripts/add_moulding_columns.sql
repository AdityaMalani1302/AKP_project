-- Migration Script: Add Moulding Section Columns
-- Date: 2025-12-04
-- Description: Adds moulding-related columns to PatternMaster table

-- Add breaker_core_size column
IF COL_LENGTH('PatternMaster', 'breaker_core_size') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD breaker_core_size VARCHAR(255) NULL;
    PRINT 'Column breaker_core_size added successfully';
END
ELSE
BEGIN
    PRINT 'Column breaker_core_size already exists';
END

-- Add down_sprue_size column
IF COL_LENGTH('PatternMaster', 'down_sprue_size') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD down_sprue_size VARCHAR(255) NULL;
    PRINT 'Column down_sprue_size added successfully';
END
ELSE
BEGIN
    PRINT 'Column down_sprue_size already exists';
END

-- Add foam_filter_size column
IF COL_LENGTH('PatternMaster', 'foam_filter_size') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD foam_filter_size VARCHAR(255) NULL;
    PRINT 'Column foam_filter_size added successfully';
END
ELSE
BEGIN
    PRINT 'Column foam_filter_size already exists';
END

-- Add sand_riser_size column
IF COL_LENGTH('PatternMaster', 'sand_riser_size') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD sand_riser_size VARCHAR(255) NULL;
    PRINT 'Column sand_riser_size added successfully';
END
ELSE
BEGIN
    PRINT 'Column sand_riser_size already exists';
END

-- Add no_of_sand_riser column
IF COL_LENGTH('PatternMaster', 'no_of_sand_riser') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD no_of_sand_riser VARCHAR(255) NULL;
    PRINT 'Column no_of_sand_riser added successfully';
END
ELSE
BEGIN
    PRINT 'Column no_of_sand_riser already exists';
END

-- Add sand_riser_ingate_size column
IF COL_LENGTH('PatternMaster', 'sand_riser_ingate_size') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD sand_riser_ingate_size VARCHAR(255) NULL;
    PRINT 'Column sand_riser_ingate_size added successfully';
END
ELSE
BEGIN
    PRINT 'Column sand_riser_ingate_size already exists';
END

-- Add no_of_ingate column
IF COL_LENGTH('PatternMaster', 'no_of_ingate') IS NULL
BEGIN
    ALTER TABLE PatternMaster ADD no_of_ingate VARCHAR(255) NULL;
    PRINT 'Column no_of_ingate added successfully';
END
ELSE
BEGIN
    PRINT 'Column no_of_ingate already exists';
END

PRINT 'Migration completed: All moulding section columns ready';
