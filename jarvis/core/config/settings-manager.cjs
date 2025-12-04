// core/config/settings-manager.cjs
// Sistema de Configuración Centralizado

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

/**
 * Settings Manager
 *
 * Sistema centralizado de configuración para JARVIS
 *
 * Características:
 * - Configuraciones persistentes en JSON
 * - Validación de schemas
 * - Hot reload sin reiniciar
 * - Encriptación para valores sensibles
 * - Backup y restauración
 * - Profiles (dev, staging, prod)
 * - Eventos de cambio de configuración
 */
class SettingsManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.configDir = options.configDir || path.join(this.projectRoot, 'config');
    this.profile = options.profile || process.env.NODE_ENV || 'development';
    this.encryptionKey = options.encryptionKey || process.env.JARVIS_ENCRYPTION_KEY;

    // Configuraciones cargadas
    this.settings = {};

    // Schema de validación
    this.schema = this.initializeSchema();

    // Valores por defecto
    this.defaults = this.initializeDefaults();

    this.isInitialized = false;
  }

  /**
   * Inicializa el settings manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('⚙️ [Settings Manager] Inicializando...');
    console.log(`   📁 Config dir: ${this.configDir}`);
    console.log(`   🏷️ Profile: ${this.profile}`);

    // Crear directorio de configuración
    await fs.ensureDir(this.configDir);

    // Cargar configuraciones
    await this.loadSettings();

    this.isInitialized = true;
    console.log('✅ [Settings Manager] Sistema de configuración listo');

    this.emit('initialized');
  }

  /**
   * Inicializa el schema de validación
   */
  initializeSchema() {
    return {
      // Sistema general
      system: {
        type: 'object',
        properties: {
          projectName: { type: 'string', default: 'JARVIS' },
          version: { type: 'string', default: '2.0.0' },
          language: { type: 'string', enum: ['es', 'en'], default: 'es' },
          timezone: { type: 'string', default: 'America/Mexico_City' }
        }
      },

      // Autonomous Agent
      agent: {
        type: 'object',
        properties: {
          maxConcurrentTasks: { type: 'number', min: 1, max: 10, default: 3 },
          defaultStrategy: { type: 'string', enum: ['balanced', 'speed', 'quality'], default: 'balanced' },
          maxRetries: { type: 'number', min: 0, max: 5, default: 3 },
          timeout: { type: 'number', min: 30000, default: 300000 } // ms
        }
      },

      // Scheduler
      scheduler: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          maxTasks: { type: 'number', min: 10, default: 100 },
          defaultRetries: { type: 'number', min: 0, max: 5, default: 3 }
        }
      },

      // Logging
      logging: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
          enableConsole: { type: 'boolean', default: true },
          maxFileSize: { type: 'string', default: '20m' },
          maxFiles: { type: 'string', default: '30d' }
        }
      },

      // Monitoring
      monitoring: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          interval: { type: 'number', min: 1000, default: 5000 }, // ms
          alerts: {
            type: 'object',
            properties: {
              cpu: { type: 'number', min: 50, max: 100, default: 80 },
              memory: { type: 'number', min: 50, max: 100, default: 85 },
              disk: { type: 'number', min: 50, max: 100, default: 90 }
            }
          }
        }
      },

      // Notifications
      notifications: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          maxNotifications: { type: 'number', min: 10, default: 100 },
          retentionDays: { type: 'number', min: 1, default: 30 },
          pushEnabled: { type: 'boolean', default: true }
        }
      },

      // Code Search
      search: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          maxResults: { type: 'number', min: 10, max: 1000, default: 100 },
          excludePatterns: {
            type: 'array',
            default: ['node_modules', '.git', 'dist', 'build', '.next']
          }
        }
      },

      // Voice Control
      voice: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          language: { type: 'string', enum: ['es-ES', 'en-US'], default: 'es-ES' },
          autoSpeak: { type: 'boolean', default: true },
          speechRate: { type: 'number', min: 0.5, max: 2, default: 1.0 }
        }
      },

      // UI/Theme
      ui: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['dark', 'light'], default: 'dark' },
          compactMode: { type: 'boolean', default: false },
          animations: { type: 'boolean', default: true },
          fontSize: { type: 'string', enum: ['small', 'medium', 'large'], default: 'medium' }
        }
      },

      // API/Server
      server: {
        type: 'object',
        properties: {
          port: { type: 'number', min: 1000, max: 65535, default: 3001 },
          host: { type: 'string', default: 'localhost' },
          cors: { type: 'boolean', default: true },
          rateLimit: { type: 'number', default: 100 } // requests per minute
        }
      }
    };
  }

  /**
   * Inicializa valores por defecto
   */
  initializeDefaults() {
    const defaults = {};

    for (const [key, config] of Object.entries(this.schema)) {
      defaults[key] = this.extractDefaults(config);
    }

    return defaults;
  }

  /**
   * Extrae valores por defecto de un schema
   */
  extractDefaults(config) {
    if (config.type === 'object' && config.properties) {
      const obj = {};
      for (const [key, prop] of Object.entries(config.properties)) {
        obj[key] = this.extractDefaults(prop);
      }
      return obj;
    }

    return config.default;
  }

  /**
   * Carga configuraciones desde archivos
   */
  async loadSettings() {
    console.log('📂 [Settings Manager] Cargando configuraciones...');

    // Empezar con defaults
    this.settings = JSON.parse(JSON.stringify(this.defaults));

    // Cargar configuración base
    const baseFile = path.join(this.configDir, 'settings.json');
    if (await fs.pathExists(baseFile)) {
      const baseSettings = await fs.readJson(baseFile);
      this.mergeSettings(this.settings, baseSettings);
      console.log('   ✅ Cargada configuración base');
    } else {
      // Crear archivo por defecto
      await fs.writeJson(baseFile, this.settings, { spaces: 2 });
      console.log('   ✅ Creada configuración por defecto');
    }

    // Cargar configuración de profile (si existe)
    const profileFile = path.join(this.configDir, `settings.${this.profile}.json`);
    if (await fs.pathExists(profileFile)) {
      const profileSettings = await fs.readJson(profileFile);
      this.mergeSettings(this.settings, profileSettings);
      console.log(`   ✅ Cargada configuración de profile: ${this.profile}`);
    }

    // Validar configuraciones
    this.validateSettings(this.settings);

    console.log('✅ [Settings Manager] Configuraciones cargadas y validadas');
  }

  /**
   * Merge settings recursivamente
   */
  mergeSettings(target, source) {
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key]) target[key] = {};
        this.mergeSettings(target[key], value);
      } else {
        target[key] = value;
      }
    }
  }

  /**
   * Valida configuraciones contra el schema
   */
  validateSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
      if (!this.schema[key]) {
        console.warn(`⚠️ [Settings] Configuración desconocida: ${key}`);
        continue;
      }

      this.validateValue(key, value, this.schema[key]);
    }
  }

  /**
   * Valida un valor contra su schema
   */
  validateValue(path, value, schema) {
    if (schema.type === 'object' && schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (value[key] !== undefined) {
          this.validateValue(`${path}.${key}`, value[key], prop);
        }
      }
      return;
    }

    // Validar tipo
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      throw new Error(`${path}: tipo inválido, esperado ${schema.type}, recibido ${actualType}`);
    }

    // Validar enum
    if (schema.enum && !schema.enum.includes(value)) {
      throw new Error(`${path}: valor inválido, debe ser uno de: ${schema.enum.join(', ')}`);
    }

    // Validar min/max
    if (typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        throw new Error(`${path}: valor debe ser >= ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        throw new Error(`${path}: valor debe ser <= ${schema.max}`);
      }
    }
  }

  /**
   * Obtiene una configuración
   */
  get(path, defaultValue = undefined) {
    const keys = path.split('.');
    let value = this.settings;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value !== undefined ? value : defaultValue;
  }

  /**
   * Establece una configuración
   */
  async set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.settings;

    // Navegar hasta el penúltimo nivel
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }

    // Validar el nuevo valor
    const schemaPath = keys.join('.');
    const schema = this.getSchema(schemaPath);
    if (schema && schema.properties && schema.properties[lastKey]) {
      this.validateValue(`${schemaPath}.${lastKey}`, value, schema.properties[lastKey]);
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    // Persistir cambios
    await this.saveSettings();

    // Emitir evento de cambio
    this.emit('change', { path, oldValue, newValue: value });
    this.emit(`change:${path}`, value, oldValue);

    console.log(`⚙️ [Settings] Actualizado: ${path} = ${JSON.stringify(value)}`);

    return true;
  }

  /**
   * Obtiene el schema de un path
   */
  getSchema(path) {
    const keys = path.split('.');
    let schema = this.schema;

    for (const key of keys) {
      if (!schema[key]) return null;
      schema = schema[key];
    }

    return schema;
  }

  /**
   * Guarda configuraciones en disco
   */
  async saveSettings() {
    const baseFile = path.join(this.configDir, 'settings.json');
    await fs.writeJson(baseFile, this.settings, { spaces: 2 });
  }

  /**
   * Obtiene todas las configuraciones
   */
  getAll() {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * Obtiene el schema completo
   */
  getSchema() {
    return this.schema;
  }

  /**
   * Reinicia configuraciones a defaults
   */
  async reset(section = null) {
    if (section) {
      if (this.defaults[section]) {
        this.settings[section] = JSON.parse(JSON.stringify(this.defaults[section]));
        console.log(`⚙️ [Settings] Reiniciada sección: ${section}`);
      }
    } else {
      this.settings = JSON.parse(JSON.stringify(this.defaults));
      console.log('⚙️ [Settings] Todas las configuraciones reiniciadas');
    }

    await this.saveSettings();
    this.emit('reset', section);
  }

  /**
   * Exporta configuraciones
   */
  async export(outputPath) {
    const exportData = {
      version: '2.0.0',
      profile: this.profile,
      timestamp: Date.now(),
      settings: this.settings
    };

    await fs.writeJson(outputPath, exportData, { spaces: 2 });
    console.log(`✅ [Settings] Configuraciones exportadas a: ${outputPath}`);

    return outputPath;
  }

  /**
   * Importa configuraciones
   */
  async import(inputPath) {
    console.log(`📥 [Settings] Importando configuraciones desde: ${inputPath}`);

    const importData = await fs.readJson(inputPath);

    // Validar versión
    if (importData.version !== '2.0.0') {
      throw new Error('Versión de configuración incompatible');
    }

    // Merge con configuraciones actuales
    this.mergeSettings(this.settings, importData.settings);

    // Validar
    this.validateSettings(this.settings);

    // Guardar
    await this.saveSettings();

    console.log('✅ [Settings] Configuraciones importadas exitosamente');
    this.emit('imported');
  }

  /**
   * Crea backup de configuraciones
   */
  async backup() {
    const backupDir = path.join(this.configDir, 'backups');
    await fs.ensureDir(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `settings-backup-${timestamp}.json`);

    await this.export(backupFile);

    // Mantener solo últimos 10 backups
    const backups = (await fs.readdir(backupDir))
      .filter(f => f.startsWith('settings-backup-'))
      .sort()
      .reverse();

    for (const old of backups.slice(10)) {
      await fs.remove(path.join(backupDir, old));
    }

    console.log(`💾 [Settings] Backup creado: ${backupFile}`);
    return backupFile;
  }

  /**
   * Restaura desde backup
   */
  async restore(backupFile) {
    console.log(`♻️ [Settings] Restaurando desde: ${backupFile}`);

    // Crear backup del estado actual primero
    await this.backup();

    // Importar backup
    await this.import(backupFile);

    console.log('✅ [Settings] Configuraciones restauradas');
    this.emit('restored');
  }

  /**
   * Encripta un valor sensible
   */
  encrypt(value) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key no configurada');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Desencripta un valor
   */
  decrypt(encrypted) {
    if (!this.encryptionKey) {
      throw new Error('Encryption key no configurada');
    }

    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = SettingsManager;
