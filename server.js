const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const isVercel = process.env.VERCEL === '1';

// Socket.IO (skip on Vercel serverless — devices use polling fallback)
let io;
if (!isVercel) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000
  });
}

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
  message: { error: 'Too many requests, try again later' }
});
app.use('/api', limiter);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const adminPath = isVercel ? path.join(__dirname, 'admin') : path.join(__dirname, '..', 'admin-panel');
app.use('/admin', express.static(adminPath));

// ========== SOCKET.IO (local only) ==========
const webrtcSessions = new Map();

if (io) {
  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on('join-device', (deviceId) => {
      socket.join(`device:${deviceId}`);
      console.log(`[WS] ${socket.id} joined device:${deviceId}`);
    });

    socket.on('join-room', (roomId) => {
      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('peer-joined', { socketId: socket.id });
    });

    socket.on('webrtc-offer', (data) => {
      socket.to(`room:${data.roomId}`).emit('webrtc-offer', { offer: data.offer, socketId: socket.id });
    });

    socket.on('webrtc-answer', (data) => {
      socket.to(`room:${data.roomId}`).emit('webrtc-answer', { answer: data.answer, socketId: socket.id });
    });

    socket.on('webrtc-ice', (data) => {
      socket.to(`room:${data.roomId}`).emit('webrtc-ice', { candidate: data.candidate, socketId: socket.id });
    });

    socket.on('device-update', (data) => {
      io.to(`device:${data.deviceId}`).emit('update', data);
    });

    socket.on('command', (data) => {
      io.to(`device:${data.deviceId}`).emit('command', data);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  app.set('io', io);
} else {
  app.set('io', null);

  // Video relay (skip on Vercel — no Socket.IO)
  // Endpoints kept but return 404 when io is null
  app.post('/api/stream/frame', (req, res) => res.status(503).json({ error: 'Streaming not available on serverless' }));
  app.get('/api/stream/live/:deviceId', (req, res) => res.status(503).json({ error: 'Streaming not available on serverless' }));
  app.get('/api/stream/hls/:deviceId/:segment', (req, res) => res.status(503).json({ error: 'Streaming not available on serverless' }));
}

// ========== ROUTES ==========
app.use('/api/auth', require('./routes/auth'));
app.use('/api/devices', require('./routes/devices'));
app.use('/api/sms', require('./routes/sms'));
app.use('/api/mms', require('./routes/mms'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/geofence', require('./routes/geofence'));
app.use('/api/apps', require('./routes/apps'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/browser', require('./routes/browser'));
app.use('/api/screenshot', require('./routes/screenshot'));
app.use('/api/pictures', require('./routes/pictures'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/remote', require('./routes/remote'));
app.use('/api/live', require('./routes/live'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/files', require('./routes/files'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/sms-commands', require('./routes/sms-commands'));
app.use('/api/sim', require('./routes/sim'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/blocked', require('./routes/blocked'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/device', require('./routes/device'));

// Health check
app.get('/api/health', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    routes: app._router?.stack?.filter(r => r.route || r.name === 'router').length || 27,
    memory: { heapUsed: Math.round(memory.heapUsed / 1024 / 1024) + 'MB', heapTotal: Math.round(memory.heapTotal / 1024 / 1024) + 'MB' },
    env: process.env.NODE_ENV || 'development'
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

// ========== START (skip on Vercel — api/index.js handles requests) ==========
if (!isVercel) {
  const PORT = parseInt(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  server.listen(PORT, HOST, () => {
    console.log(`\n========================================`);
    console.log(`  Parental Control Server v2.0`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Listening: ${HOST}:${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/api/health`);
    console.log(`  LAN:    http://192.168.31.74:${PORT}/api/health`);
    console.log(`  Admin:  http://localhost:${PORT}/admin/`);
    console.log(`========================================\n`);
  });
}

module.exports = app;

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[SHUTDOWN] HTTP server closed');
    if (io) io.close();
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[SHUTDOWN] Forced exit after 10s');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  shutdown('UNCAUGHT');
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});
