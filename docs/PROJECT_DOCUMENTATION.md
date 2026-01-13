# AKP Project - Comprehensive Documentation

**Version:** 1.0  
**Last Updated:** December 2, 2025  
**Project Type:** Full-Stack Enterprise Management System  
**Status:** Active Development

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Timeline & Evolution](#project-timeline--evolution)
4. [Architecture](#architecture)
5. [Database Configuration](#database-configuration)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Features & Modules](#features--modules)
9. [Authentication & Authorization](#authentication--authorization)
10. [API Endpoints](#api-endpoints)
11. [Database Schema](#database-schema)
12. [Development Setup](#development-setup)
13. [Deployment Instructions](#deployment-instructions)
14. [Change Log](#change-log)
15. [Known Issues & Future Enhancements](#known-issues--future-enhancements)

---

## 🎯 Project Overview

### Purpose
AKP Project is a comprehensive enterprise management system designed to handle multiple business operations including:
- **Pattern Management** - Manage manufacturing patterns with detailed specifications
- **Employee Management** - Track and manage employee information
- **Customer Management** - Handle customer relationships and data
- **Product Management** - Maintain product catalogs and part numbers
- **Supplier Management** - Track pattern makers and suppliers
- **Multi-Database Operations** - Support for 4 different SQL Server databases

### Business Context
The system is built for a manufacturing/foundry business that requires:
- Complex pattern specifications for manufacturing
- Integration with existing SQL Server databases
- Role-based access control (Admin, Manager, Employee)
- Real-time data exploration and monitoring
- Dual-write capabilities for employee records

---

## 🛠 Technology Stack

### Frontend
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.4
- **Routing:** React Router DOM 7.9.6
- **HTTP Client:** Axios 1.13.2
- **UI Components:** 
  - Lucide React 0.555.0 (Icons)
  - React Icons 5.5.0 (Additional Icons)
  - Recharts 3.5.1 (Charts/Visualization)
- **Styling:** Vanilla CSS
- **Dev Server:** Vite Dev Server (Port 5173)

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 5.1.0
- **Database Driver:** MSSQL 12.1.1 (SQL Server)
- **Authentication:** 
  - JSON Web Tokens (jsonwebtoken 9.0.2)
  - BCrypt.js 3.0.3 (Password Hashing)
- **Middleware:**
  - CORS 2.8.5
  - Cookie Parser 1.4.7
  - Express JSON Parser
- **Environment:** dotenv 17.2.3
- **Server Port:** 5000

### Database
- **DBMS:** Microsoft SQL Server (SQL Express)
- **Server:** WARRIOR\SQLEXPRESS
- **Databases:** 
  1. IcSoftVer3 (Primary)
  2. IcSoftReportVer3 (Reporting)
  3. IcSoftLedgerVer3 (Ledger)
  4. BizSpot (Business Operations)
- **Authentication:** SQL Server Authentication (sa user)

---

## 📅 Project Timeline & Evolution

### Phase 1: Initial Concept (November 28, 2025)
**Objective:** SQL to MongoDB Converter

- **Original Goal:** Create a web application to convert SQL Server queries to MongoDB queries
- **Features Planned:**
  - Fetch SQL queries from server
  - Convert to MongoDB syntax
  - Store converted queries in MongoDB
  - Display processed data on web interface
- **Status:** Concept evolved into larger enterprise system

### Phase 2: Dual-Write Implementation (November 29, 2025)
**Objective:** Fixing Dual-Write Bug

**Problem Identified:**
- Employee addition was failing due to IDENTITY_INSERT error
- Frontend was attempting to manually set EmpId
- Backend wasn't handling auto-generated IDs properly

**Solutions Implemented:**
1. **Backend Changes:**
   - Removed IDENTITY_INSERT requirements
   - Used `OUTPUT INSERTED.EmpId` to capture auto-generated ID
   - Fixed SQL query to allow database to auto-generate employee ID

2. **Frontend Changes:**
   - Removed manual EmpId input field
   - Simplified form to only accept EmpName and Dept
   - Auto-generated ID is returned after successful insertion

3. **Files Modified:**
   - `backend/server.js` - Employee POST endpoint
   - `frontend/src/components/AddEmployee.jsx` - Simplified form

### Phase 3: Database Exploration (December 1, 2025)

#### 3.1 Frontend Visibility Fix
**Problem:** Nothing visible on frontend when application runs

**Investigation:**
- Analyzed routing configuration
- Checked for JavaScript errors
- Verified backend connectivity
- Reviewed rendering logic

**Resolution:**
- Fixed App.css missing/corrupted file
- Corrected component rendering issues
- Verified build process

#### 3.2 Multi-Database Support Implementation
**Objective:** Enable 4 Database Support

**Requirements:**
- Connect to 4 different SQL Server databases simultaneously
- Allow dynamic database selection
- Maintain separate connection pools
- Route API requests to correct database

**Implementation Details:**

1. **Backend Configuration ([config/db.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/config/db.js)):**
```javascript
const databases = {
    'IcSoftVer3': process.env.DB_NAME_1,
    'IcSoftReportVer3': process.env.DB_NAME_2,
    'IcSoftLedgerVer3': process.env.DB_NAME_3,
    'BizSpot': process.env.DB_NAME_4
};
```

2. **Connection Pool Management:**
   - Created separate connection pool for each database
   - Implemented `getPool(dbName)` function to retrieve specific pool
   - Connection established on server startup

3. **Request-Level Database Selection:**
   - Added middleware to detect database from request headers
   - Header: `x-database` or query param `db`
   - Default database: IcSoftVer3

4. **Frontend Integration:**
   - Created `DatabaseSelector` component
   - Stored selection in localStorage
   - Added to Layout header
   - Auto-reload on database change

5. **API Client Update ([api.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/api.js)):**
   - Axios interceptor to attach database header to all requests
   - Reads selection from localStorage

6. **Database Scripts Created:**
   - `scripts/verify_db_connections.js` - Verify all 4 databases connect
   - Connection verification on startup

### Phase 4: Authentication & Authorization (December 1, 2025)

**Implementation:**

1. **Database Setup:**
   - Created Users table in IcSoftVer3
   - Fields: Id, Username, PasswordHash, FullName, Role, IsActive, CreatedAt
   - Roles: admin, manager, employee

2. **Security Features:**
   - JWT-based authentication
   - HTTP-only cookies for token storage
   - 8-hour session expiration
   - Bcrypt password hashing (10 salt rounds)
   - Role-based access control

3. **Authentication Endpoints:**
   - `POST /api/auth/register` - Admin-only user registration
   - `POST /api/auth/login` - User login
   - `POST /api/auth/logout` - Session termination
   - `GET /api/auth/me` - Verify auth status

4. **Admin User Created:**
   - Username: `admin`
   - Password: `admin123`
   - Role: admin
   - Full Name: System Administrator

5. **Frontend Components:**
   - Login page with credential validation
   - PrivateRoute component for route protection
   - Role-based route access
   - Automatic redirect logic

6. **Middleware:**
   - `verifyToken` - JWT verification
   - `requireRole` - Role-based authorization

### Phase 5: Pattern Master Development (December 2, 2025)

**Objective:** Create comprehensive pattern management system

**Features Implemented:**

1. **Foreign Key Relationships:**
   - Customer (CustId → Customer table)
   - Part_No (ProdId → Product table)
   - Product_Name (ProdId → Product table)
   - Pattern_Maker (SupId → Invent_Supplier table)

2. **Smart Form Behavior:**
   - Product Name auto-populated when Part No selected
   - Product Name field locked/disabled when auto-filled
   - Validation for required foreign keys
   - Visual indicator for locked fields

3. **Comprehensive Fields:**
   - **Required:** Customer, Part No, Product Name, Pattern Maker
   - **Optional:** 22 additional specification fields including:
     - Pattern specifications (PatternNo, Weight, Yield)
     - Sleeve specifications (Size, Count)
     - Cavity information
     - Molding specifications
     - Core details
     - Customer information

4. **Form Sections:**
   - Required Information (highlighted section)
   - Additional Information (grid layout)
   - Responsive grid design (auto-fit, minmax)

5. **API Integration:**
   - Dropdown data fetching (customers, products, suppliers)
   - Parameterized SQL queries for security
   - OUTPUT INSERTED.PatternId for confirmation
   - Proper error handling and user feedback

**Bug Fixes:**

**Issue:** Product Name field behavior
- **Problem:** User couldn't see product name after selecting part number
- **Root Cause:** Product Name was being cleared or not populated correctly
- **Solution:** 
  - Auto-populate Product_Name with same ProdId as Part_No
  - Keep field disabled (locked) after auto-population
  - Show lock icon and helper text
  - Both fields reference same product

**Files Modified:**
- `frontend/src/components/PatternMaster.jsx`
- `backend/server.js` (Pattern Master POST endpoint)

---

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          React Frontend (Port 5173)                   │  │
│  │  - Vite Dev Server                                    │  │
│  │  - React Router (Routing)                             │  │
│  │  - Axios (HTTP Client)                                │  │
│  │  - Component-based Architecture                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION TIER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       Express.js Backend (Port 5000)                  │  │
│  │  - REST API                                           │  │
│  │  - JWT Authentication Middleware                      │  │
│  │  - Database Selection Middleware                      │  │
│  │  - CORS Configuration                                 │  │
│  │  - Cookie-based Session Management                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ SQL Queries
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE TIER                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ IcSoftVer3 │  │IcSoftReport│  │IcSoftLedger│            │
│  │  (Primary) │  │    Ver3    │  │    Ver3    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────┐                                             │
│  │  BizSpot   │  SQL Server WARRIOR\SQLEXPRESS              │
│  │ (Business) │                                             │
│  └────────────┘                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Frontend Structure:**
```
src/
├── components/
│   ├── Layout/
│   │   ├── Layout.jsx          # Main layout wrapper
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   └── Header.jsx          # Top header bar
│   ├── AddEmployee.jsx         # Employee management
│   ├── AdminDashboard.jsx      # Admin panel
│   ├── DatabaseExplorer.jsx    # Database browser
│   ├── DatabaseSelector.jsx    # DB selection dropdown
│   ├── Login.jsx               # Authentication
│   ├── Navbar.jsx              # Navigation bar
│   ├── PatternMaster.jsx       # Pattern management
│   └── PrivateRoute.jsx        # Route protection
├── App.jsx                     # Main app component
├── api.js                      # Axios configuration
├── main.jsx                    # Entry point
├── App.css                     # App styles
└── index.css                   # Global styles
```

**Backend Structure:**
```
backend/
├── config/
│   └── db.js                   # Database configuration
├── scripts/
│   ├── create_users_table.js   # User table setup
│   ├── create_admin_user.js    # Admin creation
│   ├── check_admin.js          # Verify admin
│   ├── seed_tables.js          # Data seeding
│   ├── setup_db.js             # DB initialization
│   ├── test_products.js        # Product testing
│   └── verify_db_connections.js # Connection check
├── docs/
│   ├── admin_user_created.md   # Admin documentation
│   └── users_foreign_key_guide.md # FK guidelines
├── server.js                   # Main server file
└── .env                        # Environment variables
```

---

## 💾 Database Configuration

### Environment Variables ([.env](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/.env))

```env
PORT=5000

# SQL Server Configuration
SQL_USER=sa
SQL_PASSWORD=akp@1234
SQL_SERVER=WARRIOR\\SQLEXPRESS

# Multi-Database Configuration
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
DB_NAME_4=BizSpot
```

### Connection Configuration

**Connection Pool Settings:**
```javascript
{
    user: 'sa',
    password: 'akp@1234',
    server: 'WARRIOR\\SQLEXPRESS',
    database: <dynamic>,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
}
```

### Database Purposes

| Database | Purpose | Key Tables |
|----------|---------|------------|
| **IcSoftVer3** | Primary application database | Users, PatternMaster, ICSOFT, Customer, Product, Invent_Supplier |
| **IcSoftReportVer3** | Reporting and analytics | Report configurations, historical data |
| **IcSoftLedgerVer3** | Financial ledger data | Accounting entries, transactions |
| **BizSpot** | Business operations | Additional business entities |

---

## 🔧 Backend Implementation

### Server Configuration ([server.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/server.js))

**Key Features:**
- Express.js server on port 5000
- CORS enabled for localhost origins
- Cookie-based JWT authentication
- Multi-database request routing
- RESTful API design

**CORS Configuration:**
```javascript
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
```

**Database Middleware:**
```javascript
app.use((req, res, next) => {
    const dbName = req.headers['x-database'] || req.query.db || 'IcSoftVer3';
    const pool = getPool(dbName);
    
    if (!pool) {
        return res.status(400).json({ 
            error: `Database '${dbName}' not found or not connected` 
        });
    }
    req.db = pool;
    next();
});
```

### Security Implementation

**JWT Configuration:**
```javascript
const JWT_SECRET = 'supersecretkey123'; // TODO: Move to .env in production
const TOKEN_EXPIRY = '8h';
```

**Password Hashing:**
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

**Token Verification Middleware:**
```javascript
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Access denied' });
    
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};
```

**Role-Based Authorization:**
```javascript
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ 
                error: 'Access denied: Insufficient permissions' 
            });
        }
    };
};
```

---

## 🎨 Frontend Implementation

### Application Entry Point ([App.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/App.jsx))

**Features:**
- Route-based navigation
- Authentication state management
- Protected routes
- Layout wrapper for authenticated pages
- Automatic auth check on mount
- Loading states

**Route Structure:**
```javascript
<Routes>
  <Route path="/login" element={<Login />} />
  
  <Route path="/" element={<PrivateRoute><Layout>...</Layout></PrivateRoute>} />
  <Route path="/add-employee" element={<PrivateRoute><Layout>...</Layout></PrivateRoute>} />
  <Route path="/pattern-master" element={<PrivateRoute><Layout>...</Layout></PrivateRoute>} />
  <Route path="/database-explorer" element={<PrivateRoute><Layout>...</Layout></PrivateRoute>} />
  <Route path="/admin" element={<PrivateRoute requiredRole="admin"><Layout>...</Layout></PrivateRoute>} />
</Routes>
```

### API Client Configuration ([api.js](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/api.js))

```javascript
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true
});

// Request interceptor - attach database header
api.interceptors.request.use(config => {
    const selectedDb = localStorage.getItem('selectedDatabase') || 'IcSoftVer3';
    config.headers['x-database'] = selectedDb;
    return config;
});

export default api;
```

### Styling Approach

**Global Styles ([index.css](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/index.css)):**
- Modern CSS with CSS variables
- Dark theme color scheme
- Responsive typography
- Card-based layout system
- Form styling utilities

**Component Styles:**
- Inline styles for component-specific styling
- CSS modules avoided for simplicity
- Consistent design system
- Responsive grid layouts

---

## 🎯 Features & Modules

### 1. Authentication System

**Login Module ([Login.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/components/Login.jsx)):**
- Username/password authentication
- JWT token-based sessions
- HTTP-only cookie storage
- Error handling and validation
- Automatic redirect after login
- Loading states

**Protected Routes ([PrivateRoute.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/components/PrivateRoute.jsx)):**
- Authentication verification
- Role-based access control
- Automatic redirect to login
- Support for admin-only routes

### 2. Pattern Master Module

**Purpose:** Manage manufacturing patterns with comprehensive specifications

**Form Sections:**

1. **Required Information:**
   - Customer (Foreign key to Customer table)
   - Part No (Foreign key to Product table - InternalPartNo)
   - Product Name (Foreign key to Product table - ProdName) - Auto-filled
   - Pattern Maker (Foreign key to Invent_Supplier table)

2. **Additional Information (22 optional fields):**
   - PatternNo
   - Good_Wt_Per_Box
   - Bunch_Wt
   - YieldPercent
   - Sleeve_Size
   - No_Of_Sleeves
   - No_Of_Cavities
   - No_Of_BoxesPer_Heat
   - Filter_Size
   - No_Of_Filters
   - Moulding_Box_Size
   - Moulding_Type
   - No_Of_Cores
   - Core_Wt
   - Shell_Core
   - Cold_Box
   - Chill_Used
   - Chaplet
   - Comment (text area)
   - Rack_Location
   - Customer_Po_No
   - Customer_Tooling_Inv_No

**Smart Features:**
- Auto-population of Product Name when Part No is selected
- Locked Product Name field to prevent manual changes
- Visual lock indicator
- Dropdown populated from database
- Real-time validation
- Success feedback with generated Pattern ID

**Data Flow:**
1. User selects Part No from dropdown
2. Frontend finds matching product
3. Auto-populates Product_Name with same ProdId
4. Locks Product_Name field
5. Shows visual indicator
6. On submit, both fields reference same product

### 3. Employee Management Module

**Add Employee ([AddEmployee.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/components/AddEmployee.jsx)):**

**Features:**
- Simple form with Name and Department
- Auto-generated Employee ID
- Dual-write capability (SQL Server)
- Real-time feedback
- Form reset after submission

**Implementation:**
- Removed manual EmpId input
- Database auto-generates ID using IDENTITY column
- Backend returns generated ID
- Uses OUTPUT INSERTED.EmpId clause

### 4. Database Explorer Module

**Database Explorer ([DatabaseExplorer.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/components/DatabaseExplorer.jsx)):**

**Features:**
- Browse all tables in selected database
- View table data in tabular format
- Real-time data sync for ICSOFT table
- Auto-refresh every 5 seconds for ICSOFT
- Manual refresh capability
- Horizontal and vertical scrolling for large tables
- JSON serialization for complex data types

**Live Sync Indicator:**
- Shows green dot for ICSOFT table
- "● Live Sync" label
- Auto-refresh interval management
- Cleanup on component unmount

### 5. Database Selection Module

**Database Selector ([DatabaseSelector.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/components/DatabaseSelector.jsx)):**

**Features:**
- Dropdown with 4 database options
- Persists selection to localStorage
- Auto-reload on database change
- Visual styling to match theme
- Integration in layout header

**Databases:**
1. IcSoft Ver3
2. IcSoft Report Ver3
3. IcSoft Ledger Ver3
4. BizSpot

### 6. Admin Dashboard

**Admin Dashboard ([AdminDashboard.jsx](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/frontend/src/components/AdminDashboard.jsx)):**

**Features:**
- Admin-only access (role-based)
- User registration form
- Create new users with roles
- Set full name and credentials
- role options: admin, manager, employee
- Success/error feedback

---

## 🔌 API Endpoints

### Authentication Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Admin Only | Register new user |
| POST | `/api/auth/login` | Public | User login |
| POST | `/api/auth/logout` | Authenticated | Logout user |
| GET | `/api/auth/me` | Authenticated | Get current user |

**Register Request:**
```json
{
    "username": "johndoe",
    "password": "securepass123",
    "fullName": "John Doe",
    "role": "employee"
}
```

**Login Request:**
```json
{
    "username": "admin",
    "password": "admin123"
}
```

**Login Response:**
```json
{
    "success": true,
    "username": "admin",
    "role": "admin"
}
```

### Data Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/tables` | Authenticated | Get all table names |
| GET | `/api/tables/:tableName` | Authenticated | Get table data |
| GET | `/api/customers` | Authenticated | Get customer list |
| GET | `/api/products` | Authenticated | Get product list with part numbers |
| GET | `/api/suppliers` | Authenticated | Get supplier list |
| POST | `/api/pattern-master` | Authenticated | Create pattern |
| POST | `/api/employees` | Authenticated | Add employee |
| GET | `/api/sql-queries` | Authenticated | Get SQL queries (legacy) |

**Get Products Response:**
```json
[
    {
        "ProdId": 123,
        "ProdName": "Widget A",
        "InternalPartNo": "WA-001"
    }
]
```

**Create Pattern Request:**
```json
{
    "Customer": 5,
    "Part_No": 123,
    "Product_Name": 123,
    "Pattern_Maker": 7,
    "PatternNo": "PT-2025-001",
    "Good_Wt_Per_Box": "50kg",
    ...
}
```

**Create Pattern Response:**
```json
{
    "success": true,
    "message": "Pattern added successfully",
    "patternId": 456
}
```

---

## 📊 Database Schema

### Users Table

**Table:** `Users`  
**Database:** IcSoftVer3  
**Purpose:** Store user authentication and authorization data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Id | INT | PK, IDENTITY(1,1) | Auto-generated user ID |
| Username | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| PasswordHash | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| FullName | VARCHAR(100) | NOT NULL | User's full name |
| Role | VARCHAR(20) | NOT NULL | admin/manager/employee |
| IsActive | BIT | NOT NULL, DEFAULT 1 | Account active status |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT SYSDATETIME() | Account creation timestamp |

### PatternMaster Table

**Table:** `PatternMaster`  
**Database:** IcSoftVer3  
**Purpose:** Store manufacturing pattern specifications

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| PatternId | INT/NUMERIC | PK, IDENTITY | Auto-generated pattern ID |
| Customer | NUMERIC(18,0) | FK → Customer(CustId), NOT NULL | Customer reference |
| Part_No | NUMERIC(18,0) | FK → Product(ProdId), NOT NULL | Part number reference |
| Product_Name | NUMERIC(18,0) | FK → Product(ProdId), NOT NULL | Product reference |
| Pattern_Maker | NUMERIC(18,0) | FK → Invent_Supplier(SupId), NOT NULL | Supplier reference |
| PatternNo | VARCHAR(255) | NULL | Pattern number |
| Good_Wt_Per_Box | VARCHAR(255) | NULL | Weight per box |
| Bunch_Wt | VARCHAR(255) | NULL | Bunch weight |
| YieldPercent | VARCHAR(255) | NULL | Yield percentage |
| Sleeve_Size | VARCHAR(255) | NULL | Sleeve dimensions |
| No_Of_Sleeves | VARCHAR(255) | NULL | Sleeve count |
| No_Of_Cavities | VARCHAR(255) | NULL | Cavity count |
| No_Of_BoxesPer_Heat | VARCHAR(255) | NULL | Boxes per heat |
| Filter_Size | VARCHAR(255) | NULL | Filter dimensions |
| No_Of_Filters | VARCHAR(255) | NULL | Filter count |
| Moulding_Box_Size | VARCHAR(255) | NULL | Molding box size |
| Moulding_Type | VARCHAR(255) | NULL | Type of molding |
| No_Of_Cores | VARCHAR(255) | NULL | Core count |
| Core_Wt | VARCHAR(255) | NULL | Core weight |
| Shell_Core | VARCHAR(255) | NULL | Shell core info |
| Cold_Box | VARCHAR(255) | NULL | Cold box details |
| Chill_Used | VARCHAR(255) | NULL | Chill information |
| Chaplet | VARCHAR(255) | NULL | Chaplet details |
| Comment | VARCHAR(255) | NULL | Additional notes |
| Rack_Location | VARCHAR(255) | NULL | Storage location |
| Customer_Po_No | VARCHAR(255) | NULL | Customer PO number |
| Customer_Tooling_Inv_No | VARCHAR(255) | NULL | Tooling inventory number |

### ICSOFT Table (Employee)

**Table:** `ICSOFT`  
**Database:** IcSoftVer3  
**Purpose:** Employee information

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| EmpId | INT | PK, IDENTITY(1,1) | Auto-generated employee ID |
| EmpName | VARCHAR | NOT NULL | Employee name |
| Dept | VARCHAR | NOT NULL | Department |

### Customer Table

**Table:** `Customer`  
**Database:** IcSoftVer3  
**Purpose:** Customer master data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| CustId | NUMERIC(18,0) | PK | Customer ID |
| CustName | VARCHAR | NOT NULL | Customer name |

### Product Table

**Table:** `Product`  
**Database:** IcSoftVer3  
**Purpose:** Product catalog

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| ProdId | NUMERIC(18,0) | PK | Product ID |
| ProdName | VARCHAR | NOT NULL | Product name |
| InternalPartNo | VARCHAR | NULL | Internal part number |

**Notes:** 
- Products are sorted with non-null InternalPartNo first
- Used for both Part_No and Product_Name in PatternMaster

### Invent_Supplier Table

**Table:** `Invent_Supplier`  
**Database:** IcSoftVer3  
**Purpose:** Supplier/Pattern Maker data

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| SupId | NUMERIC(18,0) | PK | Supplier ID |
| SupName | VARCHAR | NOT NULL | Supplier name |

---

## 💻 Development Setup

### Prerequisites

- **Node.js:** v16 or higher
- **npm:** v7 or higher
- **SQL Server:** SQL Server Express or higher
- **SQL Server Authentication:** Enabled with sa user or equivalent
- **Git:** For version control

### Initial Setup

1. **Clone/Download Project:**
```powershell
# Navigate to project location
cd C:\Users\adity\OneDrive\Desktop\AKP_project
```

2. **Backend Setup:**
```powershell
cd backend
npm install
```

3. **Frontend Setup:**
```powershell
cd ../frontend
npm install
```

4. **Environment Configuration:**

Create/verify `.env` file in backend directory:
```env
PORT=5000
SQL_USER=sa
SQL_PASSWORD=akp@1234
SQL_SERVER=WARRIOR\\SQLEXPRESS
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
DB_NAME_4=BizSpot
```

5. **Database Setup:**

Run setup scripts:
```powershell
cd backend

# Create Users table
node scripts/create_users_table.js

# Create admin user
node scripts/create_admin_user.js

# Verify connections
node scripts/verify_db_connections.js
```

6. **Start Development Servers:**

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Development URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Base:** http://localhost:5000/api

### Default Login Credentials

```
Username: admin
Password: admin123
Role: admin
```

---

## 🚀 Deployment Instructions

### Production Build

**Frontend Build:**
```powershell
cd frontend
npm run build
```

**Build Output:** `frontend/dist/`

### Environment Variables for Production

**Backend (.env):**
```env
NODE_ENV=production
PORT=5000
SQL_USER=<production_user>
SQL_PASSWORD=<production_password>
SQL_SERVER=<production_server>
DB_NAME_1=IcSoftVer3
DB_NAME_2=IcSoftReportVer3
DB_NAME_3=IcSoftLedgerVer3
DB_NAME_4=BizSpot
JWT_SECRET=<strong_random_secret>
```

### Security Checklist for Production

- [ ] Change JWT_SECRET from hardcoded value
- [ ] Move JWT_SECRET to .env
- [ ] Change admin password
- [ ] Enable SQL Server encryption
- [ ] Configure CORS for production domain
- [ ] Set secure: true for cookies (HTTPS)
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Regular backup schedule
- [ ] Error logging service
- [ ] Performance monitoring

### Recommended Production Stack

- **Web Server:** Nginx (reverse proxy)
- **Process Manager:** PM2 (Node.js)
- **SSL:** Let's Encrypt or commercial certificate
- **Monitoring:** PM2 monitoring, Application Insights
- **Logging:** Winston, Morgan

---

## 📝 Change Log

### Version 1.0 - December 2, 2025

#### Added
- ✅ Multi-database support (4 databases)
- ✅ JWT-based authentication system
- ✅ Role-based access control (Admin, Manager, Employee)
- ✅ Pattern Master module with 26 fields
- ✅ Employee management with auto-ID generation
- ✅ Database Explorer with live sync
- ✅ Database selector component
- ✅ Admin dashboard for user management
- ✅ Comprehensive API endpoints
- ✅ Protected routes
- ✅ Login/logout functionality

#### Fixed
- ✅ Dual-write bug (IDENTITY_INSERT error)
- ✅ Frontend visibility issues
- ✅ Product Name auto-population in Pattern Master
- ✅ Product Name field locking behavior

#### Changed
- ✅ Database configuration from single to multi-database
- ✅ Employee form (removed manual EmpId input)
- ✅ Pattern Master form layout and validation
- ✅ API client to support database selection

#### Technical Debt & TODOs
- ⚠️ Move JWT_SECRET to environment variables
- ⚠️ Implement audit logging (User actions)
- ⚠️ Add CreatedBy/ModifiedBy to PatternMaster
- ⚠️ Implement pagination for Database Explorer
- ⚠️ Add search/filter capabilities
- ⚠️ Implement data export features
- ⚠️ Add unit tests
- ⚠️ Add integration tests
- ⚠️ Improve error handling and logging
- ⚠️ Add data validation on backend

---

## 🐛 Known Issues & Future Enhancements

### Known Issues

1. **Security:**
   - JWT_SECRET is hardcoded in server.js (should be in .env)
   - Default admin password is weak (should be changed after first login)

2. **Performance:**
   - Database Explorer loads all data (no pagination)
   - No caching strategy implemented
   - Multiple database queries on page load

3. **UX:**
   - No loading spinners for data fetching
   - Limited error messages
   - Page reload required when changing database
   - No confirmation dialogs for destructive actions

4. **Data Validation:**
   - Limited client-side validation
   - No backend data validation for optional fields
   - No input sanitization

### Future Enhancements

#### High Priority
1. **Audit System:**
   - Create AuditLog table
   - Track all CRUD operations
   - Record user actions with timestamps
   - IP address logging

2. **Pattern Master Enhancements:**
   - Add CreatedBy and ModifiedBy fields
   - Implement pattern editing
   - Pattern deletion with authorization
   - Pattern history/versioning
   - Print/export pattern specifications

3. **User Management:**
   - User profile editing
   - Password change functionality
   - User deactivation (soft delete)
   - User activity logs
   - Session management

4. **Search & Filtering:**
   - Search patterns by customer, part number
   - Filter by date ranges
   - Advanced search capabilities
   - Saved search queries

#### Medium Priority
1. **Reporting:**
   - Pattern reports
   - Employee reports
   - Customer reports
   - Export to Excel/PDF

2. **Dashboard:**
   - Statistics and analytics
   - Charts and visualizations
   - Recent activity feed
   - Key metrics

3. **Data Import/Export:**
   - Bulk import from Excel
   - Data export functionality
   - Backup/restore capabilities

4. **Mobile Responsiveness:**
   - Optimize for tablets
   - Optimize for mobile phones
   - Touch-friendly interfaces

#### Low Priority
1. **Notifications:**
   - Email notifications
   - In-app notifications
   - Alert system

2. **Integration:**
   - REST API documentation
   - Webhooks
   - Third-party integrations

3. **Internationalization:**
   - Multi-language support
   - Date/time localization
   - Currency formatting

---

## 📖 Additional Documentation

### Related Documents

1. **[Admin User Created Guide](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/docs/admin_user_created.md)**
   - Admin user creation summary
   - Login credentials
   - Verification steps
   - Usage instructions

2. **[Users Foreign Key Guide](file:///c:/Users/adity/OneDrive/Desktop/AKP_project/backend/docs/users_foreign_key_guide.md)**
   - Users table structure
   - Foreign key relationships
   - Recommended audit columns
   - Implementation examples

### Database Scripts

Located in `backend/scripts/`:

1. **create_users_table.js** - Creates Users table
2. **create_admin_user.js** - Creates default admin user
3. **check_admin.js** - Verifies admin user exists
4. **create_auth_table.js** - Legacy auth table creation
5. **create_icsoft.js** - ICSOFT table setup
6. **debug_tables.js** - Table debugging utilities
7. **seed_tables.js** - Seed sample data
8. **setup_db.js** - Complete database setup
9. **test_products.js** - Product data testing
10. **verify_db_connections.js** - Verify all 4 DB connections

---

## 🤝 Contributing Guidelines

### Code Standards

1. **Naming Conventions:**
   - React components: PascalCase
   - Functions: camelCase
   - Constants: UPPER_SNAKE_CASE
   - Files: PascalCase for components, camelCase for utilities

2. **Code Style:**
   - Use ES6+ syntax
   - Async/await over promises
   - Destructuring where appropriate
   - Proper error handling

3. **Database Queries:**
   - Always use parameterized queries
   - Never concatenate user input
   - Handle SQL errors properly
   - Use transactions for multi-step operations

4. **Git Workflow:**
   - Meaningful commit messages
   - Feature branches for new development
   - Pull requests for code review
   - Keep commits atomic and focused

---

## 📞 Support & Maintenance

### Troubleshooting

**Cannot connect to database:**
1. Verify SQL Server is running
2. Check server name in .env
3. Verify SQL authentication is enabled
4. Test credentials with SQL Server Management Studio

**Frontend not loading:**
1. Check if Vite dev server is running (port 5173)
2. Clear browser cache
3. Check browser console for errors
4. Verify API connection

**Authentication errors:**
1. Clear browser cookies
2. Check if backend is running
3. Verify JWT_SECRET matches
4. Check user exists in database

**Database selection not working:**
1. Check localStorage in browser
2. Verify all 4 databases are connected
3. Check network tab for x-database header
4. Reload page after selection

### Log Files

- **Backend Console:** Server logs, SQL queries, errors
- **Browser Console:** Frontend errors, network requests
- **SQL Server Logs:** Database errors and warnings

---

## ✅ Project Status Summary

### Completed Features ✓
- Multi-database architecture
- Authentication & authorization
- Pattern Master CRUD
- Employee management
- Database explorer
- Admin dashboard
- Protected routing
- Database selection

### Current State
- **Status:** Active Development
- **Environment:** Development
- **Deployment:** Local only
- **Version:** 1.0
- **Last Updated:** December 2, 2025

### Active Development
- Running on local development servers
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- 4 databases connected and operational

---

**Document Version:** 1.0  
**Last Updated:** December 2, 2025  
**Author:** Development Team  
**Maintained By:** AKP Project Team
