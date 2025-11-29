/**
 * Advanced Logger Service
 * Sistema de logging avanzado con Winston, transports múltiples y formatters personalizados
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;
const { EventEmitter } = require('events');

class AdvancedLogger extends EventEmitter {
  constructor() {
    super();

    this.config = {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'json',
      directory: process.env.LOG_DIRECTORY || './logs',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '30'),
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      console: process.env.LOG_CONSOLE !== 'false',
      file: process.env.LOG_FILE !== 'false',
      elasticsearch: process.env.LOG_ELASTICSEARCH === 'true',
      webhook: process.env.LOG_WEBHOOK_URL || null
    };

    this.logger = null;
    this.stats = {
      logs: {
        error: 0,
        warn: 0,
        info: 0,
        http: 0,
        debug: 0,
        total: 0
      },
      files: {
        current: 0,
        total: 0,
        size: 0
      },
      performance: {
        avgWriteTime: 0,
        maxWriteTime: 0,
        totalWrites: 0
      }
    };

    this.contexts = new Map();
    this.filters = [];
    this.hooks = [];
  }

  /**
   * Inicializar logger
   */
  async initialize() {
    try {
      // Crear directorio de logs
      await this.createLogDirectory();

      // Crear logger con Winston
      this.logger = this.createWinstonLogger();

      // Configurar event handlers
      this.setupEventHandlers();

      console.log('✅ Advanced Logger initialized');
      return true;
    } catch (error) {
      console.error('❌ Advanced Logger initialization failed:', error);
      return false;
    }
  }

  /**
   * Crear directorio de logs
   */
  async createLogDirectory() {
    try {
      await fs.mkdir(this.config.directory, { recursive: true });
      await fs.mkdir(path.join(this.config.directory, 'error'), { recursive: true });
      await fs.mkdir(path.join(this.config.directory, 'combined'), { recursive: true });
      await fs.mkdir(path.join(this.config.directory, 'audit'), { recursive: true });
    } catch (error) {
      console.error('Error creating log directory:', error);
    }
  }

  /**
   * Crear logger de Winston
   */
  createWinstonLogger() {
    const formats = [];

    // Timestamp
    formats.push(winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }));

    // Errores
    formats.push(winston.format.errors({ stack: true }));

    // Metadata
    formats.push(winston.format.metadata({
      fillExcept: ['message', 'level', 'timestamp', 'label']
    }));

    // Formato según configuración
    if (this.config.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.printf(({ timestamp, level, message, metadata }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (metadata && Object.keys(metadata).length > 0) {
          log += ` ${JSON.stringify(metadata)}`;
        }

        return log;
      }));
    }

    // Crear transports
    const transports = [];

    // Console transport
    if (this.config.console) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, metadata }) => {
            let log = `${timestamp} ${level}: ${message}`;

            if (metadata && Object.keys(metadata).length > 0) {
              log += ` ${JSON.stringify(metadata, null, 2)}`;
            }

            return log;
          })
        )
      }));
    }

    // File transports
    if (this.config.file) {
      // Combined logs
      transports.push(new winston.transports.File({
        filename: path.join(this.config.directory, 'combined', 'combined.log'),
        maxsize: this.parseSize(this.config.maxSize),
        maxFiles: this.config.maxFiles,
        tailable: true
      }));

      // Error logs
      transports.push(new winston.transports.File({
        filename: path.join(this.config.directory, 'error', 'error.log'),
        level: 'error',
        maxsize: this.parseSize(this.config.maxSize),
        maxFiles: this.config.maxFiles,
        tailable: true
      }));

      // HTTP logs
      transports.push(new winston.transports.File({
        filename: path.join(this.config.directory, 'http.log'),
        level: 'http',
        maxsize: this.parseSize(this.config.maxSize),
        maxFiles: this.config.maxFiles,
        tailable: true
      }));
    }

    return winston.createLogger({
      level: this.config.level,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false
    });
  }

  /**
   * Parsear tamaño de archivo
   */
  parseSize(size) {
    const units = { k: 1024, m: 1024 * 1024, g: 1024 * 1024 * 1024 };
    const match = size.match(/^(\d+)([kmg])?$/i);

    if (!match) return 20 * 1024 * 1024; // 20MB por defecto

    const value = parseInt(match[1]);
    const unit = match[2] ? units[match[2].toLowerCase()] : 1;

    return value * unit;
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    if (this.logger) {
      this.logger.on('finish', () => {
        this.emit('logger:closed');
      });

      this.logger.on('error', (error) => {
        console.error('Logger error:', error);
        this.emit('logger:error', error);
      });
    }
  }

  /**
   * Log methods
   */
  error(message, meta = {}) {
    return this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    return this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    return this.log('info', message, meta);
  }

  http(message, meta = {}) {
    return this.log('http', message, meta);
  }

  debug(message, meta = {}) {
    return this.log('debug', message, meta);
  }

  /**
   * Log genérico
   */
  log(level, message, meta = {}) {
    const startTime = Date.now();

    try {
      // Aplicar filtros
      if (this.shouldFilter(level, message, meta)) {
        return;
      }

      // Enriquecer metadata
      const enrichedMeta = this.enrichMetadata(meta);

      // Ejecutar hooks pre-log
      this.executeHooks('pre', level, message, enrichedMeta);

      // Log
      if (this.logger) {
        this.logger.log(level, message, enrichedMeta);
      }

      // Actualizar stats
      this.updateStats(level, startTime);

      // Ejecutar hooks post-log
      this.executeHooks('post', level, message, enrichedMeta);

      // Emit event
      this.emit('log', { level, message, meta: enrichedMeta });

      return true;
    } catch (error) {
      console.error('Error logging:', error);
      return false;
    }
  }

  /**
   * Enriquecer metadata
   */
  enrichMetadata(meta) {
    const enriched = {
      ...meta,
      pid: process.pid,
      hostname: require('os').hostname(),
      env: process.env.NODE_ENV || 'development'
    };

    // Agregar contexto si existe
    if (meta.context && this.contexts.has(meta.context)) {
      enriched.contextData = this.contexts.get(meta.context);
    }

    // Timestamp
    if (!enriched.timestamp) {
      enriched.timestamp = new Date().toISOString();
    }

    return enriched;
  }

  /**
   * Verificar si debe filtrar el log
   */
  shouldFilter(level, message, meta) {
    for (const filter of this.filters) {
      if (filter(level, message, meta)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Ejecutar hooks
   */
  executeHooks(type, level, message, meta) {
    const hooks = this.hooks.filter(h => h.type === type);

    for (const hook of hooks) {
      try {
        hook.fn(level, message, meta);
      } catch (error) {
        console.error(`Error executing ${type} hook:`, error);
      }
    }
  }

  /**
   * Actualizar estadísticas
   */
  updateStats(level, startTime) {
    this.stats.logs[level] = (this.stats.logs[level] || 0) + 1;
    this.stats.logs.total++;

    const duration = Date.now() - startTime;
    this.stats.performance.totalWrites++;

    this.stats.performance.avgWriteTime =
      (this.stats.performance.avgWriteTime * (this.stats.performance.totalWrites - 1) + duration) /
      this.stats.performance.totalWrites;

    if (duration > this.stats.performance.maxWriteTime) {
      this.stats.performance.maxWriteTime = duration;
    }
  }

  /**
   * Crear child logger con contexto
   */
  child(context, data = {}) {
    this.contexts.set(context, data);

    return {
      error: (msg, meta = {}) => this.error(msg, { ...meta, context }),
      warn: (msg, meta = {}) => this.warn(msg, { ...meta, context }),
      info: (msg, meta = {}) => this.info(msg, { ...meta, context }),
      http: (msg, meta = {}) => this.http(msg, { ...meta, context }),
      debug: (msg, meta = {}) => this.debug(msg, { ...meta, context })
    };
  }

  /**
   * Agregar filtro
   */
  addFilter(filterFn) {
    this.filters.push(filterFn);
  }

  /**
   * Agregar hook
   */
  addHook(type, fn) {
    this.hooks.push({ type, fn });
  }

  /**
   * Log de auditoría
   */
  audit(action, userId, details = {}) {
    const auditLog = {
      action,
      userId,
      details,
      timestamp: new Date().toISOString(),
      ip: details.ip || 'unknown',
      userAgent: details.userAgent || 'unknown'
    };

    this.info(`AUDIT: ${action}`, auditLog);

    // También escribir en archivo de auditoría
    if (this.config.file) {
      const auditPath = path.join(this.config.directory, 'audit', 'audit.log');
      const logLine = JSON.stringify(auditLog) + '\n';

      fs.appendFile(auditPath, logLine).catch(err => {
        console.error('Error writing audit log:', err);
      });
    }
  }

  /**
   * Query logs (simple file-based search)
   */
  async queryLogs(options = {}) {
    const {
      level = null,
      startDate = null,
      endDate = null,
      search = null,
      limit = 100
    } = options;

    try {
      const combinedLog = path.join(this.config.directory, 'combined', 'combined.log');
      const content = await fs.readFile(combinedLog, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      let results = lines.map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line };
        }
      });

      // Filtrar por level
      if (level) {
        results = results.filter(log => log.level === level);
      }

      // Filtrar por fecha
      if (startDate) {
        results = results.filter(log => new Date(log.timestamp) >= new Date(startDate));
      }

      if (endDate) {
        results = results.filter(log => new Date(log.timestamp) <= new Date(endDate));
      }

      // Buscar en mensaje
      if (search) {
        results = results.filter(log =>
          log.message && log.message.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Limitar resultados
      results = results.slice(-limit);

      return results;
    } catch (error) {
      console.error('Error querying logs:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats() {
    // Actualizar stats de archivos
    try {
      const files = await fs.readdir(this.config.directory, { recursive: true });
      let totalSize = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.config.directory, file);
          const stat = await fs.stat(filePath);

          if (stat.isFile()) {
            totalSize += stat.size;
            this.stats.files.current++;
          }
        } catch (err) {
          // Ignorar errores de archivos individuales
        }
      }

      this.stats.files.total = this.stats.files.current;
      this.stats.files.size = totalSize;
    } catch (error) {
      console.error('Error getting file stats:', error);
    }

    return {
      ...this.stats,
      config: this.config,
      contexts: this.contexts.size,
      filters: this.filters.length,
      hooks: this.hooks.length
    };
  }

  /**
   * Rotar logs manualmente
   */
  async rotateLogs() {
    try {
      // Winston maneja la rotación automáticamente
      // Aquí podemos forzar un cierre y reapertura

      if (this.logger) {
        await new Promise(resolve => {
          this.logger.close();
          setTimeout(resolve, 100);
        });

        this.logger = this.createWinstonLogger();
        this.setupEventHandlers();
      }

      this.info('Logs rotated manually');
      return true;
    } catch (error) {
      this.error('Error rotating logs', { error: error.message });
      return false;
    }
  }

  /**
   * Limpiar logs antiguos
   */
  async cleanOldLogs(daysOld = 30) {
    try {
      const files = await fs.readdir(this.config.directory, { recursive: true });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let deleted = 0;

      for (const file of files) {
        try {
          const filePath = path.join(this.config.directory, file);
          const stat = await fs.stat(filePath);

          if (stat.isFile() && stat.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deleted++;
          }
        } catch (err) {
          // Ignorar errores
        }
      }

      this.info(`Cleaned ${deleted} old log files`);
      return deleted;
    } catch (error) {
      this.error('Error cleaning old logs', { error: error.message });
      return 0;
    }
  }

  /**
   * Middleware para Express
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Log de request
      this.http(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });

      // Interceptar response
      const originalSend = res.send;
      res.send = function (data) {
        const duration = Date.now() - startTime;

        advancedLogger.http(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`, {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          contentLength: data ? data.length : 0
        });

        originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.logger) {
      await new Promise(resolve => {
        this.logger.close();
        setTimeout(resolve, 100);
      });
    }

    this.contexts.clear();
    this.filters = [];
    this.hooks = [];

    return true;
  }
}

// Singleton
const advancedLogger = new AdvancedLogger();

module.exports = advancedLogger;
