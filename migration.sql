-- Migration Script for Pattern Master Update

-- 1. Add new columns to PatternMaster table if they don't exist
IF COL_LENGTH('PatternMaster', 'Asset_No') IS NULL ALTER TABLE PatternMaster ADD Asset_No VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Tooling_PO_Date') IS NULL ALTER TABLE PatternMaster ADD Tooling_PO_Date DATE;
IF COL_LENGTH('PatternMaster', 'Purchase_No') IS NULL ALTER TABLE PatternMaster ADD Purchase_No VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Purchase_Date') IS NULL ALTER TABLE PatternMaster ADD Purchase_Date DATE;
IF COL_LENGTH('PatternMaster', 'Quoted_Estimated_Weight') IS NULL ALTER TABLE PatternMaster ADD Quoted_Estimated_Weight VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Pattern_Material_Details') IS NULL ALTER TABLE PatternMaster ADD Pattern_Material_Details VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'No_Of_Patterns_Set') IS NULL ALTER TABLE PatternMaster ADD No_Of_Patterns_Set VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Pattern_Pieces') IS NULL ALTER TABLE PatternMaster ADD Pattern_Pieces VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Core_Box_Material_Details') IS NULL ALTER TABLE PatternMaster ADD Core_Box_Material_Details VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Core_Box_Location') IS NULL ALTER TABLE PatternMaster ADD Core_Box_Location VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Core_Box_S7_F4_No_Date') IS NULL ALTER TABLE PatternMaster ADD Core_Box_S7_F4_No_Date VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'No_Of_Core_Box_Set') IS NULL ALTER TABLE PatternMaster ADD No_Of_Core_Box_Set VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Core_Box_Pieces') IS NULL ALTER TABLE PatternMaster ADD Core_Box_Pieces VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Casting_Material_Grade') IS NULL ALTER TABLE PatternMaster ADD Casting_Material_Grade VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Actual_Casting_Weight') IS NULL ALTER TABLE PatternMaster ADD Actual_Casting_Weight VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Core_Type') IS NULL ALTER TABLE PatternMaster ADD Core_Type VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Main_Core') IS NULL ALTER TABLE PatternMaster ADD Main_Core VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Side_Core') IS NULL ALTER TABLE PatternMaster ADD Side_Core VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Loose_Core') IS NULL ALTER TABLE PatternMaster ADD Loose_Core VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Chaplets_COPE') IS NULL ALTER TABLE PatternMaster ADD Chaplets_COPE VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Chaplets_DRAG') IS NULL ALTER TABLE PatternMaster ADD Chaplets_DRAG VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Chills_COPE') IS NULL ALTER TABLE PatternMaster ADD Chills_COPE VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Chills_DRAG') IS NULL ALTER TABLE PatternMaster ADD Chills_DRAG VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Mould_Vents_Size') IS NULL ALTER TABLE PatternMaster ADD Mould_Vents_Size VARCHAR(255);
IF COL_LENGTH('PatternMaster', 'Mould_Vents_No') IS NULL ALTER TABLE PatternMaster ADD Mould_Vents_No VARCHAR(255);

-- 2. Create PatternParts table if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternCavityMaster')
BEGIN
    CREATE TABLE PatternCavityMaster (
        PartRowId INT IDENTITY(1,1) PRIMARY KEY,
        PatternId NUMERIC(18, 0),
        PartNo INT,
        ProductName NVARCHAR(255),
        Qty INT,
        Weight DECIMAL(18,2),
        FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
    );
END
