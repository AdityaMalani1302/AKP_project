-- Migration Script: Reorganize PatternMaster Table
-- Date: 2025-12-04
-- Description: Final table structure with all required columns

-- This script adds missing columns and documents the final PatternMaster structure
-- Run the individual migration scripts first, or run this comprehensive one

-- Add missing columns if they don't exist

-- Core quantity columns (shell, coldBox, noBake already added)
IF COL_LENGTH('PatternMaster', 'shell_qty') IS NULL
    ALTER TABLE PatternMaster ADD shell_qty INT NULL;

IF COL_LENGTH('PatternMaster', 'coldBox_qty') IS NULL
    ALTER TABLE PatternMaster ADD coldBox_qty INT NULL;

IF COL_LENGTH('PatternMaster', 'noBake_qty') IS NULL
    ALTER TABLE PatternMaster ADD noBake_qty INT NULL;

-- Moulding section columns
IF COL_LENGTH('PatternMaster', 'breaker_core_size') IS NULL
    ALTER TABLE PatternMaster ADD breaker_core_size VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'down_sprue_size') IS NULL
    ALTER TABLE PatternMaster ADD down_sprue_size VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'foam_filter_size') IS NULL
    ALTER TABLE PatternMaster ADD foam_filter_size VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'sand_riser_size') IS NULL
    ALTER TABLE PatternMaster ADD sand_riser_size VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'no_of_sand_riser') IS NULL
    ALTER TABLE PatternMaster ADD no_of_sand_riser VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'sand_riser_ingate_size') IS NULL
    ALTER TABLE PatternMaster ADD sand_riser_ingate_size VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'no_of_ingate') IS NULL
    ALTER TABLE PatternMaster ADD no_of_ingate VARCHAR(255) NULL;

-- Additional information columns
IF COL_LENGTH('PatternMaster', 'rev_no_status') IS NULL
    ALTER TABLE PatternMaster ADD rev_no_status VARCHAR(255) NULL;

IF COL_LENGTH('PatternMaster', 'date') IS NULL
    ALTER TABLE PatternMaster ADD [date] DATE NULL;

IF COL_LENGTH('PatternMaster', 'comment') IS NULL
    ALTER TABLE PatternMaster ADD [comment] VARCHAR(8000) NULL;

PRINT 'Migration completed: PatternMaster table structure updated';
PRINT '';
PRINT 'FINAL PATTERNMASTER TABLE STRUCTURE (41 columns):';
PRINT '1. PatternId (PRIMARY KEY)';
PRINT '2. PatternNo';
PRINT '3. Customer';
PRINT '4. Part_No';
PRINT '5. Product_Name';
PRINT '6. No_Of_Cavities';
PRINT '7. Total_Weight';
PRINT '8. Asset_No';
PRINT '9. Customer_Po_No';
PRINT '10. Tooling_PO_Date';
PRINT '11. Purchase_No';
PRINT '12. Purchase_Date';
PRINT '13. Quoted_Estimated_Weight';
PRINT '14. Pattern_Maker';
PRINT '15. Pattern_Material_Details';
PRINT '16. No_Of_Patterns_Set';
PRINT '17. Pattern_Pieces';
PRINT '18. Rack_Location';
PRINT '19. Core_Box_Material_Details';
PRINT '20. Core_Box_Location';
PRINT '21. Core_Box_S7_F4_No';
PRINT '22. Core_Box_S7_F4_Date';
PRINT '23. No_Of_Core_Box_Set';
PRINT '24. Core_Box_Pieces';
PRINT '25. Core_Wt';
PRINT '26. shell_qty';
PRINT '27. coldBox_qty';
PRINT '28. noBake_qty';
PRINT '29. Main_Core';
PRINT '30. Side_Core';
PRINT '31. Loose_Core';
PRINT '32. Casting_Material_Grade';
PRINT '33. Moulding_Box_Size';
PRINT '34. Bunch_Wt';
PRINT '35. YieldPercent';
PRINT '36. Chaplets_COPE';
PRINT '37. Chaplets_DRAG';
PRINT '38. Chills_COPE';
PRINT '39. Chills_DRAG';
PRINT '40. Mould_Vents_Size';
PRINT '41. Mould_Vents_No';
PRINT '42. breaker_core_size';
PRINT '43. down_sprue_size';
PRINT '44. foam_filter_size';
PRINT '45. sand_riser_size';
PRINT '46. no_of_sand_riser';
PRINT '47. sand_riser_ingate_size';
PRINT '48. no_of_ingate';
PRINT '49. rev_no_status';
PRINT '50. date';
PRINT '51. comment';
PRINT '';
PRINT 'NOTE: Legacy columns (core_type_shell, core_type_cold_box, core_type_no_bake, Core_Type) are kept for backward compatibility but not actively used';
