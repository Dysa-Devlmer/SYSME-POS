/**
 * Inicializador del Sistema de Backup para Producción
 * Se ejecuta al iniciar el servidor y configura backups automáticos
 */

import BackupManager from './backup-manager.js';
import { enhancedLogger } from '../config/logger-enhanced.js';

class BackupSystemInitializer {
  constructor() {
    this.backupManager = new BackupManager();
    this.isInitialized = false;
  }

  /**
   * Inicializa el sistema de backup completo
   */
  async initialize() {
    try {
      enhancedLogger.info('🔄 Inicializando sistema de backup de producción...');

      // Inicializar el manager de backup
      await this.backupManager.initialize();

      // Crear un backup inicial del estado actual
      await this.createInitialBackup();

      // Programar backups automáticos
      this.scheduleBackups();

      // Configurar manejo de señales para backup de emergencia
      this.setupEmergencyBackup();

      this.isInitialized = true;
      enhancedLogger.info('✅ Sistema de backup inicializado correctamente');

      return {
        success: true,
        backupManager: this.backupManager
      };

    } catch (error) {
      enhancedLogger.error('❌ Error inicializando sistema de backup:', error);
      throw error;
    }
  }

  /**
   * Crea un backup inicial al iniciar el servidor
   */
  async createInitialBackup() {
    try {
      enhancedLogger.info('Creando backup inicial del sistema...');

      const result = await this.backupManager.createBackup('startup');

      enhancedLogger.info('✅ Backup inicial creado:', {
        file: result.file,
        size: result.size,
        duration: `${result.duration}ms`
      });

      return result;
    } catch (error) {
      enhancedLogger.warn('⚠️ No se pudo crear backup inicial:', error.message);
      // No es crítico si falla el backup inicial
    }
  }

  /**
   * Programa backups automáticos
   */
  scheduleBackups() {
    try {
      // Backup automático cada 4 horas en producción
      this.backupManager.scheduleAutomaticBackups();

      // Backup diario a medianoche
      this.scheduleDailyBackup();

      enhancedLogger.info('⏰ Backups automáticos programados');
    } catch (error) {
      enhancedLogger.error('Error programando backups automáticos:', error);
    }
  }

  /**
   * Programa backup diario
   */
  scheduleDailyBackup() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0); // Medianoche

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.createDailyBackup();

      // Programar para cada 24 horas
      setInterval(() => {
        this.createDailyBackup();
      }, 24 * 60 * 60 * 1000);

    }, msUntilMidnight);

    enhancedLogger.info(`📅 Backup diario programado para medianoche (en ${Math.round(msUntilMidnight / 1000 / 60)} minutos)`);
  }

  /**
   * Crea backup diario
   */
  async createDailyBackup() {
    try {
      await this.backupManager.createBackup('daily');
      enhancedLogger.info('📊 Backup diario completado');
    } catch (error) {
      enhancedLogger.error('Error en backup diario:', error);
    }
  }

  /**
   * Configura backup de emergencia en caso de cierre del servidor
   */
  setupEmergencyBackup() {
    const emergencyBackup = async () => {
      try {
        enhancedLogger.warn('🚨 Señal de cierre detectada - Creando backup de emergencia...');
        await this.backupManager.createBackup('emergency_shutdown');
        enhancedLogger.info('✅ Backup de emergencia completado');
      } catch (error) {
        enhancedLogger.error('❌ Error en backup de emergencia:', error);
      }
    };

    // Manejar señales de cierre
    process.on('SIGINT', async () => {
      await emergencyBackup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await emergencyBackup();
      process.exit(0);
    });

    process.on('beforeExit', async () => {
      await emergencyBackup();
    });

    enhancedLogger.info('🛡️ Backup de emergencia configurado');
  }

  /**
   * Obtiene estadísticas del sistema de backup
   */
  async getBackupStats() {
    try {
      const backups = await this.backupManager.listBackups();

      const stats = {
        totalBackups: backups.length,
        totalSize: backups.reduce((sum, backup) => sum + backup.sizeBytes, 0),
        latestBackup: backups[0] || null,
        oldestBackup: backups[backups.length - 1] || null,
        backupTypes: this.groupBackupsByType(backups)
      };

      stats.totalSizeFormatted = this.backupManager.formatFileSize(stats.totalSize);

      return stats;
    } catch (error) {
      enhancedLogger.error('Error obteniendo estadísticas de backup:', error);
      throw error;
    }
  }

  /**
   * Agrupa backups por tipo
   */
  groupBackupsByType(backups) {
    const types = {};

    backups.forEach(backup => {
      const type = this.extractBackupType(backup.name);
      if (!types[type]) {
        types[type] = 0;
      }
      types[type]++;
    });

    return types;
  }

  /**
   * Extrae el tipo de backup del nombre
   */
  extractBackupType(filename) {
    if (filename.includes('startup')) return 'startup';
    if (filename.includes('daily')) return 'daily';
    if (filename.includes('emergency')) return 'emergency';
    if (filename.includes('automatic')) return 'automatic';
    return 'manual';
  }

  /**
   * Verifica el estado del sistema de backup
   */
  async healthCheck() {
    try {
      const stats = await this.getBackupStats();
      const isHealthy = stats.totalBackups > 0 && this.isInitialized;

      return {
        healthy: isHealthy,
        initialized: this.isInitialized,
        stats,
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        healthy: false,
        initialized: this.isInitialized,
        error: error.message,
        lastCheck: new Date()
      };
    }
  }
}

// Crear instancia global
const backupSystem = new BackupSystemInitializer();

export default backupSystem;