/**
 * Enhanced Security Middleware for Production
 * Implements comprehensive security measures for SYSME production deployment
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';

// Rate limiting configuration
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Store in Redis for production clustering
    // store: process.env.REDIS_HOST ? new RedisStore({...}) : undefined
  });
};

// Security middleware factory
export const createSecurityMiddleware = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // General rate limiting
    generalLimiter: createRateLimiter(
      15 * 60 * 1000, // 15 minutes
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
      'Too many requests from this IP'
    ),

    // Strict rate limiting for authentication
    authLimiter: createRateLimiter(
      15 * 60 * 1000, // 15 minutes
      5, // Only 5 login attempts per 15 minutes
      'Too many authentication attempts'
    ),

    // API rate limiting
    apiLimiter: createRateLimiter(
      1 * 60 * 1000, // 1 minute
      30, // 30 requests per minute
      'API rate limit exceeded'
    ),

    // Helmet security headers
    helmet: helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow for WebSocket connections
    }),

    // CORS configuration
    cors: cors({
      origin: function (origin, callback) {
        const allowedOrigins = [
          process.env.CORS_ORIGIN,
          'http://localhost:3000',
          'http://localhost:5173'
        ].filter(Boolean);

        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }),

    // Request sanitization
    sanitizeRequest: (req, res, next) => {
      // Remove potential XSS vectors
      const sanitizeObject = (obj) => {
        if (typeof obj === 'string') {
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => {
            obj[key] = sanitizeObject(obj[key]);
          });
        }
        return obj;
      };

      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }

      next();
    },

    // SQL injection protection (basic)
    sqlInjectionProtection: (req, res, next) => {
      const suspiciousPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)/i,
        /(UNION\s+SELECT)/i,
        /(\bOR\b.*=.*)/i,
        /(\bAND\b.*=.*)/i,
        /(--|\#|\/\*|\*\/)/,
        /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
      ];

      const checkValue = (value) => {
        if (typeof value === 'string') {
          return suspiciousPatterns.some(pattern => pattern.test(value));
        }
        return false;
      };

      const hasSuspiciousContent = (obj) => {
        if (typeof obj === 'string') {
          return checkValue(obj);
        }
        if (typeof obj === 'object' && obj !== null) {
          return Object.values(obj).some(value => hasSuspiciousContent(value));
        }
        return false;
      };

      if (hasSuspiciousContent(req.body) || hasSuspiciousContent(req.query)) {
        return res.status(400).json({
          error: 'Invalid request content',
          message: 'Request contains potentially harmful content'
        });
      }

      next();
    },

    // Request logging for security monitoring
    securityLogger: (req, res, next) => {
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logData = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.url,
          ip: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode,
          duration,
          contentLength: res.get('Content-Length') || 0
        };

        // Log suspicious activities
        if (res.statusCode >= 400 || duration > 5000) {
          console.warn('🚨 Security Alert:', logData);
        }
      });

      next();
    },

    // File upload security
    fileUploadSecurity: (req, res, next) => {
      if (req.file || req.files) {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf'
        ];

        const maxFileSize = 5 * 1024 * 1024; // 5MB

        const validateFile = (file) => {
          if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('File type not allowed');
          }
          if (file.size > maxFileSize) {
            throw new Error('File size too large');
          }
          // Additional security: check file extension
          const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
          const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
          if (!allowedExtensions.includes(fileExtension)) {
            throw new Error('File extension not allowed');
          }
        };

        try {
          if (req.file) {
            validateFile(req.file);
          }
          if (req.files) {
            if (Array.isArray(req.files)) {
              req.files.forEach(validateFile);
            } else {
              Object.values(req.files).forEach(fileArray => {
                if (Array.isArray(fileArray)) {
                  fileArray.forEach(validateFile);
                } else {
                  validateFile(fileArray);
                }
              });
            }
          }
        } catch (error) {
          return res.status(400).json({
            error: 'File validation failed',
            message: error.message
          });
        }
      }

      next();
    }
  };
};

// IP whitelist middleware for admin endpoints
export const createIPWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // In development, allow all IPs
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      next();
    } else {
      console.warn(`🚨 Unauthorized IP access attempt: ${clientIP}`);
      res.status(403).json({
        error: 'Access denied',
        message: 'Your IP address is not authorized'
      });
    }
  };
};

// Request size limiting
export const requestSizeLimiter = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024);
      const limitMB = parseInt(limit);

      if (sizeMB > limitMB) {
        return res.status(413).json({
          error: 'Request too large',
          message: `Request size ${sizeMB.toFixed(2)}MB exceeds limit of ${limitMB}MB`
        });
      }
    }
    next();
  };
};

export default createSecurityMiddleware;