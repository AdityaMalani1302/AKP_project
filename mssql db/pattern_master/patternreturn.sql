-- Create PatternReturnHistory table
CREATE TABLE PatternReturnHistory (
    ReturnId INT IDENTITY(1,1) PRIMARY KEY,
    PatternId INT NOT NULL,
    PatternNo VARCHAR(255),
    PatternName VARCHAR(255),
    Customer INT,
    ReturnChallanNo VARCHAR(255),
    ReturnDate DATE,
    Description VARCHAR(1000),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Create PatternReturnParts table
CREATE TABLE PatternReturnParts (
    ReturnPartId INT IDENTITY(1,1) PRIMARY KEY,
    ReturnId INT NOT NULL,
    PartRowId INT,
    PartNo INT,
    ProductName VARCHAR(255),
    FOREIGN KEY (ReturnId) REFERENCES PatternReturnHistory(ReturnId)
);