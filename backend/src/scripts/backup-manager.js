/**
 * Sistema de Backup Automático para Producción
 * Gestiona backups automáticos de la base de datos con rotación y validación
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { enhancedLogger } from '../config/logger-enhanced.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupManager {
  constructor() {
    this.backupDir = path.resolve(__dirname, '../../backups');
    this.dbPath = path.resolve(__dirname, '../../data/sysme_production.db');
    this.maxBackups = 10; // Máximo número de backups a mantener
    this.compressionEnabled = true;
  }

  /**
   * Inicializa el sistema de backup
   */
  async initialize() {
    try {
      // Crear directorio de backups si no existe
      await this.ensureBackupDirectory();

      // Verificar que la base de datos existe
      await this.verifyDatabase();

      enhancedLogger.info('Sistema de backup inicializado correctamente');
      return true;
    } catch (error) {
      enhancedLogger.error('Error inicializando sistema de backup:', error);
      throw error;
    }
  }

  /**
   * Asegura que el directorio de backups existe
   */
  async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
      enhancedLogger.info(`Directorio de backups creado: ${this.backupDir}`);
    }
  }

  /**
   * Verifica que la base de datos existe y es accesible
   */
  async verifyDatabase() {
    try {
      await fs.access(this.dbPath);
      const stats = await fs.stat(this.dbPath);

      if (stats.size === 0) {
        throw new Error('La base de datos está vacía');
      }

      enhancedLogger.info(`Base de datos verificada: ${this.dbPath} (${this.formatFileSize(stats.size)})`);
      return true;
    } catch (error) {
      enhancedLogger.error('Error verificando base de datos:', error);
      throw new Error(`Base de datos no accesible: ${error.message}`);
    }
  }

  /**
   * Crea un backup de la base de datos
   */
  async createBackup(type = 'manual') {
    const startTime = Date.now();

    try {
      enhancedLogger.info(`Iniciando backup ${type}...`);

      // Generar nombre del archivo de backup
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .slice(0, -5);

      const backupFileName = `sysme_backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Crear backup usando SQLite dump
      await this.performSQLiteBackup(backupPath);

      // Verificar integridad del backup
      await this.verifyBackupIntegrity(backupPath);

      // Comprimir si está habilitado
      let finalBackupPath = backupPath;
      if (this.compressionEnabled) {
        finalBackupPath = await this.compressBackup(backupPath);
      }

      // Limpiar backups antiguos
      await this.cleanOldBackups();

      const duration = Date.now() - startTime;
      const backupInfo = await this.getBackupInfo(finalBackupPath);
      const finalFileName = path.basename(finalBackupPath);

      enhancedLogger.info(`Backup ${type} completado exitosamente:`, {
        file: finalFileName,
        size: backupInfo.size,
        duration: `${duration}ms`,
        type
      });

      return {
        success: true,
        file: finalFileName,
        path: finalBackupPath,
        size: backupInfo.size,
        duration,
        type
      };

    } catch (error) {
      enhancedLogger.error(`Error creando backup ${type}:`, error);
      throw error;
    }
  }

  /**
   * Realiza el backup usando SQLite
   */
  async performSQLiteBackup(backupPath) {
    try {
      // Usando .backup command de SQLite para backup en caliente
      const command = `sqlite3 "${this.dbPath}" ".backup '${backupPath}'"`;
      await execAsync(command);

      enhancedLogger.info(`Backup SQLite creado: ${backupPath}`);
    } catch (error) {
      enhancedLogger.error('Error en backup SQLite:', error);
      throw new Error(`Fallo al crear backup SQLite: ${error.message}`);
    }
  }

  /**
   * Verifica la integridad del backup
   */
  async verifyBackupIntegrity(backupPath) {
    try {
      // Verificar que el archivo existe y no está vacío
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        throw new Error('El archivo de backup está vacío');
      }

      // Verificar integridad usando SQLite
      const command = `sqlite3 "${backupPath}" "PRAGMA integrity_check;"`;
      const { stdout } = await execAsync(command);

      if (stdout.trim() !== 'ok') {
        throw new Error(`Integridad del backup comprometida: ${stdout}`);
      }

      enhancedLogger.info(`Integridad del backup verificada: ${backupPath}`);
      return true;
    } catch (error) {
      enhancedLogger.error('Error verificando integridad del backup:', error);
      throw error;
    }
  }

  /**
   * Comprime el archivo de backup
   */
  async compressBackup(backupPath) {
    try {
      const compressedPath = `${backupPath}.gz`;
      const command = `gzip -9 "${backupPath}"`;

      await execAsync(command);

      enhancedLogger.info(`Backup comprimido: ${compressedPath}`);
      return compressedPath;
    } catch (error) {
      enhancedLogger.warn('No se pudo comprimir el backup (gzip no disponible):', error.message);
      // No es crítico si no se puede comprimir
      return backupPath;
    }
  }

  /**
   * Limpia backups antiguos manteniendo solo los más recientes
   */
  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('sysme_backup_') && (file.endsWith('.db') || file.endsWith('.db.gz')))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file)
        }));

      if (backupFiles.length > this.maxBackups) {
        // Ordenar por fecha de modificación (más antiguos primero)
        const filesWithStats = await Promise.all(
          backupFiles.map(async file => ({
            ...file,
            stats: await fs.stat(file.path)
          }))
        );

        filesWithStats.sort((a, b) => a.stats.mtime - b.stats.mtime);

        // Eliminar archivos más antiguos
        const filesToDelete = filesWithStats.slice(0, filesWithStats.length - this.maxBackups);

        for (const file of filesToDelete) {
          await fs.unlink(file.path);
          enhancedLogger.info(`Backup antiguo eliminado: ${file.name}`);
        }

        enhancedLogger.info(`Limpieza completada: ${filesToDelete.length} backups antiguos eliminados`);
      }
    } catch (error) {
      enhancedLogger.error('Error limpiando backups antiguos:', error);
      // No es crítico si no se pueden limpiar
    }
  }

  /**
   * Obtiene información de un archivo de backup
   */
  async getBackupInfo(backupPath) {
    const stats = await fs.stat(backupPath);
    return {
      size: this.formatFileSize(stats.size),
      sizeBytes: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  }

  /**
   * Lista todos los backups disponibles
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file =>
        file.startsWith('sysme_backup_') &&
        (file.endsWith('.db') || file.endsWith('.db.gz'))
      );

      const backups = await Promise.all(
        backupFiles.map(async file => {
          const filePath = path.join(this.backupDir, file);
          const info = await this.getBackupInfo(filePath);
          return {
            name: file,
            path: filePath,
            ...info,
            compressed: file.endsWith('.gz')
          };
        })
      );

      // Ordenar por fecha de creación (más recientes primero)
      backups.sort((a, b) => b.created - a.created);

      return backups;
    } catch (error) {
      enhancedLogger.error('Error listando backups:', error);
      throw error;
    }
  }

  /**
   * Programa backups automáticos
   */
  scheduleAutomaticBackups() {
    // Backup cada 6 horas
    const intervalMs = 6 * 60 * 60 * 1000; // 6 horas

    setInterval(async () => {
      try {
        await this.createBackup('automatic');
      } catch (error) {
        enhancedLogger.error('Error en backup automático:', error);
      }
    }, intervalMs);

    enhancedLogger.info('Backups automáticos programados cada 6 horas');
  }

  /**
   * Restaura la base de datos desde un backup
   */
  async restoreFromBackup(backupFileName) {
    try {
      enhancedLogger.warn(`Iniciando restauración desde backup: ${backupFileName}`);

      const backupPath = path.join(this.backupDir, backupFileName);

      // Verificar que el backup existe
      await fs.access(backupPath);

      // Crear backup de seguridad antes de restaurar
      const emergencyBackup = await this.createBackup('emergency_before_restore');
      enhancedLogger.info(`Backup de emergencia creado: ${emergencyBackup.file}`);

      // Descomprimir si es necesario
      let sourceFile = backupPath;
      if (backupFileName.endsWith('.gz')) {
        sourceFile = await this.decompressBackup(backupPath);
      }

      // Restaurar base de datos
      await fs.copyFile(sourceFile, this.dbPath);

      // Verificar integridad de la base restaurada
      await this.verifyDatabase();

      enhancedLogger.info(`Restauración completada exitosamente desde: ${backupFileName}`);

      return {
        success: true,
        backupRestored: backupFileName,
        emergencyBackup: emergencyBackup.file
      };

    } catch (error) {
      enhancedLogger.error('Error en restauración:', error);
      throw error;
    }
  }

  /**
   * Descomprime un backup
   */
  async decompressBackup(compressedPath) {
    try {
      const decompressedPath = compressedPath.replace('.gz', '');
      const command = `gunzip -c "${compressedPath}" > "${decompressedPath}"`;

      await execAsync(command);

      return decompressedPath;
    } catch (error) {
      throw new Error(`Error descomprimiendo backup: ${error.message}`);
    }
  }

  /**
   * Formatea el tamaño de archivo en formato legible
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default BackupManager;