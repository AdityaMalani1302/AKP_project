# Users Table Foreign Key Usage Guide

## Users Table Created ✓

The `Users` table has been successfully created in the **IcSoftVer3** database with the following structure:

```sql
CREATE TABLE Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName VARCHAR(100) NOT NULL,
    Role VARCHAR(20) NOT NULL,          -- 'admin', 'manager', 'employee'
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
```

---

## Where Users.Id Should Be Used as Foreign Key

The `Users.Id` primary key should be referenced as a foreign key in tables that track **who performed an action** (audit trail) or **who owns a record**. Here are the recommended places:

### 1. **PatternMaster Table** (Already Created)

Add audit columns to track who created and modified pattern records:

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

### 2. **ICSOFT Table** (Employee Table)

Link employees to user accounts:

```sql
ALTER TABLE ICSOFT
ADD UserId INT NULL;

ALTER TABLE ICSOFT
ADD CONSTRAINT FK_ICSOFT_User
    FOREIGN KEY (UserId) REFERENCES Users(Id);

-- Optional: Ensure one employee maps to one user
-- CREATE UNIQUE INDEX UX_ICSOFT_UserId ON ICSOFT(UserId) WHERE UserId IS NOT NULL;
```

### 3. **Customer Table**

Track which user manages each customer account:

```sql
ALTER TABLE Customer
ADD AccountManagerId INT NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME();

ALTER TABLE Customer
ADD CONSTRAINT FK_Customer_AccountManager
    FOREIGN KEY (AccountManagerId) REFERENCES Users(Id);

ALTER TABLE Customer
ADD CONSTRAINT FK_Customer_CreatedBy
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id);
```

### 4. **Product Table**

Track product creation and ownership:

```sql
ALTER TABLE Product
ADD CreatedBy INT NULL,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME(),
    ModifiedBy INT NULL,
    ModifiedAt DATETIME2 NULL;

ALTER TABLE Product
ADD CONSTRAINT FK_Product_CreatedBy
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id);

ALTER TABLE Product
ADD CONSTRAINT FK_Product_ModifiedBy
    FOREIGN KEY (ModifiedBy) REFERENCES Users(Id);
```

### 5. **Invent_Supplier Table**

Track supplier relationship management:

```sql
ALTER TABLE Invent_Supplier
ADD ManagedBy INT NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2 DEFAULT SYSDATETIME();

ALTER TABLE Invent_Supplier
ADD CONSTRAINT FK_Supplier_ManagedBy
    FOREIGN KEY (ManagedBy) REFERENCES Users(Id);

ALTER TABLE Invent_Supplier
ADD CONSTRAINT FK_Supplier_CreatedBy
    FOREIGN KEY (CreatedBy) REFERENCES Users(Id);
```

### 6. **Create Audit Log Table** (Recommended)

A dedicated table to track all user actions across the system:

```sql
CREATE TABLE AuditLog (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    TableName VARCHAR(100) NOT NULL,
    RecordId INT NULL,
    Action VARCHAR(50) NOT NULL,        -- 'INSERT', 'UPDATE', 'DELETE'
    OldValues NVARCHAR(MAX) NULL,       -- JSON of old values
    NewValues NVARCHAR(MAX) NULL,       -- JSON of new values
    PerformedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    IpAddress VARCHAR(50) NULL,
    
    CONSTRAINT FK_AuditLog_User
        FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_AuditLog_UserId ON AuditLog(UserId);
CREATE INDEX IX_AuditLog_TableName ON AuditLog(TableName);
CREATE INDEX IX_AuditLog_PerformedAt ON AuditLog(PerformedAt DESC);
```

### 7. **Create User Sessions Table** (Optional - For Security)

Track active user sessions:

```sql
CREATE TABLE UserSessions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    SessionToken VARCHAR(255) NOT NULL,
    IpAddress VARCHAR(50) NULL,
    UserAgent VARCHAR(500) NULL,
    LoginAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    LogoutAt DATETIME2 NULL,
    ExpiresAt DATETIME2 NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    
    CONSTRAINT FK_UserSessions_User
        FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE INDEX IX_UserSessions_UserId ON UserSessions(UserId);
CREATE INDEX IX_UserSessions_SessionToken ON UserSessions(SessionToken);
```

---

## Summary of Foreign Key Relationships

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| **PatternMaster** | `CreatedBy`, `ModifiedBy` | Track pattern creation/modification |
| **ICSOFT** | `UserId` | Link employees to user accounts |
| **Customer** | `AccountManagerId`, `CreatedBy` | Track customer management |
| **Product** | `CreatedBy`, `ModifiedBy` | Track product creation/modification |
| **Invent_Supplier** | `ManagedBy`, `CreatedBy` | Track supplier management |
| **AuditLog** | `UserId` | Complete audit trail of all actions |
| **UserSessions** | `UserId` | Security and session management |

---

## Implementation Script

I've created a script at `create_users_table.js` that:
- ✓ Creates the Users table if it doesn't exist
- ✓ Uses the IcSoftVer3 database
- ✓ Follows the exact schema you specified

**To run it:**
```powershell
node scripts/create_users_table.js
```

---

## Next Steps

1. **Decide which tables need audit trails** - Not all tables need CreatedBy/ModifiedBy
2. **Update your API endpoints** - Modify POST/PUT endpoints to include `UserId` from the authenticated user
3. **Add audit logging** - Implement the AuditLog table for compliance and debugging
4. **Link employees to users** - If ICSOFT employees should have user accounts, add the UserId FK

Would you like me to:
- Create migration scripts to add these foreign keys?
- Update the PatternMaster API to include CreatedBy/ModifiedBy tracking?
- Implement the AuditLog system?
