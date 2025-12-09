/**
 * 🔧 JARVIS CONFIG MANAGER
 * Sistema centralizado de configuración con validación y valores por defecto
 *
 * Features:
 * - Carga automática de .env
 * - Validación de variables requeridas
 * - Valores por defecto seguros
 * - Soporte para múltiples entornos
 * - Hot reload en desarrollo
 */

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = {};
    this.environment = process.env.NODE_ENV || 'development';
    this.loadConfig();
  }

  /**
   * Carga la configuración desde archivos .env
   */
  loadConfig() {
    // Cargar .env principal
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }

    // Cargar .env específico del entorno
    const envSpecificPath = path.join(__dirname, '..', `.env.${this.environment}`);
    if (fs.existsSync(envSpecificPath)) {
      dotenv.config({ path: envSpecificPath, override: true });
    }

    // Construir objeto de configuración
    this.config = {
      // Entorno
      env: this.environment,
      isDevelopment: this.environment === 'development',
      isProduction: this.environment === 'production',
      isTesting: this.environment === 'test',

      // Servidor
      server: {
        port: this.getNumber('PORT', 7777),
        host: this.getString('HOST', 'localhost'),
        cors: {
          enabled: this.getBoolean('CORS_ENABLED', true),
          origin: this.getString('CORS_ORIGIN', '*')
        }
      },

      // Base de datos
      database: {
        type: this.getString('DB_TYPE', 'sqlite'),
        path: this.getString('DB_PATH', './memory/jarvis.db'),
        host: this.getString('DB_HOST', 'localhost'),
        port: this.getNumber('DB_PORT', 3306),
        user: this.getString('DB_USER', ''),
        password: this.getString('DB_PASSWORD', ''),
        name: this.getString('DB_NAME', 'jarvis'),
        pool: {
          min: this.getNumber('DB_POOL_MIN', 2),
          max: this.getNumber('DB_POOL_MAX', 10)
        }
      },

      // IA & Ollama
      ai: {
        enabled: this.getBoolean('AI_ENABLED', true),
        provider: this.getString('AI_PROVIDER', 'ollama'),
        ollama: {
          host: this.getString('OLLAMA_HOST', 'http://localhost:11434'),
          model: this.getString('OLLAMA_MODEL', 'mistral:latest'),
          timeout: this.getNumber('OLLAMA_TIMEOUT', 120000)
        },
        anthropic: {
          apiKey: this.getString('ANTHROPIC_API_KEY', ''),
          model: this.getString('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229')
        }
      },

      // Memoria
      memory: {
        enabled: this.getBoolean('MEMORY_ENABLED', true),
        path: this.getString('MEMORY_PATH', './memory'),
        maxHistoryLength: this.getNumber('MEMORY_MAX_HISTORY', 10),
        autoSave: this.getBoolean('MEMORY_AUTO_SAVE', true),
        saveInterval: this.getNumber('MEMORY_SAVE_INTERVAL', 30000)
      },

      // Monitoreo
      monitoring: {
        enabled: this.getBoolean('MONITORING_ENABLED', true),
        interval: this.getNumber('MONITORING_INTERVAL', 5000),
        maxFilesToMonitor: this.getNumber('MONITORING_MAX_FILES', 10000),
        excludePaths: this.getArray('MONITORING_EXCLUDE', ['node_modules', '.git', 'logs'])
      },

      // Email
      email: {
        enabled: this.getBoolean('EMAIL_ENABLED', false),
        service: this.getString('EMAIL_SERVICE', 'gmail'),
        user: this.getString('EMAIL_USER', ''),
        password: this.getString('EMAIL_PASSWORD', ''),
        from: this.getString('EMAIL_FROM', 'jarvis@starkindustries.com')
      },

      // GitHub
      github: {
        enabled: this.getBoolean('GITHUB_ENABLED', false),
        token: this.getString('GITHUB_TOKEN', ''),
        owner: this.getString('GITHUB_OWNER', ''),
        repo: this.getString('GITHUB_REPO', '')
      },

      // Voice
      voice: {
        enabled: this.getBoolean('VOICE_ENABLED', false),
        language: this.getString('VOICE_LANGUAGE', 'es-ES'),
        provider: this.getString('VOICE_PROVIDER', 'google')
      },

      // Web Interface
      web: {
        enabled: this.getBoolean('WEB_ENABLED', true),
        frontendPort: this.getNumber('WEB_FRONTEND_PORT', 5173),
        backendPort: this.getNumber('WEB_BACKEND_PORT', 7777),
        socketPath: this.getString('WEB_SOCKET_PATH', '/socket.io')
      },

      // Seguridad
      security: {
        jwtSecret: this.getString('JWT_SECRET', this.generateSecret()),
        jwtExpiration: this.getString('JWT_EXPIRATION', '24h'),
        bcryptRounds: this.getNumber('BCRYPT_ROUNDS', 10),
        rateLimit: {
          enabled: this.getBoolean('RATE_LIMIT_ENABLED', true),
          windowMs: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
          maxRequests: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100)
        }
      },

      // Logs
      logging: {
        level: this.getString('LOG_LEVEL', 'info'),
        file: this.getBoolean('LOG_FILE', true),
        console: this.getBoolean('LOG_CONSOLE', true),
        maxSize: this.getString('LOG_MAX_SIZE', '20m'),
        maxFiles: this.getString('LOG_MAX_FILES', '14d'),
        path: this.getString('LOG_PATH', './logs')
      },

      // Redis Cache
      redis: {
        enabled: this.getBoolean('REDIS_ENABLED', false),
        host: this.getString('REDIS_HOST', 'localhost'),
        port: this.getNumber('REDIS_PORT', 6379),
        password: this.getString('REDIS_PASSWORD', ''),
        db: this.getNumber('REDIS_DB', 0),
        ttl: this.getNumber('REDIS_TTL', 3600)
      },

      // Backup
      backup: {
        enabled: this.getBoolean('BACKUP_ENABLED', true),
        path: this.getString('BACKUP_PATH', './backups'),
        interval: this.getString('BACKUP_INTERVAL', '0 2 * * *'), // 2 AM daily
        retention: this.getNumber('BACKUP_RETENTION_DAYS', 7),
        compression: this.getBoolean('BACKUP_COMPRESSION', true)
      },

      // Enterprise Features
      enterprise: {
        observability: this.getBoolean('OBSERVABILITY_ENABLED', true),
        chaos: this.getBoolean('CHAOS_ENGINEERING_ENABLED', false),
        featureFlags: this.getBoolean('FEATURE_FLAGS_ENABLED', true),
        serviceMesh: this.getBoolean('SERVICE_MESH_ENABLED', false),
        autoHealing: this.getBoolean('AUTO_HEALING_ENABLED', true)
      },

      // Paths
      paths: {
        root: path.join(__dirname, '..'),
        core: path.join(__dirname),
        memory: path.join(__dirname, '..', 'memory'),
        logs: path.join(__dirname, '..', 'logs'),
        backups: path.join(__dirname, '..', 'backups'),
        projects: path.join(__dirname, '..', 'Proyectos'),
        web: path.join(__dirname, '..', 'web-interface')
      }
    };

    // Validar configuración crítica
    this.validate();
  }

  /**
   * Obtiene un valor string del environment
   */
  getString(key, defaultValue = '') {
    return process.env[key] || defaultValue;
  }

  /**
   * Obtiene un valor numérico del environment
   */
  getNumber(key, defaultValue = 0) {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Obtiene un valor booleano del environment
   */
  getBoolean(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Obtiene un array del environment
   */
  getArray(key, defaultValue = []) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(v => v.trim());
  }

  /**
   * Genera un secret aleatorio para JWT
   */
  generateSecret() {
    return require('crypto').randomBytes(64).toString('hex');
  }

  /**
   * Valida la configuración crítica
   */
  validate() {
    const errors = [];

    // Validar puerto
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('PORT debe estar entre 1 y 65535');
    }

    // Validar AI si está habilitado
    if (this.config.ai.enabled && this.config.ai.provider === 'anthropic') {
      if (!this.config.ai.anthropic.apiKey) {
        console.warn('⚠️ ANTHROPIC_API_KEY no configurada, usando Ollama por defecto');
        this.config.ai.provider = 'ollama';
      }
    }

    // Validar database
    if (this.config.database.type === 'mysql' && !this.config.database.user) {
      errors.push('DB_USER es requerido para MySQL');
    }

    // Validar JWT secret en producción
    if (this.isProduction && this.config.security.jwtSecret.length < 32) {
      errors.push('JWT_SECRET debe tener al menos 32 caracteres en producción');
    }

    // Reportar errores
    if (errors.length > 0) {
      console.error('❌ Errores de configuración:');
      errors.forEach(err => console.error(`  - ${err}`));
      if (this.isProduction) {
        throw new Error('Configuración inválida en producción');
      }
    }
  }

  /**
   * Obtiene toda la configuración
   */
  getAll() {
    return this.config;
  }

  /**
   * Obtiene un valor específico con dot notation
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Establece un valor en runtime (no persiste)
   */
  set(path, value) {
    const keys = path.split('.');
    let target = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    target[keys[keys.length - 1]] = value;
  }

  /**
   * Recarga la configuración (útil en desarrollo)
   */
  reload() {
    console.log('🔄 Recargando configuración...');
    this.loadConfig();
    console.log('✅ Configuración recargada');
  }

  /**
   * Exporta la configuración actual (sin secretos)
   */
  export(includeSensitive = false) {
    const exported = JSON.parse(JSON.stringify(this.config));

    if (!includeSensitive) {
      // Remover datos sensibles
      if (exported.security) {
        exported.security.jwtSecret = '***HIDDEN***';
      }
      if (exported.database) {
        exported.database.password = '***HIDDEN***';
      }
      if (exported.ai?.anthropic) {
        exported.ai.anthropic.apiKey = '***HIDDEN***';
      }
      if (exported.email) {
        exported.email.password = '***HIDDEN***';
      }
      if (exported.github) {
        exported.github.token = '***HIDDEN***';
      }
      if (exported.redis) {
        exported.redis.password = '***HIDDEN***';
      }
    }

    return exported;
  }

  /**
   * Imprime la configuración actual
   */
  print() {
    console.log('\n🔧 JARVIS CONFIGURATION\n');
    console.log('Environment:', this.config.env);
    console.log('Server:', `${this.config.server.host}:${this.config.server.port}`);
    console.log('AI Provider:', this.config.ai.provider);
    console.log('Database:', this.config.database.type);
    console.log('Memory:', this.config.memory.enabled ? 'Enabled' : 'Disabled');
    console.log('Monitoring:', this.config.monitoring.enabled ? 'Enabled' : 'Disabled');
    console.log('Web Interface:', this.config.web.enabled ? 'Enabled' : 'Disabled');
    console.log('');
  }
}

// Exportar singleton
const configManager = new ConfigManager();
module.exports = configManager;
