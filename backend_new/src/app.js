const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./config/logger');

const rateLimit = require('express-rate-limit');

const app = express();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// Dev: allow Vite (5173) and CRA-style (3000) frontends.
// Prod: allow only the production origin defined in CORS_ORIGIN env var.
// NOTE: Access-Control-Allow-Origin: * is intentionally disabled to prevent
//       cross-site leaks of scan results.
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow server-to-server requests (no origin header) in development
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS: Blocked request from disallowed origin: ${origin}`);
            callback(new Error(`CORS policy: origin '${origin}' not allowed`));
        }
    },
    credentials: true,       // Allow cookies / Authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// Middlewares
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Apply Rate Limiter
app.use(limiter);
// Http Logger
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

const authRoutes = require('./routes/auth.routes');
const scanRoutes = require('./routes/scan.routes');
const reviewRoutes = require('./routes/review.routes');
const adminRoutes = require('./routes/admin.routes');
const mlopsRoutes = require('./routes/mlops.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/mlops', mlopsRoutes);

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'Multimodal Phishing Detection System API' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

module.exports = app;
