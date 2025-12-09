// web-interface/backend/backup-integration.cjs
// Integración del Backup Manager con Socket.io

const BackupManager = require('../../core/backup/backup-manager.cjs');
const path = require('path');

/**
 * Integración de Backup con Socket.io
 */
class BackupIntegration {
  constructor(io, options = {}) {
    this.io = io;
    this.options = options;
    this.backupManager = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa el backup manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('💾 [Backup Integration] Inicializando...');

    this.backupManager = new BackupManager({
      projectRoot: process.cwd(),
      backupDir: path.join(process.cwd(), 'backups'),
      maxBackups: 10,
      compressionLevel: 6
    });

    await this.backupManager.initialize();

    // Escuchar eventos
    this.setupEventListeners();

    this.isInitialized = true;
    console.log('✅ [Backup Integration] Listo');
  }

  /**
   * Setup de event listeners
   */
  setupEventListeners() {
    this.backupManager.on('backup:created', (backup) => {
      this.io.emit('backup:created', backup);
      console.log(`📦 [Backup] Creado: ${backup.name}`);
    });

    this.backupManager.on('backup:restored', (data) => {
      this.io.emit('backup:restored', data);
      console.log(`♻️ [Backup] Restaurado: ${data.backup.name}`);
    });

    this.backupManager.on('backup:deleted', (data) => {
      this.io.emit('backup:deleted', data);
      console.log(`🗑️ [Backup] Eliminado: ${data.backup.name}`);
    });
  }

  /**
   * Setup de handlers de socket
   */
  setupSocketHandlers(socket) {
    // Obtener lista de backups
    socket.on('backup:get-list', () => {
      try {
        if (!this.backupManager) {
          socket.emit('backup:list', []);
          return;
        }

        const backups = this.backupManager.getBackups();
        socket.emit('backup:list', backups);

      } catch (error) {
        console.error('Error obteniendo backups:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Obtener estadísticas
    socket.on('backup:get-stats', () => {
      try {
        if (!this.backupManager) {
          socket.emit('backup:stats', null);
          return;
        }

        const stats = this.backupManager.getStats();
        socket.emit('backup:stats', stats);

      } catch (error) {
        console.error('Error obteniendo stats:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Crear backup
    socket.on('backup:create', async (options) => {
      try {
        if (!this.backupManager) {
          throw new Error('Backup manager no disponible');
        }

        console.log('💾 [Backup Integration] Creando backup...', options);

        const backup = await this.backupManager.createBackup(options);

        socket.emit('backup:created', backup);

      } catch (error) {
        console.error('Error creando backup:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Verificar backup
    socket.on('backup:verify', async (backupId) => {
      try {
        if (!this.backupManager) {
          throw new Error('Backup manager no disponible');
        }

        console.log('🔍 [Backup Integration] Verificando backup:', backupId);

        const isValid = await this.backupManager.verifyBackup(backupId);

        socket.emit('backup:verified', { backupId, valid: isValid });

      } catch (error) {
        console.error('Error verificando backup:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Restaurar backup
    socket.on('backup:restore', async (options) => {
      try {
        if (!this.backupManager) {
          throw new Error('Backup manager no disponible');
        }

        console.log('♻️ [Backup Integration] Restaurando backup...', options);

        const result = await this.backupManager.restoreBackup(options.backupId, options);

        socket.emit('backup:restored', result);

      } catch (error) {
        console.error('Error restaurando backup:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Eliminar backup
    socket.on('backup:delete', async (backupId) => {
      try {
        if (!this.backupManager) {
          throw new Error('Backup manager no disponible');
        }

        console.log('🗑️ [Backup Integration] Eliminando backup:', backupId);

        await this.backupManager.deleteBackup(backupId);

        socket.emit('backup:deleted', { backupId });

      } catch (error) {
        console.error('Error eliminando backup:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Exportar backup
    socket.on('backup:export', async (data) => {
      try {
        if (!this.backupManager) {
          throw new Error('Backup manager no disponible');
        }

        const { backupId, targetPath } = data;

        console.log('📤 [Backup Integration] Exportando backup:', backupId, 'a', targetPath);

        const result = await this.backupManager.exportBackup(backupId, targetPath);

        socket.emit('backup:exported', { backupId, path: result.backupFile });

      } catch (error) {
        console.error('Error exportando backup:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });

    // Crear backup automático (llamado por otros sistemas)
    socket.on('backup:auto-create', async (description = 'Backup automático') => {
      try {
        if (!this.backupManager) {
          throw new Error('Backup manager no disponible');
        }

        console.log('🤖 [Backup Integration] Creando backup automático...');

        const backup = await this.backupManager.createBackup({
          type: 'full',
          description,
          includeMemory: true,
          includeConfig: true,
          includeLogs: false,
          includeData: true,
          includeDocs: true
        });

        socket.emit('backup:created', backup);

      } catch (error) {
        console.error('Error en backup automático:', error);
        socket.emit('backup:error', { message: error.message });
      }
    });
  }

  /**
   * Obtiene el backup manager
   */
  getBackupManager() {
    return this.backupManager;
  }

  /**
   * Crea un backup programático (para uso interno)
   */
  async createBackup(options = {}) {
    if (!this.backupManager) {
      throw new Error('Backup manager no disponible');
    }

    return await this.backupManager.createBackup(options);
  }
}

module.exports = BackupIntegration;
