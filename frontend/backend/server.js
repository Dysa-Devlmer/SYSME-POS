// =====================================================
// SYSME POS - Main API Server
// =====================================================
// Enterprise-grade Express.js server with all integrations
//
// @author JARVIS AI Assistant
// @date 2025-11-20
// @version 2.1.0
// =====================================================

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import configuration
const config = require('./config/config');
const logger = require('./config/logger');
const { dbManager } = require('./config/database');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const maintenanceMode = require('./middleware/maintenanceMode');
const requestLogger = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/auth');
const salesRoutes = require('./routes/sales');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const customersRoutes = require('./routes/customers');
const recipesRoutes = require('./routes/recipes');
const loyaltyRoutes = require('./routes/loyalty');
const deliveryRoutes = require('./routes/delivery');
const reservationsRoutes = require('./routes/reservations');
const suppliersRoutes = require('./routes/suppliers');
const analyticsRoutes = require('./routes/analytics');
const promotionsRoutes = require('./routes/promotions');
const aiRoutes = require('./routes/ai.routes');

// Import services
const SocketService = require('./services/socketService');
const BackupService = require('./services/backupService');
const MetricsService = require('./services/metricsService');

// =====================================================
// Initialize Express App
// =====================================================

const app = express();
const server = http.createServer(app);

// =====================================================
// Initialize Sentry (if enabled)
// =====================================================

if (config.monitoring.sentry.enabled) {
  const Sentry = require('@sentry/node');
  Sentry.init({
    dsn: config.monitoring.sentry.dsn,
    environment: config.app.env,
    tracesSampleRate: config.app.env === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app })
    ]
  });

  // Sentry request handler must be first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  logger.info('Sentry error tracking enabled');
}

// =====================================================
// Global Middleware
// =====================================================

// Security
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// HTTP request logging
if (config.development.logApiRequests) {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Custom request logger
app.use(requestLogger);

// Maintenance mode check
app.use(maintenanceMode);

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// =====================================================
// Database Connection
// =====================================================

logger.info('Connecting to database...');
dbManager.connect();

// Run migrations on startup (development only)
if (config.app.env === 'development') {
  logger.info('Running database migrations...');
  dbManager.runMigrations()
    .then(() => logger.info('Migrations completed'))
    .catch(err => logger.error('Migrations failed:', err));
}

// =====================================================
// Initialize Socket.IO for Real-Time Updates
// =====================================================

const socketService = new SocketService(server);
logger.info('Socket.IO service initialized');

// Make socket service available to routes
app.set('socketService', socketService);

// =====================================================
// Initialize Services
// =====================================================

// Backup service (scheduled backups)
const backupService = new BackupService();
if (config.app.env === 'production') {
  backupService.scheduleDailyBackup();
  logger.info('Automated backup service enabled');
}

// Metrics service (Prometheus metrics)
const metricsService = new MetricsService(app);
logger.info('Metrics collection enabled');

// =====================================================
// API Routes
// =====================================================

const API_PREFIX = '/api';

// Public routes (no auth required)
app.use(`${API_PREFIX}/auth`, authRoutes);

// Protected routes (auth required)
app.use(`${API_PREFIX}/sales`, salesRoutes);
app.use(`${API_PREFIX}/products`, productsRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/customers`, customersRoutes);
app.use(`${API_PREFIX}/recipes`, recipesRoutes);
app.use(`${API_PREFIX}/loyalty`, loyaltyRoutes);
app.use(`${API_PREFIX}/delivery`, deliveryRoutes);
app.use(`${API_PREFIX}/reservations`, reservationsRoutes);
app.use(`${API_PREFIX}/suppliers`, suppliersRoutes);
app.use(`${API_PREFIX}/analytics`, analyticsRoutes);
app.use(`${API_PREFIX}/promotions`, promotionsRoutes);
app.use(`${API_PREFIX}/ai`, aiRoutes);

// =====================================================
// Health Check Endpoint
// =====================================================

app.get('/health', (req, res) => {
  const dbHealthy = dbManager.healthCheck();

  const health = {
    status: dbHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: config.app.version,
    database: dbHealthy ? 'connected' : 'disconnected',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  };

  const statusCode = dbHealthy ? 200 : 503;
  res.status(statusCode).json(health);
});

// =====================================================
// Database Stats Endpoint (Admin only)
// =====================================================

app.get('/api/admin/db-stats', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const stats = dbManager.getStats();
  res.json(stats);
});

// =====================================================
// Prometheus Metrics Endpoint
// =====================================================

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsService.register.contentType);
  res.end(await metricsService.register.metrics());
});

// =====================================================
// Root Endpoint
// =====================================================

app.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.app.version,
    status: 'running',
    documentation: '/api/docs',
    health: '/health',
    metrics: '/metrics'
  });
});

// =====================================================
// 404 Handler
// =====================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// =====================================================
// Error Handler (must be last)
// =====================================================

if (config.monitoring.sentry.enabled) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

// =====================================================
// Graceful Shutdown
// =====================================================

const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    // Close database connection
    dbManager.close();

    // Close Socket.IO
    socketService.close();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =====================================================
// Uncaught Exception Handler
// =====================================================

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // In production, you might want to restart the process
  if (config.app.env === 'production') {
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// =====================================================
// Start Server
// =====================================================

const PORT = config.app.port;
const HOST = config.app.host;

server.listen(PORT, HOST, () => {
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`🚀 ${config.app.name} v${config.app.version}`);
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info(`Environment:  ${config.app.env}`);
  logger.info(`Server:       http://${HOST}:${PORT}`);
  logger.info(`Health:       http://${HOST}:${PORT}/health`);
  logger.info(`Metrics:      http://${HOST}:${PORT}/metrics`);
  logger.info(`Database:     ${config.database.url}`);
  logger.info(`Sentry:       ${config.monitoring.sentry.enabled ? 'Enabled' : 'Disabled'}`);
  logger.info(`Features:     Loyalty=${config.features.loyaltyProgram}, Delivery=${config.features.deliveryIntegration}`);
  logger.info('═══════════════════════════════════════════════════════════');
});

// Export for testing
module.exports = { app, server };
