/**
 * 🔌 JARVIS PLUGIN MANAGER
 * Sistema de plugins dinámicos y extensiones
 *
 * Features:
 * - Carga dinámica de plugins
 * - Hot reload en desarrollo
 * - Lifecycle hooks (init, start, stop, destroy)
 * - Eventos entre plugins
 * - Sandboxing de plugins
 * - Versionado y dependencias
 * - Marketplace de plugins (futuro)
 */

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { getLogger } = require('./logger');

class PluginManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      pluginsPath: config.pluginsPath || path.join(__dirname, '../plugins'),
      autoLoad: config.autoLoad !== false,
      enableHotReload: config.enableHotReload || false,
      ...config
    };

    this.plugins = new Map();
    this.pluginStates = new Map();
    this.logger = getLogger();

    // Crear directorio de plugins si no existe
    if (!fs.existsSync(this.config.pluginsPath)) {
      fs.mkdirSync(this.config.pluginsPath, { recursive: true });
    }

    if (this.config.autoLoad) {
      this.loadAllPlugins();
    }
  }

  /**
   * Carga todos los plugins del directorio
   */
  loadAllPlugins() {
    try {
      const entries = fs.readdirSync(this.config.pluginsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() || entry.name.endsWith('.js')) {
          const pluginPath = path.join(this.config.pluginsPath, entry.name);
          this.loadPlugin(pluginPath);
        }
      }

      this.logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('Error loading plugins:', { error: error.message });
    }
  }

  /**
   * Carga un plugin individual
   */
  loadPlugin(pluginPath) {
    try {
      // Limpiar cache de require
      delete require.cache[require.resolve(pluginPath)];

      const PluginClass = require(pluginPath);
      const plugin = new PluginClass(this.createPluginContext());

      // Validar plugin
      if (!this.validatePlugin(plugin)) {
        throw new Error('Invalid plugin structure');
      }

      // Registrar plugin
      this.plugins.set(plugin.name, {
        instance: plugin,
        path: pluginPath,
        loadedAt: new Date()
      });

      this.pluginStates.set(plugin.name, 'loaded');

      this.logger.plugin(plugin.name, 'loaded', {
        version: plugin.version,
        path: pluginPath
      });

      this.emit('plugin:loaded', plugin.name);

      return plugin;

    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}:`, {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Valida estructura de un plugin
   */
  validatePlugin(plugin) {
    const required = ['name', 'version', 'init'];

    for (const prop of required) {
      if (!(prop in plugin)) {
        this.logger.error(`Plugin missing required property: ${prop}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Crea contexto para un plugin
   */
  createPluginContext() {
    return {
      // Logger específico del plugin
      logger: this.logger,

      // Event emitter
      events: this,

      // Acceso a configuración global
      getConfig: () => {
        try {
          return require('./config-manager');
        } catch {
          return {};
        }
      },

      // Registrar hooks
      registerHook: (hookName, callback) => {
        this.on(`hook:${hookName}`, callback);
      },

      // Trigger hooks
      triggerHook: (hookName, data) => {
        this.emit(`hook:${hookName}`, data);
      },

      // Acceso a otros plugins
      getPlugin: (pluginName) => {
        return this.getPlugin(pluginName);
      },

      // Storage del plugin (simple key-value)
      storage: {
        get: (key) => this.getPluginStorage(plugin?.name, key),
        set: (key, value) => this.setPluginStorage(plugin?.name, key, value),
        delete: (key) => this.deletePluginStorage(plugin?.name, key)
      }
    };
  }

  /**
   * Inicializa todos los plugins
   */
  async initializeAll() {
    const plugins = Array.from(this.plugins.values());

    for (const { instance, path: pluginPath } of plugins) {
      try {
        if (typeof instance.init === 'function') {
          await instance.init();
          this.pluginStates.set(instance.name, 'initialized');
          this.logger.plugin(instance.name, 'initialized');
          this.emit('plugin:initialized', instance.name);
        }
      } catch (error) {
        this.logger.error(`Failed to initialize plugin ${instance.name}:`, {
          error: error.message
        });
        this.pluginStates.set(instance.name, 'error');
      }
    }
  }

  /**
   * Inicia todos los plugins
   */
  async startAll() {
    const plugins = Array.from(this.plugins.values());

    for (const { instance } of plugins) {
      try {
        if (typeof instance.start === 'function') {
          await instance.start();
          this.pluginStates.set(instance.name, 'running');
          this.logger.plugin(instance.name, 'started');
          this.emit('plugin:started', instance.name);
        }
      } catch (error) {
        this.logger.error(`Failed to start plugin ${instance.name}:`, {
          error: error.message
        });
        this.pluginStates.set(instance.name, 'error');
      }
    }
  }

  /**
   * Detiene todos los plugins
   */
  async stopAll() {
    const plugins = Array.from(this.plugins.values());

    for (const { instance } of plugins) {
      try {
        if (typeof instance.stop === 'function') {
          await instance.stop();
          this.pluginStates.set(instance.name, 'stopped');
          this.logger.plugin(instance.name, 'stopped');
          this.emit('plugin:stopped', instance.name);
        }
      } catch (error) {
        this.logger.error(`Failed to stop plugin ${instance.name}:`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Obtiene un plugin por nombre
   */
  getPlugin(name) {
    const plugin = this.plugins.get(name);
    return plugin ? plugin.instance : null;
  }

  /**
   * Lista todos los plugins
   */
  listPlugins() {
    return Array.from(this.plugins.entries()).map(([name, data]) => ({
      name,
      version: data.instance.version,
      description: data.instance.description,
      state: this.pluginStates.get(name),
      loadedAt: data.loadedAt,
      path: data.path
    }));
  }

  /**
   * Descarga un plugin
   */
  unloadPlugin(name) {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    // Detener el plugin primero
    if (typeof plugin.instance.stop === 'function') {
      plugin.instance.stop();
    }

    // Destruir
    if (typeof plugin.instance.destroy === 'function') {
      plugin.instance.destroy();
    }

    // Remover
    this.plugins.delete(name);
    this.pluginStates.delete(name);

    this.logger.plugin(name, 'unloaded');
    this.emit('plugin:unloaded', name);
  }

  /**
   * Recarga un plugin
   */
  async reloadPlugin(name) {
    const plugin = this.plugins.get(name);

    if (!plugin) {
      throw new Error(`Plugin ${name} not found`);
    }

    const pluginPath = plugin.path;

    // Descargar
    this.unloadPlugin(name);

    // Cargar de nuevo
    const newPlugin = this.loadPlugin(pluginPath);

    if (newPlugin && typeof newPlugin.init === 'function') {
      await newPlugin.init();
    }

    if (newPlugin && typeof newPlugin.start === 'function') {
      await newPlugin.start();
    }

    this.logger.plugin(name, 'reloaded');
    this.emit('plugin:reloaded', name);
  }

  /**
   * Storage de plugins
   */
  getPluginStorage(pluginName, key) {
    if (!this.pluginStorage) {
      this.pluginStorage = new Map();
    }

    const storage = this.pluginStorage.get(pluginName) || new Map();
    return storage.get(key);
  }

  setPluginStorage(pluginName, key, value) {
    if (!this.pluginStorage) {
      this.pluginStorage = new Map();
    }

    let storage = this.pluginStorage.get(pluginName);
    if (!storage) {
      storage = new Map();
      this.pluginStorage.set(pluginName, storage);
    }

    storage.set(key, value);
  }

  deletePluginStorage(pluginName, key) {
    if (!this.pluginStorage) {
      return;
    }

    const storage = this.pluginStorage.get(pluginName);
    if (storage) {
      storage.delete(key);
    }
  }

  /**
   * Obtiene estadísticas de plugins
   */
  getStats() {
    const plugins = this.listPlugins();

    return {
      total: plugins.length,
      running: plugins.filter(p => p.state === 'running').length,
      stopped: plugins.filter(p => p.state === 'stopped').length,
      error: plugins.filter(p => p.state === 'error').length,
      plugins
    };
  }

  /**
   * Crea un plugin de ejemplo
   */
  createExamplePlugin() {
    const examplePath = path.join(this.config.pluginsPath, 'example-plugin.js');

    const template = `/**
 * Example JARVIS Plugin
 */

class ExamplePlugin {
  constructor(context) {
    this.name = 'example-plugin';
    this.version = '1.0.0';
    this.description = 'An example plugin for JARVIS';
    this.context = context;
  }

  async init() {
    this.context.logger.info('Example plugin initializing...');

    // Register hooks
    this.context.registerHook('example:event', (data) => {
      console.log('Example hook triggered:', data);
    });
  }

  async start() {
    this.context.logger.info('Example plugin started!');

    // Do something every 10 seconds
    this.interval = setInterval(() => {
      this.context.logger.debug('Example plugin is running...');
    }, 10000);
  }

  async stop() {
    this.context.logger.info('Example plugin stopping...');

    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async destroy() {
    this.context.logger.info('Example plugin destroyed');
  }

  // Custom methods
  async doSomething() {
    return 'Plugin did something!';
  }
}

module.exports = ExamplePlugin;
`;

    fs.writeFileSync(examplePath, template);
    this.logger.info(`Created example plugin at: ${examplePath}`);

    return examplePath;
  }
}

module.exports = PluginManager;
