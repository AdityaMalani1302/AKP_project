const express = require('express');
const cors = require('cors');
const { sql, connectSQL, getPool } = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'supersecretkey123'; // In production, use .env

const cookieParser = require('cookie-parser');

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost origin
        if (origin.startsWith('http://localhost:')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Middleware to select database
app.use((req, res, next) => {
    const dbName = req.headers['x-database'] || req.query.db || 'IcSoftVer3';
    const pool = getPool(dbName);

    if (!pool) {
        // If the specific DB is not found, try to find it in the list of keys (in case user passed key name)
        // For now, just return error
        return res.status(400).json({ error: `Database '${dbName}' not found or not connected` });
    }
    req.db = pool;
    next();
});

// Connect to Databases
connectSQL();

// --- Middleware ---
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

const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied: Insufficient permissions' });
        }
    };
};

// --- Authentication Routes ---

// Register (Admin Only)
app.post('/api/auth/register', verifyToken, requireRole('admin'), async (req, res) => {
    const { username, password, fullName, role } = req.body;
    if (!username || !password || !fullName) return res.status(400).json({ error: 'Username, password, and full name required' });

    const userRole = role || 'employee';

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await req.db.request().query`
            INSERT INTO Users (Username, PasswordHash, FullName, Role, IsActive)
            VALUES (${username}, ${hashedPassword}, ${fullName}, ${userRole}, 1)
        `;
        res.json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.error('Registration error:', err);
        if (err.number === 2627) { // Unique constraint violation
            return res.status(400).json({ error: 'Username already exists' });
        }
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const result = await req.db.request().query`SELECT * FROM Users WHERE Username = ${username} AND IsActive = 1`;
        const user = result.recordset[0];

        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.PasswordHash);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.Id, username: user.Username, role: user.Role }, JWT_SECRET, { expiresIn: '8h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 8 * 60 * 60 * 1000 // 8 hours
        });

        res.json({ success: true, username: user.Username, role: user.Role });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});
// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Me (Check Auth Status)
app.get('/api/auth/me', verifyToken, (req, res) => {
    res.json({ user: req.user });
});

// --- Existing Routes ---

// 1. Fetch SQL Queries (Mock or Real)
app.get('/api/sql-queries', async (req, res) => {
    try {
        const result = await req.db.request().query`SELECT * FROM SQLQueries`;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching SQL queries:', err);
        res.json([
            { id: 1, query_text: "SELECT * FROM Users WHERE age > 25" },
            { id: 2, query_text: "SELECT * FROM Products WHERE category = 'Electronics'" }
        ]);
    }
});



// 4. Get All Tables
app.get('/api/tables', async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT name AS TABLE_NAME 
            FROM sys.tables 
            WHERE name != 'sysdiagrams'
        `;
        const tables = result.recordset.map(row => row.TABLE_NAME);
        res.json(tables);
    } catch (err) {
        console.error('Error fetching tables:', err);
        res.status(500).json({ error: 'Failed to fetch tables' });
    }
});

// 5. Get Table Data (Paginated)
app.get('/api/tables/:tableName', async (req, res) => {
    const { tableName } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    try {
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return res.status(400).json({ error: 'Invalid table name' });
        }

        // Get total count
        const countResult = await req.db.request().query(`SELECT COUNT(*) as total FROM [${tableName}]`);
        const total = countResult.recordset[0].total;

        // Get paginated data using ROW_NUMBER() for compatibility with older SQL Server versions
        const result = await req.db.request().query(`
            SELECT * FROM (
                SELECT *, ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS RowNum
                FROM [${tableName}]
            ) AS t
            WHERE RowNum > ${offset} AND RowNum <= ${offset + limit}
        `);

        // Remove RowNum from the result if desired, or keep it. 
        // For now, we keep it or let the frontend handle it.
        const data = result.recordset.map(row => {
            const { RowNum, ...rest } = row;
            return rest;
        });

        res.json({
            data: data,
            total,
            page,
            limit
        });
    } catch (err) {
        console.error(`Error fetching data for ${tableName}:`, err);
        res.status(500).json({ error: 'Failed to fetch table data' });
    }
});

// 6. Get Customers for dropdown (with search)
app.get('/api/customers', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT CustId, CustName FROM Customer';

        if (search) {
            query += ` WHERE CustName LIKE '%${search}%'`;
        }

        query += ' ORDER BY CustName';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// 7. Get Products for dropdown (with search)
app.get('/api/products', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT
                ProdId, 
                ProdName, 
                LTRIM(RTRIM(ISNULL(InternalPartNo, ''))) as InternalPartNo
            FROM Product 
        `;

        if (search) {
            query += ` WHERE InternalPartNo LIKE '%${search}%' OR ProdName LIKE '%${search}%'`;
        }

        query += `
            ORDER BY 
                CASE 
                    WHEN InternalPartNo IS NULL OR InternalPartNo = '' THEN 1 
                    ELSE 0 
                END,
                InternalPartNo
        `;

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// 8. Get Suppliers (Pattern Makers) for dropdown (with search)
app.get('/api/suppliers', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT SupId, SupName FROM Invent_Supplier';

        if (search) {
            query += ` WHERE SupName LIKE '%${search}%'`;
        }

        query += ' ORDER BY SupName';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching suppliers:', err);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// Get Sleeves from RawMaterial table (GrnTypeId = 141)
app.get('/api/sleeves', verifyToken, async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT RawMatID, RawMatName 
            FROM RawMaterial 
            WHERE GrnTypeId = 141
            ORDER BY RawMatName
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching sleeves:', err);
        res.status(500).json({ error: 'Failed to fetch sleeves' });
    }
});

// POST /api/pattern-master - Add a new pattern
app.post('/api/pattern-master', verifyToken, async (req, res) => {
    const {
        Customer, Part_No, Product_Name, Pattern_Maker, PatternNo,
        Bunch_Wt, YieldPercent,
        No_Of_Cavities, Moulding_Box_Size, Core_Wt,
        Rack_Location, Customer_Po_No,
        // New Fields
        Asset_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
        Quoted_Estimated_Weight, Pattern_Material_Details, No_Of_Patterns_Set, Pattern_Pieces,
        Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No, Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
        Casting_Material_Grade, Total_Weight, Core_Type,
        Main_Core, Side_Core, Loose_Core,
        Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
        Mould_Vents_Size, Mould_Vents_No,
        // Core Quantity Columns
        shell_qty, coldBox_qty, noBake_qty,
        mainCore_qty, sideCore_qty, looseCore_qty,
        // Moulding Section Fields
        breaker_core_size, down_sprue_size, foam_filter_size,
        sand_riser_size, no_of_sand_riser, sand_riser_ingate_size, no_of_ingate,
        // Additional Info Fields
        rev_no_status, date, comment,
        parts, // Dynamic parts array
        sleeveRows // Dynamic sleeve rows array
    } = req.body;

    // Validate required foreign keys (Basic validation)
    if (!Customer || !Pattern_Maker) {
        return res.status(400).json({ error: 'Customer and Pattern Maker are required' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        // 1. Insert into PatternMaster
        const request = new sql.Request(transaction);

        // Add all inputs
        request.input('Customer', sql.Numeric(18, 0), Customer);
        request.input('Part_No', sql.Numeric(18, 0), Part_No || null); // Can be null if using parts array
        request.input('Product_Name', sql.Numeric(18, 0), Product_Name || null);
        request.input('Pattern_Maker', sql.Numeric(18, 0), Pattern_Maker);
        request.input('PatternNo', sql.VarChar(255), PatternNo || null);
        request.input('Bunch_Wt', sql.VarChar(255), Bunch_Wt || null);
        request.input('YieldPercent', sql.VarChar(255), YieldPercent || null);
        request.input('No_Of_Cavities', sql.VarChar(255), No_Of_Cavities || null);
        request.input('Moulding_Box_Size', sql.VarChar(255), Moulding_Box_Size || null);
        request.input('Core_Wt', sql.VarChar(255), Core_Wt || null);
        request.input('Rack_Location', sql.VarChar(255), Rack_Location || null);
        request.input('Customer_Po_No', sql.VarChar(255), Customer_Po_No || null);

        // New Inputs
        request.input('Asset_No', sql.VarChar(255), Asset_No || null);
        request.input('Tooling_PO_Date', sql.Date, Tooling_PO_Date || null);
        request.input('Purchase_No', sql.VarChar(255), Purchase_No || null);
        request.input('Purchase_Date', sql.Date, Purchase_Date || null);
        request.input('Quoted_Estimated_Weight', sql.VarChar(255), Quoted_Estimated_Weight || null);
        request.input('Pattern_Material_Details', sql.VarChar(255), Pattern_Material_Details || null);
        request.input('No_Of_Patterns_Set', sql.VarChar(255), No_Of_Patterns_Set || null);
        request.input('Pattern_Pieces', sql.VarChar(255), Pattern_Pieces || null);
        request.input('Core_Box_Material_Details', sql.VarChar(255), Core_Box_Material_Details || null);
        request.input('Core_Box_Location', sql.VarChar(255), Core_Box_Location || null);
        request.input('Core_Box_S7_F4_No', sql.VarChar(255), Core_Box_S7_F4_No || null);
        request.input('Core_Box_S7_F4_Date', sql.Date, Core_Box_S7_F4_Date || null);
        request.input('No_Of_Core_Box_Set', sql.VarChar(255), No_Of_Core_Box_Set || null);
        request.input('Core_Box_Pieces', sql.VarChar(255), Core_Box_Pieces || null);
        request.input('Casting_Material_Grade', sql.VarChar(255), Casting_Material_Grade || null);
        request.input('Total_Weight', sql.VarChar(255), Total_Weight || null);
        request.input('Core_Type', sql.VarChar(255), Core_Type || null);
        request.input('Main_Core', sql.VarChar(255), Main_Core || null);
        request.input('Side_Core', sql.VarChar(255), Side_Core || null);
        request.input('Loose_Core', sql.VarChar(255), Loose_Core || null);
        request.input('Chaplets_COPE', sql.VarChar(255), Chaplets_COPE || null);
        request.input('Chaplets_DRAG', sql.VarChar(255), Chaplets_DRAG || null);
        request.input('Chills_COPE', sql.VarChar(255), Chills_COPE || null);
        request.input('Chills_DRAG', sql.VarChar(255), Chills_DRAG || null);
        request.input('Mould_Vents_Size', sql.VarChar(255), Mould_Vents_Size || null);
        request.input('Mould_Vents_No', sql.VarChar(255), Mould_Vents_No || null);

        // Core quantity inputs
        request.input('shell_qty', sql.Int, shell_qty || null);
        request.input('coldBox_qty', sql.Int, coldBox_qty || null);
        request.input('noBake_qty', sql.Int, noBake_qty || null);
        request.input('mainCore_qty', sql.VarChar(255), mainCore_qty || null);
        request.input('sideCore_qty', sql.VarChar(255), sideCore_qty || null);
        request.input('looseCore_qty', sql.VarChar(255), looseCore_qty || null);

        // Moulding section inputs
        request.input('breaker_core_size', sql.VarChar(255), breaker_core_size || null);
        request.input('down_sprue_size', sql.VarChar(255), down_sprue_size || null);
        request.input('foam_filter_size', sql.VarChar(255), foam_filter_size || null);
        request.input('sand_riser_size', sql.VarChar(255), sand_riser_size || null);
        request.input('no_of_sand_riser', sql.VarChar(255), no_of_sand_riser || null);
        request.input('sand_riser_ingate_size', sql.VarChar(255), sand_riser_ingate_size || null);
        request.input('no_of_ingate', sql.VarChar(255), no_of_ingate || null);

        // Additional info inputs
        request.input('rev_no_status', sql.VarChar(255), rev_no_status || null);
        request.input('date', sql.Date, date || null);
        request.input('comment', sql.VarChar(8000), comment || null);

        // NOTE: Ensure these columns exist in your PatternMaster table. 
        // If not, you need to ALTER the table to add them.
        const result = await request.query`
            INSERT INTO PatternMaster (
                Customer, Part_No, Product_Name, Pattern_Maker,
                PatternNo, Bunch_Wt, YieldPercent,
                No_Of_Cavities, Moulding_Box_Size, Core_Wt,
                Rack_Location, Customer_Po_No,
                Asset_No, Tooling_PO_Date, Purchase_No, Purchase_Date,
                Quoted_Estimated_Weight, Pattern_Material_Details, No_Of_Patterns_Set, Pattern_Pieces,
                Core_Box_Material_Details, Core_Box_Location, Core_Box_S7_F4_No, Core_Box_S7_F4_Date, No_Of_Core_Box_Set, Core_Box_Pieces,
                Casting_Material_Grade, Total_Weight, Core_Type,
                Main_Core, Side_Core, Loose_Core,
                Chaplets_COPE, Chaplets_DRAG, Chills_COPE, Chills_DRAG,
                Mould_Vents_Size, Mould_Vents_No,
                shell_qty, coldBox_qty, noBake_qty,
                mainCore_qty, sideCore_qty, looseCore_qty,
                breaker_core_size, down_sprue_size, foam_filter_size,
                sand_riser_size, no_of_sand_riser, sand_riser_ingate_size, no_of_ingate,
                rev_no_status, date, comment
            )
            OUTPUT INSERTED.PatternId
            VALUES (
                @Customer, @Part_No, @Product_Name, @Pattern_Maker,
                @PatternNo, @Bunch_Wt, @YieldPercent,
                @No_Of_Cavities, @Moulding_Box_Size, @Core_Wt,
                @Rack_Location, @Customer_Po_No,
                @Asset_No, @Tooling_PO_Date, @Purchase_No, @Purchase_Date,
                @Quoted_Estimated_Weight, @Pattern_Material_Details, @No_Of_Patterns_Set, @Pattern_Pieces,
                @Core_Box_Material_Details, @Core_Box_Location, @Core_Box_S7_F4_No, @Core_Box_S7_F4_Date, @No_Of_Core_Box_Set, @Core_Box_Pieces,
                @Casting_Material_Grade, @Total_Weight, @Core_Type,
                @Main_Core, @Side_Core, @Loose_Core,
                @Chaplets_COPE, @Chaplets_DRAG, @Chills_COPE, @Chills_DRAG,
                @Mould_Vents_Size, @Mould_Vents_No,
                @shell_qty, @coldBox_qty, @noBake_qty,
                @mainCore_qty, @sideCore_qty, @looseCore_qty,
                @breaker_core_size, @down_sprue_size, @foam_filter_size,
                @sand_riser_size, @no_of_sand_riser, @sand_riser_ingate_size, @no_of_ingate,
                @rev_no_status, @date, @comment
            )
        `;

        const newPatternId = result.recordset[0].PatternId;

        // 2. Insert into PatternCavityMaster (Dynamic Parts)
        if (parts && Array.isArray(parts) && parts.length > 0) {
            // Ensure PatternCavityMaster table exists
            const checkTableReq = new sql.Request(transaction);
            await checkTableReq.query`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PatternCavityMaster')
                CREATE TABLE PatternCavityMaster (
                    PartRowId INT IDENTITY(1,1) PRIMARY KEY,
                    PatternId NUMERIC(18, 0),
                    PartNo INT,
                    ProductName NVARCHAR(255),
                    Qty INT,
                    Weight DECIMAL(18,2),
                    FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
                )
            `;

            for (const part of parts) {
                if (part.partNo) { // Only insert if partNo is present
                    const partReq = new sql.Request(transaction);
                    partReq.input('PatternId', sql.Numeric(18, 0), newPatternId);
                    partReq.input('PartNo', sql.Int, part.partNo);
                    partReq.input('ProductName', sql.VarChar(255), part.productName || '');
                    partReq.input('Qty', sql.Int, parseInt(part.qty) || 0);
                    partReq.input('Weight', sql.Decimal(18, 2), parseFloat(part.weight) || 0);

                    await partReq.query`
                        INSERT INTO PatternCavityMaster (PatternId, PartNo, ProductName, Qty, Weight)
                        VALUES (@PatternId, @PartNo, @ProductName, @Qty, @Weight)
                    `;
                }
            }
        }

        // 4. Insert into SleeveMaster (Dynamic Sleeve Rows)
        if (sleeveRows && Array.isArray(sleeveRows) && sleeveRows.length > 0) {
            // Ensure SleeveMaster table exists
            const checkSleeveTableReq = new sql.Request(transaction);
            await checkSleeveTableReq.query`
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SleeveMaster')
                CREATE TABLE SleeveMaster (
                    SleeveRowId INT IDENTITY(1,1) PRIMARY KEY,
                    PatternId NUMERIC(18, 0),
                    sleeve_name NVARCHAR(255) NULL,
                    sleeve_type_size NVARCHAR(255) NULL,
                    quantity INT NULL,
                    FOREIGN KEY (PatternId) REFERENCES PatternMaster(PatternId)
                )
            `;

            for (const sleeve of sleeveRows) {
                const sleeveReq = new sql.Request(transaction);
                sleeveReq.input('PatternId', sql.Numeric(18, 0), newPatternId);
                sleeveReq.input('sleeve_name', sql.NVarChar(255), sleeve.sleeve_name || null);
                sleeveReq.input('sleeve_type_size', sql.NVarChar(255), sleeve.sleeve_type_size || null);
                sleeveReq.input('quantity', sql.Int, sleeve.quantity || null);

                await sleeveReq.query`
                    INSERT INTO SleeveMaster (PatternId, sleeve_name, sleeve_type_size, quantity)
                    VALUES (@PatternId, @sleeve_name, @sleeve_type_size, @quantity)
                `;
            }
        }

        await transaction.commit();
        res.json({ success: true, message: 'Pattern added successfully', patternId: newPatternId });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error adding pattern:', err);
        res.status(500).json({ error: 'Failed to add pattern. Ensure database schema is updated.' });
    }
});


