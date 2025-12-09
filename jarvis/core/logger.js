/**
 * 📝 JARVIS LOGGER SYSTEM
 * Sistema profesional de logging con Winston
 *
 * Features:
 * - Múltiples niveles (error, warn, info, debug, verbose)
 * - Rotación automática de archivos
 * - Formatos personalizados
 * - Logs estructurados (JSON)
 * - Separación por tipo (error.log, combined.log)
 * - Colorización en consola
 * - Timestamps automáticos
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

class Logger {
  constructor(config = {}) {
    this.config = {
      level: config.level || process.env.LOG_LEVEL || 'info',
      logPath: config.path || './logs',
      maxSize: config.maxSize || '20m',
      maxFiles: config.maxFiles || '14d',
      enableFile: config.file !== false,
      enableConsole: config.console !== false,
      serviceName: config.serviceName || 'JARVIS'
    };

    // Crear directorio de logs si no existe
    if (this.config.enableFile && !fs.existsSync(this.config.logPath)) {
      fs.mkdirSync(this.config.logPath, { recursive: true });
    }

    this.logger = this.createLogger();
  }

  /**
   * Crea el logger de Winston
   */
  createLogger() {
    const transports = [];

    // Console Transport con colores
    if (this.config.enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(this.consoleFormat.bind(this))
          )
        })
      );
    }

    // File Transport - Combined (todos los logs)
    if (this.config.enableFile) {
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.config.logPath, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // File Transport - Errors only
      transports.push(
        new DailyRotateFile({
          level: 'error',
          filename: path.join(this.config.logPath, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        })
      );

      // File Transport - Performance (opcional)
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.config.logPath, 'performance-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxSize,
          maxFiles: this.config.maxFiles,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          level: 'verbose'
        })
      );
    }

    return winston.createLogger({
      level: this.config.level,
      levels: winston.config.npm.levels,
      transports,
      exceptionHandlers: this.config.enableFile ? [
        new DailyRotateFile({
          filename: path.join(this.config.logPath, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxSize,
          maxFiles: this.config.maxFiles
        })
      ] : [],
      rejectionHandlers: this.config.enableFile ? [
        new DailyRotateFile({
          filename: path.join(this.config.logPath, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: this.config.maxSize,
          maxFiles: this.config.maxFiles
        })
      ] : []
    });
  }

  /**
   * Formato para consola
   */
  consoleFormat(info) {
    const { timestamp, level, message, service, ...meta } = info;

    let log = `${timestamp} [${this.config.serviceName}] ${level}: ${message}`;

    // Agregar metadata si existe
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    return log;
  }

  /**
   * Log nivel ERROR
   */
  error(message, meta = {}) {
    this.logger.error(message, { service: this.config.serviceName, ...meta });
  }

  /**
   * Log nivel WARN
   */
  warn(message, meta = {}) {
    this.logger.warn(message, { service: this.config.serviceName, ...meta });
  }

  /**
   * Log nivel INFO
   */
  info(message, meta = {}) {
    this.logger.info(message, { service: this.config.serviceName, ...meta });
  }

  /**
   * Log nivel DEBUG
   */
  debug(message, meta = {}) {
    this.logger.debug(message, { service: this.config.serviceName, ...meta });
  }

  /**
   * Log nivel VERBOSE (performance)
   */
  verbose(message, meta = {}) {
    this.logger.verbose(message, { service: this.config.serviceName, ...meta });
  }

  /**
   * Log de inicio de sistema
   */
  startup(message, meta = {}) {
    this.info(`🚀 ${message}`, { type: 'startup', ...meta });
  }

  /**
   * Log de shutdown
   */
  shutdown(message, meta = {}) {
    this.info(`🛑 ${message}`, { type: 'shutdown', ...meta });
  }

  /**
   * Log de operación exitosa
   */
  success(message, meta = {}) {
    this.info(`✅ ${message}`, { type: 'success', ...meta });
  }

  /**
   * Log de operación fallida
   */
  failure(message, meta = {}) {
    this.error(`❌ ${message}`, { type: 'failure', ...meta });
  }

  /**
   * Log de performance/timing
   */
  performance(operation, duration, meta = {}) {
    this.verbose(`⚡ ${operation} completed in ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...meta
    });
  }

  /**
   * Log de request HTTP
   */
  http(method, path, statusCode, duration, meta = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level](`${method} ${path} ${statusCode} - ${duration}ms`, {
      type: 'http',
      method,
      path,
      statusCode,
      duration,
      ...meta
    });
  }

  /**
   * Log de query de base de datos
   */
  database(operation, query, duration, meta = {}) {
    this.debug(`💾 DB ${operation}: ${query}`, {
      type: 'database',
      operation,
      query,
      duration,
      ...meta
    });
  }

  /**
   * Log de llamada a IA
   */
  ai(provider, model, prompt, duration, meta = {}) {
    this.info(`🧠 AI ${provider}/${model}`, {
      type: 'ai',
      provider,
      model,
      promptLength: prompt.length,
      duration,
      ...meta
    });
  }

  /**
   * Log de sistema de memoria
   */
  memory(operation, details, meta = {}) {
    this.debug(`🗄️ Memory ${operation}`, {
      type: 'memory',
      operation,
      ...details,
      ...meta
    });
  }

  /**
   * Log de monitoreo
   */
  monitoring(event, data, meta = {}) {
    this.verbose(`👁️ Monitor: ${event}`, {
      type: 'monitoring',
      event,
      ...data,
      ...meta
    });
  }

  /**
   * Log de seguridad
   */
  security(event, severity, meta = {}) {
    const level = severity === 'critical' ? 'error' : 'warn';
    this.logger[level](`🔒 Security: ${event}`, {
      type: 'security',
      event,
      severity,
      ...meta
    });
  }

  /**
   * Log de backup
   */
  backup(operation, result, meta = {}) {
    const level = result === 'success' ? 'info' : 'error';
    this.logger[level](`💾 Backup ${operation}: ${result}`, {
      type: 'backup',
      operation,
      result,
      ...meta
    });
  }

  /**
   * Log de plugin
   */
  plugin(pluginName, event, meta = {}) {
    this.info(`🔌 Plugin [${pluginName}]: ${event}`, {
      type: 'plugin',
      pluginName,
      event,
      ...meta
    });
  }

  /**
   * Crea un child logger con contexto
   */
  child(context) {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(context);
    return childLogger;
  }

  /**
   * Obtiene estadísticas de logs
   */
  async getStats() {
    const stats = {
      logPath: this.config.logPath,
      level: this.config.level,
      files: []
    };

    if (this.config.enableFile && fs.existsSync(this.config.logPath)) {
      const files = fs.readdirSync(this.config.logPath);

      for (const file of files) {
        const filePath = path.join(this.config.logPath, file);
        const stat = fs.statSync(filePath);

        stats.files.push({
          name: file,
          size: stat.size,
          sizeFormatted: this.formatBytes(stat.size),
          modified: stat.mtime
        });
      }

      // Calcular tamaño total
      stats.totalSize = stats.files.reduce((sum, f) => sum + f.size, 0);
      stats.totalSizeFormatted = this.formatBytes(stats.totalSize);
    }

    return stats;
  }

  /**
   * Formatea bytes a formato legible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Limpia logs antiguos
   */
  async cleanup(daysToKeep = 14) {
    if (!this.config.enableFile) return;

    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

    const files = fs.readdirSync(this.config.logPath);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(this.config.logPath, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    this.info(`🗑️ Cleaned up ${deletedCount} old log files`);
    return deletedCount;
  }

  /**
   * Cierra el logger
   */
  close() {
    return new Promise((resolve) => {
      this.logger.end(() => {
        resolve();
      });
    });
  }
}

// Crear logger global con configuración del ConfigManager
let globalLogger;

function createLogger(config) {
  return new Logger(config);
}

function getGlobalLogger() {
  if (!globalLogger) {
    try {
      const configManager = require('./config-manager');
      const logConfig = configManager.get('logging');
      globalLogger = new Logger(logConfig);
    } catch (error) {
      // Fallback si ConfigManager no está disponible
      globalLogger = new Logger({});
    }
  }
  return globalLogger;
}

module.exports = {
  Logger,
  createLogger,
  getLogger: getGlobalLogger
};
