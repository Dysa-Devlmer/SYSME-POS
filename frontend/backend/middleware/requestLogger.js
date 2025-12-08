// =====================================================
// SYSME POS - Request Logger Middleware
// =====================================================

const logger = require('../config/logger');

/**
 * Log incoming requests with timing
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log after response is sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      user: req.user?.id || 'anonymous'
    };

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request error:', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request warning:', logData);
    } else {
      logger.debug('Request completed:', logData);
    }
  });

  next();
};

module.exports = requestLogger;
