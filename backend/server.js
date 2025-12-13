const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const { connectSQL, sql } = require('./config/db');
const { verifyToken } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Optimization Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for dev/simplicity, enable in strict prod
}));
app.use(compression());

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    process.env.CORS_ORIGIN // e.g., http://192.168.1.10:5173
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow local network IPs (IPv4)
        // Regex matches http://192.168.x.x(:port)
        if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// Body Parsing
app.use(express.json());
app.use(cookieParser());

// Serve static files in production (Moved bevore DB connection to ensure app loads even if DB fails)
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'deployment') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));

    // We intentionally do NOT add the catch-all handler here yet.
    // The catch-all *must* be the very last route after all API routes.
    // However, static files (images, js, css) should be served here.
}

// Database Connection on Startup
connectSQL();

// Middleware to Attach Database Pool to Request
app.use((req, res, next) => {
    const { getPool } = require('./config/db');
    // Default to 'IcSoftVer3' (ERP) unless specified otherwise
    // We could make this dynamic based on route/headers if needed
    // For now, most routes use IcSoftVer3.
    // Specifying which DB to use:
    // Some routes might need specific DBs. 
    // Ideally, the route handler calls getPool(dbName).

    // For backward compatibility with the monolithic code that used req.db:
    // We'll attach the main pool.
    const pool = getPool('IcSoftVer3');
    if (pool) {
        req.db = pool;
        next();
    } else {
        // If DB isn't ready yet or failed
        res.status(503).json({ error: 'Database service unavailable' });
    }
});

// --- ROUTES MOUNTING ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const masterRoutes = require('./routes/masterRoutes');
const patternRoutes = require('./routes/patternRoutes');
const planningRoutes = require('./routes/planningRoutes');
const labRoutes = require('./routes/labRoutes');
const reportRoutes = require('./routes/reportRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const { initScheduler } = require('./services/schedulerService');

// Auth Routes (Public: Login, Register if admin)
// Note: /me is protected inside the router
app.use('/api/auth', authRoutes);

// Protected Routes
// We apply verifyToken middleware here to protect entire groups of routes
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/pattern-master', verifyToken, patternRoutes);
app.use('/api/lab-master', verifyToken, labRoutes);

// Planning Master - Mount at /api since it has multiple paths inside (/planning-master, /raw-materials)
app.use('/api', verifyToken, planningRoutes);

// Master Data Routes (Customers, Products, etc.)
// These were previously at /api/customers, /api/products directly.
// We can mount them at /api to preserve the URL structure, 
// OR mount at /api/master and update frontend.
// TO MINIMIZE FRONTEND CHANGES: We mount at /api and use the paths defined in router.
app.use('/api', verifyToken, masterRoutes);

// Report Automation Routes (admin-only enforced in routers)
app.use('/api/reports', verifyToken, reportRoutes);
app.use('/api/schedules', verifyToken, scheduleRoutes);



// Catch-all handler for SPA (Must be after API routes)
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'deployment') {
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

// Start Server (Listen on all interfaces for LAN access)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Local Access: http://localhost:${PORT}`);

    // Log LAN IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`LAN Access: http://${net.address}:${PORT}`);
            }
        }
    }

    // Initialize report scheduler after DB is ready
    setTimeout(() => {
        initScheduler();
    }, 3000);
});
