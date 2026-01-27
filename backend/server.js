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
const { initScheduler } = require('./services/schedulerService');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

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
    const pool = getPool('IcSoftVer3');
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

// Apply Global Rate Limiting to all API routes
app.use('/api', apiLimiter);

// --- ROUTES MOUNTING ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pattern-master', patternRoutes);
app.use('/api/lab-master', labRoutes);
app.use('/api/quality-lab', qualityLabRoutes);
app.use('/api/sales-dashboard', salesDashboardRoutes);
app.use('/api/production-dashboard', productionDashboardRoutes);
app.use('/api/finance-dashboard', financeDashboardRoutes);
app.use('/api/ar-dashboard', arDashboardRoutes);
app.use('/api/it-management', itManagementRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/drawing-master', drawingMasterRoutes);

// Centralized Error Handler (must be after all routes)
app.use('/api', notFoundHandler); // catch 404s for API routes
app.use(errorHandler);

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
