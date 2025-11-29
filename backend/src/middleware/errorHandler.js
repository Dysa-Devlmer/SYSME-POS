/**
 * Error Handler Middleware
 * Centralized error handling with logging and appropriate responses
 */

import { logger, logSecurityEvent } from '../config/logger.js';

// Custom error classes
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = null) {
    super(message, 400);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
  }
}

// Error handler middleware
export const errorHandler = (error, req, res, next) => {
  // Set default error values
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';
  let errors = error.errors || null;
  
  // Log error details
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || null,
    username: req.user?.username || null,
    body: req.method !== 'GET' ? req.body : null,
    query: req.query
  };
  
  // Handle specific error types
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid input data';
    
    logger.warn('Validation error:', errorInfo);
    
  } else if (error.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Resource already exists';
    
    logger.warn('Duplicate entry error:', errorInfo);
    
  } else if (error.code === 'ER_NO_SUCH_TABLE') {
    statusCode = 500;
    message = 'Database configuration error';
    
    logger.error('Database table error:', errorInfo);
    
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
    
    logger.error('Connection error:', errorInfo);
    
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    
    logSecurityEvent('INVALID_TOKEN', errorInfo);
    
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    
    logSecurityEvent('EXPIRED_TOKEN', errorInfo);
    
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File size too large';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    } else {
      message = 'File upload error';
    }
    
    logger.warn('File upload error:', errorInfo);
    
  } else if (statusCode >= 500) {
    // Log server errors
    logger.error('Server error:', errorInfo);
    
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal Server Error';
      errors = null;
    }
    
  } else if (statusCode >= 400) {
    // Log client errors
    logger.warn('Client error:', errorInfo);
    
    // Log potential security issues
    if (statusCode === 401 || statusCode === 403) {
      logSecurityEvent('ACCESS_DENIED', errorInfo);
    }
  }
  
  // Prepare error response
  const response = {
    success: false,
    error: message,
    statusCode,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: errorInfo
    })
  };
  
  // Add request ID for tracking
  if (req.id) {
    response.requestId = req.id;
  }
  
  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Global error handlers for uncaught exceptions
export const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : null,
      promise: promise
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

export default {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  errorHandler,
  asyncHandler,
  setupGlobalErrorHandlers
};