-- Migration Script: Create PatternMaster Table
-- Database: IcSoftVer3

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternMaster')
BEGIN
    CREATE TABLE PatternMaster (
        PatternId NUMERIC(18, 0) IDENTITY(1,1),
        PatternNo VARCHAR(255),
        Customer NUMERIC(18, 0),
        Part_No NUMERIC(18, 0),
        Product_Name NUMERIC(18, 0),
        Box_Per_Heat VARCHAR(255),
        Total_Weight VARCHAR(255),
        Asset_No VARCHAR(255),
        Customer_Po_No VARCHAR(255),
        Tooling_PO_Date DATE,
        Purchase_No VARCHAR(255),
        Purchase_Date DATE,
        Pattern_Received_Date DATE,
        Quoted_Estimated_Weight VARCHAR(255),
        Pattern_Maker NUMERIC(18, 0),
        Pattern_Material_Details VARCHAR(255),
        No_Of_Patterns_Set VARCHAR(255),
        Pattern_Pieces VARCHAR(255),
        Rack_Location VARCHAR(255),
        Core_Box_Material_Details VARCHAR(255),
        Core_Box_Location VARCHAR(255),
        Core_Box_S7_F4_No VARCHAR(255),
        Core_Box_S7_F4_Date DATE,
        No_Of_Core_Box_Set VARCHAR(255),
        Core_Box_Pieces VARCHAR(255),
        Core_Wt VARCHAR(255),
        shell_qty INT,
        coldBox_qty INT,
        noBake_qty INT,
        Main_Core VARCHAR(255),
        Side_Core VARCHAR(255),
        Loose_Core VARCHAR(255),

        Moulding_Box_Size VARCHAR(255),
        Bunch_Wt VARCHAR(255),
        YieldPercent VARCHAR(255),
        Chaplets_COPE VARCHAR(255),
        Chaplets_DRAG VARCHAR(255),
        Chills_COPE VARCHAR(255),
        Chills_DRAG VARCHAR(255),
        Mould_Vents_Size VARCHAR(255),
        Mould_Vents_No VARCHAR(255),
        breaker_core_size VARCHAR(255),
        down_sprue_size VARCHAR(255),
        foam_filter_size VARCHAR(255),
        sand_riser_size VARCHAR(255),
        no_of_sand_riser VARCHAR(255),
        ingate_size VARCHAR(255),
        no_of_ingate VARCHAR(255),
        rev_no_status VARCHAR(255),
        date DATE,
        comment VARCHAR(8000),
        Core_Type VARCHAR(255),
        mainCore_qty VARCHAR(255),
        sideCore_qty VARCHAR(255),
        looseCore_qty VARCHAR(255),
        Serial_No VARCHAR(255),
        runner_bar_size VARCHAR(255),
        runner_bar_no VARCHAR(255),
        
        -- Foreign Key Constraints
        -- NOTE: Ensure these reference tables exist. If names differ in your DB, update them here.
        
    CONSTRAINT PK_PatternMaster
        PRIMARY KEY (PatternId),

    CONSTRAINT FK_PatternMaster_Customer
        FOREIGN KEY (Customer)
        REFERENCES Customer (CustId),

    CONSTRAINT FK_PatternMaster_Part
        FOREIGN KEY (Part_No)
        REFERENCES Product (ProdId),

    CONSTRAINT FK_PatternMaster_Product
        FOREIGN KEY (Product_Name)
        REFERENCES Product (ProdId),

    CONSTRAINT FK_PatternMaster_PatternMaker
        FOREIGN KEY (Pattern_Maker)
        REFERENCES Invent_Supplier (SupId)
    );
    PRINT 'PatternMaster table created successfully with Foreign Keys';
END
ELSE
BEGIN
    PRINT 'PatternMaster table already exists';
END
GO
