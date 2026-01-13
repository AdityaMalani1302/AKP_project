# AKP Project - Database Changes Documentation

**Version:** 1.0  
**Last Updated:** December 2, 2025  
**Database System:** Microsoft SQL Server (WARRIOR\SQLEXPRESS)  
**Primary Database:** IcSoftVer3

---

## 📋 Table of Contents

1. [Database Overview](#database-overview)
2. [Database Configuration Changes](#database-configuration-changes)
3. [Schema Changes Timeline](#schema-changes-timeline)
4. [Table Creation Log](#table-creation-log)
5. [Table Modifications Log](#table-modifications-log)
6. [Scripts Repository](#scripts-repository)
7. [Current Database State](#current-database-state)
8. [Migration History](#migration-history)

---

## 🗄 Database Overview

### Connected Databases

The AKP Project manages **4 SQL Server databases** on the same server instance:

| Database Name | Purpose | Status | Connection Pool |
|---------------|---------|--------|-----------------|
| **IcSoftVer3** | Primary application database | Active | ✅ Connected |
| **IcSoftReportVer3** | Reporting and analytics | Active | ✅ Connected |
| **IcSoftLedgerVer3** | Financial ledger operations | Active | ✅ Connected |
| **BizSpot** | Business operations | Active | ✅ Connected |

### Server Configuration

```
Server: WARRIOR\SQLEXPRESS
Authentication: SQL Server Authentication
User: sa
Encryption: Disabled (Trust Server Certificate)
```

---

## 🔧 Database Configuration Changes

### Phase 1: Single Database Configuration (Pre-December 1, 2025)

**Initial State:**
- Single database connection to `IcSoft` (deprecated name)
- Simple connection pool
- No database switching capability

**Configuration File:** `backend/config/db.js`

```javascript
// Initial configuration (deprecated)
const config = {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE  // Single database
};
```

**Environment Variables:**
```env
SQL_DATABASE=IcSoft
```

### Phase 2: Multi-Database Configuration (December 1, 2025)

**Change Type:** ✅ **CONFIGURATION UPGRADE**

**Changes Made:**

1. **Multiple Database Support Added:**
```javascript
const databases = {
    'IcSoftVer3': process.env.DB_NAME_1,
    'IcSoftReportVer3': process.env.DB_NAME_2,
    'IcSoftLedgerVer3': process.env.DB_NAME_3,
    'BizSpot': process.env.DB_NAME_4
};
```

2. **Connection Pool Per Database:**
```javascript
const pools = {};

const connectSQL = async () => {
    try {
        for (const [key, dbName] of Object.entries(databases)) {
            const config = {
                ...dbConfig,
                database: dbName
            };
            const pool = new sql.ConnectionPool(config);
            await pool.connect();
            pools[key] = pool;
            console.log(`Connected to SQL Server Database: ${dbName}`);
        }
    } catch (err) {
        console.error('SQL Server Connection Failed:', err);
    }
};
```

3. **Dynamic Pool Retrieval:**
```javascript
const getPool = (dbName) => {
    if (pools[dbName]) {
        return pools[dbName];
    }
    return null; // Returns null if database not found
};
```

**Updated Environment Variables:**
```env
# Deprecated
# SQL_DATABASE=IcSoft

# New Multi-Database Configuration
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
DB_NAME_4=BizSpot
```

**Impact:**
- ✅ Enabled simultaneous connections to 4 databases
- ✅ Request-level database selection via headers/query params
- ✅ Independent connection pools for performance
- ✅ Backward compatibility maintained (defaults to IcSoftVer3)

---

## 📅 Schema Changes Timeline

### November 28, 2025 - Initial Database Setup

**Objective:** SQL to MongoDB Converter (Initial Concept)

#### Change 1.1: SQLQueries Table Creation

**Script:** `backend/scripts/setup_db.js`  
**Database:** IcSoftVer3  
**Change Type:** ✅ **TABLE CREATION**

```sql
CREATE TABLE SQLQueries (
    id INT PRIMARY KEY IDENTITY(1,1),
    query_text NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE()
)
```

**Purpose:** Store SQL queries for conversion to MongoDB  
**Status:** Created (legacy feature, retained for reference)

**Sample Data Inserted:**
```sql
INSERT INTO SQLQueries (query_text) VALUES 
('SELECT * FROM Users WHERE age > 25'),
('SELECT name, email FROM Users WHERE role = ''admin'''),
('SELECT u.name, o.order_date FROM Users u JOIN Orders o ON u.id = o.user_id'),
('SELECT category, COUNT(*) FROM Products GROUP BY category')
```

#### Change 1.2: Seed Tables Creation (Development)

**Script:** `backend/scripts/seed_tables.js`  
**Database:** IcSoftVer3  
**Change Type:** ✅ **TABLE CREATION** (Development/Testing)

**Tables Created:**

**Users Table (Legacy - Development Only):**
```sql
CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100),
    email NVARCHAR(100),
    age INT,
    role NVARCHAR(50)
)
```

**Sample Data:**
```sql
INSERT INTO Users (name, email, age, role) VALUES 
('Alice', 'alice@example.com', 30, 'admin'),
('Bob', 'bob@example.com', 22, 'user'),
('Charlie', 'charlie@example.com', 28, 'user')
```

**Products Table (Development Only):**
```sql
CREATE TABLE Products (
    id INT PRIMARY KEY IDENTITY(1,1),
    name NVARCHAR(100),
    category NVARCHAR(50),
    price DECIMAL(10, 2)
)
```

**Sample Data:**
```sql
INSERT INTO Products (name, category, price) VALUES 
('Laptop', 'Electronics', 1200.00),
('Mouse', 'Electronics', 25.00),
('Chair', 'Furniture', 150.00),
('Desk', 'Furniture', 300.00)
```

**Orders Table (Development Only):**
```sql
CREATE TABLE Orders (
    id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    order_date DATETIME DEFAULT GETDATE(),
    total DECIMAL(10, 2)
)
```

**Sample Data:**
```sql
INSERT INTO Orders (user_id, total) VALUES 
(1, 1225.00),
(2, 150.00),
(1, 300.00)
```

**Note:** These are development/testing tables, not production tables.

---

### November 29, 2025 - Employee Management Implementation

#### Change 2.1: ICSOFT Table Schema

**Script:** `backend/scripts/create_icsoft.js`  
**Database:** IcSoftVer3  
**Change Type:** ✅ **TABLE CREATION/MODIFICATION**

**Initial Schema Attempt:**
```sql
CREATE TABLE ICSOFT (
    EmpId INT PRIMARY KEY,
    EmpName NVARCHAR(100),
    Dept NVARCHAR(50),
    updatedAt DATETIME DEFAULT GETDATE()
)
```

**Issues Identified:**
- ❌ `EmpId` was not IDENTITY column
- ❌ Manual ID insertion required
- ❌ Caused IDENTITY_INSERT errors on dual-write

#### Change 2.2: ICSOFT Table Fix

**Change Type:** 🔧 **SCHEMA MODIFICATION**

**Modified Schema:**
```sql
-- Schema updated to use IDENTITY for auto-increment
CREATE TABLE ICSOFT (
    EmpId INT PRIMARY KEY IDENTITY(1,1),  -- Changed: Added IDENTITY
    EmpName NVARCHAR(100),
    Dept NVARCHAR(50),
    updatedAt DATETIME DEFAULT GETDATE()
)
```

**Changes:**
- ✅ Added `IDENTITY(1,1)` to EmpId
- ✅ Removed manual ID insertion requirement
- ✅ Backend uses `OUTPUT INSERTED.EmpId` to capture auto-generated ID

**Backend Query Updated:**
```sql
INSERT INTO ICSOFT (EmpName, Dept) 
OUTPUT INSERTED.EmpId
VALUES (@EmpName, @Dept);
```

**Result:** Fixed dual-write bug, automatic ID generation working

---

### December 1, 2025 - Authentication System Implementation

#### Change 3.1: Users Table Creation (Authentication)

**Script:** `backend/scripts/create_users_table.js`  
**Database:** IcSoftVer3  
**Change Type:** ✅ **TABLE CREATION**

**Purpose:** User authentication and authorization

**Complete Schema:**
```sql
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Role VARCHAR(20) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
)
```

**Column Details:**

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| Id | INT | PK, IDENTITY(1,1) | Auto-incrementing user ID |
| Username | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| PasswordHash | VARCHAR(255) | NOT NULL | Bcrypt hashed password (salt rounds: 10) |
| FullName | VARCHAR(100) | NOT NULL | User's full name |
| Role | VARCHAR(20) | NOT NULL | User role: 'admin', 'manager', 'employee' |
| IsActive | BIT | NOT NULL, DEFAULT 1 | Account status (1=active, 0=inactive) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT SYSDATETIME() | Account creation timestamp |

**Indexes:**
- Primary Key Index on `Id`
- Unique Index on `Username`

**Security Features:**
- Password hashing using bcrypt (10 salt rounds)
- Account activation/deactivation support
- Timestamp tracking for audit

#### Change 3.2: Admin User Seed Data

**Script:** `backend/scripts/create_admin_user.js`  
**Database:** IcSoftVer3  
**Change Type:** ✅ **DATA INSERTION**

**Admin User Created:**
```sql
INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive)
VALUES (
    'admin',
    '$2a$10$[bcrypt_hash]',  -- Hash of 'admin123'
    'System Administrator',
    'admin',
    1
)
```

**Credentials:**
- Username: `admin`
- Password: `admin123` (hashed)
- Role: `admin`
- Status: Active

**Verification Script:** `backend/scripts/check_admin.js` created to verify admin user exists

---

### December 2, 2025 - Pattern Master Implementation

#### Change 4.1: PatternMaster Table (Pre-existing)

**Database:** IcSoftVer3  
**Change Type:** 📋 **EXISTING TABLE UTILIZED**

**Note:** PatternMaster table existed in the database before project started. No schema changes were made, but the table is now actively used.

**Current Schema:**
```sql
CREATE TABLE PatternMaster (
    PatternId INT IDENTITY(1,1) PRIMARY KEY,  -- Assumed based on usage
    Customer NUMERIC(18,0) NOT NULL,  -- FK to Customer(CustId)
    Part_No NUMERIC(18,0) NOT NULL,  -- FK to Product(ProdId)
    Product_Name NUMERIC(18,0) NOT NULL,  -- FK to Product(ProdId)
    Pattern_Maker NUMERIC(18,0) NOT NULL,  -- FK to Invent_Supplier(SupId)
    PatternNo VARCHAR(255) NULL,
    Good_Wt_Per_Box VARCHAR(255) NULL,
    Bunch_Wt VARCHAR(255) NULL,
    YieldPercent VARCHAR(255) NULL,
    Sleeve_Size VARCHAR(255) NULL,
    No_Of_Sleeves VARCHAR(255) NULL,
    No_Of_Cavities VARCHAR(255) NULL,
    No_Of_BoxesPer_Heat VARCHAR(255) NULL,
    Filter_Size VARCHAR(255) NULL,
    No_Of_Filters VARCHAR(255) NULL,
    Moulding_Box_Size VARCHAR(255) NULL,
    Moulding_Type VARCHAR(255) NULL,
    No_Of_Cores VARCHAR(255) NULL,
    Core_Wt VARCHAR(255) NULL,
    Shell_Core VARCHAR(255) NULL,
    Cold_Box VARCHAR(255) NULL,
    Chill_Used VARCHAR(255) NULL,
    Chaplet VARCHAR(255) NULL,
    Comment VARCHAR(255) NULL,
    Rack_Location VARCHAR(255) NULL,
    Customer_Po_No VARCHAR(255) NULL,
    Customer_Tooling_Inv_No VARCHAR(255) NULL
    -- Potentially more columns
)
```

**Foreign Key Relationships:**
- `Customer` → `Customer(CustId)`
- `Part_No` → `Product(ProdId)`
- `Product_Name` → `Product(ProdId)`
- `Pattern_Maker` → `Invent_Supplier(SupId)`

**Total Fields:** 26 (4 required, 22 optional)

**Backend Insert Query:**
```sql
INSERT INTO PatternMaster (
    Customer, Part_No, Product_Name, Pattern_Maker,
    PatternNo, Good_Wt_Per_Box, Bunch_Wt, YieldPercent,
    Sleeve_Size, No_Of_Sleeves, No_Of_Cavities, No_Of_BoxesPer_Heat,
    Filter_Size, No_Of_Filters, Moulding_Box_Size, Moulding_Type,
    No_Of_Cores, Core_Wt, Shell_Core, Cold_Box,
    Chill_Used, Chaplet, Comment, Rack_Location,
    Customer_Po_No, Customer_Tooling_Inv_No
)
OUTPUT INSERTED.PatternId
VALUES (
    @Customer, @Part_No, @Product_Name, @Pattern_Maker,
    @PatternNo, @Good_Wt_Per_Box, @Bunch_Wt, @YieldPercent,
    @Sleeve_Size, @No_Of_Sleeves, @No_Of_Cavities, @No_Of_BoxesPer_Heat,
    @Filter_Size, @No_Of_Filters, @Moulding_Box_Size, @Moulding_Type,
    @No_Of_Cores, @Core_Wt, @Shell_Core, @Cold_Box,
    @Chill_Used, @Chaplet, @Comment, @Rack_Location,
    @Customer_Po_No, @Customer_Tooling_Inv_No
)
```

#### Change 4.2: Supporting Tables (Pre-existing)

**Database:** IcSoftVer3  
**Change Type:** 📋 **EXISTING TABLES UTILIZED**

**Customer Table:**
```sql
CREATE TABLE Customer (
    CustId NUMERIC(18,0) PRIMARY KEY,
    CustName VARCHAR(...) NOT NULL,
    -- Additional columns
)
```

**Product Table:**
```sql
CREATE TABLE Product (
    ProdId NUMERIC(18,0) PRIMARY KEY,
    ProdName VARCHAR(...) NOT NULL,
    InternalPartNo VARCHAR(...) NULL,
    -- Additional columns
)
```

**Invent_Supplier Table:**
```sql
CREATE TABLE Invent_Supplier (
    SupId NUMERIC(18,0) PRIMARY KEY,
    SupName VARCHAR(...) NOT NULL,
    -- Additional columns
)
```

**Backend Query for Products (with sorting):**
```sql
SELECT 
    ProdId, 
    ProdName, 
    LTRIM(RTRIM(ISNULL(InternalPartNo, ''))) as InternalPartNo
FROM Product 
ORDER BY 
    CASE 
        WHEN InternalPartNo IS NULL OR InternalPartNo = '' THEN 1 
        ELSE 0 
    END,
    InternalPartNo
```

**Purpose:** Products with InternalPartNo are sorted first for Part No selection

---

## 📊 Table Creation Log

### Summary of All Tables

| Table Name | Database | Created | Type | Purpose | Status |
|------------|----------|---------|------|---------|--------|
| **SQLQueries** | IcSoftVer3 | Nov 28, 2025 | Legacy | SQL query storage | ✅ Active |
| **Users** (dev) | IcSoftVer3 | Nov 28, 2025 | Development | Testing users | 🧪 Dev Only |
| **Products** (dev) | IcSoftVer3 | Nov 28, 2025 | Development | Testing products | 🧪 Dev Only |
| **Orders** (dev) | IcSoftVer3 | Nov 28, 2025 | Development | Testing orders | 🧪 Dev Only |
| **ICSOFT** | IcSoftVer3 | Nov 29, 2025 | Production | Employee data | ✅ Active |
| **Users** (auth) | IcSoftVer3 | Dec 1, 2025 | Production | Authentication | ✅ Active |
| **PatternMaster** | IcSoftVer3 | Pre-existing | Production | Pattern management | ✅ Active |
| **Customer** | IcSoftVer3 | Pre-existing | Production | Customer data | ✅ Active |
| **Product** | IcSoftVer3 | Pre-existing | Production | Product catalog | ✅ Active |
| **Invent_Supplier** | IcSoftVer3 | Pre-existing | Production | Supplier data | ✅ Active |

---

## 🔄 Table Modifications Log

### ICSOFT Table

**Date:** November 29, 2025

**Modification Type:** Schema Change (IDENTITY Addition)

**Before:**
```sql
EmpId INT PRIMARY KEY
```

**After:**
```sql
EmpId INT PRIMARY KEY IDENTITY(1,1)
```

**Reason:** Fix dual-write bug caused by manual ID insertion

**Impact:**
- ✅ Auto-increment employee IDs
- ✅ Eliminated IDENTITY_INSERT errors
- ✅ Simplified frontend (removed EmpId input field)

**Backend Query Changed:**
```sql
-- Before (caused error)
INSERT INTO ICSOFT (EmpId, EmpName, Dept) VALUES (@EmpId, @EmpName, @Dept)

-- After (working)
INSERT INTO ICSOFT (EmpName, Dept) 
OUTPUT INSERTED.EmpId
VALUES (@EmpName, @Dept);
```

---

### Recommended Future Changes

Based on the Users Foreign Key Guide ([users_foreign_key_guide.md](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/docs/users_foreign_key_guide.md)):

#### PatternMaster Audit Columns (Pending)

**Status:** 📋 **RECOMMENDED - NOT IMPLEMENTED**

```sql
ALTER TABLE PatternMaster
ADD CreatedBy INT NULL,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
    ModifiedBy INT NULL,
    ModifiedAt DATETIME2 NULL;

ALTER TABLE PatternMaster
ADD CONSTRAINT FK_PatternMaster_CreatedBy
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id);

ALTER TABLE PatternMaster
ADD CONSTRAINT FK_PatternMaster_ModifiedBy
    FOREIGN KEY (ModifiedBy) REFERENCES Users(Id);
```

**Purpose:** Track who created/modified patterns

#### ICSOFT-Users Link (Pending)

**Status:** 📋 **RECOMMENDED - NOT IMPLEMENTED**

```sql
ALTER TABLE ICSOFT
ADD UserId INT NULL;

ALTER TABLE ICSOFT
ADD CONSTRAINT FK_ICSOFT_User
    FOREIGN KEY (UserId) REFERENCES Users(Id);
```

**Purpose:** Link employees to user accounts

#### AuditLog Table (Pending)

**Status:** 📋 **RECOMMENDED - NOT IMPLEMENTED**

```sql
CREATE TABLE AuditLog (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    TableName VARCHAR(100) NOT NULL,
    RecordId INT NULL,
    Action VARCHAR(50) NOT NULL,
    OldValues NVARCHAR(MAX) NULL,
    NewValues NVARCHAR(MAX) NULL,
    PerformedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IpAddress VARCHAR(50) NULL,
    
    CONSTRAINT FK_AuditLog_User
        FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_AuditLog_UserId ON AuditLog(UserId);
CREATE INDEX IX_AuditLog_TableName ON AuditLog(TableName);
CREATE INDEX IX_AuditLog_PerformedAt ON AuditLog(PerformedAt DESC);
```

**Purpose:** Complete audit trail of all user actions

---

## 📜 Scripts Repository

### Database Setup Scripts

All scripts located in `backend/scripts/`:

| Script | Purpose | Database | Status |
|--------|---------|----------|--------|
| [setup_db.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/setup_db.js) | Create SQLQueries table | IcSoftVer3 | ✅ Tested |
| [seed_tables.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/seed_tables.js) | Create dev/test tables | IcSoftVer3 | 🧪 Dev Only |
| [create_icsoft.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/create_icsoft.js) | Create ICSOFT table | IcSoftVer3 | ✅ Tested |
| [create_users_table.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/create_users_table.js) | Create Users (auth) table | IcSoftVer3 | ✅ Tested |
| [create_admin_user.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/create_admin_user.js) | Create admin user | IcSoftVer3 | ✅ Tested |
| [check_admin.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/check_admin.js) | Verify admin exists | IcSoftVer3 | ✅ Tested |
| [verify_db_connections.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/verify_db_connections.js) | Test all 4 DB connections | All 4 | ✅ Tested |
| [test_products.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/test_products.js) | Test product queries | IcSoftVer3 | ✅ Tested |
| [debug_tables.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/scripts/debug_tables.js) | Debug table issues | IcSoftVer3 | 🔧 Utility |

### Script Execution Order

**Initial Setup:**
```powershell
# 1. Verify connections
node scripts/verify_db_connections.js

# 2. Create Users table
node scripts/create_users_table.js

# 3. Create admin user
node scripts/create_admin_user.js

# 4. Verify admin
node scripts/check_admin.js
```

**Development Setup (Optional):**
```powershell
# Create development/test tables
node scripts/seed_tables.js
```

---

## 🗂 Current Database State

### IcSoftVer3 (Primary Database)

**Production Tables:**

1. **Users** (Authentication)
   - Records: 1+ (admin user)
   - Primary Key: Id (IDENTITY)
   - Indexes: PK on Id, UNIQUE on Username

2. **ICSOFT** (Employees)
   - Records: Variable
   - Primary Key: EmpId (IDENTITY)
   - Auto-refresh: 5 seconds (frontend)

3. **PatternMaster** (Patterns)
   - Records: Variable
   - Primary Key: PatternId (IDENTITY)
   - Foreign Keys: 4 (Customer, Part_No, Product_Name, Pattern_Maker)

4. **Customer** (Customers)
   - Records: Pre-existing data
   - Primary Key: CustId

5. **Product** (Products)
   - Records: Pre-existing data
   - Primary Key: ProdId
   - Sorted by: InternalPartNo (non-null first)

6. **Invent_Supplier** (Suppliers/Pattern Makers)
   - Records: Pre-existing data
   - Primary Key: SupId

**Development Tables:**

7. **SQLQueries** (Legacy)
   - Records: 4 sample queries
   - Purpose: Original SQL-to-MongoDB concept

8. **Users** (Development - if created via seed_tables.js)
   - Records: 3 test users
   - Note: Different from production Users table

9. **Products** (Development)
   - Records: 4 test products
   - Note: Different from production Product table

10. **Orders** (Development)
    - Records: 3 test orders

### IcSoftReportVer3 (Reporting Database)

**Status:** Connected, schema unknown (pre-existing)

### IcSoftLedgerVer3 (Ledger Database)

**Status:** Connected, schema unknown (pre-existing)

### BizSpot (Business Database)

**Status:** Connected, schema unknown (pre-existing)

---

## 🔄 Migration History

### Migration 1: Single to Multi-Database (December 1, 2025)

**Type:** Configuration Migration

**Steps Performed:**
1. Updated `backend/config/db.js` to support multiple databases
2. Created connection pools for each database
3. Added `getPool()` function for database selection
4. Updated `.env` file with 4 database names
5. Added middleware for request-level database selection
6. Updated API client to send database header
7. Tested all 4 database connections

**Downtime:** None (backward compatible)

**Rollback Plan:** Revert to single database configuration

**Verification:**
```powershell
node scripts/verify_db_connections.js
```

**Result:** ✅ All 4 databases connected successfully

### Migration 2: ICSOFT Schema Fix (November 29, 2025)

**Type:** Schema Migration

**Issue:** IDENTITY_INSERT error on employee insertion

**Steps Performed:**
1. Identified schema issue (missing IDENTITY)
2. Modified ICSOFT table to add IDENTITY to EmpId
3. Updated backend query to use OUTPUT clause
4. Removed manual EmpId from frontend form
5. Tested employee insertion

**Data Impact:** None (auto-increment preserves existing IDs)

**Verification:** Added employee successfully, ID auto-generated

**Result:** ✅ Dual-write functionality restored

### Migration 3: Authentication System (December 1, 2025)

**Type:** New Feature Migration

**Steps Performed:**
1. Created Users table with authentication schema
2. Hashed admin password using bcrypt
3. Inserted admin user
4. Verified admin login
5. Tested JWT token generation
6. Tested protected routes

**Data Impact:** New table created, no existing data affected

**Verification:**
```powershell
node scripts/check_admin.js
```

**Result:** ✅ Authentication system operational

---

## 📊 Database Statistics

### Table Count by Database

| Database | Production Tables | Development Tables | Total |
|----------|------------------|-------------------|-------|
| IcSoftVer3 | 6 | 4 | 10 |
| IcSoftReportVer3 | Unknown | - | Unknown |
| IcSoftLedgerVer3 | Unknown | - | Unknown |
| BizSpot | Unknown | - | Unknown |

### Schema Changes Summary

| Date | Changes | Type | Impact |
|------|---------|------|--------|
| Nov 28, 2025 | SQLQueries, Dev tables | Creation | Low |
| Nov 29, 2025 | ICSOFT IDENTITY fix | Modification | Medium |
| Dec 1, 2025 | Multi-DB configuration | Configuration | High |
| Dec 1, 2025 | Users table (auth) | Creation | High |
| Dec 2, 2025 | Pattern integration | Integration | Medium |

---

## 🔒 Security & Compliance

### Password Security

- **Hashing Algorithm:** bcrypt
- **Salt Rounds:** 10
- **Storage:** PasswordHash column (VARCHAR(255))
- **Never Stored:** Plain text passwords

### Audit Compliance

**Current State:**
- ❌ No audit logging implemented
- ❌ No CreatedBy/ModifiedBy tracking
- ❌ No change history

**Recommended Implementation:**
- ✅ Create AuditLog table
- ✅ Add audit columns to PatternMaster
- ✅ Implement trigger-based or application-level logging

---

## ✅ Database Change Summary

### Tables Created: 10
- SQLQueries (Legacy)
- Users (Development) - 3 tables
- ICSOFT (Production)
- Users (Authentication - Production)

### Tables Modified: 1
- ICSOFT (Added IDENTITY to EmpId)

### Tables Utilized (Pre-existing): 3
- PatternMaster
- Customer
- Product
- Invent_Supplier

### Configuration Changes: 1
- Single database → Multi-database (4 databases)

### Scripts Created: 9
- Database setup and verification scripts

---

## 📝 Change Control

### Approval Process

**Development Changes:**
- No formal approval required
- Direct schema modifications allowed

**Production Changes (Recommended):**
1. Document proposed change
2. Create migration script
3. Test in development environment
4. Review and approve
5. Execute during maintenance window
6. Verify and monitor

### Backup Strategy

**Current:** 
- ⚠️ No automated backup configured

**Recommended:**
- Daily full backups
- Transaction log backups every 15 minutes
- Backup retention: 30 days
- Test restore procedures monthly

---

## 🎯 Future Database Changes

### Planned Changes

1. **High Priority:**
   - [ ] Add AuditLog table for compliance
   - [ ] Add CreatedBy/ModifiedBy to PatternMaster
   - [ ] Link ICSOFT to Users table
   - [ ] Implement automated backups

2. **Medium Priority:**
   - [ ] Add indexes for frequently queried columns
   - [ ] Optimize Product sorting query
   - [ ] Add database-level constraints
   - [ ] Implement soft delete (IsActive flags)

3. **Low Priority:**
   - [ ] Archive old data (Orders, SQLQueries)
   - [ ] Partition large tables
   - [ ] Database performance tuning

---

**Document Version:** 1.0  
**Last Updated:** December 2, 2025  
**Maintained By:** AKP Development Team  
**Next Review:** When new database changes are made
