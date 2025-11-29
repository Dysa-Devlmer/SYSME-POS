/**
 * Sistema de Logging Estructurado de Producción
 * Logger avanzado con múltiples transportes, rotación y análisis
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedLogger {
  constructor() {
    this.logDir = path.resolve(__dirname, '../../logs');
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4
    };

    this.logger = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el sistema de logging avanzado
   */
  async initialize() {
    try {
      // Crear directorio de logs si no existe
      await this.ensureLogDirectory();

      // Configurar formatos personalizados
      const formats = this.createLogFormats();

      // Configurar transportes
      const transports = await this.createTransports(formats);

      // Crear logger de Winston
      this.logger = winston.createLogger({
        levels: this.logLevels,
        level: process.env.LOG_LEVEL || 'info',
        format: formats.combined,
        transports,
        exitOnError: false,
        handleExceptions: true,
        handleRejections: true
      });

      // Configurar colores para consola
      winston.addColors({
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'cyan',
        debug: 'blue'
      });

      this.isInitialized = true;
      this.info('🔍 Sistema de logging estructurado inicializado');

      return this.logger;
    } catch (error) {
      console.error('Error inicializando logger:', error);
      throw error;
    }
  }

  /**
   * Asegura que el directorio de logs existe
   */
  async ensureLogDirectory() {
    try {
      await fs.access(this.logDir);
    } catch {
      await fs.mkdir(this.logDir, { recursive: true });
    }
  }

  /**
   * Crea formatos de log personalizados
   */
  createLogFormats() {
    // Formato para archivo JSON estructurado
    const jsonFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({
        fillExcept: ['message', 'level', 'timestamp']
      }),
      winston.format.json()
    );

    // Formato para consola con colores
    const consoleFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.align(),
      winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    );

    // Formato simple para archivos de texto
    const fileFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        const metaStr = Object.keys(meta).length ? ` | Meta: ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
      })
    );

    return {
      json: jsonFormat,
      console: consoleFormat,
      file: fileFormat,
      combined: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    };
  }

  /**
   * Crea transportes de Winston
   */
  async createTransports(formats) {
    const transports = [];

    // Transporte de consola para desarrollo
    if (process.env.NODE_ENV !== 'production') {
      transports.push(
        new winston.transports.Console({
          format: formats.console,
          level: 'debug'
        })
      );
    }

    // Archivo de logs generales con rotación
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'app.log'),
        format: formats.file,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        level: 'info'
      })
    );

    // Archivo específico para errores
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'error.log'),
        format: formats.file,
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        level: 'error'
      })
    );

    // Archivo JSON estructurado para análisis
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'structured.log'),
        format: formats.json,
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        level: 'info'
      })
    );

    // Archivo de performance y métricas
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'performance.log'),
        format: formats.json,
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        level: 'http'
      })
    );

    return transports;
  }

  /**
   * Métodos de logging con contexto enriquecido
   */
  error(message, meta = {}) {
    if (!this.isInitialized) return console.error(message, meta);
    try {
      this.logger.error(message, {
        ...meta,
        timestamp: new Date().toISOString(),
        process: process.pid,
        memory: process.memoryUsage(),
        stack: meta.stack || new Error().stack
      });
    } catch (error) {
      console.error('Logger error:', error, 'Original message:', message);
    }
  }

  warn(message, meta = {}) {
    if (!this.isInitialized) return console.warn(message, meta);
    this.logger.warn(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      process: process.pid
    });
  }

  info(message, meta = {}) {
    if (!this.isInitialized) return console.info(message, meta);
    this.logger.info(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      process: process.pid
    });
  }

  http(message, meta = {}) {
    if (!this.isInitialized) return console.log(message, meta);
    this.logger.http(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      process: process.pid
    });
  }

  debug(message, meta = {}) {
    if (!this.isInitialized) return console.debug(message, meta);
    this.logger.debug(message, {
      ...meta,
      timestamp: new Date().toISOString(),
      process: process.pid
    });
  }

  /**
   * Log específico para requests HTTP
   */
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0,
      referrer: req.get('Referrer') || req.get('Referer'),
      timestamp: new Date().toISOString()
    };

    if (res.statusCode >= 400) {
      this.warn(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
    } else {
      this.http(`HTTP ${res.statusCode} - ${req.method} ${req.url}`, logData);
    }
  }

  /**
   * Log de performance y métricas
   */
  logPerformance(operation, duration, details = {}) {
    this.http(`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString(),
      type: 'performance'
    });
  }

  /**
   * Log de métricas del sistema
   */
  logSystemMetrics() {
    const metrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      timestamp: new Date().toISOString(),
      type: 'system_metrics'
    };

    this.info('System Metrics', metrics);
  }

  /**
   * Log de eventos de negocio
   */
  logBusinessEvent(event, details = {}) {
    this.info(`Business Event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString(),
      type: 'business_event'
    });
  }

  /**
   * Log de seguridad
   */
  logSecurityEvent(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      event,
      ...details,
      timestamp: new Date().toISOString(),
      type: 'security_event',
      severity: 'high'
    });
  }

  /**
   * Obtiene estadísticas de logs
   */
  async getLogStats() {
    try {
      const logFiles = ['app.log', 'error.log', 'structured.log', 'performance.log'];
      const stats = {};

      for (const file of logFiles) {
        try {
          const filePath = path.join(this.logDir, file);
          const stat = await fs.stat(filePath);
          stats[file] = {
            size: this.formatFileSize(stat.size),
            sizeBytes: stat.size,
            modified: stat.mtime,
            created: stat.birthtime
          };
        } catch (error) {
          stats[file] = { error: 'File not found' };
        }
      }

      return {
        directory: this.logDir,
        files: stats,
        totalFiles: Object.keys(stats).length,
        isInitialized: this.isInitialized
      };
    } catch (error) {
      this.error('Error getting log stats:', error);
      throw error;
    }
  }

  /**
   * Formatea tamaño de archivo
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtiene el logger de Winston para uso directo
   */
  getWinstonLogger() {
    return this.logger;
  }
}

// Crear instancia global del logger mejorado
const enhancedLogger = new EnhancedLogger();

export { enhancedLogger };
export default enhancedLogger;