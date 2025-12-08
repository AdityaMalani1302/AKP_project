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

// 7. Get Products for dropdown (with search) - includes Grade info
app.get('/api/products', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT
                p.ProdId, 
                p.ProdName, 
                LTRIM(RTRIM(ISNULL(p.InternalPartNo, ''))) as InternalPartNo,
                p.Gid as GradeId,
                g.GradeName
            FROM Product p
            LEFT JOIN Grade g ON p.Gid = g.GradeId
        `;

        if (search) {
            query += ` WHERE p.InternalPartNo LIKE '%${search}%' OR p.ProdName LIKE '%${search}%'`;
        }

        query += `
            ORDER BY 
                CASE 
                    WHEN p.InternalPartNo IS NULL OR p.InternalPartNo = '' THEN 1 
                    ELSE 0 
                END,
                p.InternalPartNo
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

// Get Grades from Grade table
app.get('/api/grades', verifyToken, async (req, res) => {
    try {
        const result = await req.db.request().query`
            SELECT GradeId, GradeName 
            FROM Grade 
            ORDER BY GradeName
        `;
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching grades:', err);
        res.status(500).json({ error: 'Failed to fetch grades' });
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
        Serial_No, // Serial No field
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
        sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
        runner_bar_size, runner_bar_no, // Runner Bar fields
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

        // Serial No input
        request.input('Serial_No', sql.VarChar(255), Serial_No || null);

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
        request.input('ingate_size', sql.VarChar(255), ingate_size || null);
        request.input('no_of_ingate', sql.VarChar(255), no_of_ingate || null);
        request.input('runner_bar_size', sql.VarChar(255), runner_bar_size || null);
        request.input('runner_bar_no', sql.VarChar(255), runner_bar_no || null);

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
                Serial_No,
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
                sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
                runner_bar_size, runner_bar_no,
                rev_no_status, date, comment
            )
            OUTPUT INSERTED.PatternId
            VALUES (
                @Customer, @Part_No, @Product_Name, @Pattern_Maker,
                @PatternNo, @Bunch_Wt, @YieldPercent,
                @No_Of_Cavities, @Moulding_Box_Size, @Core_Wt,
                @Rack_Location, @Customer_Po_No,
                @Serial_No,
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
                @sand_riser_size, @no_of_sand_riser, @ingate_size, @no_of_ingate,
                @runner_bar_size, @runner_bar_no,
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

// GET /api/pattern-master - Get all patterns (summary for table display)
app.get('/api/pattern-master', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT TOP 100
                pm.*,
                c.CustName as CustomerName,
                s.SupName as Pattern_Maker_Name
            FROM PatternMaster pm
            LEFT JOIN Customer c ON pm.Customer = c.CustId
            LEFT JOIN Invent_Supplier s ON pm.Pattern_Maker = s.SupId
        `;

        if (search) {
            query += ` WHERE 
                pm.PatternNo LIKE '%${search}%' OR 
                c.CustName LIKE '%${search}%' OR
                pm.Serial_No LIKE '%${search}%'
            `;
        }

        query += ' ORDER BY pm.PatternId DESC';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching patterns:', err);
        res.status(500).json({ error: 'Failed to fetch patterns' });
    }
});

// GET /api/pattern-master/:id - Get single pattern with all details
app.get('/api/pattern-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));

        // Get main pattern record
        const patternResult = await request.query`
            SELECT * FROM PatternMaster WHERE PatternId = @id
        `;

        if (patternResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Pattern not found' });
        }

        const pattern = patternResult.recordset[0];

        // Get cavity/parts data
        const partsRequest = new sql.Request(req.db);
        partsRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));
        const partsResult = await partsRequest.query`
            SELECT * FROM PatternCavityMaster WHERE PatternId = @patternId
        `;

        // Get sleeves data
        const sleevesRequest = new sql.Request(req.db);
        sleevesRequest.input('patternId', sql.Numeric(18, 0), parseInt(id));
        const sleevesResult = await sleevesRequest.query`
            SELECT * FROM SleeveMaster WHERE PatternId = @patternId
        `;

        res.json({
            ...pattern,
            parts: partsResult.recordset,
            sleeveRows: sleevesResult.recordset
        });
    } catch (err) {
        console.error('Error fetching pattern details:', err);
        res.status(500).json({ error: 'Failed to fetch pattern details' });
    }
});

// DELETE /api/pattern-master/:id - Delete pattern and related records
app.delete('/api/pattern-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Numeric(18, 0), parseInt(id));

        // Delete related child records first (cascade should handle this, but be safe)
        await req.db.request().input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM PatternCavityMaster WHERE PatternId = @pid
        `;
        await req.db.request().input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM SleeveMaster WHERE PatternId = @pid
        `;

        // Delete main pattern
        const result = await request.query`
            DELETE FROM PatternMaster WHERE PatternId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Pattern not found' });
        }

        res.json({ success: true, message: 'Pattern deleted successfully' });
    } catch (err) {
        console.error('Error deleting pattern:', err);
        res.status(500).json({ error: 'Failed to delete pattern' });
    }
});

// PUT /api/pattern-master/:id - Update existing pattern
app.put('/api/pattern-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const {
        Customer, Part_No, Product_Name, Pattern_Maker, PatternNo,
        Bunch_Wt, YieldPercent,
        No_Of_Cavities, Moulding_Box_Size, Core_Wt,
        Rack_Location, Customer_Po_No,
        Serial_No,
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
        sand_riser_size, no_of_sand_riser, ingate_size, no_of_ingate,
        runner_bar_size, runner_bar_no,
        rev_no_status, date, comment,
        parts, // Dynamic parts array
        sleeveRows // Dynamic sleeve rows array
    } = req.body;

    // Validate required foreign keys
    if (!Customer || !Pattern_Maker) {
        return res.status(400).json({ error: 'Customer and Pattern Maker are required' });
    }

    const transaction = new sql.Transaction(req.db);

    try {
        await transaction.begin();

        // 1. Update PatternMaster
        const request = new sql.Request(transaction);
        request.input('id', sql.Numeric(18, 0), parseInt(id));
        request.input('Customer', sql.Numeric(18, 0), Customer);
        request.input('Part_No', sql.Numeric(18, 0), Part_No || null);
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
        request.input('Serial_No', sql.VarChar(255), Serial_No || null);
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
        request.input('shell_qty', sql.Int, shell_qty || null);
        request.input('coldBox_qty', sql.Int, coldBox_qty || null);
        request.input('noBake_qty', sql.Int, noBake_qty || null);
        request.input('mainCore_qty', sql.VarChar(255), mainCore_qty || null);
        request.input('sideCore_qty', sql.VarChar(255), sideCore_qty || null);
        request.input('looseCore_qty', sql.VarChar(255), looseCore_qty || null);
        request.input('breaker_core_size', sql.VarChar(255), breaker_core_size || null);
        request.input('down_sprue_size', sql.VarChar(255), down_sprue_size || null);
        request.input('foam_filter_size', sql.VarChar(255), foam_filter_size || null);
        request.input('sand_riser_size', sql.VarChar(255), sand_riser_size || null);
        request.input('no_of_sand_riser', sql.VarChar(255), no_of_sand_riser || null);
        request.input('ingate_size', sql.VarChar(255), ingate_size || null);
        request.input('no_of_ingate', sql.VarChar(255), no_of_ingate || null);
        request.input('runner_bar_size', sql.VarChar(255), runner_bar_size || null);
        request.input('runner_bar_no', sql.VarChar(255), runner_bar_no || null);
        request.input('rev_no_status', sql.VarChar(255), rev_no_status || null);
        request.input('date', sql.Date, date || null);
        request.input('comment', sql.VarChar(8000), comment || null);

        const updateResult = await request.query`
            UPDATE PatternMaster
            SET Customer = @Customer,
                Part_No = @Part_No,
                Product_Name = @Product_Name,
                Pattern_Maker = @Pattern_Maker,
                PatternNo = @PatternNo,
                Bunch_Wt = @Bunch_Wt,
                YieldPercent = @YieldPercent,
                No_Of_Cavities = @No_Of_Cavities,
                Moulding_Box_Size = @Moulding_Box_Size,
                Core_Wt = @Core_Wt,
                Rack_Location = @Rack_Location,
                Customer_Po_No = @Customer_Po_No,
                Serial_No = @Serial_No,
                Asset_No = @Asset_No,
                Tooling_PO_Date = @Tooling_PO_Date,
                Purchase_No = @Purchase_No,
                Purchase_Date = @Purchase_Date,
                Quoted_Estimated_Weight = @Quoted_Estimated_Weight,
                Pattern_Material_Details = @Pattern_Material_Details,
                No_Of_Patterns_Set = @No_Of_Patterns_Set,
                Pattern_Pieces = @Pattern_Pieces,
                Core_Box_Material_Details = @Core_Box_Material_Details,
                Core_Box_Location = @Core_Box_Location,
                Core_Box_S7_F4_No = @Core_Box_S7_F4_No,
                Core_Box_S7_F4_Date = @Core_Box_S7_F4_Date,
                No_Of_Core_Box_Set = @No_Of_Core_Box_Set,
                Core_Box_Pieces = @Core_Box_Pieces,
                Casting_Material_Grade = @Casting_Material_Grade,
                Total_Weight = @Total_Weight,
                Core_Type = @Core_Type,
                Main_Core = @Main_Core,
                Side_Core = @Side_Core,
                Loose_Core = @Loose_Core,
                Chaplets_COPE = @Chaplets_COPE,
                Chaplets_DRAG = @Chaplets_DRAG,
                Chills_COPE = @Chills_COPE,
                Chills_DRAG = @Chills_DRAG,
                Mould_Vents_Size = @Mould_Vents_Size,
                Mould_Vents_No = @Mould_Vents_No,
                shell_qty = @shell_qty,
                coldBox_qty = @coldBox_qty,
                noBake_qty = @noBake_qty,
                mainCore_qty = @mainCore_qty,
                sideCore_qty = @sideCore_qty,
                looseCore_qty = @looseCore_qty,
                breaker_core_size = @breaker_core_size,
                down_sprue_size = @down_sprue_size,
                foam_filter_size = @foam_filter_size,
                sand_riser_size = @sand_riser_size,
                no_of_sand_riser = @no_of_sand_riser,
                ingate_size = @ingate_size,
                no_of_ingate = @no_of_ingate,
                runner_bar_size = @runner_bar_size,
                runner_bar_no = @runner_bar_no,
                rev_no_status = @rev_no_status,
                date = @date,
                comment = @comment
            WHERE PatternId = @id
        `;

        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Pattern not found' });
        }

        // 2. Delete and re-insert PatternCavityMaster records
        await new sql.Request(transaction).input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM PatternCavityMaster WHERE PatternId = @pid
        `;

        if (parts && Array.isArray(parts) && parts.length > 0) {
            for (const part of parts) {
                if (part.partNo) {
                    const partReq = new sql.Request(transaction);
                    partReq.input('PatternId', sql.Numeric(18, 0), parseInt(id));
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

        // 3. Delete and re-insert SleeveMaster records
        await new sql.Request(transaction).input('pid', sql.Numeric(18, 0), parseInt(id)).query`
            DELETE FROM SleeveMaster WHERE PatternId = @pid
        `;

        if (sleeveRows && Array.isArray(sleeveRows) && sleeveRows.length > 0) {
            for (const sleeve of sleeveRows) {
                const sleeveReq = new sql.Request(transaction);
                sleeveReq.input('PatternId', sql.Numeric(18, 0), parseInt(id));
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
        res.json({ success: true, message: 'Pattern updated successfully' });

    } catch (err) {
        if (transaction) await transaction.rollback();
        console.error('Error updating pattern:', err);
        res.status(500).json({ error: 'Failed to update pattern' });
    }
});





// ========================================
// PLANNING MASTER ENDPOINTS (using PPC table)
// ========================================

// GET /api/raw-materials - Get raw materials for Item Code dropdown
app.get('/api/raw-materials', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT RawMatCode, RawMatName, RawMatID
            FROM RawMaterial 
            WHERE Saleable = 'Y' AND GrnTypeId NOT IN (176, 181, 192, 193)
        `;

        if (search) {
            query += ` AND (RawMatName LIKE '%${search}%' OR RawMatCode LIKE '%${search}%')`;
        }

        query += ' ORDER BY RawMatCode';

        const result = await req.db.request().query(query);
        console.log(`Raw materials fetched: ${result.recordset.length} items`);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching raw materials:', err);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// GET /api/raw-materials/all - Get ALL raw materials without filters (for debugging)
app.get('/api/raw-materials/all', verifyToken, async (req, res) => {
    try {
        const result = await req.db.request().query(`
            SELECT RawMatID, RawMatName, RawMatCode, Saleable, GrnTypeId
            FROM RawMaterial 
            ORDER BY RawMatID
        `);
        console.log(`All raw materials: ${result.recordset.length} items`);
        res.json({
            total: result.recordset.length,
            data: result.recordset.slice(0, 100)
        });
    } catch (err) {
        console.error('Error fetching all raw materials:', err);
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// GET /api/planning-master - Get all planning schedules from PPC table
app.get('/api/planning-master', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                id as ID,
                ItemCode,
                CustName as CustomerName,
                SQty as ScheduleQty,
                PlanDate
            FROM PPC
        `;

        if (search) {
            query += ` WHERE 
                ItemCode LIKE '%${search}%' OR 
                CustName LIKE '%${search}%'
            `;
        }

        query += ' ORDER BY id ASC';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching planning schedules:', err);
        res.status(500).json({ error: 'Failed to fetch planning schedules' });
    }
});

// POST /api/planning-master - Create new planning schedule in PPC table
app.post('/api/planning-master', verifyToken, async (req, res) => {
    const { ItemCode, CustomerName, ScheduleQty, PlanDate } = req.body;

    // Validation
    if (!ItemCode || !CustomerName || !ScheduleQty || !PlanDate) {
        return res.status(400).json({
            error: 'Item Code, Customer Name, Schedule Qty, and Plan Date are required'
        });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));

        const result = await request.query`
            INSERT INTO PPC (ItemCode, CustName, SQty, PlanDate)
            OUTPUT INSERTED.id
            VALUES (@ItemCode, @CustName, @SQty, @PlanDate)
        `;

        const newId = result.recordset[0].id;
        res.json({
            success: true,
            message: 'Planning schedule added successfully',
            id: newId
        });
    } catch (err) {
        console.error('Error adding planning schedule:', err);
        res.status(500).json({ error: 'Failed to add planning schedule' });
    }
});

// PUT /api/planning-master/:id - Update existing planning schedule in PPC table
app.put('/api/planning-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { ItemCode, CustomerName, ScheduleQty, PlanDate } = req.body;

    // Validation
    if (!ItemCode || !CustomerName || !ScheduleQty || !PlanDate) {
        return res.status(400).json({
            error: 'Item Code, Customer Name, Schedule Qty, and Plan Date are required'
        });
    }

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));
        request.input('ItemCode', sql.VarChar(50), ItemCode);
        request.input('CustName', sql.VarChar(50), CustomerName);
        request.input('SQty', sql.Numeric(18, 0), parseInt(ScheduleQty));
        request.input('PlanDate', sql.DateTime, new Date(PlanDate));

        const result = await request.query`
            UPDATE PPC
            SET 
                ItemCode = @ItemCode,
                CustName = @CustName,
                SQty = @SQty,
                PlanDate = @PlanDate
            WHERE id = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        res.json({ success: true, message: 'Planning schedule updated successfully' });
    } catch (err) {
        console.error('Error updating planning schedule:', err);
        res.status(500).json({ error: 'Failed to update planning schedule' });
    }
});

// DELETE /api/planning-master/:id - Delete planning schedule from PPC table
app.delete('/api/planning-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    console.log('DELETE request received for ID:', id);

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM PPC WHERE id = @id
        `;

        console.log('Delete result - rows affected:', result.rowsAffected[0]);

        if (result.rowsAffected[0] === 0) {
            console.log('No rows deleted - ID not found:', id);
            return res.status(404).json({ error: 'Planning schedule not found' });
        }

        console.log('Successfully deleted schedule ID:', id);
        res.json({ success: true, message: 'Planning schedule deleted successfully' });
    } catch (err) {
        console.error('Error deleting planning schedule:', err);
        res.status(500).json({ error: 'Failed to delete planning schedule' });
    }
});

// ========================================
// LAB MASTER ENDPOINTS
// ========================================

// GET /api/lab-master - Get all lab master records
app.get('/api/lab-master', verifyToken, async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT 
                LabMasterId,
                Customer, DrgNo, Description, Grade, PartWeight,
                MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
                C, Si, Mn, P, S,
                Cr, Cu, Mg_Chem, CE,
                CRCA, RR, PIG, MS, Mg_Mix,
                RegularCritical, LastBoxTemp, Remarks,
                CreatedAt, UpdatedAt
            FROM LabMaster
        `;

        if (search) {
            query += ` WHERE 
                Customer LIKE '%${search}%' OR 
                DrgNo LIKE '%${search}%' OR 
                Grade LIKE '%${search}%' OR
                Description LIKE '%${search}%'
            `;
        }

        query += ' ORDER BY LabMasterId DESC';

        const result = await req.db.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching lab master records:', err);
        res.status(500).json({ error: 'Failed to fetch lab master records' });
    }
});

// GET /api/lab-master/:id - Get single lab master record
app.get('/api/lab-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            SELECT * FROM LabMaster WHERE LabMasterId = @id
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Lab master record not found' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error fetching lab master record:', err);
        res.status(500).json({ error: 'Failed to fetch lab master record' });
    }
});

// POST /api/lab-master - Create new lab master record
app.post('/api/lab-master', verifyToken, async (req, res) => {
    const {
        // Details
        Customer, DrgNo, Description, Grade, PartWeight,
        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
        // Final Chemistry
        C, Si, Mn, P, S,
        Cr, Cu, Mg_Chem, CE,
        // Charge Mix
        CRCA, RR, PIG, MS, Mg_Mix,
        // Others
        RegularCritical, LastBoxTemp, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);

        // Details inputs
        request.input('Customer', sql.NVarChar(255), Customer || null);
        request.input('DrgNo', sql.NVarChar(100), DrgNo || null);
        request.input('Description', sql.NVarChar(500), Description || null);
        request.input('Grade', sql.NVarChar(100), Grade || null);
        request.input('PartWeight', sql.NVarChar(100), PartWeight || null);
        request.input('MinMaxThickness', sql.NVarChar(100), MinMaxThickness || null);
        request.input('ThicknessGroup', sql.NVarChar(100), ThicknessGroup || null);
        request.input('BaseChe_C', sql.NVarChar(50), BaseChe_C || null);
        request.input('BaseChe_Si', sql.NVarChar(50), BaseChe_Si || null);

        // Final Chemistry inputs
        request.input('C', sql.NVarChar(50), C || null);
        request.input('Si', sql.NVarChar(50), Si || null);
        request.input('Mn', sql.NVarChar(50), Mn || null);
        request.input('P', sql.NVarChar(50), P || null);
        request.input('S', sql.NVarChar(50), S || null);
        request.input('Cr', sql.NVarChar(50), Cr || null);
        request.input('Cu', sql.NVarChar(50), Cu || null);
        request.input('Mg_Chem', sql.NVarChar(50), Mg_Chem || null);
        request.input('CE', sql.NVarChar(50), CE || null);

        // Charge Mix inputs
        request.input('CRCA', sql.NVarChar(100), CRCA || null);
        request.input('RR', sql.NVarChar(100), RR || null);
        request.input('PIG', sql.NVarChar(100), PIG || null);
        request.input('MS', sql.NVarChar(100), MS || null);
        request.input('Mg_Mix', sql.NVarChar(100), Mg_Mix || null);

        // Others inputs
        request.input('RegularCritical', sql.NVarChar(50), RegularCritical || null);
        request.input('LastBoxTemp', sql.NVarChar(100), LastBoxTemp || null);
        request.input('Remarks', sql.NVarChar(2000), Remarks || null);

        const result = await request.query`
            INSERT INTO LabMaster (
                Customer, DrgNo, Description, Grade, PartWeight,
                MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
                C, Si, Mn, P, S,
                Cr, Cu, Mg_Chem, CE,
                CRCA, RR, PIG, MS, Mg_Mix,
                RegularCritical, LastBoxTemp, Remarks
            )
            OUTPUT INSERTED.LabMasterId
            VALUES (
                @Customer, @DrgNo, @Description, @Grade, @PartWeight,
                @MinMaxThickness, @ThicknessGroup, @BaseChe_C, @BaseChe_Si,
                @C, @Si, @Mn, @P, @S,
                @Cr, @Cu, @Mg_Chem, @CE,
                @CRCA, @RR, @PIG, @MS, @Mg_Mix,
                @RegularCritical, @LastBoxTemp, @Remarks
            )
        `;

        const newId = result.recordset[0].LabMasterId;
        res.json({
            success: true,
            message: 'Lab master record added successfully',
            id: newId
        });
    } catch (err) {
        console.error('Error adding lab master record:', err);
        res.status(500).json({ error: 'Failed to add lab master record' });
    }
});

// PUT /api/lab-master/:id - Update existing lab master record
app.put('/api/lab-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const {
        Customer, DrgNo, Description, Grade, PartWeight,
        MinMaxThickness, ThicknessGroup, BaseChe_C, BaseChe_Si,
        C, Si, Mn, P, S,
        Cr, Cu, Mg_Chem, CE,
        CRCA, RR, PIG, MS, Mg_Mix,
        RegularCritical, LastBoxTemp, Remarks
    } = req.body;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        // Details inputs
        request.input('Customer', sql.NVarChar(255), Customer || null);
        request.input('DrgNo', sql.NVarChar(100), DrgNo || null);
        request.input('Description', sql.NVarChar(500), Description || null);
        request.input('Grade', sql.NVarChar(100), Grade || null);
        request.input('PartWeight', sql.NVarChar(100), PartWeight || null);
        request.input('MinMaxThickness', sql.NVarChar(100), MinMaxThickness || null);
        request.input('ThicknessGroup', sql.NVarChar(100), ThicknessGroup || null);
        request.input('BaseChe_C', sql.NVarChar(50), BaseChe_C || null);
        request.input('BaseChe_Si', sql.NVarChar(50), BaseChe_Si || null);

        // Final Chemistry inputs
        request.input('C', sql.NVarChar(50), C || null);
        request.input('Si', sql.NVarChar(50), Si || null);
        request.input('Mn', sql.NVarChar(50), Mn || null);
        request.input('P', sql.NVarChar(50), P || null);
        request.input('S', sql.NVarChar(50), S || null);
        request.input('Cr', sql.NVarChar(50), Cr || null);
        request.input('Cu', sql.NVarChar(50), Cu || null);
        request.input('Mg_Chem', sql.NVarChar(50), Mg_Chem || null);
        request.input('CE', sql.NVarChar(50), CE || null);

        // Charge Mix inputs
        request.input('CRCA', sql.NVarChar(100), CRCA || null);
        request.input('RR', sql.NVarChar(100), RR || null);
        request.input('PIG', sql.NVarChar(100), PIG || null);
        request.input('MS', sql.NVarChar(100), MS || null);
        request.input('Mg_Mix', sql.NVarChar(100), Mg_Mix || null);

        // Others inputs
        request.input('RegularCritical', sql.NVarChar(50), RegularCritical || null);
        request.input('LastBoxTemp', sql.NVarChar(100), LastBoxTemp || null);
        request.input('Remarks', sql.NVarChar(2000), Remarks || null);


        const result = await request.query`
            UPDATE LabMaster
            SET Customer = @Customer,
                DrgNo = @DrgNo,
                Description = @Description,
                Grade = @Grade,
                PartWeight = @PartWeight,
                MinMaxThickness = @MinMaxThickness,
                ThicknessGroup = @ThicknessGroup,
                BaseChe_C = @BaseChe_C,
                BaseChe_Si = @BaseChe_Si,
                C = @C,
                Si = @Si,
                Mn = @Mn,
                P = @P,
                S = @S,
                Cr = @Cr,
                Cu = @Cu,
                Mg_Chem = @Mg_Chem,
                CE = @CE,
                CRCA = @CRCA,
                RR = @RR,
                PIG = @PIG,
                MS = @MS,
                Mg_Mix = @Mg_Mix,
                RegularCritical = @RegularCritical,
                LastBoxTemp = @LastBoxTemp,
                Remarks = @Remarks,
                UpdatedAt = SYSDATETIME()
            WHERE LabMasterId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Lab master record not found' });
        }

        res.json({ success: true, message: 'Lab master record updated successfully' });
    } catch (err) {
        console.error('Error updating lab master record:', err);
        res.status(500).json({ error: 'Failed to update lab master record' });
    }
});

// DELETE /api/lab-master/:id - Delete lab master record
app.delete('/api/lab-master/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const request = new sql.Request(req.db);
        request.input('id', sql.Int, parseInt(id));

        const result = await request.query`
            DELETE FROM LabMaster WHERE LabMasterId = @id
        `;

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Lab master record not found' });
        }

        res.json({ success: true, message: 'Lab master record deleted successfully' });
    } catch (err) {
        console.error('Error deleting lab master record:', err);
        res.status(500).json({ error: 'Failed to delete lab master record' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

