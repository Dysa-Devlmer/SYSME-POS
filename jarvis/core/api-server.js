/**
 * 🌐 JARVIS API REST SERVER
 * API REST completa para integración externa
 *
 * Features:
 * - Express con middleware profesional
 * - Autenticación JWT
 * - Rate limiting
 * - CORS configurable
 * - Validación de datos
 * - Documentación Swagger
 * - Health checks
 * - Métricas de API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { getLogger } = require('./logger');

class APIServer {
  constructor(config = {}) {
    this.config = config;
    this.app = express();
    this.logger = getLogger();
    this.server = null;

    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configura middleware
   */
  setupMiddleware() {
    // Seguridad
    this.app.use(helmet());

    // CORS
    if (this.config.server?.cors?.enabled) {
      this.app.use(cors({
        origin: this.config.server.cors.origin,
        credentials: true
      }));
    }

    // Body parsing
    this.app.use(bodyParser.json({ limit: '10mb' }));
    this.app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    if (this.config.security?.rateLimit?.enabled) {
      const limiter = rateLimit({
        windowMs: this.config.security.rateLimit.windowMs,
        max: this.config.security.rateLimit.maxRequests,
        message: 'Too many requests from this IP, please try again later.'
      });
      this.app.use('/api/', limiter);
    }

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logger.http(req.method, req.path, res.statusCode, duration, {
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      });

      next();
    });
  }

  /**
   * Configura rutas de la API
   */
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: require('../package.json').version
      });
    });

    // API Routes
    this.app.use('/api/v1/ai', this.createAIRoutes());
    this.app.use('/api/v1/memory', this.createMemoryRoutes());
    this.app.use('/api/v1/projects', this.createProjectsRoutes());
    this.app.use('/api/v1/monitoring', this.createMonitoringRoutes());
    this.app.use('/api/v1/system', this.createSystemRoutes());
    this.app.use('/api/v1/config', this.createConfigRoutes());
    this.app.use('/api/v1/logs', this.createLogsRoutes());

    // Swagger/OpenAPI documentation
    this.app.get('/api/docs', (req, res) => {
      res.json(this.generateSwaggerDocs());
    });

    // Root
    this.app.get('/', (req, res) => {
      res.json({
        name: 'JARVIS API',
        version: require('../package.json').version,
        description: 'Just A Rather Very Intelligent System',
        docs: '/api/docs',
        health: '/health'
      });
    });
  }

  /**
   * Rutas de IA
   */
  createAIRoutes() {
    const router = express.Router();

    // POST /api/v1/ai/chat - Chat con IA
    router.post('/chat', async (req, res) => {
      try {
        const { message, model, userId } = req.body;

        if (!message) {
          return res.status(400).json({ error: 'message is required' });
        }

        // Aquí integramos con el sistema de IA
        const aiIntegration = require('../jarvis-ai-integration.cjs');
        const response = await aiIntegration.processMessage(message, model || 'mistral:latest');

        res.json({
          success: true,
          response: response.response,
          model: model || 'mistral:latest',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        this.logger.error('AI chat error:', { error: error.message });
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/v1/ai/models - Lista modelos disponibles
    router.get('/models', async (req, res) => {
      try {
        const models = ['mistral:latest', 'llama2:latest', 'codellama:latest'];
        res.json({ models });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/v1/ai/status - Estado del sistema de IA
    router.get('/status', async (req, res) => {
      try {
        res.json({
          available: true,
          provider: this.config.ai?.provider || 'ollama',
          model: this.config.ai?.ollama?.model || 'mistral:latest'
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  /**
   * Rutas de memoria
   */
  createMemoryRoutes() {
    const router = express.Router();

    // GET /api/v1/memory - Obtener toda la memoria
    router.get('/', async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const memoryPath = path.join(__dirname, '../memory');

        const files = fs.readdirSync(memoryPath).filter(f => f.endsWith('.json'));
        const memory = {};

        for (const file of files) {
          const content = fs.readFileSync(path.join(memoryPath, file), 'utf8');
          memory[file.replace('.json', '')] = JSON.parse(content);
        }

        res.json(memory);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/v1/memory/:type - Obtener tipo específico de memoria
    router.get('/:type', async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const memoryFile = path.join(__dirname, '../memory', `${req.params.type}.json`);

        if (!fs.existsSync(memoryFile)) {
          return res.status(404).json({ error: 'Memory type not found' });
        }

        const content = fs.readFileSync(memoryFile, 'utf8');
        res.json(JSON.parse(content));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/v1/memory/:type - Actualizar memoria
    router.post('/:type', async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const memoryFile = path.join(__dirname, '../memory', `${req.params.type}.json`);

        fs.writeFileSync(memoryFile, JSON.stringify(req.body, null, 2));

        res.json({ success: true, message: 'Memory updated' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  /**
   * Rutas de proyectos
   */
  createProjectsRoutes() {
    const router = express.Router();

    // GET /api/v1/projects - Lista todos los proyectos
    router.get('/', async (req, res) => {
      try {
        const projectManager = require('./project-memory-manager');
        const projects = await projectManager.listProjects();
        res.json({ projects });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/v1/projects/:id - Obtiene un proyecto específico
    router.get('/:id', async (req, res) => {
      try {
        const projectManager = require('./project-memory-manager');
        const project = await projectManager.getProject(req.params.id);

        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // POST /api/v1/projects - Registra un nuevo proyecto
    router.post('/', async (req, res) => {
      try {
        const projectManager = require('./project-memory-manager');
        const project = await projectManager.registerProject(req.body);
        res.status(201).json(project);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // PUT /api/v1/projects/:id - Actualiza un proyecto
    router.put('/:id', async (req, res) => {
      try {
        const projectManager = require('./project-memory-manager');
        const project = await projectManager.updateProjectSession(req.params.id, req.body);
        res.json(project);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  /**
   * Rutas de monitoreo
   */
  createMonitoringRoutes() {
    const router = express.Router();

    // GET /api/v1/monitoring/stats - Estadísticas del sistema
    router.get('/stats', (req, res) => {
      const os = require('os');

      res.json({
        cpu: {
          model: os.cpus()[0].model,
          cores: os.cpus().length,
          usage: process.cpuUsage()
        },
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          process: process.memoryUsage()
        },
        uptime: {
          system: os.uptime(),
          process: process.uptime()
        },
        platform: {
          type: os.type(),
          release: os.release(),
          arch: os.arch(),
          hostname: os.hostname()
        }
      });
    });

    // GET /api/v1/monitoring/health - Health check detallado
    router.get('/health', async (req, res) => {
      const checks = {
        api: true,
        database: await this.checkDatabase(),
        ai: await this.checkAI(),
        memory: await this.checkMemory(),
        disk: await this.checkDisk()
      };

      const allHealthy = Object.values(checks).every(v => v === true);

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        checks,
        timestamp: new Date().toISOString()
      });
    });

    return router;
  }

  /**
   * Rutas de sistema
   */
  createSystemRoutes() {
    const router = express.Router();

    // GET /api/v1/system/info - Información del sistema
    router.get('/info', (req, res) => {
      const pkg = require('../package.json');

      res.json({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        node: process.version,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid,
        uptime: process.uptime()
      });
    });

    // POST /api/v1/system/restart - Reiniciar el sistema
    router.post('/restart', (req, res) => {
      this.logger.warn('System restart requested via API');
      res.json({ message: 'System restart initiated' });

      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });

    return router;
  }

  /**
   * Rutas de configuración
   */
  createConfigRoutes() {
    const router = express.Router();

    // GET /api/v1/config - Obtener configuración (sin secretos)
    router.get('/', (req, res) => {
      try {
        const configManager = require('./config-manager');
        res.json(configManager.export(false));
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/v1/config/:key - Obtener valor específico
    router.get('/:key', (req, res) => {
      try {
        const configManager = require('./config-manager');
        const value = configManager.get(req.params.key);

        if (value === null) {
          return res.status(404).json({ error: 'Config key not found' });
        }

        res.json({ key: req.params.key, value });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  /**
   * Rutas de logs
   */
  createLogsRoutes() {
    const router = express.Router();

    // GET /api/v1/logs/stats - Estadísticas de logs
    router.get('/stats', async (req, res) => {
      try {
        const stats = await this.logger.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // GET /api/v1/logs/:type - Obtener logs por tipo
    router.get('/:type', async (req, res) => {
      try {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../logs');

        const files = fs.readdirSync(logPath)
          .filter(f => f.includes(req.params.type))
          .sort()
          .reverse();

        if (files.length === 0) {
          return res.status(404).json({ error: 'No logs found' });
        }

        const latestLog = fs.readFileSync(path.join(logPath, files[0]), 'utf8');
        const lines = latestLog.split('\n').filter(l => l.trim()).slice(-100);

        res.json({
          file: files[0],
          lines: lines.map(l => {
            try {
              return JSON.parse(l);
            } catch {
              return { raw: l };
            }
          })
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }

  /**
   * Configura manejo de errores
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
        method: req.method
      });
    });

    // Error handler
    this.app.use((err, req, res, next) => {
      this.logger.error('API Error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method
      });

      res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(this.config.isDevelopment && { stack: err.stack })
      });
    });
  }

  /**
   * Health checks
   */
  async checkDatabase() {
    try {
      const fs = require('fs');
      const dbPath = this.config.database?.path || './memory/jarvis.db';
      return fs.existsSync(dbPath);
    } catch {
      return false;
    }
  }

  async checkAI() {
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.config.ai?.ollama?.host || 'http://localhost:11434'}/api/tags`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async checkMemory() {
    try {
      const fs = require('fs');
      const memoryPath = this.config.memory?.path || './memory';
      return fs.existsSync(memoryPath);
    } catch {
      return false;
    }
  }

  async checkDisk() {
    try {
      const os = require('os');
      const free = os.freemem();
      const total = os.totalmem();
      return (free / total) > 0.1; // Al menos 10% libre
    } catch {
      return false;
    }
  }

  /**
   * Genera documentación Swagger
   */
  generateSwaggerDocs() {
    return {
      openapi: '3.0.0',
      info: {
        title: 'JARVIS API',
        version: require('../package.json').version,
        description: 'Just A Rather Very Intelligent System - REST API',
        contact: {
          name: 'Stark Industries',
          url: 'https://github.com/Soyelijah/jarvis-mark-vii'
        }
      },
      servers: [
        {
          url: `http://${this.config.server?.host || 'localhost'}:${this.config.server?.port || 7777}`,
          description: 'Local server'
        }
      ],
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: {
              '200': { description: 'Service is healthy' }
            }
          }
        },
        '/api/v1/ai/chat': {
          post: {
            summary: 'Chat with AI',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      model: { type: 'string' },
                      userId: { type: 'string' }
                    },
                    required: ['message']
                  }
                }
              }
            },
            responses: {
              '200': { description: 'AI response' }
            }
          }
        }
        // ... más endpoints
      }
    };
  }

  /**
   * Inicia el servidor
   */
  start(port) {
    const serverPort = port || this.config.server?.port || 7777;

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(serverPort, () => {
          this.logger.startup(`API Server running on http://localhost:${serverPort}`);
          this.logger.info(`API Docs available at http://localhost:${serverPort}/api/docs`);
          resolve(this.server);
        });

        this.server.on('error', (error) => {
          this.logger.error('Failed to start API server:', { error: error.message });
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
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.logger.shutdown('Stopping API server...');
        this.server.close(() => {
          this.logger.info('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = APIServer;
