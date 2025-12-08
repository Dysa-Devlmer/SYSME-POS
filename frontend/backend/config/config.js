// =====================================================
// SYSME POS - Application Configuration
// =====================================================
// Centralized configuration management
//
// @author JARVIS AI Assistant
// @date 2025-11-20
// =====================================================

require('dotenv').config();

module.exports = {
  // Application
  app: {
    name: process.env.APP_NAME || 'SYSME POS',
    version: process.env.APP_VERSION || '2.1.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0'
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'sqlite:///data/database.db',
    logQueries: process.env.LOG_SQL_QUERIES === 'true'
  },

  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000 // 15 minutes
  },

  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    loginWindowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    loginMaxAttempts: parseInt(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
    timeout: parseInt(process.env.SESSION_TIMEOUT_MS) || 3600000 // 1 hour
  },

  // Redis
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    errorFile: process.env.ERROR_LOG_FILE || './logs/error.log'
  },

  // File Uploads
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },

  // Email (SMTP)
  email: {
    enabled: !!process.env.SMTP_HOST,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.EMAIL_FROM || 'noreply@sysmepos.com'
  },

  // Delivery Platforms
  delivery: {
    uberEats: {
      apiKey: process.env.UBER_EATS_API_KEY,
      apiSecret: process.env.UBER_EATS_API_SECRET,
      merchantId: process.env.UBER_EATS_MERCHANT_ID,
      storeId: process.env.UBER_EATS_STORE_ID
    },
    rappi: {
      apiKey: process.env.RAPPI_API_KEY,
      apiSecret: process.env.RAPPI_API_SECRET,
      merchantId: process.env.RAPPI_MERCHANT_ID
    },
    pedidosYa: {
      apiKey: process.env.PEDIDOSYA_API_KEY,
      apiSecret: process.env.PEDIDOSYA_API_SECRET,
      restaurantId: process.env.PEDIDOSYA_RESTAURANT_ID
    }
  },

  // Payment Gateways
  payment: {
    stripe: {
      enabled: !!process.env.STRIPE_SECRET_KEY,
      secretKey: process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.STRIPE_PUBLIC_KEY
    },
    paypal: {
      enabled: !!process.env.PAYPAL_CLIENT_ID,
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      mode: process.env.PAYPAL_MODE || 'sandbox'
    }
  },

  // Monitoring
  monitoring: {
    sentry: {
      enabled: !!process.env.SENTRY_DSN,
      dsn: process.env.SENTRY_DSN
    },
    newRelic: {
      enabled: !!process.env.NEW_RELIC_LICENSE_KEY,
      licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
      appName: process.env.NEW_RELIC_APP_NAME || 'SYSME-POS'
    }
  },

  // Analytics
  analytics: {
    googleAnalytics: {
      enabled: !!process.env.GA_TRACKING_ID,
      trackingId: process.env.GA_TRACKING_ID
    }
  },

  // Security
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key-32-characters-min',
    httpsEnabled: process.env.HTTPS_ENABLED === 'true',
    sslKeyPath: process.env.SSL_KEY_PATH,
    sslCertPath: process.env.SSL_CERT_PATH
  },

  // Backup
  backup: {
    dir: process.env.BACKUP_DIR || './backups',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30
  },

  // Feature Flags
  features: {
    loyaltyProgram: process.env.ENABLE_LOYALTY_PROGRAM !== 'false',
    deliveryIntegration: process.env.ENABLE_DELIVERY_INTEGRATION !== 'false',
    recipeSystem: process.env.ENABLE_RECIPE_SYSTEM !== 'false',
    reservations: process.env.ENABLE_RESERVATIONS !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false'
  },

  // Maintenance
  maintenance: {
    enabled: process.env.MAINTENANCE_MODE === 'true',
    message: process.env.MAINTENANCE_MESSAGE || "System under maintenance. We'll be back soon!"
  },

  // Locale
  locale: {
    timezone: process.env.TZ || 'America/Santiago',
    language: process.env.DEFAULT_LANGUAGE || 'es',
    currency: process.env.DEFAULT_CURRENCY || 'CLP'
  },

  // Performance
  performance: {
    clusterEnabled: process.env.CLUSTER_ENABLED === 'true',
    clusterWorkers: process.env.CLUSTER_WORKERS === 'auto'
      ? require('os').cpus().length
      : parseInt(process.env.CLUSTER_WORKERS) || 4
  },

  // Development
  development: {
    debug: process.env.DEBUG === 'true',
    logApiRequests: process.env.LOG_API_REQUESTS !== 'false'
  }
};
