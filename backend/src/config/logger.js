/**
 * Simple Console Logger for Local Development
 * Simplified for local-only deployment
 */

import path from 'path';
import { fileURLToPath } from 'url';

// Simple console logger implementation
const createSimpleLogger = () => {
  const log = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const levelColor = {
      info: '\x1b[36m', // cyan
      error: '\x1b[31m', // red
      warn: '\x1b[33m', // yellow
      debug: '\x1b[35m' // magenta
    };
    const resetColor = '\x1b[0m';

    console.log(`${levelColor[level] || ''}[${timestamp}] ${level.toUpperCase()}: ${message}${resetColor}`, ...args);
  };

  return {
    info: (message, ...args) => log('info', message, ...args),
    error: (message, ...args) => log('error', message, ...args),
    warn: (message, ...args) => log('warn', message, ...args),
    debug: (message, ...args) => log('debug', message, ...args),
    log: (message, ...args) => log('info', message, ...args)
  };
};

export const logger = createSimpleLogger();

// Create request logger for Morgan
export const requestLogger = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Simple loggers for other purposes
export const auditLogger = logger;
export const performanceLogger = logger;
export const securityLogger = logger;

// Helper functions for structured logging
export const logInfo = (message, meta = {}) => {
  logger.info(message, meta);
};

export const logError = (message, error = null, meta = {}) => {
  if (error instanceof Error) {
    logger.error(message, { error: error.message, stack: error.stack, ...meta });
  } else {
    logger.error(message, meta);
  }
};

export const logWarn = (message, meta = {}) => {
  logger.warn(message, meta);
};

export const logDebug = (message, meta = {}) => {
  logger.debug(message, meta);
};

// Log security events
export const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event:', { event, ...details });
};

// Log audit events
export const logAuditEvent = (action, user, details = {}) => {
  logger.info('Audit Event:', { action, user: user?.username || 'unknown', ...details });
};

// Log performance metrics
export const logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance:', { operation, duration: `${duration}ms`, ...details });
};

export default logger;