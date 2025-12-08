-- Complete CREATE TABLE Script for PatternMaster
-- Use this to recreate the table with columns in the correct order
-- WARNING: This will DROP the existing table. Backup your data first!

-- Step 1: Rename old table to backup
IF OBJECT_ID('PatternMaster_Backup', 'U') IS NOT NULL
    DROP TABLE PatternMaster_Backup;

IF OBJECT_ID('PatternMaster', 'U') IS NOT NULL
    EXEC sp_rename 'PatternMaster', 'PatternMaster_Backup';

-- Step 2: Create new PatternMaster table with proper column order
CREATE TABLE PatternMaster (
    -- Primary Key
    PatternId NUMERIC(18, 0) IDENTITY(1,1) PRIMARY KEY,
    
    -- Main Details (1-13)
    PatternNo VARCHAR(255) NULL,
    Customer NUMERIC(18, 0) NULL,
    Part_No NUMERIC(18, 0) NULL,
    Product_Name NUMERIC(18, 0) NULL,
    No_Of_Cavities VARCHAR(255) NULL,
    Total_Weight VARCHAR(255) NULL,
    Asset_No VARCHAR(255) NULL,
    Customer_Po_No VARCHAR(255) NULL,
    Tooling_PO_Date DATE NULL,
    Purchase_No VARCHAR(255) NULL,
    Purchase_Date DATE NULL,
    Quoted_Estimated_Weight VARCHAR(255) NULL,
    Pattern_Maker NUMERIC(18, 0) NULL,
    
    -- Pattern Details (14-17)
    Pattern_Material_Details VARCHAR(255) NULL,
    No_Of_Patterns_Set VARCHAR(255) NULL,
    Pattern_Pieces VARCHAR(255) NULL,
    Rack_Location VARCHAR(255) NULL,
    
    -- Core Box Details (18-23)
    Core_Box_Material_Details VARCHAR(255) NULL,
    Core_Box_Location VARCHAR(255) NULL,
    Core_Box_S7_F4_No VARCHAR(255) NULL,
    Core_Box_S7_F4_Date DATE NULL,
    No_Of_Core_Box_Set VARCHAR(255) NULL,
    Core_Box_Pieces VARCHAR(255) NULL,
    
    -- Core Details (24-30)
    Core_Wt VARCHAR(255) NULL,
    shell_qty INT NULL,
    coldBox_qty INT NULL,
    noBake_qty INT NULL,
    Main_Core VARCHAR(255) NULL,
    Side_Core VARCHAR(255) NULL,
    Loose_Core VARCHAR(255) NULL,
    
    -- Casting Details (31-34)
    Casting_Material_Grade VARCHAR(255) NULL,
    Moulding_Box_Size VARCHAR(255) NULL,
    Bunch_Wt VARCHAR(255) NULL,
    YieldPercent VARCHAR(255) NULL,
    
    -- Chaplets & Chills (35-38)
    Chaplets_COPE VARCHAR(255) NULL,
    Chaplets_DRAG VARCHAR(255) NULL,
    Chills_COPE VARCHAR(255) NULL,
    Chills_DRAG VARCHAR(255) NULL,
    
    -- Mould Vents (39-40)
    Mould_Vents_Size VARCHAR(255) NULL,
    Mould_Vents_No VARCHAR(255) NULL,
    
    -- Moulding Section (41-47)
    breaker_core_size VARCHAR(255) NULL,
    down_sprue_size VARCHAR(255) NULL,
    foam_filter_size VARCHAR(255) NULL,
    sand_riser_size VARCHAR(255) NULL,
    no_of_sand_riser VARCHAR(255) NULL,
    sand_riser_ingate_size VARCHAR(255) NULL,
    no_of_ingate VARCHAR(255) NULL,
    
    -- Additional Information (48-50)
    rev_no_status VARCHAR(255) NULL,
    [date] DATE NULL,
    [comment] VARCHAR(8000) NULL,
    
    -- Legacy Core Type column (kept for backward compatibility)
    Core_Type VARCHAR(255) NULL,
    
    -- Foreign Key Constraints
    CONSTRAINT FK_PatternMaster_Customer FOREIGN KEY (Customer) REFERENCES CustomerMaster(CusId),
    CONSTRAINT FK_PatternMaster_Part FOREIGN KEY (Part_No) REFERENCES PartMaster(PartNo),
    CONSTRAINT FK_PatternMaster_Product FOREIGN KEY (Product_Name) REFERENCES ProductMaster(ProductId),
    CONSTRAINT FK_PatternMaster_PatternMaker FOREIGN KEY (Pattern_Maker) REFERENCES Invent_Supplier(SupId)
);

PRINT 'New PatternMaster table created with proper column order';

-- Step 3: Copy data from backup table
IF OBJECT_ID('PatternMaster_Backup', 'U') IS NOT NULL
BEGIN
    INSERT INTO PatternMaster (
        PatternNo, Customer, Part_No, Product_Name, No_Of_Cavities, Total_Weight,
        Asset_No, Customer_Po_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
        Quoted_Estimated_Weight, Pattern_Maker, Pattern_Material_Details,
        No_Of_Patterns_Set, Pattern_Pieces, Rack_Location,
        Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No,
        Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
        Core_Wt, shell_qty, coldBox_qty, noBake_qty,
        Main_Core, Side_Core, Loose_Core,
        Casting_Material_Grade, Moulding_Box_Size, Bunch_Wt, YieldPercent,
        Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
        Mould_Vents_Size, Mould_Vents_No,
        breaker_core_size, down_sprue_size, foam_filter_size,
        sand_riser_size, no_of_sand_riser, sand_riser_ingate_size, no_of_ingate,
        rev_no_status, [date], [comment],
        Core_Type
    )
    SELECT 
        PatternNo, Customer, Part_No, Product_Name, No_Of_Cavities, Total_Weight,
        Asset_No, Customer_Po_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
        Quoted_Estimated_Weight, Pattern_Maker, Pattern_Material_Details,
        No_Of_Patterns_Set, Pattern_Pieces, Rack_Location,
        Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No,
        Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
        Core_Wt, shell_qty, coldBox_qty, noBake_qty,
        Main_Core, Side_Core, Loose_Core,
        Casting_Material_Grade, Moulding_Box_Size, Bunch_Wt, YieldPercent,
        Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
        Mould_Vents_Size, Mould_Vents_No,
        breaker_core_size, down_sprue_size, foam_filter_size,
        sand_riser_size, no_of_sand_riser, sand_riser_ingate_size, no_of_ingate,
        rev_no_status, [date], [comment],
        Core_Type
    FROM PatternMaster_Backup;
    
    PRINT 'Data copied from backup table';
    PRINT 'Review the new table, then manually drop PatternMaster_Backup if everything is correct';
END

PRINT 'Table reorganization complete!';
PRINT 'Total columns: 54 (54 main columns)';
