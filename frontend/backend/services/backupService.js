// =====================================================
// SYSME POS - Automated Backup Service
// =====================================================

const cron = require('node-cron');
const { dbManager } = require('../config/database');
const logger = require('../config/logger');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');

class BackupService {
  constructor() {
    this.backupDir = config.backup.dir || path.join(__dirname, '../backups');
    this.retentionDays = config.backup.retentionDays || 30;
    this.cronJob = null;

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      logger.info(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Schedule daily backup at 2 AM
   */
  scheduleDailyBackup() {
    // Cron: 0 2 * * * = Every day at 2:00 AM
    this.cronJob = cron.schedule('0 2 * * *', () => {
      logger.info('Running scheduled backup...');
      this.createBackup()
        .then(backupPath => {
          logger.info(`Scheduled backup completed: ${backupPath}`);
          this.cleanOldBackups();
        })
        .catch(error => {
          logger.error('Scheduled backup failed:', error);
        });
    }, {
      scheduled: true,
      timezone: config.locale.timezone
    });

    logger.info('Daily backup scheduled at 2:00 AM');
  }

  /**
   * Create a backup of the database
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Use database manager's backup method
      await dbManager.backup(backupPath);

      // Get file size
      const stats = fs.statSync(backupPath);
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info(`Backup created: ${backupPath} (${fileSizeInMB} MB)`);

      return {
        path: backupPath,
        fileName: backupFileName,
        size: stats.size,
        sizeMB: fileSizeInMB,
        createdAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  /**
   * Clean old backups based on retention policy
   */
  cleanOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      let deletedCount = 0;

      files.forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
          logger.info(`Deleted old backup: ${file}`);
        }
      });

      if (deletedCount > 0) {
        logger.info(`Cleaned ${deletedCount} old backup(s)`);
      } else {
        logger.debug('No old backups to clean');
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to clean old backups:', error);
      return 0;
    }
  }

  /**
   * List all available backups
   */
  listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(f => f.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);

          return {
            fileName: file,
            path: filePath,
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
            createdAt: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return files;
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      // Use database manager's restore method
      await dbManager.restore(backupPath);

      logger.info(`Database restored from backup: ${backupFileName}`);

      return {
        success: true,
        backup: backupFileName,
        restoredAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Backup restore failed:', error);
      throw error;
    }
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      fs.unlinkSync(backupPath);
      logger.info(`Deleted backup: ${backupFileName}`);

      return { success: true, deleted: backupFileName };
    } catch (error) {
      logger.error('Failed to delete backup:', error);
      throw error;
    }
  }

  /**
   * Stop scheduled backups
   */
  stopSchedule() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Backup schedule stopped');
    }
  }
}

module.exports = BackupService;
