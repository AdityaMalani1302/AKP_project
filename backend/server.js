const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// Fail-fast validation for critical environment variables
const requiredEnvVars = ['JWT_SECRET', 'SQL_USER', 'SQL_PASSWORD', 'SQL_SERVER'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.error(`FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please check your .env file configuration.');
    process.exit(1);
}

const { connectSQL, sql } = require('./config/db');
const { verifyToken, requirePage } = require('./middleware/authMiddleware');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Optimization Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // React needs these
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: null, // Explicitly disable HTTPS upgrade
        },
    },
    hsts: false, // Disable HSTS since we are running on HTTP
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
}));
app.use(compression());

// CORS Configuration
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    process.env.CORS_ORIGIN,      // e.g., http://192.168.1.10:5173
    process.env.FRONTEND_URL       // Production frontend URL
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

        // Allow Vercel preview deployments (*.vercel.app)
        if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }

        // Allow Cloudflare tunnel domains (*.trycloudflare.com)
        if (/^https:\/\/.*\.trycloudflare\.com$/.test(origin)) {
            return callback(null, true);
        }

        // Allow AKP Foundries domain (production)
        if (/^https?:\/\/(.*\.)?akpfoundries\.com$/.test(origin)) {
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

// Health Check Endpoint (no auth required)
app.get('/api/health', (req, res) => {
    const { getPool } = require('./config/db');
    const dbPool = getPool('IcSoftVer3');
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: dbPool ? 'connected' : 'disconnected'
    });
});

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
const qualityLabRoutes = require('./routes/qualityLabRoutes');
const reportRoutes = require('./routes/reportRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const itManagementRoutes = require('./routes/itManagementRoutes');


const salesDashboardRoutes = require('./routes/salesDashboardRoutes');
const financeDashboardRoutes = require('./routes/financeDashboardRoutes');
const arDashboardRoutes = require('./routes/arDashboardRoutes');
const productionDashboardRoutes = require('./routes/productionDashboardRoutes');
const drawingMasterRoutes = require('./routes/drawingMasterRoutes');
const { initScheduler } = require('./services/schedulerService');

// Auth Routes (Public: Login, Register if admin)
// Note: /me is protected inside the router
// Apply rate limiting to auth routes (especially login)
app.use('/api/auth', authLimiter, authRoutes);

// Protected Routes
// We apply verifyToken middleware here to protect entire groups of routes
// requirePage enforces page-level permissions for employees
app.use('/api/users', verifyToken, userRoutes);
app.use('/api/pattern-master', verifyToken, patternRoutes);
app.use('/api/lab-master', verifyToken, labRoutes);
app.use('/api/quality-lab', verifyToken, requirePage('quality-lab'), qualityLabRoutes);

// Sales & Finance Dashboards (Must be before generic /api routes)
app.use('/api/sales-dashboard', verifyToken, salesDashboardRoutes);
app.use('/api/finance-dashboard', verifyToken, financeDashboardRoutes);
app.use('/api/ar-dashboard', verifyToken, arDashboardRoutes);
app.use('/api/production-dashboard', verifyToken, productionDashboardRoutes);
app.use('/api/drawing-master', verifyToken, drawingMasterRoutes);

// Master Data Routes (Customers, Products, etc.)
// These were previously at /api/customers, /api/products directly.
// We can mount them at /api to preserve the URL structure, 
// OR mount at /api/master and update frontend.
// TO MINIMIZE FRONTEND CHANGES: We mount at /api and use the paths defined in router.
app.use('/api', verifyToken, masterRoutes);

// Planning Master - Mount at /api since it has multiple paths inside (/planning-master, /raw-materials)
app.use('/api', verifyToken, requirePage('planning-master'), planningRoutes);



// Report Automation Routes (admin-only enforced in routers)
app.use('/api/reports', verifyToken, reportRoutes);
app.use('/api/schedules', verifyToken, scheduleRoutes);
app.use('/api/it-management', verifyToken, itManagementRoutes);

// Centralized Error Handler (must be after all routes)
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 for API routes (only if path starts with /api and no route matched)
app.use('/api', notFoundHandler);

// Error handler (catches errors from all routes)
app.use(errorHandler);

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
