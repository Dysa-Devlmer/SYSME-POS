/**
 * Advanced Security Middleware v2.1
 * Enhanced security features adicionales para SYSME POS
 *
 * Este middleware complementa el security.js existente con:
 * - CSRF Protection mejorado
 * - API Key validation
 * - Request signature verification
 * - Advanced input validation
 * - Honeypot detection
 * - Brute force protection
 */

const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

/**
 * CSRF Token Generator y Validator mejorado
 */
class CSRFProtection {
  constructor() {
    this.tokenStore = new Map();
    this.tokenExpiry = 3600000; // 1 hora
  }

  generateToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    this.tokenStore.set(sessionId, {
      token,
      createdAt: Date.now()
    });

    // Limpiar tokens expirados
    this.cleanExpiredTokens();

    return token;
  }

  validateToken(sessionId, token) {
    const stored = this.tokenStore.get(sessionId);

    if (!stored) return false;

    // Verificar expiración
    if (Date.now() - stored.createdAt > this.tokenExpiry) {
      this.tokenStore.delete(sessionId);
      return false;
    }

    return stored.token === token;
  }

  cleanExpiredTokens() {
    const now = Date.now();
    for (const [sessionId, data] of this.tokenStore.entries()) {
      if (now - data.createdAt > this.tokenExpiry) {
        this.tokenStore.delete(sessionId);
      }
    }
  }

  middleware() {
    return (req, res, next) => {
      // Skip for safe methods
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }

      const sessionId = req.session?.id || req.ip;
      const token = req.get('X-CSRF-Token') || req.body._csrf;

      if (!this.validateToken(sessionId, token)) {
        return res.status(403).json({
          error: 'CSRF validation failed',
          message: 'Invalid or missing CSRF token'
        });
      }

      next();
    };
  }

  attachToken(req, res, next) {
    const sessionId = req.session?.id || req.ip;
    const token = this.generateToken(sessionId);

    res.locals.csrfToken = token;
    res.setHeader('X-CSRF-Token', token);

    next();
  }
}

const csrfProtection = new CSRFProtection();

/**
 * API Key Validator con rate limiting por key
 */
class APIKeyValidator {
  constructor() {
    this.keyUsage = new Map(); // Track usage per key
    this.keyRateLimits = new Map(); // Rate limits per key
  }

  middleware(options = {}) {
    const {
      header = 'X-API-Key',
      required = true,
      rateLimit = { windowMs: 60000, max: 100 }
    } = options;

    return (req, res, next) => {
      const apiKey = req.get(header);

      if (!apiKey) {
        if (required) {
          return res.status(401).json({
            error: 'API key missing',
            message: `${header} header is required`
          });
        }
        return next();
      }

      // Validate key format
      if (!/^[a-zA-Z0-9-_]{32,}$/.test(apiKey)) {
        return res.status(401).json({
          error: 'Invalid API key format',
          message: 'API key must be at least 32 alphanumeric characters'
        });
      }

      // Check rate limit for this key
      if (!this.checkRateLimit(apiKey, rateLimit)) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests with this API key'
        });
      }

      // Attach key info to request
      req.apiKey = apiKey;

      next();
    };
  }

  checkRateLimit(apiKey, limits) {
    const now = Date.now();
    const usage = this.keyUsage.get(apiKey) || [];

    // Remove expired entries
    const validUsage = usage.filter(time => now - time < limits.windowMs);

    // Check limit
    if (validUsage.length >= limits.max) {
      return false;
    }

    // Add new usage
    validUsage.push(now);
    this.keyUsage.set(apiKey, validUsage);

    return true;
  }
}

const apiKeyValidator = new APIKeyValidator();

/**
 * Request Signature Verification (HMAC)
 */
const verifyRequestSignature = (secret) => {
  return (req, res, next) => {
    const signature = req.get('X-Signature');
    const timestamp = req.get('X-Timestamp');

    if (!signature || !timestamp) {
      return res.status(401).json({
        error: 'Missing signature',
        message: 'X-Signature and X-Timestamp headers are required'
      });
    }

    // Check timestamp (prevent replay attacks)
    const now = Date.now();
    const requestTime = parseInt(timestamp);

    if (Math.abs(now - requestTime) > 300000) { // 5 minutes
      return res.status(401).json({
        error: 'Invalid timestamp',
        message: 'Request timestamp is too old'
      });
    }

    // Verify signature
    const payload = `${req.method}:${req.path}:${timestamp}:${JSON.stringify(req.body)}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(401).json({
        error: 'Invalid signature',
        message: 'Request signature verification failed'
      });
    }

    next();
  };
};

/**
 * Honeypot Detection
 * Detecta bots que llenan campos ocultos
 */
const honeypotDetection = (fieldName = 'website') => {
  return (req, res, next) => {
    if (req.body && req.body[fieldName]) {
      // Bot detected
      console.warn(`🍯 Honeypot triggered by IP: ${req.ip}`);

      // Return fake success to confuse bot
      return res.status(200).json({
        success: true,
        message: 'Request processed successfully'
      });
    }

    // Remove honeypot field
    if (req.body) {
      delete req.body[fieldName];
    }

    next();
  };
};

/**
 * Brute Force Protection
 */
class BruteForceProtection {
  constructor() {
    this.attempts = new Map();
    this.blockList = new Map();
  }

  middleware(options = {}) {
    const {
      maxAttempts = 5,
      windowMs = 900000, // 15 minutes
      blockDuration = 3600000 // 1 hour
    } = options;

    return (req, res, next) => {
      const identifier = req.ip + ':' + (req.body?.username || req.body?.email || '');

      // Check if blocked
      if (this.isBlocked(identifier)) {
        const blockedUntil = this.blockList.get(identifier);
        const remainingTime = Math.ceil((blockedUntil - Date.now()) / 60000);

        return res.status(429).json({
          error: 'Too many failed attempts',
          message: `Account temporarily locked. Try again in ${remainingTime} minutes.`,
          retryAfter: remainingTime * 60
        });
      }

      // Track attempt
      this.trackAttempt(identifier, windowMs, maxAttempts, blockDuration);

      // Check on response
      res.on('finish', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          this.recordFailedAttempt(identifier, maxAttempts, blockDuration);
        } else if (res.statusCode === 200) {
          this.clearAttempts(identifier);
        }
      });

      next();
    };
  }

  isBlocked(identifier) {
    const blockedUntil = this.blockList.get(identifier);
    if (!blockedUntil) return false;

    if (Date.now() > blockedUntil) {
      this.blockList.delete(identifier);
      return false;
    }

    return true;
  }

  trackAttempt(identifier, windowMs, maxAttempts, blockDuration) {
    const now = Date.now();
    let attempts = this.attempts.get(identifier) || [];

    // Remove old attempts
    attempts = attempts.filter(time => now - time < windowMs);

    this.attempts.set(identifier, attempts);
  }

  recordFailedAttempt(identifier, maxAttempts, blockDuration) {
    const now = Date.now();
    let attempts = this.attempts.get(identifier) || [];

    attempts.push(now);
    this.attempts.set(identifier, attempts);

    if (attempts.length >= maxAttempts) {
      this.blockList.set(identifier, now + blockDuration);
      this.attempts.delete(identifier);

      console.warn(`🚨 Brute force detected - Blocked: ${identifier}`);
    }
  }

  clearAttempts(identifier) {
    this.attempts.delete(identifier);
  }
}

const bruteForceProtection = new BruteForceProtection();

/**
 * Advanced Input Validation Schemas
 */
const advancedValidation = {
  // Validación de email corporativo
  corporateEmail: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .custom((value) => {
        const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
        const domain = value.split('@')[1];

        if (blockedDomains.includes(domain)) {
          throw new Error('Temporary email addresses are not allowed');
        }

        return true;
      })
  ],

  // Validación de contraseña fuerte
  strongPassword: [
    body('password')
      .isLength({ min: 12 })
      .withMessage('Password must be at least 12 characters')
      .matches(/[a-z]/)
      .withMessage('Password must contain lowercase letters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain uppercase letters')
      .matches(/\d/)
      .withMessage('Password must contain numbers')
      .matches(/[@$!%*?&]/)
      .withMessage('Password must contain special characters')
      .custom((value) => {
        const commonPasswords = ['Password123!', 'Admin123!', 'Welcome123!'];
        if (commonPasswords.includes(value)) {
          throw new Error('Password is too common');
        }
        return true;
      })
  ],

  // Validación de número de teléfono internacional
  internationalPhone: [
    body('phone')
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage('Invalid international phone number format')
  ],

  // Validación de URL segura
  secureURL: [
    body('url')
      .isURL({ protocols: ['https'], require_protocol: true })
      .withMessage('Only HTTPS URLs are allowed')
  ],

  // Validación de JSON
  jsonField: (fieldName) => [
    body(fieldName)
      .custom((value) => {
        try {
          JSON.parse(value);
          return true;
        } catch (e) {
          throw new Error('Invalid JSON format');
        }
      })
  ]
};

/**
 * Content-Type Validation
 */
const validateContentType = (allowedTypes = ['application/json']) => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');

    if (req.method !== 'GET' && req.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          error: 'Unsupported Media Type',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
};

/**
 * Request Method Whitelist
 */
const allowedMethods = (methods = ['GET', 'POST', 'PUT', 'DELETE']) => {
  return (req, res, next) => {
    if (!methods.includes(req.method)) {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: `Method ${req.method} is not allowed`,
        allowed: methods
      });
    }

    res.setHeader('Allow', methods.join(', '));
    next();
  };
};

/**
 * Validation Error Handler mejorado
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().reduce((acc, err) => {
      if (!acc[err.param]) {
        acc[err.param] = [];
      }
      acc[err.param].push(err.msg);
      return acc;
    }, {});

    return res.status(400).json({
      error: 'Validation failed',
      details: formattedErrors,
      count: errors.array().length
    });
  }

  next();
};

module.exports = {
  // CSRF Protection
  csrfProtection: csrfProtection.middleware(),
  attachCSRFToken: csrfProtection.attachToken.bind(csrfProtection),

  // API Key Validation
  requireApiKey: apiKeyValidator.middleware({ required: true }),
  optionalApiKey: apiKeyValidator.middleware({ required: false }),

  // Request Signature
  verifyRequestSignature,

  // Anti-Bot
  honeypotDetection,

  // Brute Force Protection
  bruteForceProtection: bruteForceProtection.middleware(),

  // Advanced Validation
  advancedValidation,
  handleValidationErrors,

  // Misc
  validateContentType,
  allowedMethods
};
