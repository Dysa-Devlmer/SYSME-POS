// core/logging/logger-manager.cjs
// Sistema de Logging Estructurado para JARVIS

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs-extra');
const EventEmitter = require('events');

/**
 * Logger Manager
 *
 * Sistema de logging estructurado con Winston
 *
 * Características:
 * - Múltiples niveles (debug, info, warn, error)
 * - Rotación automática de archivos
 * - Logs separados por categoría
 * - Formato estructurado (JSON)
 * - Timestamps precisos
 * - Emisión de eventos para UI en tiempo real
 * - Análisis y búsqueda de logs
 */
class LoggerManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.logsDir = options.logsDir || path.join(this.projectRoot, 'logs');
    this.maxFiles = options.maxFiles || '30d'; // 30 días
    this.maxSize = options.maxSize || '20m'; // 20 MB por archivo
    this.level = options.level || 'info'; // debug, info, warn, error
    this.enableConsole = options.enableConsole !== false;

    // Categorías de logs
    this.loggers = new Map();
    this.categories = [
      'system',      // Sistema general
      'agent',       // Autonomous agent
      'scheduler',   // Task scheduler
      'workflow',    // Workflow manager
      'search',      // Code search
      'docs',        // Documentation
      'voice',       // Voice control
      'notifications', // Notifications
      'errors'       // Errores críticos
    ];

    // Buffer para logs en memoria (últimos N logs)
    this.logBuffer = [];
    this.maxBufferSize = options.maxBufferSize || 1000;

    // Estadísticas
    this.stats = {
      totalLogs: 0,
      byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
      byCategory: {},
      errors: []
    };

    this.isInitialized = false;
  }

  /**
   * Inicializa el logger manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('📝 [Logger Manager] Inicializando...');

    // Crear directorio de logs
    await fs.ensureDir(this.logsDir);

    // Inicializar estadísticas por categoría
    for (const category of this.categories) {
      this.stats.byCategory[category] = 0;
    }

    // Crear loggers para cada categoría
    for (const category of this.categories) {
      this.loggers.set(category, this.createLogger(category));
    }

    // Logger por defecto
    this.loggers.set('default', this.createLogger('combined'));

    this.isInitialized = true;
    console.log('✅ [Logger Manager] Sistema de logging inicializado');
    console.log(`   📁 Logs dir: ${this.logsDir}`);
    console.log(`   📊 Categorías: ${this.categories.length}`);

    this.emit('initialized');
  }

  /**
   * Crea un logger de Winston
   */
  createLogger(category) {
    const formats = [];

    // Timestamp
    formats.push(winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }));

    // Agregar categoría
    formats.push(winston.format((info) => {
      info.category = category;
      return info;
    })());

    // Errores con stack trace
    formats.push(winston.format.errors({ stack: true }));

    // JSON para archivos
    const jsonFormat = winston.format.combine(
      ...formats,
      winston.format.json()
    );

    // Pretty print para consola
    const consoleFormat = winston.format.combine(
      ...formats,
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, category, ...meta }) => {
        let msg = `${timestamp} [${category}] ${level}: ${message}`;
        if (Object.keys(meta).length > 0 && meta.stack) {
          msg += `\n${meta.stack}`;
        }
        return msg;
      })
    );

    // Transports
    const transports = [];

    // Archivo con rotación diaria
    transports.push(new DailyRotateFile({
      filename: path.join(this.logsDir, `${category}-%DATE%.log`),
      datePattern: 'YYYY-MM-DD',
      maxFiles: this.maxFiles,
      maxSize: this.maxSize,
      format: jsonFormat,
      level: this.level
    }));

    // Archivo de errores separado
    if (category === 'errors' || category === 'combined') {
      transports.push(new DailyRotateFile({
        filename: path.join(this.logsDir, `error-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxFiles: this.maxFiles,
        maxSize: this.maxSize,
        format: jsonFormat,
        level: 'error'
      }));
    }

    // Consola (opcional)
    if (this.enableConsole) {
      transports.push(new winston.transports.Console({
        format: consoleFormat,
        level: this.level
      }));
    }

    // Crear logger
    const logger = winston.createLogger({
      level: this.level,
      transports,
      exitOnError: false
    });

    // Interceptar logs para buffer y eventos
    const originalLog = logger.log.bind(logger);
    logger.log = (level, message, meta = {}) => {
      // Log original
      originalLog(level, message, meta);

      // Agregar a buffer
      this.addToBuffer({
        timestamp: Date.now(),
        level,
        category,
        message,
        meta
      });

      // Actualizar estadísticas
      this.updateStats(level, category, message, meta);

      // Emitir evento
      this.emit('log', {
        timestamp: Date.now(),
        level,
        category,
        message,
        meta
      });
    };

    return logger;
  }

  /**
   * Agrega log al buffer en memoria
   */
  addToBuffer(log) {
    this.logBuffer.push(log);

    // Mantener límite de buffer
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  /**
   * Actualiza estadísticas
   */
  updateStats(level, category, message, meta) {
    this.stats.totalLogs++;
    this.stats.byLevel[level] = (this.stats.byLevel[level] || 0) + 1;
    this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;

    // Trackear errores
    if (level === 'error') {
      this.stats.errors.push({
        timestamp: Date.now(),
        category,
        message,
        meta
      });

      // Mantener solo últimos 100 errores
      if (this.stats.errors.length > 100) {
        this.stats.errors.shift();
      }
    }
  }

  /**
   * Obtiene un logger por categoría
   */
  getLogger(category = 'default') {
    if (!this.isInitialized) {
      throw new Error('Logger manager no inicializado');
    }

    if (!this.loggers.has(category)) {
      // Crear logger dinámicamente si no existe
      this.loggers.set(category, this.createLogger(category));
      this.stats.byCategory[category] = 0;
    }

    return this.loggers.get(category);
  }

  /**
   * Log con categoría específica
   */
  log(category, level, message, meta = {}) {
    const logger = this.getLogger(category);
    logger.log(level, message, meta);
  }

  /**
   * Métodos de conveniencia
   */
  debug(category, message, meta) {
    this.log(category, 'debug', message, meta);
  }

  info(category, message, meta) {
    this.log(category, 'info', message, meta);
  }

  warn(category, message, meta) {
    this.log(category, 'warn', message, meta);
  }

  error(category, message, meta) {
    this.log(category, 'error', message, meta);
  }

  /**
   * Obtiene logs del buffer
   */
  getRecentLogs(options = {}) {
    const {
      limit = 100,
      level = null,
      category = null,
      search = null
    } = options;

    let logs = [...this.logBuffer];

    // Filtrar por nivel
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // Filtrar por categoría
    if (category) {
      logs = logs.filter(log => log.category === category);
    }

    // Búsqueda en mensaje
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log =>
        log.message.toLowerCase().includes(searchLower)
      );
    }

    // Últimos N logs (más recientes primero)
    return logs.slice(-limit).reverse();
  }

  /**
   * Busca en archivos de log
   */
  async searchLogFiles(options = {}) {
    const {
      query,
      category = 'combined',
      startDate = null,
      endDate = null,
      limit = 100
    } = options;

    const results = [];
    const logFiles = await this.getLogFiles(category);

    for (const file of logFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const log = JSON.parse(line);

            // Filtrar por fecha
            if (startDate && new Date(log.timestamp) < startDate) continue;
            if (endDate && new Date(log.timestamp) > endDate) continue;

            // Búsqueda en mensaje
            if (query && !log.message.toLowerCase().includes(query.toLowerCase())) {
              continue;
            }

            results.push(log);

            // Límite de resultados
            if (results.length >= limit) break;

          } catch (err) {
            // Línea no es JSON válido, ignorar
          }
        }

        if (results.length >= limit) break;

      } catch (err) {
        console.error(`Error leyendo archivo ${file}:`, err);
      }
    }

    return results.reverse(); // Más recientes primero
  }

  /**
   * Obtiene archivos de log de una categoría
   */
  async getLogFiles(category = 'combined') {
    const files = await fs.readdir(this.logsDir);
    const pattern = new RegExp(`^${category}-\\d{4}-\\d{2}-\\d{2}\\.log$`);

    const logFiles = files
      .filter(file => pattern.test(file))
      .map(file => path.join(this.logsDir, file))
      .sort()
      .reverse(); // Más recientes primero

    return logFiles;
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      bufferSize: this.logBuffer.length,
      categories: this.categories,
      recentErrors: this.stats.errors.slice(-10)
    };
  }

  /**
   * Limpia logs antiguos
   */
  async cleanupOldLogs(daysToKeep = 30) {
    console.log(`🗑️ [Logger Manager] Limpiando logs más antiguos de ${daysToKeep} días...`);

    const files = await fs.readdir(this.logsDir);
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(this.logsDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtimeMs < cutoffDate) {
        await fs.remove(filePath);
        deleted++;
      }
    }

    console.log(`✅ [Logger Manager] ${deleted} archivos eliminados`);
    return deleted;
  }

  /**
   * Analiza logs para detectar patrones
   */
  analyzePatterns() {
    const patterns = {
      errorPatterns: {},
      frequentMessages: {},
      errorTrends: []
    };

    // Analizar errores recientes
    for (const error of this.stats.errors) {
      // Contar patrones de error
      const key = error.message.substring(0, 50); // Primeros 50 chars
      patterns.errorPatterns[key] = (patterns.errorPatterns[key] || 0) + 1;
    }

    // Mensajes más frecuentes en buffer
    const messageCounts = {};
    for (const log of this.logBuffer) {
      const key = log.message.substring(0, 50);
      messageCounts[key] = (messageCounts[key] || 0) + 1;
    }

    // Top 10 mensajes más frecuentes
    patterns.frequentMessages = Object.entries(messageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .reduce((obj, [key, count]) => {
        obj[key] = count;
        return obj;
      }, {});

    // Tendencia de errores (últimas 24 horas por hora)
    const now = Date.now();
    const hourMs = 60 * 60 * 1000;
    const hours = 24;

    for (let i = 0; i < hours; i++) {
      const hourStart = now - (i * hourMs);
      const hourEnd = now - ((i - 1) * hourMs);

      const errorsInHour = this.stats.errors.filter(e =>
        e.timestamp >= hourStart && e.timestamp < hourEnd
      ).length;

      patterns.errorTrends.unshift({
        hour: new Date(hourStart).toISOString().substring(11, 13) + ':00',
        errors: errorsInHour
      });
    }

    return patterns;
  }

  /**
   * Exporta logs a un archivo
   */
  async exportLogs(options = {}) {
    const {
      category = 'combined',
      format = 'json', // 'json' o 'csv'
      outputPath = null
    } = options;

    const logs = await this.searchLogFiles({ category, limit: 10000 });

    let content = '';

    if (format === 'json') {
      content = JSON.stringify(logs, null, 2);
    } else if (format === 'csv') {
      // Header
      content = 'Timestamp,Level,Category,Message\n';

      // Rows
      for (const log of logs) {
        const message = (log.message || '').replace(/"/g, '""');
        content += `"${log.timestamp}","${log.level}","${log.category}","${message}"\n`;
      }
    }

    const exportPath = outputPath || path.join(
      this.logsDir,
      `export-${category}-${Date.now()}.${format}`
    );

    await fs.writeFile(exportPath, content);

    console.log(`✅ [Logger Manager] Logs exportados a: ${exportPath}`);

    return {
      path: exportPath,
      count: logs.length,
      format
    };
  }

  /**
   * Cierra todos los loggers
   */
  async close() {
    console.log('🛑 [Logger Manager] Cerrando loggers...');

    for (const [category, logger] of this.loggers) {
      logger.close();
    }

    this.loggers.clear();
    console.log('✅ [Logger Manager] Loggers cerrados');
  }
}

module.exports = LoggerManager;
