/**
 * Sistema de Configuración Dinámica
 * Gestiona configuración centralizada con hot reload y versionado
 *
 * @module ConfigManager
 * @version 2.1.0
 */

const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');
const crypto = require('crypto');

/**
 * Gestor de configuración centralizado
 */
class ConfigManager extends EventEmitter {
  constructor() {
    super();

    this.config = {
      configPath: process.env.CONFIG_PATH || path.join(__dirname, '../config'),
      environment: process.env.NODE_ENV || 'development',
      hotReload: process.env.CONFIG_HOT_RELOAD !== 'false',
      watchInterval: 5000, // Revisar cambios cada 5s
      versionControl: true,
      encryption: {
        enabled: process.env.CONFIG_ENCRYPTION === 'true',
        algorithm: 'aes-256-gcm',
        key: process.env.CONFIG_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')
      },
      validation: {
        strict: process.env.CONFIG_STRICT_VALIDATION === 'true',
        schema: null
      }
    };

    this.configurations = new Map();
    this.schemas = new Map();
    this.versions = new Map();
    this.watchers = new Map();
    this.validators = new Map();
    this.defaults = new Map();
  }

  /**
   * Inicializa el gestor de configuración
   */
  async initialize() {
    try {
      console.log('⚙️  Iniciando gestor de configuración...');

      // Crear directorios si no existen
      await fs.mkdir(this.config.configPath, { recursive: true });
      await fs.mkdir(path.join(this.config.configPath, 'versions'), { recursive: true });
      await fs.mkdir(path.join(this.config.configPath, 'schemas'), { recursive: true });

      // Cargar configuraciones
      await this.loadAllConfigurations();

      // Cargar esquemas de validación
      await this.loadSchemas();

      // Iniciar hot reload si está habilitado
      if (this.config.hotReload) {
        this.startHotReload();
      }

      console.log('✅ Gestor de configuración inicializado');
      this.emit('initialized');

      return true;
    } catch (error) {
      console.error('❌ Error inicializando gestor de configuración:', error);
      throw error;
    }
  }

  /**
   * Carga todas las configuraciones
   */
  async loadAllConfigurations() {
    try {
      const files = await fs.readdir(this.config.configPath);

      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          const configName = file.replace('.json', '');
          await this.loadConfiguration(configName);
        }
      }

      console.log(`✅ ${this.configurations.size} configuraciones cargadas`);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
    }
  }

  /**
   * Carga una configuración específica
   */
  async loadConfiguration(name) {
    try {
      const filePath = path.join(this.config.configPath, `${name}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');

      let config = JSON.parse(fileContent);

      // Desencriptar si es necesario
      if (this.config.encryption.enabled && config.encrypted) {
        config = this.decrypt(config);
      }

      // Validar configuración
      const validation = await this.validateConfiguration(name, config);
      if (!validation.valid && this.config.validation.strict) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      // Guardar versión anterior
      if (this.configurations.has(name)) {
        await this.saveVersion(name, this.configurations.get(name));
      }

      // Guardar configuración
      this.configurations.set(name, config);

      // Calcular hash para detectar cambios
      const hash = this.calculateHash(config);
      this.versions.set(name, {
        hash,
        loadedAt: Date.now(),
        version: config.version || '1.0.0'
      });

      console.log(`✅ Configuración cargada: ${name}`);
      this.emit('config:loaded', { name, config });

      return config;
    } catch (error) {
      console.error(`Error cargando configuración ${name}:`, error);
      throw error;
    }
  }

  /**
   * Obtiene una configuración
   */
  get(name, defaultValue = null) {
    const config = this.configurations.get(name);

    if (!config) {
      if (defaultValue !== null) {
        return defaultValue;
      }
      throw new Error(`Configuración no encontrada: ${name}`);
    }

    return config;
  }

  /**
   * Obtiene un valor específico de una configuración
   */
  getValue(configName, path, defaultValue = null) {
    const config = this.get(configName, null);

    if (!config) {
      return defaultValue;
    }

    // Navegar por el path (ej: "database.connection.host")
    const parts = path.split('.');
    let value = config;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Establece una configuración completa
   */
  async set(name, config, options = {}) {
    try {
      // Validar configuración
      const validation = await this.validateConfiguration(name, config);
      if (!validation.valid && this.config.validation.strict) {
        throw new Error(`Configuración inválida: ${validation.errors.join(', ')}`);
      }

      // Guardar versión anterior
      if (this.configurations.has(name)) {
        await this.saveVersion(name, this.configurations.get(name));
      }

      // Actualizar configuración en memoria
      this.configurations.set(name, config);

      // Persistir a disco
      if (options.persist !== false) {
        await this.saveConfiguration(name, config, options);
      }

      // Actualizar hash de versión
      const hash = this.calculateHash(config);
      this.versions.set(name, {
        hash,
        updatedAt: Date.now(),
        version: config.version || '1.0.0'
      });

      console.log(`✅ Configuración actualizada: ${name}`);
      this.emit('config:updated', { name, config });

      return true;
    } catch (error) {
      console.error(`Error estableciendo configuración ${name}:`, error);
      throw error;
    }
  }

  /**
   * Establece un valor específico en una configuración
   */
  async setValue(configName, path, value, options = {}) {
    const config = this.get(configName, {});

    // Navegar y establecer valor
    const parts = path.split('.');
    let current = config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;

    // Guardar configuración completa
    return this.set(configName, config, options);
  }

  /**
   * Guarda configuración a disco
   */
  async saveConfiguration(name, config, options = {}) {
    try {
      const filePath = path.join(this.config.configPath, `${name}.json`);

      let dataToSave = { ...config };

      // Encriptar si está habilitado
      if (this.config.encryption.enabled && options.encrypt !== false) {
        dataToSave = this.encrypt(dataToSave);
      }

      // Guardar con formato legible
      const jsonData = JSON.stringify(dataToSave, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf-8');

      console.log(`💾 Configuración guardada: ${name}`);
      this.emit('config:saved', { name, filePath });

      return true;
    } catch (error) {
      console.error(`Error guardando configuración ${name}:`, error);
      throw error;
    }
  }

  /**
   * Guarda versión de configuración
   */
  async saveVersion(name, config) {
    if (!this.config.versionControl) return;

    try {
      const timestamp = Date.now();
      const versionPath = path.join(
        this.config.configPath,
        'versions',
        `${name}_${timestamp}.json`
      );

      const versionData = {
        name,
        timestamp,
        config,
        version: config.version || '1.0.0'
      };

      await fs.writeFile(versionPath, JSON.stringify(versionData, null, 2), 'utf-8');

      console.log(`📦 Versión guardada: ${name} (${timestamp})`);
    } catch (error) {
      console.error('Error guardando versión:', error);
    }
  }

  /**
   * Restaura una versión anterior
   */
  async restoreVersion(name, timestamp) {
    try {
      const versionPath = path.join(
        this.config.configPath,
        'versions',
        `${name}_${timestamp}.json`
      );

      const versionContent = await fs.readFile(versionPath, 'utf-8');
      const versionData = JSON.parse(versionContent);

      await this.set(name, versionData.config);

      console.log(`🔄 Versión restaurada: ${name} (${timestamp})`);
      this.emit('config:restored', { name, timestamp });

      return true;
    } catch (error) {
      console.error('Error restaurando versión:', error);
      throw error;
    }
  }

  /**
   * Lista versiones disponibles
   */
  async listVersions(name) {
    try {
      const versionsPath = path.join(this.config.configPath, 'versions');
      const files = await fs.readdir(versionsPath);

      const versions = files
        .filter(f => f.startsWith(`${name}_`) && f.endsWith('.json'))
        .map(f => {
          const timestamp = parseInt(f.replace(`${name}_`, '').replace('.json', ''));
          return {
            timestamp,
            date: new Date(timestamp),
            file: f
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      return versions;
    } catch (error) {
      console.error('Error listando versiones:', error);
      return [];
    }
  }

  /**
   * Carga esquemas de validación
   */
  async loadSchemas() {
    try {
      const schemasPath = path.join(this.config.configPath, 'schemas');
      const files = await fs.readdir(schemasPath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const schemaName = file.replace('.json', '').replace('.schema', '');
          const schemaPath = path.join(schemasPath, file);
          const schemaContent = await fs.readFile(schemaPath, 'utf-8');
          const schema = JSON.parse(schemaContent);

          this.schemas.set(schemaName, schema);
        }
      }

      console.log(`✅ ${this.schemas.size} esquemas cargados`);
    } catch (error) {
      console.error('Error cargando esquemas:', error);
    }
  }

  /**
   * Valida una configuración contra su esquema
   */
  async validateConfiguration(name, config) {
    const schema = this.schemas.get(name);

    if (!schema) {
      // No hay esquema, asumir válido
      return { valid: true, errors: [] };
    }

    const errors = [];

    // Validación básica de campos requeridos
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          errors.push(`Campo requerido faltante: ${field}`);
        }
      }
    }

    // Validación de tipos
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in config) {
          const value = config[key];
          const expectedType = prop.type;

          if (!this.validateType(value, expectedType)) {
            errors.push(`Tipo inválido para ${key}: esperado ${expectedType}`);
          }

          // Validar rango numérico
          if (expectedType === 'number') {
            if (prop.min !== undefined && value < prop.min) {
              errors.push(`${key} debe ser >= ${prop.min}`);
            }
            if (prop.max !== undefined && value > prop.max) {
              errors.push(`${key} debe ser <= ${prop.max}`);
            }
          }

          // Validar enum
          if (prop.enum && !prop.enum.includes(value)) {
            errors.push(`${key} debe ser uno de: ${prop.enum.join(', ')}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida el tipo de un valor
   */
  validateType(value, expectedType) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    if (expectedType === 'array') {
      return Array.isArray(value);
    }

    return actualType === expectedType;
  }

  /**
   * Inicia hot reload
   */
  startHotReload() {
    console.log('🔄 Hot reload activado');

    const watcher = setInterval(async () => {
      await this.checkForChanges();
    }, this.config.watchInterval);

    this.watchers.set('main', watcher);
  }

  /**
   * Detiene hot reload
   */
  stopHotReload() {
    for (const [name, watcher] of this.watchers) {
      clearInterval(watcher);
    }
    this.watchers.clear();
    console.log('⏸️  Hot reload desactivado');
  }

  /**
   * Verifica cambios en archivos de configuración
   */
  async checkForChanges() {
    try {
      const files = await fs.readdir(this.config.configPath);

      for (const file of files) {
        if (file.endsWith('.json') && !file.startsWith('.')) {
          const configName = file.replace('.json', '');
          const filePath = path.join(this.config.configPath, file);

          const stats = await fs.stat(filePath);
          const fileContent = await fs.readFile(filePath, 'utf-8');
          const config = JSON.parse(fileContent);

          const newHash = this.calculateHash(config);
          const version = this.versions.get(configName);

          if (!version || version.hash !== newHash) {
            console.log(`🔄 Cambio detectado en: ${configName}`);
            await this.loadConfiguration(configName);
            this.emit('config:changed', { name: configName, config });
          }
        }
      }
    } catch (error) {
      console.error('Error verificando cambios:', error);
    }
  }

  /**
   * Calcula hash de una configuración
   */
  calculateHash(config) {
    const str = JSON.stringify(config, Object.keys(config).sort());
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Encripta configuración
   */
  encrypt(config) {
    const iv = crypto.randomBytes(16);
    const key = Buffer.from(this.config.encryption.key, 'hex');
    const cipher = crypto.createCipheriv(this.config.encryption.algorithm, key, iv);

    const configStr = JSON.stringify(config);
    let encrypted = cipher.update(configStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted: true,
      algorithm: this.config.encryption.algorithm,
      data: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Desencripta configuración
   */
  decrypt(encryptedConfig) {
    const key = Buffer.from(this.config.encryption.key, 'hex');
    const iv = Buffer.from(encryptedConfig.iv, 'hex');
    const authTag = Buffer.from(encryptedConfig.authTag, 'hex');

    const decipher = crypto.createDecipheriv(this.config.encryption.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedConfig.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Obtiene todas las configuraciones
   */
  getAll() {
    const configs = {};
    for (const [name, config] of this.configurations) {
      configs[name] = config;
    }
    return configs;
  }

  /**
   * Exporta configuración
   */
  async exportConfiguration(name, outputPath) {
    const config = this.get(name);

    await fs.writeFile(outputPath, JSON.stringify(config, null, 2), 'utf-8');

    console.log(`📤 Configuración exportada: ${name} -> ${outputPath}`);
    return true;
  }

  /**
   * Importa configuración
   */
  async importConfiguration(name, inputPath) {
    const content = await fs.readFile(inputPath, 'utf-8');
    const config = JSON.parse(content);

    await this.set(name, config);

    console.log(`📥 Configuración importada: ${name} <- ${inputPath}`);
    return true;
  }

  /**
   * Obtiene metadatos de configuración
   */
  getMetadata(name) {
    const version = this.versions.get(name);
    const config = this.configurations.get(name);

    if (!version || !config) {
      return null;
    }

    return {
      name,
      version: version.version,
      hash: version.hash,
      loadedAt: version.loadedAt,
      updatedAt: version.updatedAt,
      hasSchema: this.schemas.has(name),
      size: JSON.stringify(config).length
    };
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    this.stopHotReload();
    this.configurations.clear();
    this.schemas.clear();
    this.versions.clear();
    console.log('✅ Gestor de configuración limpiado');
  }
}

// Singleton
const configManager = new ConfigManager();

module.exports = configManager;
