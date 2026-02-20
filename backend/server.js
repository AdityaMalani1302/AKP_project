const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { DB } = require('./config/constants');
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
const { initScheduler } = require('./services/schedulerService');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { performanceMonitor } = require('./middleware/performanceMonitor');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patternRoutes = require('./routes/patternRoutes');
const labRoutes = require('./routes/labRoutes');
const qualityLabRoutes = require('./routes/qualityLabRoutes'); // Assuming index.js handles export
const salesDashboardRoutes = require('./routes/salesDashboardRoutes');
const productionDashboardRoutes = require('./routes/productionDashboardRoutes');
const financeDashboardRoutes = require('./routes/financeDashboardRoutes');
const arDashboardRoutes = require('./routes/arDashboardRoutes');
const itManagementRoutes = require('./routes/itManagementRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const masterRoutes = require('./routes/masterRoutes');
const planningRoutes = require('./routes/planningRoutes');
const reportRoutes = require('./routes/reportRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const drawingMasterRoutes = require('./routes/drawingMasterRoutes');
const rejectionDashboardRoutes = require('./routes/rejectionDashboardRoutes');
const dailyDashboardRoutes = require('./routes/dailyDashboardRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

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
            connectSrc: ["'self'", "https://*.trycloudflare.com", "http://localhost:*", "ws://localhost:*"],
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
    // Skip DB attachment for health check (it handles its own DB check)
    if (req.path === '/api/health') {
        return next();
    }

    const { getPool } = require('./config/db');
    // Default to 'IcSoftVer3' (ERP) unless specified otherwise
    const pool = getPool(DB.DEFAULT_POOL);
    if (pool) {
        req.db = pool;
        next();
    } else {
        // If DB isn't ready yet or failed
        res.status(503).json({ error: 'Database service unavailable' });
    }
});

// Request Logging Middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`);
    next();
});

// Performance Monitoring Middleware (tracks API response times)
app.use(performanceMonitor);

// Apply Global Rate Limiting to all API routes
app.use('/api', apiLimiter);

// --- ROUTES MOUNTING ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pattern-master', verifyToken, patternRoutes);
app.use('/api/lab-master', verifyToken, labRoutes);
app.use('/api/quality-lab', verifyToken, qualityLabRoutes);
app.use('/api/sales-dashboard', verifyToken, salesDashboardRoutes);
app.use('/api/production-dashboard', verifyToken, productionDashboardRoutes);
app.use('/api/finance-dashboard', verifyToken, financeDashboardRoutes);
app.use('/api/ar-dashboard', verifyToken, arDashboardRoutes);
app.use('/api/it-management', verifyToken, itManagementRoutes);
app.use('/api/marketing', verifyToken, marketingRoutes);
app.use('/api/master', verifyToken, masterRoutes);
app.use('/api/planning', verifyToken, planningRoutes);
app.use('/api/reports', verifyToken, reportRoutes);
app.use('/api/schedule', verifyToken, scheduleRoutes);
app.use('/api/drawing-master', verifyToken, drawingMasterRoutes);
app.use('/api/rejection-dashboard', verifyToken, rejectionDashboardRoutes);
app.use('/api/daily-dashboard', verifyToken, dailyDashboardRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// --- ALIAS ROUTES (for frontend compatibility) ---
// These route aliases map frontend API calls to existing route handlers
// Frontend calls /api/customers -> masterRoutes handles /customers
app.use('/api/customers', verifyToken, (req, res, next) => { req.url = '/customers' + req.url; masterRoutes(req, res, next); });
app.use('/api/products', verifyToken, (req, res, next) => { req.url = '/products' + req.url; masterRoutes(req, res, next); });
app.use('/api/suppliers', verifyToken, (req, res, next) => { req.url = '/suppliers' + req.url; masterRoutes(req, res, next); });
app.use('/api/sleeves', verifyToken, (req, res, next) => { req.url = '/sleeves' + req.url; masterRoutes(req, res, next); });
// Frontend calls /api/tables -> masterRoutes handles /tables
app.use('/api/tables', verifyToken, (req, res, next) => { req.url = '/tables' + req.url; masterRoutes(req, res, next); });
// Frontend calls /api/raw-materials -> planningRoutes handles /raw-materials
app.use('/api/raw-materials', verifyToken, (req, res, next) => { req.url = '/raw-materials' + req.url; planningRoutes(req, res, next); });
// Frontend calls /api/planning-master -> planningRoutes handles /planning-master
app.use('/api/planning-master', verifyToken, (req, res, next) => { req.url = '/planning-master' + req.url; planningRoutes(req, res, next); });
// Frontend calls /api/schedules -> scheduleRoutes handles /
app.use('/api/schedules', verifyToken, (req, res, next) => { scheduleRoutes(req, res, next); });
// Frontend calls /api/sleeve-indent -> planningRoutes handles /sleeve-indent
app.use('/api/sleeve-indent', verifyToken, (req, res, next) => { req.url = '/sleeve-indent' + req.url; planningRoutes(req, res, next); });
// Frontend calls /api/sleeve-requirement -> planningRoutes handles /sleeve-requirement
app.use('/api/sleeve-requirement', verifyToken, (req, res, next) => { req.url = '/sleeve-requirement' + req.url; planningRoutes(req, res, next); });
// Frontend calls /api/planning-entry -> planningRoutes handles /planning-entry
app.use('/api/planning-entry', verifyToken, (req, res, next) => { req.url = '/planning-entry' + req.url; planningRoutes(req, res, next); });

// Centralized Error Handler (must be after all routes)
app.use('/api', notFoundHandler); // catch 404s for API routes
app.use(errorHandler);

// SPA Catch-all Route Handler (MUST be after all API routes and error handlers)
// This serves index.html for all non-API routes, enabling client-side routing
// Note: Using /{*splat} syntax for compatibility with newer path-to-regexp versions
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'deployment') {
    app.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    });
}

// Start Server (Listen on all interfaces for LAN access)
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Local Access: http://localhost:${PORT}`);

    // Log LAN IP
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                logger.info(`LAN Access: http://${net.address}:${PORT}`);
            }
        }
    }

    // Initialize report scheduler after DB is ready
    setTimeout(() => {
        initScheduler();
    }, 3000);
});
