/**
 * JARVIS Mark VII v2.1.0 - API REST Server
 * Sistema de API principal para SYSME-POS
 * Puerto: 7777
 *
 * @module APIServer
 * @version 2.1.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

class APIServer {
  constructor(config = {}) {
    this.config = {
      port: process.env.API_PORT || 7777,
      host: process.env.API_HOST || '0.0.0.0',
      env: process.env.NODE_ENV || 'development',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
      ...config
    };

    this.app = express();
    this.server = null;
    this.io = null;
    this.isRunning = false;
  }

  /**
   * Inicializa el servidor API
   */
  async initialize() {
    try {
      console.log('🚀 Inicializando JARVIS API Server v2.1.0...');

      // Middlewares de seguridad
      this.setupSecurity();

      // Middlewares generales
      this.setupMiddlewares();

      // Socket.IO
      this.setupSocketIO();

      // Rutas
      this.setupRoutes();

      // Error handlers
      this.setupErrorHandlers();

      console.log('✅ API Server inicializado correctamente');
      return true;
    } catch (error) {
      console.error('❌ Error inicializando API Server:', error);
      throw error;
    }
  }

  /**
   * Configura middlewares de seguridad
   */
  setupSecurity() {
    // Helmet para headers de seguridad
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    this.app.use(cors({
      origin: this.config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por IP
      message: 'Demasiadas peticiones desde esta IP, intente más tarde'
    });
    this.app.use('/api/', limiter);
  }

  /**
   * Configura middlewares generales
   */
  setupMiddlewares() {
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logger de requests
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  /**
   * Configura Socket.IO para tiempo real
   */
  setupSocketIO() {
    this.server = http.createServer(this.app);

    this.io = new Server(this.server, {
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
      });
    });

    console.log('✅ Socket.IO configurado');
  }

  /**
   * Configura las rutas de la API
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.1.0',
        service: 'JARVIS API Server'
      });
    });

    // API Info
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'JARVIS Mark VII API',
        version: '2.1.0',
        description: 'API REST para SYSME-POS con IA integrada',
        endpoints: {
          jarvis: '/api/jarvis',
          auth: '/api/auth',
          pos: '/api/pos',
          inventory: '/api/inventory',
          analytics: '/api/analytics'
        }
      });
    });

    // Placeholder para rutas futuras
    this.app.use('/api/jarvis', this.createJarvisRoutes());
    this.app.use('/api/auth', this.createAuthRoutes());

    console.log('✅ Rutas configuradas');
  }

  /**
   * Crea rutas de JARVIS
   */
  createJarvisRoutes() {
    const router = express.Router();

    router.get('/status', (req, res) => {
      res.json({
        status: 'active',
        ai: {
          enabled: true,
          memory: 'neural (3 niveles)',
          autonomous: true
        },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    router.get('/metrics', (req, res) => {
      res.json({
        requests: 0,
        averageResponseTime: 0,
        errors: 0,
        timestamp: new Date().toISOString()
      });
    });

    return router;
  }

  /**
   * Crea rutas de autenticación
   */
  createAuthRoutes() {
    const router = express.Router();

    router.post('/login', (req, res) => {
      res.status(501).json({
        error: 'Not implemented yet',
        message: 'Auth system en desarrollo'
      });
    });

    return router;
  }

  /**
   * Configura manejadores de errores
   */
  setupErrorHandlers() {
    // 404
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Ruta ${req.path} no encontrada`,
        timestamp: new Date().toISOString()
      });
    });

    // Error handler global
    this.app.use((err, req, res, next) => {
      console.error('❌ Error:', err);

      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        stack: this.config.env === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Inicia el servidor
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(this.config.port, this.config.host, () => {
          this.isRunning = true;
          console.log('');
          console.log('┌─────────────────────────────────────────────┐');
          console.log('│   🤖 JARVIS Mark VII v2.1.0 - API Server   │');
          console.log('├─────────────────────────────────────────────┤');
          console.log(`│   URL: http://${this.config.host}:${this.config.port}           │`);
          console.log(`│   ENV: ${this.config.env.padEnd(36)} │`);
          console.log('│   Socket.IO: ✅ Enabled                     │');
          console.log('└─────────────────────────────────────────────┘');
          console.log('');

          resolve(this.server);
        });

        this.server.on('error', (error) => {
          this.isRunning = false;
          console.error('❌ Error en servidor:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Detiene el servidor
   */
  async stop() {
    return new Promise((resolve) => {
      if (!this.server || !this.isRunning) {
        resolve();
        return;
      }

      this.io?.close();
      this.server.close(() => {
        this.isRunning = false;
        console.log('✅ API Server detenido');
        resolve();
      });
    });
  }

  /**
   * Emite evento Socket.IO
   */
  emit(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

module.exports = APIServer;

// Si se ejecuta directamente
if (require.main === module) {
  const server = new APIServer();

  server.initialize()
    .then(() => server.start())
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('📡 SIGTERM recibido, cerrando servidor...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('📡 SIGINT recibido, cerrando servidor...');
    await server.stop();
    process.exit(0);
  });
}
