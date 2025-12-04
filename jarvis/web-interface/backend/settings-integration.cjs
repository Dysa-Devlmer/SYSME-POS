// web-interface/backend/settings-integration.cjs
// Integración del Settings Manager con Socket.io

const SettingsManager = require('../../core/config/settings-manager.cjs');
const path = require('path');

/**
 * Integración de Settings con Socket.io
 */
class SettingsIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.settingsManager = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el settings manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('⚙️ [Settings Integration] Inicializando...');

    this.settingsManager = new SettingsManager({
      projectRoot: process.cwd(),
      profile: process.env.NODE_ENV || 'development'
    });

    await this.settingsManager.initialize();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Settings Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    this.settingsManager.on('change', (data) => {
      this.io.emit('settings:changed', data);
    });

    this.settingsManager.on('reset', (section) => {
      this.io.emit('settings:reset', section);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Obtener todas las configuraciones
    socket.on('settings:get-all', () => {
      try {
        if (!this.settingsManager) {
          socket.emit('settings:all', {});
          return;
        }

        const settings = this.settingsManager.getAll();
        socket.emit('settings:all', settings);

      } catch (error) {
        console.error('Error obteniendo settings:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });

    // Obtener una configuración específica
    socket.on('settings:get', (path) => {
      try {
        if (!this.settingsManager) {
          socket.emit('settings:value', { path, value: null });
          return;
        }

        const value = this.settingsManager.get(path);
        socket.emit('settings:value', { path, value });

      } catch (error) {
        console.error('Error obteniendo setting:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });

    // Establecer una configuración
    socket.on('settings:set', async (data) => {
      try {
        if (!this.settingsManager) {
          throw new Error('Settings manager no disponible');
        }

        const { path, value } = data;
        await this.settingsManager.set(path, value);

        socket.emit('settings:set-success', { path, value });

      } catch (error) {
        console.error('Error estableciendo setting:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });

    // Guardar todas las configuraciones
    socket.on('settings:save-all', async (settings) => {
      try {
        if (!this.settingsManager) {
          throw new Error('Settings manager no disponible');
        }

        // Merge y guardar
        this.settingsManager.settings = settings;
        await this.settingsManager.saveSettings();

        socket.emit('settings:saved');

      } catch (error) {
        console.error('Error guardando settings:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });

    // Reiniciar configuraciones
    socket.on('settings:reset', async (section) => {
      try {
        if (!this.settingsManager) {
          throw new Error('Settings manager no disponible');
        }

        await this.settingsManager.reset(section);

        const settings = this.settingsManager.getAll();
        socket.emit('settings:all', settings);

      } catch (error) {
        console.error('Error reiniciando settings:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });

    // Exportar configuraciones
    socket.on('settings:export', async () => {
      try {
        if (!this.settingsManager) {
          throw new Error('Settings manager no disponible');
        }

        const exportPath = path.join(process.cwd(), 'config', `settings-export-${Date.now()}.json`);
        await this.settingsManager.export(exportPath);

        socket.emit('settings:exported', { path: exportPath });

      } catch (error) {
        console.error('Error exportando settings:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });

    // Crear backup
    socket.on('settings:backup', async () => {
      try {
        if (!this.settingsManager) {
          throw new Error('Settings manager no disponible');
        }

        const backupPath = await this.settingsManager.backup();

        socket.emit('settings:backup-created', { path: backupPath });

      } catch (error) {
        console.error('Error creando backup:', error);
        socket.emit('settings:error', { message: error.message });
      }
    });
  }

  /**
   * Obtiene el settings manager
   */
  getSettingsManager() {
    return this.settingsManager;
  }
}

module.exports = SettingsIntegration;
