// =====================================================
// SYSME POS - Maintenance Mode Middleware
// =====================================================

const config = require('../config/config');

/**
 * Check if system is in maintenance mode
 * Allows health checks to pass through
 */
const maintenanceMode = (req, res, next) => {
  // Skip maintenance check for health endpoint
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  // Check if maintenance mode is enabled
  if (config.maintenance.enabled) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: config.maintenance.message,
      maintenanceMode: true,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

module.exports = maintenanceMode;
