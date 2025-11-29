/**
 * SYSME Backend Server
 * Modern Express.js API with security best practices
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import custom modules
import { logger } from './config/logger.js';
import { connectDatabase, initializeDbService } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { initializeSocket } from './websockets/socketHandler.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { authenticate } from './middleware/auth.js';
import { chileMiddleware } from './middleware/chile-middleware.js';

// Import routes
import authRoutes from './modules/auth/routes.js';
import userRoutes from './modules/users/routes.js';
import productRoutes from './modules/products/routes.js';
import categoryRoutes from './modules/categories/routes.js';
import salesRoutes from './modules/sales/routes.js';
import inventoryRoutes from './modules/inventory/routes.js';
import reportsRoutes from './modules/reports/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import tablesRoutes from './modules/tables/routes.js';
import ordersRoutes from './modules/orders/routes.js';
import kitchenRoutes from './modules/kitchen/routes.js';
import cashRoutes from './modules/cash/routes.js';
import modifiersRoutes from './modules/modifiers/routes.js';
import invoicesRoutes from './modules/invoices/routes.js';
import permissionsRoutes from './modules/permissions/routes.js';
import warehousesRoutes from './modules/warehouses/routes.js';
import combosRoutes from './modules/combos/routes.js';
import pricingTiersRoutes from './modules/pricing-tiers/routes.js';
import tipsRoutes from './modules/tips/routes.js';
import reservationsRoutes from './modules/reservations/routes.js';
import suppliersRoutes from './modules/suppliers/routes.js';
// TEMPORALMENTE DESHABILITADO - Necesita conversión a ES modules
// import aiRoutes from './modules/ai/routes.js';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // minutes
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '2.0.0'
  });
});

// API routes
const apiRouter = express.Router();

// Apply Chile-specific middleware to all API routes
apiRouter.use(chileMiddleware);

// Public routes (no authentication required)
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tables', tablesRoutes);

// Protected routes (authentication required)
apiRouter.use('/users', authenticate, userRoutes);
apiRouter.use('/products', authenticate, productRoutes);
apiRouter.use('/categories', authenticate, categoryRoutes);
apiRouter.use('/sales', authenticate, salesRoutes);
apiRouter.use('/orders', ordersRoutes); // Orders have their own auth middleware
apiRouter.use('/kitchen', kitchenRoutes); // Kitchen has its own auth middleware
apiRouter.use('/inventory', authenticate, inventoryRoutes);
apiRouter.use('/reports', authenticate, reportsRoutes);
apiRouter.use('/settings', authenticate, settingsRoutes);
apiRouter.use('/cash', authenticate, cashRoutes);
apiRouter.use('/modifiers', authenticate, modifiersRoutes);
apiRouter.use('/invoices', authenticate, invoicesRoutes);
apiRouter.use('/permissions', authenticate, permissionsRoutes);
apiRouter.use('/warehouses', authenticate, warehousesRoutes);
apiRouter.use('/combos', authenticate, combosRoutes);
apiRouter.use('/pricing-tiers', authenticate, pricingTiersRoutes);
apiRouter.use('/tips', authenticate, tipsRoutes);
apiRouter.use('/reservations', authenticate, reservationsRoutes);
apiRouter.use('/suppliers', authenticate, suppliersRoutes);
// TEMPORALMENTE DESHABILITADO - Necesita conversión a ES modules
// apiRouter.use('/ai', authenticate, aiRoutes);

// Mount API routes
app.use(`/api/${process.env.API_VERSION || 'v1'}`, apiRouter);

// WebSocket setup
initializeSocket(server);

// TEMPORALMENTE DESHABILITADO - realtime-notifications usa CommonJS
// Initialize AI notification service with WebSocket
// const notificationService = require('./services/realtime-notifications');
// notificationService.initialize(io);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connections
    // Close Redis connections
    // Perform other cleanup tasks
    
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await connectDatabase();
    logger.info('Database connected successfully');

    // Initialize database service
    initializeDbService();
    logger.info('Database service initialized');
    
    // Initialize Redis connection
    await connectRedis();
    logger.info('Redis connected successfully');

    // TEMPORALMENTE DESHABILITADO - ai-proactive-alerts usa CommonJS
    // Initialize AI Services
    // const proactiveAlerts = require('./services/ai-proactive-alerts');
    // await proactiveAlerts.initialize();
    // logger.info('🤖 AI Services initialized successfully');

    const PORT = process.env.PORT || 3001;
    
    server.listen(PORT, () => {
      logger.info(`🚀 SYSME Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, io };