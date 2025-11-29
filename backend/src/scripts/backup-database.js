/**
 * Database Backup Script
 * Creates automated backups of the MySQL database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import cron from 'node-cron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env.production') });

const BACKUP_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USER || 'sysme_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sysme_production',
  backupPath: process.env.BACKUP_PATH || './backups',
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *' // Daily at 2 AM
};

// Ensure backup directory exists
const ensureBackupDirectory = () => {
  if (!fs.existsSync(BACKUP_CONFIG.backupPath)) {
    fs.mkdirSync(BACKUP_CONFIG.backupPath, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_CONFIG.backupPath}`);
  }
};

// Generate backup filename
const generateBackupFilename = (type = 'full') => {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);

  return `sysme_${type}_backup_${timestamp}.sql`;
};

// Create database backup
const createBackup = async (type = 'full') => {
  console.log(`🔄 Starting ${type} backup...`);

  try {
    ensureBackupDirectory();

    const filename = generateBackupFilename(type);
    const backupFile = path.join(BACKUP_CONFIG.backupPath, filename);

    // Build mysqldump command
    let mysqldumpCmd = `mysqldump ` +
      `--host=${BACKUP_CONFIG.host} ` +
      `--port=${BACKUP_CONFIG.port} ` +
      `--user=${BACKUP_CONFIG.user} ` +
      `--password='${BACKUP_CONFIG.password}' ` +
      `--single-transaction ` +
      `--routines ` +
      `--triggers ` +
      `--add-drop-database ` +
      `--databases ${BACKUP_CONFIG.database}`;

    // Add compression
    const compressedFile = `${backupFile}.gz`;
    mysqldumpCmd += ` | gzip > "${compressedFile}"`;

    console.log(`📁 Creating backup: ${path.basename(compressedFile)}`);

    // Execute backup
    execSync(mysqldumpCmd, { stdio: 'pipe' });

    // Verify backup file was created
    if (fs.existsSync(compressedFile)) {
      const stats = fs.statSync(compressedFile);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ Backup completed successfully`);
      console.log(`📊 File: ${path.basename(compressedFile)}`);
      console.log(`📐 Size: ${sizeInMB} MB`);
      console.log(`📍 Location: ${compressedFile}`);

      // Create backup metadata
      const metadata = {
        filename: path.basename(compressedFile),
        filepath: compressedFile,
        type: type,
        database: BACKUP_CONFIG.database,
        timestamp: new Date().toISOString(),
        size: stats.size,
        sizeFormatted: `${sizeInMB} MB`
      };

      const metadataFile = `${compressedFile}.json`;
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

      return metadata;
    } else {
      throw new Error('Backup file was not created');
    }

  } catch (error) {
    console.error(`❌ Backup failed: ${error.message}`);
    throw error;
  }
};

// Clean old backups
const cleanOldBackups = () => {
  console.log(`🧹 Cleaning backups older than ${BACKUP_CONFIG.retentionDays} days...`);

  try {
    ensureBackupDirectory();

    const files = fs.readdirSync(BACKUP_CONFIG.backupPath);
    const cutoffDate = new Date(Date.now() - (BACKUP_CONFIG.retentionDays * 24 * 60 * 60 * 1000));

    let deletedCount = 0;
    let totalSize = 0;

    files.forEach(file => {
      if (file.endsWith('.sql.gz') || file.endsWith('.sql.gz.json')) {
        const filePath = path.join(BACKUP_CONFIG.backupPath, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          totalSize += stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️  Deleted: ${file}`);
        }
      }
    });

    if (deletedCount > 0) {
      const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
      console.log(`✅ Cleaned ${deletedCount} old backup files (${sizeInMB} MB freed)`);
    } else {
      console.log(`✅ No old backups to clean`);
    }

  } catch (error) {
    console.error(`❌ Cleanup failed: ${error.message}`);
  }
};

// List available backups
const listBackups = () => {
  console.log('📋 Available backups:');

  try {
    ensureBackupDirectory();

    const files = fs.readdirSync(BACKUP_CONFIG.backupPath)
      .filter(file => file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(BACKUP_CONFIG.backupPath, file);
        const stats = fs.statSync(filePath);
        const metadataFile = `${filePath}.json`;

        let metadata = null;
        if (fs.existsSync(metadataFile)) {
          metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        }

        return {
          filename: file,
          filepath: filePath,
          size: stats.size,
          sizeFormatted: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
          created: stats.mtime,
          metadata: metadata
        };
      })
      .sort((a, b) => b.created - a.created);

    if (files.length === 0) {
      console.log('No backups found');
      return;
    }

    files.forEach((backup, index) => {
      const age = Math.floor((Date.now() - backup.created.getTime()) / (24 * 60 * 60 * 1000));
      const ageText = age === 0 ? 'Today' : age === 1 ? '1 day ago' : `${age} days ago`;

      console.log(`${index + 1}. ${backup.filename}`);
      console.log(`   📐 Size: ${backup.sizeFormatted}`);
      console.log(`   📅 Created: ${backup.created.toISOString()} (${ageText})`);
      console.log(`   📁 Path: ${backup.filepath}`);
      console.log('');
    });

    return files;

  } catch (error) {
    console.error(`❌ Failed to list backups: ${error.message}`);
  }
};

// Restore from backup
const restoreFromBackup = async (backupFile) => {
  console.log(`🔄 Restoring from backup: ${backupFile}`);

  try {
    const backupPath = path.isAbsolute(backupFile)
      ? backupFile
      : path.join(BACKUP_CONFIG.backupPath, backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    console.log('⚠️  WARNING: This will overwrite the current database!');
    console.log('🔄 Restoring database...');

    // Build restore command
    const restoreCmd = `gunzip -c "${backupPath}" | mysql ` +
      `--host=${BACKUP_CONFIG.host} ` +
      `--port=${BACKUP_CONFIG.port} ` +
      `--user=${BACKUP_CONFIG.user} ` +
      `--password='${BACKUP_CONFIG.password}'`;

    execSync(restoreCmd, { stdio: 'pipe' });

    console.log('✅ Database restored successfully');

  } catch (error) {
    console.error(`❌ Restore failed: ${error.message}`);
    throw error;
  }
};

// Schedule automatic backups
const scheduleBackups = () => {
  console.log(`⏰ Scheduling automatic backups: ${BACKUP_CONFIG.schedule}`);

  cron.schedule(BACKUP_CONFIG.schedule, async () => {
    console.log('🕐 Automated backup starting...');

    try {
      await createBackup('scheduled');
      cleanOldBackups();
      console.log('✅ Scheduled backup completed');
    } catch (error) {
      console.error('❌ Scheduled backup failed:', error.message);
    }
  });

  console.log('✅ Backup scheduler started');
};

// Test database connection
const testConnection = () => {
  try {
    const testCmd = `mysql ` +
      `--host=${BACKUP_CONFIG.host} ` +
      `--port=${BACKUP_CONFIG.port} ` +
      `--user=${BACKUP_CONFIG.user} ` +
      `--password='${BACKUP_CONFIG.password}' ` +
      `--execute="SELECT 1" ` +
      `${BACKUP_CONFIG.database}`;

    execSync(testCmd, { stdio: 'pipe' });
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Main function for CLI usage
const main = async () => {
  const command = process.argv[2];
  const argument = process.argv[3];

  console.log('🗄️  SYSME Database Backup Manager\n');

  // Test connection first
  if (!testConnection()) {
    process.exit(1);
  }

  switch (command) {
    case 'create':
    case 'backup':
      await createBackup(argument || 'manual');
      cleanOldBackups();
      break;

    case 'list':
      listBackups();
      break;

    case 'clean':
      cleanOldBackups();
      break;

    case 'restore':
      if (!argument) {
        console.error('❌ Please specify backup file to restore');
        process.exit(1);
      }
      await restoreFromBackup(argument);
      break;

    case 'schedule':
      scheduleBackups();
      // Keep process running
      console.log('Press Ctrl+C to stop the scheduler');
      break;

    case 'test':
      console.log('✅ Connection test completed');
      break;

    default:
      console.log('Usage:');
      console.log('  node backup-database.js create [type]  - Create backup (type: full, manual)');
      console.log('  node backup-database.js list          - List available backups');
      console.log('  node backup-database.js clean         - Clean old backups');
      console.log('  node backup-database.js restore <file> - Restore from backup');
      console.log('  node backup-database.js schedule      - Start backup scheduler');
      console.log('  node backup-database.js test          - Test database connection');
      break;
  }
};

// Export functions for use in other modules
export {
  createBackup,
  cleanOldBackups,
  listBackups,
  restoreFromBackup,
  scheduleBackups,
  testConnection
};

// Run main function if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main().catch(error => {
    console.error('❌ Operation failed:', error.message);
    process.exit(1);
  });
}