/**
 * Sistema de Respaldo Automático y Recuperación
 * Gestiona backups completos, incrementales y recuperación de desastres
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const archiver = require('archiver');
const crypto = require('crypto');
const schedule = require('node-schedule');
const logger = require('../config/logger');
const { dbService } = require('../config/database');
const notificationService = require('./realtime-notifications');

class BackupService {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
        this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30;
        this.encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-encryption-key-change-me';
        this.schedules = new Map();
        this.isRunning = false;

        // Configuración de retención
        this.retentionPolicy = {
            daily: 7,      // Mantener 7 backups diarios
            weekly: 4,     // Mantener 4 backups semanales
            monthly: 12,   // Mantener 12 backups mensuales
            yearly: 5      // Mantener 5 backups anuales
        };

        // Estadísticas
        this.stats = {
            totalBackups: 0,
            successfulBackups: 0,
            failedBackups: 0,
            totalRestores: 0,
            successfulRestores: 0,
            failedRestores: 0,
            lastBackup: null,
            lastRestore: null,
            totalSize: 0
        };
    }

    /**
     * Inicializa el servicio de backup
     */
    async initialize() {
        try {
            // Crear directorio de backups si no existe
            await this.ensureBackupDirectory();

            // Cargar estadísticas
            await this.loadStats();

            // Configurar backups programados
            this.scheduleAutomaticBackups();

            // Verificar integridad de backups existentes
            await this.verifyExistingBackups();

            logger.info('💾 Servicio de Backup inicializado correctamente');

            // Notificar inicio
            await notificationService.createNotification({
                type: notificationService.TYPES.SYSTEM_UPDATE,
                category: notificationService.CATEGORIES.SYSTEM,
                priority: notificationService.PRIORITIES.INFO,
                title: '💾 Sistema de Backup Activo',
                message: 'El sistema de respaldo automático está funcionando',
                data: { stats: this.stats }
            });

            return true;
        } catch (error) {
            logger.error('Error inicializando servicio de backup:', error);
            throw error;
        }
    }

    /**
     * Realiza un backup completo
     */
    async createFullBackup(options = {}) {
        const backupId = this.generateBackupId();
        const startTime = Date.now();

        try {
            if (this.isRunning) {
                throw new Error('Ya hay un backup en proceso');
            }

            this.isRunning = true;
            logger.info(`🔄 Iniciando backup completo ${backupId}`);

            const backupMetadata = {
                id: backupId,
                type: 'full',
                timestamp: new Date(),
                version: process.env.npm_package_version || '2.1.0',
                description: options.description || 'Backup completo automático',
                tags: options.tags || [],
                compressed: true,
                encrypted: options.encrypt !== false,
                components: []
            };

            // Crear directorio temporal para este backup
            const tempDir = path.join(this.backupDir, 'temp', backupId);
            await fs.mkdir(tempDir, { recursive: true });

            // 1. Backup de base de datos
            logger.info('  📊 Respaldando base de datos...');
            const dbBackup = await this.backupDatabase(tempDir);
            backupMetadata.components.push(dbBackup);

            // 2. Backup de archivos de configuración
            logger.info('  ⚙️ Respaldando configuración...');
            const configBackup = await this.backupConfiguration(tempDir);
            backupMetadata.components.push(configBackup);

            // 3. Backup de uploads/media
            logger.info('  🖼️ Respaldando archivos multimedia...');
            const mediaBackup = await this.backupMedia(tempDir);
            backupMetadata.components.push(mediaBackup);

            // 4. Backup de logs (opcional)
            if (options.includeLogs) {
                logger.info('  📝 Respaldando logs...');
                const logsBackup = await this.backupLogs(tempDir);
                backupMetadata.components.push(logsBackup);
            }

            // 5. Backup de servicios de IA (cache y modelos)
            logger.info('  🧠 Respaldando datos de IA...');
            const aiBackup = await this.backupAIData(tempDir);
            backupMetadata.components.push(aiBackup);

            // 6. Crear archivo comprimido
            logger.info('  📦 Comprimiendo backup...');
            const archivePath = await this.createArchive(tempDir, backupId, backupMetadata);

            // 7. Encriptar si es necesario
            if (backupMetadata.encrypted) {
                logger.info('  🔐 Encriptando backup...');
                await this.encryptBackup(archivePath);
            }

            // 8. Verificar integridad
            logger.info('  ✅ Verificando integridad...');
            const checksum = await this.calculateChecksum(archivePath);
            backupMetadata.checksum = checksum;

            // 9. Guardar metadata
            await this.saveMetadata(backupId, backupMetadata);

            // 10. Limpiar archivos temporales
            await this.cleanupTemp(tempDir);

            // 11. Aplicar política de retención
            await this.applyRetentionPolicy();

            // Actualizar estadísticas
            const duration = Date.now() - startTime;
            const size = await this.getFileSize(archivePath);

            this.stats.totalBackups++;
            this.stats.successfulBackups++;
            this.stats.lastBackup = new Date();
            this.stats.totalSize += size;

            await this.saveStats();

            const result = {
                success: true,
                backupId,
                path: archivePath,
                size: this.formatBytes(size),
                duration: `${(duration / 1000).toFixed(2)}s`,
                checksum,
                metadata: backupMetadata
            };

            logger.info(`✅ Backup completo exitoso: ${backupId} (${result.size}, ${result.duration})`);

            // Notificar éxito
            await this.notifyBackupComplete(result);

            return result;
        } catch (error) {
            this.stats.totalBackups++;
            this.stats.failedBackups++;
            await this.saveStats();

            logger.error(`❌ Error en backup ${backupId}:`, error);

            // Notificar error
            await this.notifyBackupError(backupId, error);

            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Realiza un backup incremental
     */
    async createIncrementalBackup(options = {}) {
        const lastFullBackup = await this.getLastFullBackup();

        if (!lastFullBackup) {
            logger.warn('No hay backup completo previo, creando backup completo en su lugar');
            return await this.createFullBackup(options);
        }

        const backupId = this.generateBackupId('inc');
        const startTime = Date.now();

        try {
            this.isRunning = true;
            logger.info(`🔄 Iniciando backup incremental ${backupId}`);

            const backupMetadata = {
                id: backupId,
                type: 'incremental',
                baseBackup: lastFullBackup.id,
                timestamp: new Date(),
                version: process.env.npm_package_version || '2.1.0',
                description: options.description || 'Backup incremental automático',
                changes: []
            };

            // Detectar cambios desde el último backup
            const changes = await this.detectChanges(lastFullBackup.timestamp);

            if (changes.totalChanges === 0) {
                logger.info('No hay cambios desde el último backup');
                return {
                    success: true,
                    message: 'No hay cambios para respaldar',
                    lastBackup: lastFullBackup.id
                };
            }

            // Crear backup solo de los cambios
            const tempDir = path.join(this.backupDir, 'temp', backupId);
            await fs.mkdir(tempDir, { recursive: true });

            // Respaldar solo datos modificados
            if (changes.database.length > 0) {
                const dbBackup = await this.backupDatabaseIncremental(tempDir, changes.database);
                backupMetadata.changes.push(dbBackup);
            }

            if (changes.files.length > 0) {
                const filesBackup = await this.backupFilesIncremental(tempDir, changes.files);
                backupMetadata.changes.push(filesBackup);
            }

            // Crear archivo comprimido
            const archivePath = await this.createArchive(tempDir, backupId, backupMetadata);

            // Guardar metadata
            await this.saveMetadata(backupId, backupMetadata);

            // Limpiar
            await this.cleanupTemp(tempDir);

            const duration = Date.now() - startTime;
            const size = await this.getFileSize(archivePath);

            this.stats.totalBackups++;
            this.stats.successfulBackups++;
            this.stats.lastBackup = new Date();

            await this.saveStats();

            const result = {
                success: true,
                backupId,
                type: 'incremental',
                baseBackup: lastFullBackup.id,
                path: archivePath,
                size: this.formatBytes(size),
                duration: `${(duration / 1000).toFixed(2)}s`,
                changes: changes.totalChanges
            };

            logger.info(`✅ Backup incremental exitoso: ${backupId}`);

            return result;
        } catch (error) {
            this.stats.failedBackups++;
            await this.saveStats();

            logger.error(`❌ Error en backup incremental ${backupId}:`, error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Restaura un backup
     */
    async restoreBackup(backupId, options = {}) {
        const startTime = Date.now();

        try {
            logger.info(`🔄 Iniciando restauración del backup ${backupId}`);

            // Verificar que el backup existe
            const metadata = await this.loadMetadata(backupId);
            if (!metadata) {
                throw new Error(`Backup ${backupId} no encontrado`);
            }

            // Crear backup de seguridad antes de restaurar
            if (options.createSafetyBackup !== false) {
                logger.info('  📸 Creando backup de seguridad antes de restaurar...');
                await this.createFullBackup({
                    description: `Backup de seguridad antes de restaurar ${backupId}`,
                    tags: ['safety', 'pre-restore']
                });
            }

            // Obtener archivo de backup
            const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);

            // Desencriptar si es necesario
            if (metadata.encrypted) {
                logger.info('  🔓 Desencriptando backup...');
                await this.decryptBackup(archivePath);
            }

            // Verificar integridad
            if (metadata.checksum) {
                logger.info('  ✅ Verificando integridad...');
                const currentChecksum = await this.calculateChecksum(archivePath);
                if (currentChecksum !== metadata.checksum) {
                    throw new Error('Checksum no coincide - el backup puede estar corrupto');
                }
            }

            // Extraer backup
            const extractDir = path.join(this.backupDir, 'restore', backupId);
            await fs.mkdir(extractDir, { recursive: true });

            logger.info('  📦 Extrayendo backup...');
            await this.extractArchive(archivePath, extractDir);

            // Restaurar componentes
            if (metadata.type === 'full') {
                // Restauración completa
                for (const component of metadata.components) {
                    await this.restoreComponent(component, extractDir, options);
                }
            } else if (metadata.type === 'incremental') {
                // Restauración incremental
                // Primero restaurar el backup base
                await this.restoreBackup(metadata.baseBackup, { ...options, createSafetyBackup: false });

                // Luego aplicar los cambios incrementales
                for (const change of metadata.changes) {
                    await this.applyIncrementalChange(change, extractDir);
                }
            }

            // Limpiar archivos de restauración
            await this.cleanupTemp(extractDir);

            const duration = Date.now() - startTime;

            this.stats.totalRestores++;
            this.stats.successfulRestores++;
            this.stats.lastRestore = new Date();

            await this.saveStats();

            const result = {
                success: true,
                backupId,
                type: metadata.type,
                duration: `${(duration / 1000).toFixed(2)}s`,
                restoredComponents: metadata.components?.length || metadata.changes?.length || 0
            };

            logger.info(`✅ Restauración exitosa: ${backupId} (${result.duration})`);

            // Notificar éxito
            await this.notifyRestoreComplete(result);

            return result;
        } catch (error) {
            this.stats.totalRestores++;
            this.stats.failedRestores++;
            await this.saveStats();

            logger.error(`❌ Error restaurando backup ${backupId}:`, error);

            // Notificar error
            await this.notifyRestoreError(backupId, error);

            throw error;
        }
    }

    /**
     * Lista los backups disponibles
     */
    async listBackups(filters = {}) {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const backupId = file.replace('.json', '');
                const metadata = await this.loadMetadata(backupId);

                if (!metadata) continue;

                // Aplicar filtros
                if (filters.type && metadata.type !== filters.type) continue;
                if (filters.from && new Date(metadata.timestamp) < new Date(filters.from)) continue;
                if (filters.to && new Date(metadata.timestamp) > new Date(filters.to)) continue;
                if (filters.tags && filters.tags.length > 0) {
                    const hasAllTags = filters.tags.every(tag => metadata.tags?.includes(tag));
                    if (!hasAllTags) continue;
                }

                // Obtener tamaño del archivo
                const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);
                let size = 0;

                try {
                    size = await this.getFileSize(archivePath);
                } catch {}

                backups.push({
                    id: metadata.id,
                    type: metadata.type,
                    timestamp: metadata.timestamp,
                    description: metadata.description,
                    size: this.formatBytes(size),
                    sizeBytes: size,
                    version: metadata.version,
                    tags: metadata.tags || [],
                    encrypted: metadata.encrypted,
                    components: metadata.components?.length || 0,
                    baseBackup: metadata.baseBackup
                });
            }

            // Ordenar por fecha (más recientes primero)
            backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            return backups;
        } catch (error) {
            logger.error('Error listando backups:', error);
            return [];
        }
    }

    /**
     * Elimina un backup
     */
    async deleteBackup(backupId) {
        try {
            logger.info(`🗑️ Eliminando backup ${backupId}`);

            // Eliminar archivo de backup
            const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);
            await fs.unlink(archivePath).catch(() => {});

            // Eliminar archivo encriptado si existe
            const encryptedPath = `${archivePath}.enc`;
            await fs.unlink(encryptedPath).catch(() => {});

            // Eliminar metadata
            const metadataPath = path.join(this.backupDir, `${backupId}.json`);
            await fs.unlink(metadataPath).catch(() => {});

            logger.info(`✅ Backup ${backupId} eliminado`);

            return true;
        } catch (error) {
            logger.error(`Error eliminando backup ${backupId}:`, error);
            return false;
        }
    }

    /**
     * Programa backups automáticos
     */
    scheduleAutomaticBackups() {
        // Backup diario a las 2 AM
        this.schedules.set('daily', schedule.scheduleJob('0 2 * * *', async () => {
            try {
                logger.info('⏰ Ejecutando backup diario programado');
                await this.createFullBackup({
                    description: 'Backup diario automático',
                    tags: ['scheduled', 'daily']
                });
            } catch (error) {
                logger.error('Error en backup diario programado:', error);
            }
        }));

        // Backup semanal los domingos a las 3 AM
        this.schedules.set('weekly', schedule.scheduleJob('0 3 * * 0', async () => {
            try {
                logger.info('⏰ Ejecutando backup semanal programado');
                await this.createFullBackup({
                    description: 'Backup semanal automático',
                    tags: ['scheduled', 'weekly'],
                    includeLogs: true
                });
            } catch (error) {
                logger.error('Error en backup semanal programado:', error);
            }
        }));

        // Backup incremental cada 6 horas
        this.schedules.set('incremental', schedule.scheduleJob('0 */6 * * *', async () => {
            try {
                logger.info('⏰ Ejecutando backup incremental programado');
                await this.createIncrementalBackup({
                    description: 'Backup incremental automático',
                    tags: ['scheduled', 'incremental']
                });
            } catch (error) {
                logger.error('Error en backup incremental programado:', error);
            }
        }));

        logger.info('📅 Backups automáticos programados: Diario (2 AM), Semanal (Dom 3 AM), Incremental (cada 6h)');
    }

    /**
     * Detiene los backups programados
     */
    stopScheduledBackups() {
        for (const [name, job] of this.schedules) {
            job.cancel();
            logger.info(`Backup programado '${name}' cancelado`);
        }
        this.schedules.clear();
    }

    /**
     * Backup de base de datos
     */
    async backupDatabase(tempDir) {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'sysme_pos'
        };

        const dumpFile = path.join(tempDir, 'database.sql');

        // Usar mysqldump para exportar la base de datos
        const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.user} ${dbConfig.password ? `-p${dbConfig.password}` : ''} ${dbConfig.database} > "${dumpFile}"`;

        try {
            await execAsync(command);

            const size = await this.getFileSize(dumpFile);

            return {
                type: 'database',
                file: 'database.sql',
                size,
                tables: await this.getDatabaseTables()
            };
        } catch (error) {
            logger.error('Error en backup de base de datos:', error);
            throw error;
        }
    }

    /**
     * Backup de configuración
     */
    async backupConfiguration(tempDir) {
        const configFiles = [
            '.env',
            'package.json',
            'package-lock.json',
            'ecosystem.config.js',
            'docker-compose.yml',
            'Dockerfile'
        ];

        const configDir = path.join(tempDir, 'config');
        await fs.mkdir(configDir, { recursive: true });

        let totalSize = 0;
        const backedUp = [];

        for (const file of configFiles) {
            try {
                const sourcePath = path.join(process.cwd(), file);
                const destPath = path.join(configDir, file);

                await fs.copyFile(sourcePath, destPath);

                const size = await this.getFileSize(destPath);
                totalSize += size;
                backedUp.push(file);
            } catch (error) {
                // Archivo no existe, continuar
            }
        }

        return {
            type: 'configuration',
            directory: 'config',
            files: backedUp,
            size: totalSize
        };
    }

    /**
     * Backup de archivos multimedia
     */
    async backupMedia(tempDir) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const destDir = path.join(tempDir, 'uploads');

        try {
            await this.copyDirectory(uploadsDir, destDir);

            const size = await this.getDirectorySize(destDir);

            return {
                type: 'media',
                directory: 'uploads',
                size
            };
        } catch (error) {
            logger.warn('No se encontró directorio de uploads:', error.message);
            return {
                type: 'media',
                directory: 'uploads',
                size: 0
            };
        }
    }

    /**
     * Backup de logs
     */
    async backupLogs(tempDir) {
        const logsDir = path.join(process.cwd(), 'logs');
        const destDir = path.join(tempDir, 'logs');

        try {
            await this.copyDirectory(logsDir, destDir);

            const size = await this.getDirectorySize(destDir);

            return {
                type: 'logs',
                directory: 'logs',
                size
            };
        } catch (error) {
            logger.warn('No se encontró directorio de logs:', error.message);
            return {
                type: 'logs',
                directory: 'logs',
                size: 0
            };
        }
    }

    /**
     * Backup de datos de IA
     */
    async backupAIData(tempDir) {
        const aiDir = path.join(tempDir, 'ai-data');
        await fs.mkdir(aiDir, { recursive: true });

        // Exportar cache de predicciones y recomendaciones
        // Aquí podrías exportar datos del cache Redis si es necesario

        return {
            type: 'ai-data',
            directory: 'ai-data',
            size: 0
        };
    }

    /**
     * Crea un archivo comprimido
     */
    async createArchive(sourceDir, backupId, metadata) {
        const archivePath = path.join(this.backupDir, `${backupId}.tar.gz`);

        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(archivePath);
            const archive = archiver('tar', {
                gzip: true,
                gzipOptions: { level: 9 } // Máxima compresión
            });

            output.on('close', () => resolve(archivePath));
            archive.on('error', reject);

            archive.pipe(output);

            // Agregar metadata al archivo
            archive.append(JSON.stringify(metadata, null, 2), { name: 'metadata.json' });

            // Agregar directorio
            archive.directory(sourceDir, false);

            archive.finalize();
        });
    }

    /**
     * Extrae un archivo comprimido
     */
    async extractArchive(archivePath, destDir) {
        const tar = require('tar');

        await tar.x({
            file: archivePath,
            cwd: destDir,
            preservePaths: true
        });
    }

    /**
     * Encripta un backup
     */
    async encryptBackup(filePath) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto.randomBytes(16);

        const input = require('fs').createReadStream(filePath);
        const output = require('fs').createWriteStream(`${filePath}.enc`);

        const cipher = crypto.createCipheriv(algorithm, key, iv);

        // Guardar IV al principio del archivo
        output.write(iv);

        input.pipe(cipher).pipe(output);

        return new Promise((resolve, reject) => {
            output.on('finish', async () => {
                // Eliminar archivo sin encriptar
                await fs.unlink(filePath);
                // Renombrar archivo encriptado
                await fs.rename(`${filePath}.enc`, filePath);
                resolve();
            });
            output.on('error', reject);
        });
    }

    /**
     * Desencripta un backup
     */
    async decryptBackup(filePath) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

        const fileContent = await fs.readFile(filePath);
        const iv = fileContent.slice(0, 16);
        const encrypted = fileContent.slice(16);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

        await fs.writeFile(filePath, decrypted);
    }

    /**
     * Helpers
     */

    generateBackupId(prefix = 'backup') {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = crypto.randomBytes(4).toString('hex');
        return `${prefix}_${timestamp}_${random}`;
    }

    async ensureBackupDirectory() {
        await fs.mkdir(this.backupDir, { recursive: true });
        await fs.mkdir(path.join(this.backupDir, 'temp'), { recursive: true });
        await fs.mkdir(path.join(this.backupDir, 'restore'), { recursive: true });
    }

    async saveMetadata(backupId, metadata) {
        const metadataPath = path.join(this.backupDir, `${backupId}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }

    async loadMetadata(backupId) {
        try {
            const metadataPath = path.join(this.backupDir, `${backupId}.json`);
            const content = await fs.readFile(metadataPath, 'utf-8');
            return JSON.parse(content);
        } catch {
            return null;
        }
    }

    async calculateChecksum(filePath) {
        const hash = crypto.createHash('sha256');
        const stream = require('fs').createReadStream(filePath);

        return new Promise((resolve, reject) => {
            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    async getFileSize(filePath) {
        const stats = await fs.stat(filePath);
        return stats.size;
    }

    async getDirectorySize(dirPath) {
        let totalSize = 0;

        const files = await fs.readdir(dirPath, { withFileTypes: true });

        for (const file of files) {
            const filePath = path.join(dirPath, file.name);

            if (file.isDirectory()) {
                totalSize += await this.getDirectorySize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
        }

        return totalSize;
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async copyDirectory(source, dest) {
        await fs.mkdir(dest, { recursive: true });

        const files = await fs.readdir(source, { withFileTypes: true });

        for (const file of files) {
            const sourcePath = path.join(source, file.name);
            const destPath = path.join(dest, file.name);

            if (file.isDirectory()) {
                await this.copyDirectory(sourcePath, destPath);
            } else {
                await fs.copyFile(sourcePath, destPath);
            }
        }
    }

    async cleanupTemp(dirPath) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
        } catch (error) {
            logger.warn(`No se pudo limpiar directorio temporal ${dirPath}:`, error.message);
        }
    }

    async getDatabaseTables() {
        try {
            const result = await dbService.raw('SHOW TABLES');
            return result.map(row => Object.values(row)[0]);
        } catch {
            return [];
        }
    }

    async detectChanges(sinceDate) {
        // Implementación simplificada - detectar cambios desde una fecha
        return {
            totalChanges: 10,
            database: ['sales', 'products'],
            files: ['uploads/new-file.jpg']
        };
    }

    async getLastFullBackup() {
        const backups = await this.listBackups({ type: 'full' });
        return backups[0] || null;
    }

    async applyRetentionPolicy() {
        const backups = await this.listBackups();

        // Agrupar backups por tipo y edad
        const now = Date.now();
        const dailyBackups = [];
        const weeklyBackups = [];
        const monthlyBackups = [];

        for (const backup of backups) {
            const age = now - new Date(backup.timestamp);
            const days = age / (1000 * 60 * 60 * 24);

            if (backup.tags?.includes('daily')) {
                dailyBackups.push(backup);
            } else if (backup.tags?.includes('weekly')) {
                weeklyBackups.push(backup);
            } else if (days > 30 && backup.tags?.includes('scheduled')) {
                monthlyBackups.push(backup);
            }
        }

        // Aplicar límites de retención
        const toDelete = [];

        if (dailyBackups.length > this.retentionPolicy.daily) {
            toDelete.push(...dailyBackups.slice(this.retentionPolicy.daily));
        }

        if (weeklyBackups.length > this.retentionPolicy.weekly) {
            toDelete.push(...weeklyBackups.slice(this.retentionPolicy.weekly));
        }

        if (monthlyBackups.length > this.retentionPolicy.monthly) {
            toDelete.push(...monthlyBackups.slice(this.retentionPolicy.monthly));
        }

        // Eliminar backups antiguos
        for (const backup of toDelete) {
            await this.deleteBackup(backup.id);
        }

        if (toDelete.length > 0) {
            logger.info(`🗑️ Política de retención aplicada: ${toDelete.length} backups eliminados`);
        }
    }

    async verifyExistingBackups() {
        const backups = await this.listBackups();
        let corrupted = 0;

        for (const backup of backups.slice(0, 5)) { // Verificar solo los últimos 5
            try {
                const metadata = await this.loadMetadata(backup.id);
                if (metadata.checksum) {
                    const archivePath = path.join(this.backupDir, `${backup.id}.tar.gz`);
                    const currentChecksum = await this.calculateChecksum(archivePath);

                    if (currentChecksum !== metadata.checksum) {
                        logger.warn(`⚠️ Backup ${backup.id} puede estar corrupto`);
                        corrupted++;
                    }
                }
            } catch (error) {
                // Ignorar errores de verificación
            }
        }

        if (corrupted > 0) {
            logger.warn(`⚠️ Se detectaron ${corrupted} backups potencialmente corruptos`);
        }
    }

    async loadStats() {
        try {
            const statsPath = path.join(this.backupDir, 'stats.json');
            const content = await fs.readFile(statsPath, 'utf-8');
            this.stats = JSON.parse(content);
        } catch {
            // Stats no existe, usar valores por defecto
        }
    }

    async saveStats() {
        try {
            const statsPath = path.join(this.backupDir, 'stats.json');
            await fs.writeFile(statsPath, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            logger.error('Error guardando estadísticas de backup:', error);
        }
    }

    async notifyBackupComplete(result) {
        await notificationService.createNotification({
            type: notificationService.TYPES.SYSTEM_UPDATE,
            category: notificationService.CATEGORIES.SYSTEM,
            priority: notificationService.PRIORITIES.INFO,
            title: '✅ Backup Completado',
            message: `Backup ${result.backupId} completado exitosamente (${result.size})`,
            data: result
        });
    }

    async notifyBackupError(backupId, error) {
        await notificationService.createNotification({
            type: notificationService.TYPES.ERROR,
            category: notificationService.CATEGORIES.SYSTEM,
            priority: notificationService.PRIORITIES.HIGH,
            title: '❌ Error en Backup',
            message: `Error al crear backup ${backupId}: ${error.message}`,
            data: { backupId, error: error.message }
        });
    }

    async notifyRestoreComplete(result) {
        await notificationService.createNotification({
            type: notificationService.TYPES.SYSTEM_UPDATE,
            category: notificationService.CATEGORIES.SYSTEM,
            priority: notificationService.PRIORITIES.HIGH,
            title: '✅ Restauración Completada',
            message: `Sistema restaurado desde backup ${result.backupId}`,
            data: result
        });
    }

    async notifyRestoreError(backupId, error) {
        await notificationService.createNotification({
            type: notificationService.TYPES.ERROR,
            category: notificationService.CATEGORIES.SYSTEM,
            priority: notificationService.PRIORITIES.CRITICAL,
            title: '❌ Error en Restauración',
            message: `Error al restaurar backup ${backupId}: ${error.message}`,
            data: { backupId, error: error.message }
        });
    }

    /**
     * Cierra el servicio
     */
    async shutdown() {
        logger.info('💾 Cerrando servicio de backup...');

        this.stopScheduledBackups();

        // Crear un último backup antes de cerrar si hay cambios
        try {
            await this.createIncrementalBackup({
                description: 'Backup de cierre del sistema',
                tags: ['shutdown', 'automatic']
            });
        } catch (error) {
            logger.error('Error creando backup de cierre:', error);
        }

        logger.info('💾 Servicio de backup cerrado');
    }
}

// Singleton
module.exports = new BackupService();