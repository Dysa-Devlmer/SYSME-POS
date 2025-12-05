// =====================================================
// SYSME POS - Global Error Handler Middleware
// =====================================================

const logger = require('../config/logger');
const config = require('../config/config');

/**
 * Global error handler middleware
 * Must be last middleware in the chain
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    ip: req.ip,
    user: req.user?.id || 'anonymous'
  });

  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = Object.values(err.errors).map(e => e.message);
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Forbidden';
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    statusCode = 409;
    message = 'Database constraint violation';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  // Include additional details in development
  if (config.app.env !== 'production') {
    errorResponse.details = {
      type: err.name,
      message: err.message,
      stack: err.stack,
      errors: errors
    };
  } else if (errors) {
    errorResponse.errors = errors;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
