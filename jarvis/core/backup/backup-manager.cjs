// core/backup/backup-manager.cjs
// Sistema de Backup Automático y Disaster Recovery

const EventEmitter = require('events');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const crypto = require('crypto');

/**
 * Backup Manager
 *
 * Sistema completo de backup y disaster recovery
 *
 * Características:
 * - Backup automático programado
 * - Backup incremental y completo
 * - Compresión ZIP
 * - Verificación de integridad (checksums)
 * - Retención configurable
 * - Restauración completa o selectiva
 * - Export para migración
 */
class BackupManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.backupDir = options.backupDir || path.join(this.projectRoot, 'backups');
    this.maxBackups = options.maxBackups || 10;
    this.compressionLevel = options.compressionLevel || 6; // 0-9

    // Directorios a respaldar
    this.sources = {
      memory: path.join(this.projectRoot, 'memory'),
      config: path.join(this.projectRoot, 'config'),
      logs: path.join(this.projectRoot, 'logs'),
      data: path.join(this.projectRoot, 'data'),
      docs: path.join(this.projectRoot, 'docs', 'generated')
    };

    // Historial de backups
    this.backupHistory = [];

    this.isInitialized = false;
  }

  /**
   * Inicializa el backup manager
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('💾 [Backup Manager] Inicializando...');

    // Crear directorio de backups
    await fs.ensureDir(this.backupDir);

    // Cargar historial de backups
    await this.loadBackupHistory();

    this.isInitialized = true;
    console.log('✅ [Backup Manager] Sistema de backup listo');
    console.log(`   📁 Backup dir: ${this.backupDir}`);

    this.emit('initialized');
  }

  /**
   * Carga el historial de backups
   */
  async loadBackupHistory() {
    const files = await fs.readdir(this.backupDir);
    const backups = [];

    for (const file of files) {
      if (file.endsWith('.zip')) {
        const infoFile = path.join(this.backupDir, file.replace('.zip', '.json'));

        if (await fs.pathExists(infoFile)) {
          const info = await fs.readJson(infoFile);
          backups.push(info);
        }
      }
    }

    this.backupHistory = backups.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`   📋 ${this.backupHistory.length} backups encontrados`);
  }

  /**
   * Crea un backup completo
   */
  async createBackup(options = {}) {
    const {
      type = 'full', // 'full' o 'incremental'
      includeMemory = true,
      includeConfig = true,
      includeLogs = false,
      includeData = true,
      includeDocs = true,
      description = ''
    } = options;

    console.log(`💾 [Backup Manager] Creando backup ${type}...`);

    const timestamp = Date.now();
    const dateStr = new Date(timestamp).toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const backupName = `jarvis-backup-${type}-${dateStr}`;
    const backupFile = path.join(this.backupDir, `${backupName}.zip`);
    const infoFile = path.join(this.backupDir, `${backupName}.json`);

    // Información del backup
    const backupInfo = {
      id: crypto.randomBytes(8).toString('hex'),
      name: backupName,
      timestamp,
      type,
      description,
      files: [],
      size: 0,
      checksum: null,
      sources: {
        memory: includeMemory,
        config: includeConfig,
        logs: includeLogs,
        data: includeData,
        docs: includeDocs
      }
    };

    try {
      // Crear archivo ZIP
      const output = fs.createWriteStream(backupFile);
      const archive = archiver('zip', {
        zlib: { level: this.compressionLevel }
      });

      // Eventos
      output.on('close', () => {
        backupInfo.size = archive.pointer();
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);

      // Agregar directorios al backup
      let fileCount = 0;

      if (includeMemory && await fs.pathExists(this.sources.memory)) {
        console.log('   📂 Incluyendo: memory/');
        archive.directory(this.sources.memory, 'memory');
        fileCount++;
      }

      if (includeConfig && await fs.pathExists(this.sources.config)) {
        console.log('   📂 Incluyendo: config/');
        archive.directory(this.sources.config, 'config');
        fileCount++;
      }

      if (includeLogs && await fs.pathExists(this.sources.logs)) {
        console.log('   📂 Incluyendo: logs/');
        archive.directory(this.sources.logs, 'logs');
        fileCount++;
      }

      if (includeData && await fs.pathExists(this.sources.data)) {
        console.log('   📂 Incluyendo: data/');
        archive.directory(this.sources.data, 'data');
        fileCount++;
      }

      if (includeDocs && await fs.pathExists(this.sources.docs)) {
        console.log('   📂 Incluyendo: docs/generated/');
        archive.directory(this.sources.docs, 'docs');
        fileCount++;
      }

      // Agregar metadata
      archive.append(JSON.stringify(backupInfo, null, 2), { name: 'backup-info.json' });

      // Finalizar
      await archive.finalize();

      // Calcular checksum
      backupInfo.checksum = await this.calculateChecksum(backupFile);

      // Guardar información del backup
      await fs.writeJson(infoFile, backupInfo, { spaces: 2 });

      // Agregar al historial
      this.backupHistory.unshift(backupInfo);

      // Limpiar backups antiguos
      await this.cleanupOldBackups();

      const sizeKB = (backupInfo.size / 1024).toFixed(2);
      console.log(`✅ [Backup Manager] Backup creado: ${backupName}.zip (${sizeKB} KB)`);
      console.log(`   🔒 Checksum: ${backupInfo.checksum.substring(0, 16)}...`);

      this.emit('backup:created', backupInfo);

      return backupInfo;

    } catch (error) {
      console.error('❌ [Backup Manager] Error creando backup:', error);

      // Limpiar archivos parciales
      if (await fs.pathExists(backupFile)) {
        await fs.remove(backupFile);
      }
      if (await fs.pathExists(infoFile)) {
        await fs.remove(infoFile);
      }

      throw error;
    }
  }

  /**
   * Calcula checksum SHA256 de un archivo
   */
  async calculateChecksum(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Verifica la integridad de un backup
   */
  async verifyBackup(backupId) {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup no encontrado: ${backupId}`);
    }

    console.log(`🔍 [Backup Manager] Verificando backup: ${backup.name}`);

    const backupFile = path.join(this.backupDir, `${backup.name}.zip`);

    if (!await fs.pathExists(backupFile)) {
      throw new Error('Archivo de backup no existe');
    }

    // Calcular checksum actual
    const currentChecksum = await this.calculateChecksum(backupFile);

    // Comparar con checksum guardado
    const isValid = currentChecksum === backup.checksum;

    if (isValid) {
      console.log('✅ [Backup Manager] Backup verificado correctamente');
    } else {
      console.error('❌ [Backup Manager] Backup corrupto - checksums no coinciden');
    }

    return isValid;
  }

  /**
   * Restaura un backup completo
   */
  async restoreBackup(backupId, options = {}) {
    const {
      restoreMemory = true,
      restoreConfig = true,
      restoreLogs = false,
      restoreData = true,
      restoreDocs = true,
      targetDir = this.projectRoot
    } = options;

    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup no encontrado: ${backupId}`);
    }

    console.log(`♻️ [Backup Manager] Restaurando backup: ${backup.name}`);

    const backupFile = path.join(this.backupDir, `${backup.name}.zip`);

    // Verificar integridad
    const isValid = await this.verifyBackup(backupId);
    if (!isValid) {
      throw new Error('Backup corrupto - restauración cancelada');
    }

    // Crear backup del estado actual antes de restaurar
    console.log('📦 [Backup Manager] Creando backup de seguridad del estado actual...');
    await this.createBackup({
      type: 'full',
      description: 'Backup automático antes de restauración'
    });

    // Extraer backup
    const extractDir = path.join(this.backupDir, `restore-${Date.now()}`);
    await fs.ensureDir(extractDir);

    try {
      // Extraer ZIP
      const extract = require('extract-zip');
      await extract(backupFile, { dir: extractDir });

      console.log('📂 [Backup Manager] Backup extraído, restaurando archivos...');

      // Restaurar cada directorio
      if (restoreMemory && await fs.pathExists(path.join(extractDir, 'memory'))) {
        console.log('   ♻️ Restaurando: memory/');
        await fs.remove(this.sources.memory);
        await fs.copy(path.join(extractDir, 'memory'), this.sources.memory);
      }

      if (restoreConfig && await fs.pathExists(path.join(extractDir, 'config'))) {
        console.log('   ♻️ Restaurando: config/');
        await fs.remove(this.sources.config);
        await fs.copy(path.join(extractDir, 'config'), this.sources.config);
      }

      if (restoreLogs && await fs.pathExists(path.join(extractDir, 'logs'))) {
        console.log('   ♻️ Restaurando: logs/');
        await fs.remove(this.sources.logs);
        await fs.copy(path.join(extractDir, 'logs'), this.sources.logs);
      }

      if (restoreData && await fs.pathExists(path.join(extractDir, 'data'))) {
        console.log('   ♻️ Restaurando: data/');
        await fs.remove(this.sources.data);
        await fs.copy(path.join(extractDir, 'data'), this.sources.data);
      }

      if (restoreDocs && await fs.pathExists(path.join(extractDir, 'docs'))) {
        console.log('   ♻️ Restaurando: docs/');
        await fs.remove(this.sources.docs);
        await fs.copy(path.join(extractDir, 'docs'), this.sources.docs);
      }

      // Limpiar directorio temporal
      await fs.remove(extractDir);

      console.log('✅ [Backup Manager] Restauración completada exitosamente');
      console.log('⚠️  Se recomienda reiniciar JARVIS para aplicar todos los cambios');

      this.emit('backup:restored', { backupId, backup });

      return {
        success: true,
        backup,
        message: 'Restauración completada. Se recomienda reiniciar el sistema.'
      };

    } catch (error) {
      console.error('❌ [Backup Manager] Error restaurando backup:', error);

      // Limpiar en caso de error
      if (await fs.pathExists(extractDir)) {
        await fs.remove(extractDir);
      }

      throw error;
    }
  }

  /**
   * Limpia backups antiguos
   */
  async cleanupOldBackups() {
    if (this.backupHistory.length <= this.maxBackups) return;

    console.log(`🗑️ [Backup Manager] Limpiando backups antiguos (mantener ${this.maxBackups})...`);

    const toDelete = this.backupHistory.slice(this.maxBackups);

    for (const backup of toDelete) {
      const backupFile = path.join(this.backupDir, `${backup.name}.zip`);
      const infoFile = path.join(this.backupDir, `${backup.name}.json`);

      if (await fs.pathExists(backupFile)) {
        await fs.remove(backupFile);
      }
      if (await fs.pathExists(infoFile)) {
        await fs.remove(infoFile);
      }

      console.log(`   🗑️ Eliminado: ${backup.name}`);
    }

    this.backupHistory = this.backupHistory.slice(0, this.maxBackups);
    console.log(`✅ [Backup Manager] ${toDelete.length} backups eliminados`);
  }

  /**
   * Elimina un backup específico
   */
  async deleteBackup(backupId) {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup no encontrado: ${backupId}`);
    }

    console.log(`🗑️ [Backup Manager] Eliminando backup: ${backup.name}`);

    const backupFile = path.join(this.backupDir, `${backup.name}.zip`);
    const infoFile = path.join(this.backupDir, `${backup.name}.json`);

    if (await fs.pathExists(backupFile)) {
      await fs.remove(backupFile);
    }
    if (await fs.pathExists(infoFile)) {
      await fs.remove(infoFile);
    }

    this.backupHistory = this.backupHistory.filter(b => b.id !== backupId);

    console.log('✅ [Backup Manager] Backup eliminado');

    this.emit('backup:deleted', { backupId, backup });
  }

  /**
   * Obtiene lista de backups
   */
  getBackups() {
    return this.backupHistory;
  }

  /**
   * Obtiene un backup por ID
   */
  getBackup(backupId) {
    return this.backupHistory.find(b => b.id === backupId);
  }

  /**
   * Obtiene estadísticas de backups
   */
  getStats() {
    const totalSize = this.backupHistory.reduce((sum, b) => sum + b.size, 0);
    const latestBackup = this.backupHistory[0];

    return {
      totalBackups: this.backupHistory.length,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      maxBackups: this.maxBackups,
      latestBackup: latestBackup ? {
        name: latestBackup.name,
        timestamp: latestBackup.timestamp,
        size: latestBackup.size
      } : null
    };
  }

  /**
   * Exporta backup para migración
   */
  async exportBackup(backupId, targetPath) {
    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup no encontrado: ${backupId}`);
    }

    console.log(`📤 [Backup Manager] Exportando backup: ${backup.name}`);

    const backupFile = path.join(this.backupDir, `${backup.name}.zip`);
    const infoFile = path.join(this.backupDir, `${backup.name}.json`);

    // Copiar archivos
    await fs.copy(backupFile, path.join(targetPath, `${backup.name}.zip`));
    await fs.copy(infoFile, path.join(targetPath, `${backup.name}.json`));

    console.log(`✅ [Backup Manager] Backup exportado a: ${targetPath}`);

    return {
      backupFile: path.join(targetPath, `${backup.name}.zip`),
      infoFile: path.join(targetPath, `${backup.name}.json`)
    };
  }
}

module.exports = BackupManager;
