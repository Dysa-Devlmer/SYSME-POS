/**
 * Sistema Avanzado de Auditoría y Logs
 * Rastrea todas las acciones críticas del sistema con trazabilidad completa
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { dbService } = require('../config/database');
const logger = require('../config/logger');
const notificationService = require('./realtime-notifications');

class AuditService extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.processing = false;
        this.batchSize = 100;
        this.flushInterval = 5000; // 5 segundos

        // Niveles de auditoría
        this.LEVELS = {
            DEBUG: 'debug',
            INFO: 'info',
            WARNING: 'warning',
            ERROR: 'error',
            CRITICAL: 'critical',
            SECURITY: 'security'
        };

        // Categorías de eventos
        this.CATEGORIES = {
            AUTH: 'authentication',
            AUTHORIZATION: 'authorization',
            DATA_ACCESS: 'data_access',
            DATA_MODIFICATION: 'data_modification',
            SYSTEM: 'system',
            FINANCIAL: 'financial',
            INVENTORY: 'inventory',
            USER_ACTION: 'user_action',
            API: 'api',
            SECURITY: 'security',
            COMPLIANCE: 'compliance',
            PERFORMANCE: 'performance'
        };

        // Acciones auditables
        this.ACTIONS = {
            // Auth
            LOGIN: 'user.login',
            LOGOUT: 'user.logout',
            LOGIN_FAILED: 'user.login_failed',
            PASSWORD_CHANGE: 'user.password_change',
            PASSWORD_RESET: 'user.password_reset',
            SESSION_EXPIRED: 'user.session_expired',

            // Data
            CREATE: 'data.create',
            READ: 'data.read',
            UPDATE: 'data.update',
            DELETE: 'data.delete',
            EXPORT: 'data.export',
            IMPORT: 'data.import',

            // Financial
            SALE_CREATE: 'sale.create',
            SALE_CANCEL: 'sale.cancel',
            PAYMENT_PROCESS: 'payment.process',
            REFUND_PROCESS: 'refund.process',
            CASH_OPEN: 'cash.open',
            CASH_CLOSE: 'cash.close',
            DISCOUNT_APPLY: 'discount.apply',

            // Inventory
            STOCK_UPDATE: 'stock.update',
            STOCK_ADJUSTMENT: 'stock.adjustment',
            PRODUCT_CREATE: 'product.create',
            PRODUCT_UPDATE: 'product.update',
            PRODUCT_DELETE: 'product.delete',

            // System
            BACKUP_CREATE: 'backup.create',
            BACKUP_RESTORE: 'backup.restore',
            CONFIG_CHANGE: 'config.change',
            SERVICE_START: 'service.start',
            SERVICE_STOP: 'service.stop',
            ERROR_OCCURRED: 'error.occurred',

            // Security
            PERMISSION_GRANT: 'permission.grant',
            PERMISSION_REVOKE: 'permission.revoke',
            ROLE_ASSIGN: 'role.assign',
            SUSPICIOUS_ACTIVITY: 'security.suspicious',
            ACCESS_DENIED: 'security.access_denied'
        };

        // Configuración de retención
        this.retentionDays = {
            [this.LEVELS.DEBUG]: 7,
            [this.LEVELS.INFO]: 30,
            [this.LEVELS.WARNING]: 90,
            [this.LEVELS.ERROR]: 180,
            [this.LEVELS.CRITICAL]: 365,
            [this.LEVELS.SECURITY]: 730 // 2 años para eventos de seguridad
        };

        // Estadísticas
        this.stats = {
            totalEvents: 0,
            eventsByLevel: {},
            eventsByCategory: {},
            eventsByAction: {},
            errors: 0,
            startTime: Date.now()
        };

        // Inicializar contadores
        Object.values(this.LEVELS).forEach(level => {
            this.stats.eventsByLevel[level] = 0;
        });

        Object.values(this.CATEGORIES).forEach(category => {
            this.stats.eventsByCategory[category] = 0;
        });
    }

    /**
     * Inicializa el servicio de auditoría
     */
    async initialize() {
        try {
            // Crear tabla de auditoría si no existe
            await this.createAuditTable();

            // Iniciar procesamiento de cola
            this.startQueueProcessor();

            // Cargar configuración de auditoría
            await this.loadConfiguration();

            // Limpiar registros antiguos
            await this.cleanupOldRecords();

            // Programar limpieza periódica
            this.scheduleCleanup();

            logger.info('📝 Servicio de Auditoría inicializado correctamente');

            // Registrar inicio del servicio
            await this.log({
                level: this.LEVELS.INFO,
                category: this.CATEGORIES.SYSTEM,
                action: this.ACTIONS.SERVICE_START,
                description: 'Servicio de auditoría iniciado',
                metadata: { version: process.env.npm_package_version || '2.1.0' }
            });

            return true;
        } catch (error) {
            logger.error('Error inicializando servicio de auditoría:', error);
            throw error;
        }
    }

    /**
     * Registra un evento de auditoría
     */
    async log(event) {
        try {
            // Enriquecer evento con información adicional
            const enrichedEvent = {
                id: this.generateEventId(),
                timestamp: new Date(),
                level: event.level || this.LEVELS.INFO,
                category: event.category || this.CATEGORIES.SYSTEM,
                action: event.action || 'unknown',
                description: event.description || '',
                userId: event.userId || null,
                userName: event.userName || null,
                userRole: event.userRole || null,
                ipAddress: event.ipAddress || null,
                userAgent: event.userAgent || null,
                resourceType: event.resourceType || null,
                resourceId: event.resourceId || null,
                oldValue: event.oldValue || null,
                newValue: event.newValue || null,
                metadata: event.metadata || {},
                success: event.success !== false,
                errorMessage: event.errorMessage || null,
                duration: event.duration || null,
                sessionId: event.sessionId || null,
                correlationId: event.correlationId || this.generateCorrelationId(),
                checksum: null // Se calculará antes de guardar
            };

            // Calcular checksum para integridad
            enrichedEvent.checksum = this.calculateChecksum(enrichedEvent);

            // Agregar a la cola
            this.queue.push(enrichedEvent);

            // Actualizar estadísticas
            this.updateStats(enrichedEvent);

            // Emitir evento para listeners
            this.emit('audit:logged', enrichedEvent);

            // Verificar si necesita alerta inmediata
            await this.checkForAlerts(enrichedEvent);

            // Si es crítico o de seguridad, procesar inmediatamente
            if ([this.LEVELS.CRITICAL, this.LEVELS.SECURITY].includes(enrichedEvent.level)) {
                await this.processQueue();
            }

            return enrichedEvent.id;
        } catch (error) {
            this.stats.errors++;
            logger.error('Error registrando evento de auditoría:', error);

            // Intentar guardar en archivo como respaldo
            await this.saveToFile(event);

            throw error;
        }
    }

    /**
     * Registra una acción de usuario
     */
    async logUserAction(userId, action, details = {}) {
        return await this.log({
            level: this.LEVELS.INFO,
            category: this.CATEGORIES.USER_ACTION,
            action,
            userId,
            description: details.description || `Usuario ${userId} ejecutó ${action}`,
            ...details
        });
    }

    /**
     * Registra un acceso a datos
     */
    async logDataAccess(userId, resourceType, resourceId, operation, details = {}) {
        return await this.log({
            level: this.LEVELS.INFO,
            category: this.CATEGORIES.DATA_ACCESS,
            action: `data.${operation}`,
            userId,
            resourceType,
            resourceId,
            description: `${operation} en ${resourceType}:${resourceId}`,
            ...details
        });
    }

    /**
     * Registra una modificación de datos
     */
    async logDataModification(userId, resourceType, resourceId, oldValue, newValue, details = {}) {
        const changes = this.detectChanges(oldValue, newValue);

        return await this.log({
            level: this.LEVELS.INFO,
            category: this.CATEGORIES.DATA_MODIFICATION,
            action: this.ACTIONS.UPDATE,
            userId,
            resourceType,
            resourceId,
            oldValue: this.sanitizeValue(oldValue),
            newValue: this.sanitizeValue(newValue),
            description: `Modificación en ${resourceType}:${resourceId}`,
            metadata: { changes },
            ...details
        });
    }

    /**
     * Registra un evento de seguridad
     */
    async logSecurityEvent(type, details = {}) {
        return await this.log({
            level: this.LEVELS.SECURITY,
            category: this.CATEGORIES.SECURITY,
            action: type,
            description: details.description || `Evento de seguridad: ${type}`,
            ...details
        });
    }

    /**
     * Registra un error
     */
    async logError(error, context = {}) {
        return await this.log({
            level: this.LEVELS.ERROR,
            category: this.CATEGORIES.SYSTEM,
            action: this.ACTIONS.ERROR_OCCURRED,
            description: error.message,
            errorMessage: error.stack,
            metadata: {
                errorType: error.name,
                context
            },
            success: false
        });
    }

    /**
     * Busca eventos de auditoría
     */
    async search(filters = {}) {
        try {
            let query = dbService.table('audit_logs');

            // Aplicar filtros
            if (filters.level) {
                query = query.where('level', filters.level);
            }

            if (filters.category) {
                query = query.where('category', filters.category);
            }

            if (filters.action) {
                query = query.where('action', filters.action);
            }

            if (filters.userId) {
                query = query.where('user_id', filters.userId);
            }

            if (filters.resourceType) {
                query = query.where('resource_type', filters.resourceType);
            }

            if (filters.resourceId) {
                query = query.where('resource_id', filters.resourceId);
            }

            if (filters.success !== undefined) {
                query = query.where('success', filters.success);
            }

            if (filters.fromDate) {
                query = query.where('timestamp', '>=', filters.fromDate);
            }

            if (filters.toDate) {
                query = query.where('timestamp', '<=', filters.toDate);
            }

            if (filters.searchTerm) {
                query = query.where(function() {
                    this.where('description', 'like', `%${filters.searchTerm}%`)
                        .orWhere('error_message', 'like', `%${filters.searchTerm}%`)
                        .orWhere('metadata', 'like', `%${filters.searchTerm}%`);
                });
            }

            // Ordenar y paginar
            const page = filters.page || 1;
            const limit = filters.limit || 100;
            const offset = (page - 1) * limit;

            const results = await query
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .offset(offset);

            // Contar total
            const countQuery = dbService.table('audit_logs');
            // Aplicar mismos filtros para el conteo
            const totalCount = await countQuery.count('id as count').first();

            return {
                data: results,
                pagination: {
                    page,
                    limit,
                    total: totalCount.count,
                    totalPages: Math.ceil(totalCount.count / limit)
                }
            };
        } catch (error) {
            logger.error('Error buscando eventos de auditoría:', error);
            throw error;
        }
    }

    /**
     * Obtiene un trail completo de auditoría para un recurso
     */
    async getAuditTrail(resourceType, resourceId) {
        try {
            const events = await dbService.table('audit_logs')
                .where('resource_type', resourceType)
                .where('resource_id', resourceId)
                .orderBy('timestamp', 'asc');

            // Construir timeline
            const trail = {
                resourceType,
                resourceId,
                events: events.map(event => ({
                    id: event.id,
                    timestamp: event.timestamp,
                    action: event.action,
                    userId: event.user_id,
                    userName: event.user_name,
                    description: event.description,
                    changes: this.parseChanges(event),
                    success: event.success
                })),
                summary: {
                    totalEvents: events.length,
                    firstEvent: events[0]?.timestamp,
                    lastEvent: events[events.length - 1]?.timestamp,
                    uniqueUsers: [...new Set(events.map(e => e.user_id))].length
                }
            };

            return trail;
        } catch (error) {
            logger.error('Error obteniendo audit trail:', error);
            throw error;
        }
    }

    /**
     * Genera un reporte de auditoría
     */
    async generateReport(options = {}) {
        try {
            const { startDate, endDate, groupBy = 'day' } = options;

            const events = await dbService.table('audit_logs')
                .whereBetween('timestamp', [startDate, endDate])
                .orderBy('timestamp', 'asc');

            // Agrupar eventos
            const grouped = this.groupEvents(events, groupBy);

            // Calcular métricas
            const metrics = {
                totalEvents: events.length,
                eventsByLevel: {},
                eventsByCategory: {},
                topUsers: [],
                topActions: [],
                errorRate: 0,
                averageResponseTime: 0,
                securityEvents: 0,
                complianceScore: 0
            };

            // Calcular distribución por nivel
            events.forEach(event => {
                metrics.eventsByLevel[event.level] = (metrics.eventsByLevel[event.level] || 0) + 1;
                metrics.eventsByCategory[event.category] = (metrics.eventsByCategory[event.category] || 0) + 1;

                if (event.level === this.LEVELS.SECURITY) {
                    metrics.securityEvents++;
                }
            });

            // Calcular tasa de errores
            const errors = events.filter(e => !e.success).length;
            metrics.errorRate = events.length > 0 ? (errors / events.length * 100).toFixed(2) : 0;

            // Top usuarios
            const userActivity = {};
            events.forEach(event => {
                if (event.user_id) {
                    userActivity[event.user_id] = (userActivity[event.user_id] || 0) + 1;
                }
            });
            metrics.topUsers = Object.entries(userActivity)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([userId, count]) => ({ userId, count }));

            // Top acciones
            const actionCounts = {};
            events.forEach(event => {
                actionCounts[event.action] = (actionCounts[event.action] || 0) + 1;
            });
            metrics.topActions = Object.entries(actionCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([action, count]) => ({ action, count }));

            // Calcular score de compliance (ejemplo simplificado)
            const requiredEvents = ['user.login', 'user.logout', 'data.access'];
            const hasRequiredEvents = requiredEvents.every(action =>
                events.some(e => e.action === action)
            );
            metrics.complianceScore = hasRequiredEvents ? 100 : 75;

            return {
                period: { startDate, endDate },
                metrics,
                timeline: grouped,
                recommendations: this.generateRecommendations(metrics)
            };
        } catch (error) {
            logger.error('Error generando reporte de auditoría:', error);
            throw error;
        }
    }

    /**
     * Verifica la integridad de los registros
     */
    async verifyIntegrity(startDate, endDate) {
        try {
            const events = await dbService.table('audit_logs')
                .whereBetween('timestamp', [startDate, endDate])
                .orderBy('timestamp', 'asc');

            let valid = 0;
            let invalid = 0;
            const issues = [];

            for (const event of events) {
                const calculatedChecksum = this.calculateChecksum(event);

                if (calculatedChecksum === event.checksum) {
                    valid++;
                } else {
                    invalid++;
                    issues.push({
                        eventId: event.id,
                        timestamp: event.timestamp,
                        issue: 'Checksum mismatch',
                        expected: event.checksum,
                        calculated: calculatedChecksum
                    });
                }
            }

            return {
                totalEvents: events.length,
                valid,
                invalid,
                integrityScore: events.length > 0 ? (valid / events.length * 100).toFixed(2) : 100,
                issues: issues.slice(0, 100) // Limitar a 100 issues
            };
        } catch (error) {
            logger.error('Error verificando integridad:', error);
            throw error;
        }
    }

    /**
     * Exporta registros de auditoría
     */
    async export(filters = {}, format = 'json') {
        try {
            const results = await this.search({ ...filters, limit: 10000 });

            switch (format) {
                case 'json':
                    return JSON.stringify(results.data, null, 2);

                case 'csv':
                    return this.convertToCSV(results.data);

                case 'xml':
                    return this.convertToXML(results.data);

                default:
                    throw new Error(`Formato no soportado: ${format}`);
            }
        } catch (error) {
            logger.error('Error exportando auditoría:', error);
            throw error;
        }
    }

    /**
     * Crea la tabla de auditoría
     */
    async createAuditTable() {
        try {
            const exists = await dbService.schema.hasTable('audit_logs');

            if (!exists) {
                await dbService.schema.createTable('audit_logs', table => {
                    table.string('id', 50).primary();
                    table.timestamp('timestamp').notNullable().index();
                    table.string('level', 20).notNullable().index();
                    table.string('category', 50).notNullable().index();
                    table.string('action', 100).notNullable().index();
                    table.text('description');
                    table.integer('user_id').index();
                    table.string('user_name', 100);
                    table.string('user_role', 50);
                    table.string('ip_address', 45);
                    table.text('user_agent');
                    table.string('resource_type', 50).index();
                    table.string('resource_id', 100).index();
                    table.json('old_value');
                    table.json('new_value');
                    table.json('metadata');
                    table.boolean('success').defaultTo(true).index();
                    table.text('error_message');
                    table.integer('duration');
                    table.string('session_id', 100);
                    table.string('correlation_id', 50).index();
                    table.string('checksum', 64);

                    // Índices compuestos
                    table.index(['resource_type', 'resource_id']);
                    table.index(['user_id', 'timestamp']);
                    table.index(['level', 'timestamp']);
                });

                logger.info('Tabla de auditoría creada exitosamente');
            }
        } catch (error) {
            logger.error('Error creando tabla de auditoría:', error);
            throw error;
        }
    }

    /**
     * Procesa la cola de eventos
     */
    async processQueue() {
        if (this.processing || this.queue.length === 0) {
            return;
        }

        this.processing = true;

        try {
            // Tomar batch de eventos
            const batch = this.queue.splice(0, this.batchSize);

            if (batch.length > 0) {
                // Insertar en base de datos
                await dbService.table('audit_logs').insert(batch);

                logger.debug(`Procesados ${batch.length} eventos de auditoría`);

                // Emitir evento
                this.emit('audit:batch_processed', batch);
            }
        } catch (error) {
            this.stats.errors++;
            logger.error('Error procesando cola de auditoría:', error);

            // Intentar guardar en archivo como respaldo
            for (const event of batch) {
                await this.saveToFile(event);
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * Inicia el procesador de cola
     */
    startQueueProcessor() {
        // Procesar cola periódicamente
        setInterval(() => {
            this.processQueue();
        }, this.flushInterval);

        // Procesar al alcanzar el tamaño del batch
        this.on('audit:logged', () => {
            if (this.queue.length >= this.batchSize) {
                this.processQueue();
            }
        });
    }

    /**
     * Limpia registros antiguos
     */
    async cleanupOldRecords() {
        try {
            const now = new Date();
            let totalDeleted = 0;

            for (const [level, days] of Object.entries(this.retentionDays)) {
                const cutoffDate = new Date(now - days * 24 * 60 * 60 * 1000);

                const deleted = await dbService.table('audit_logs')
                    .where('level', level)
                    .where('timestamp', '<', cutoffDate)
                    .delete();

                totalDeleted += deleted;
            }

            if (totalDeleted > 0) {
                logger.info(`🗑️ Limpiados ${totalDeleted} registros de auditoría antiguos`);

                await this.log({
                    level: this.LEVELS.INFO,
                    category: this.CATEGORIES.SYSTEM,
                    action: 'audit.cleanup',
                    description: `Limpiados ${totalDeleted} registros antiguos`,
                    metadata: { deletedCount: totalDeleted }
                });
            }

            return totalDeleted;
        } catch (error) {
            logger.error('Error limpiando registros antiguos:', error);
            return 0;
        }
    }

    /**
     * Programa limpieza periódica
     */
    scheduleCleanup() {
        // Limpiar diariamente a las 3 AM
        const schedule = require('node-schedule');

        schedule.scheduleJob('0 3 * * *', async () => {
            await this.cleanupOldRecords();
        });
    }

    /**
     * Verifica si un evento necesita generar alertas
     */
    async checkForAlerts(event) {
        // Alertar en eventos críticos o de seguridad
        if ([this.LEVELS.CRITICAL, this.LEVELS.SECURITY].includes(event.level)) {
            await notificationService.createNotification({
                type: notificationService.TYPES.SYSTEM_UPDATE,
                category: notificationService.CATEGORIES.ALERTS,
                priority: notificationService.PRIORITIES.HIGH,
                title: `⚠️ Evento de Auditoría ${event.level.toUpperCase()}`,
                message: event.description,
                data: {
                    eventId: event.id,
                    action: event.action,
                    userId: event.userId,
                    timestamp: event.timestamp
                }
            });
        }

        // Detectar patrones sospechosos
        if (event.category === this.CATEGORIES.SECURITY) {
            await this.detectSuspiciousPatterns(event);
        }
    }

    /**
     * Detecta patrones sospechosos
     */
    async detectSuspiciousPatterns(event) {
        // Múltiples fallos de login
        if (event.action === this.ACTIONS.LOGIN_FAILED) {
            const recentFailures = await dbService.table('audit_logs')
                .where('action', this.ACTIONS.LOGIN_FAILED)
                .where('ip_address', event.ipAddress)
                .where('timestamp', '>', new Date(Date.now() - 15 * 60 * 1000)) // Últimos 15 minutos
                .count('id as count')
                .first();

            if (recentFailures.count >= 5) {
                await this.logSecurityEvent('multiple_login_failures', {
                    description: `Múltiples intentos de login fallidos desde ${event.ipAddress}`,
                    ipAddress: event.ipAddress,
                    attempts: recentFailures.count
                });
            }
        }

        // Acceso fuera de horario
        const hour = new Date(event.timestamp).getHours();
        if (hour < 6 || hour > 23) {
            await this.log({
                level: this.LEVELS.WARNING,
                category: this.CATEGORIES.SECURITY,
                action: 'unusual_hour_access',
                description: `Acceso en horario inusual: ${hour}:00`,
                userId: event.userId,
                metadata: { hour, eventId: event.id }
            });
        }
    }

    /**
     * Helpers
     */

    generateEventId() {
        return `evt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    }

    generateCorrelationId() {
        return crypto.randomBytes(8).toString('hex');
    }

    calculateChecksum(event) {
        const data = JSON.stringify({
            id: event.id,
            timestamp: event.timestamp,
            level: event.level,
            action: event.action,
            userId: event.userId,
            resourceType: event.resourceType,
            resourceId: event.resourceId
        });

        return crypto.createHash('sha256').update(data).digest('hex');
    }

    sanitizeValue(value) {
        if (!value) return null;

        // Remover información sensible
        const sanitized = { ...value };
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '***REDACTED***';
            }
        });

        return sanitized;
    }

    detectChanges(oldValue, newValue) {
        const changes = [];

        if (!oldValue || !newValue) return changes;

        for (const key in newValue) {
            if (oldValue[key] !== newValue[key]) {
                changes.push({
                    field: key,
                    oldValue: oldValue[key],
                    newValue: newValue[key]
                });
            }
        }

        return changes;
    }

    parseChanges(event) {
        try {
            if (event.metadata) {
                const metadata = typeof event.metadata === 'string'
                    ? JSON.parse(event.metadata)
                    : event.metadata;
                return metadata.changes || [];
            }
        } catch {
            return [];
        }
        return [];
    }

    groupEvents(events, groupBy) {
        const grouped = {};

        events.forEach(event => {
            let key;
            const date = new Date(event.timestamp);

            switch (groupBy) {
                case 'hour':
                    key = date.toISOString().slice(0, 13);
                    break;
                case 'day':
                    key = date.toISOString().slice(0, 10);
                    break;
                case 'week':
                    const week = this.getWeekNumber(date);
                    key = `${date.getFullYear()}-W${week}`;
                    break;
                case 'month':
                    key = date.toISOString().slice(0, 7);
                    break;
                default:
                    key = date.toISOString().slice(0, 10);
            }

            if (!grouped[key]) {
                grouped[key] = [];
            }
            grouped[key].push(event);
        });

        return grouped;
    }

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    generateRecommendations(metrics) {
        const recommendations = [];

        if (metrics.errorRate > 5) {
            recommendations.push({
                type: 'warning',
                message: `Alta tasa de errores detectada (${metrics.errorRate}%). Revisar logs de error.`
            });
        }

        if (metrics.securityEvents > 10) {
            recommendations.push({
                type: 'security',
                message: `${metrics.securityEvents} eventos de seguridad detectados. Revisar actividad sospechosa.`
            });
        }

        if (metrics.complianceScore < 90) {
            recommendations.push({
                type: 'compliance',
                message: 'Score de compliance bajo. Asegurar que todas las acciones críticas están siendo auditadas.'
            });
        }

        return recommendations;
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csv = [
            headers.join(','),
            ...data.map(row =>
                headers.map(header => {
                    const value = row[header];
                    return typeof value === 'object' ? JSON.stringify(value) : value;
                }).join(',')
            )
        ];

        return csv.join('\n');
    }

    convertToXML(data) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<audit_logs>\n';

        for (const event of data) {
            xml += '  <event>\n';
            for (const [key, value] of Object.entries(event)) {
                const xmlValue = typeof value === 'object' ? JSON.stringify(value) : value;
                xml += `    <${key}>${this.escapeXML(xmlValue)}</${key}>\n`;
            }
            xml += '  </event>\n';
        }

        xml += '</audit_logs>';
        return xml;
    }

    escapeXML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    async saveToFile(event) {
        try {
            const logsDir = path.join(process.cwd(), 'logs', 'audit');
            await fs.mkdir(logsDir, { recursive: true });

            const filename = `audit_${new Date().toISOString().slice(0, 10)}.log`;
            const filepath = path.join(logsDir, filename);

            const logLine = JSON.stringify(event) + '\n';
            await fs.appendFile(filepath, logLine);
        } catch (error) {
            console.error('Error guardando auditoría en archivo:', error);
        }
    }

    updateStats(event) {
        this.stats.totalEvents++;
        this.stats.eventsByLevel[event.level] = (this.stats.eventsByLevel[event.level] || 0) + 1;
        this.stats.eventsByCategory[event.category] = (this.stats.eventsByCategory[event.category] || 0) + 1;
        this.stats.eventsByAction[event.action] = (this.stats.eventsByAction[event.action] || 0) + 1;
    }

    async loadConfiguration() {
        // Cargar configuración personalizada de auditoría
        // Por ahora usar valores por defecto
    }

    getStats() {
        const uptime = Date.now() - this.stats.startTime;

        return {
            ...this.stats,
            uptime: Math.floor(uptime / 1000),
            eventsPerSecond: this.stats.totalEvents / (uptime / 1000),
            queueSize: this.queue.length
        };
    }

    /**
     * Cierra el servicio
     */
    async shutdown() {
        logger.info('📝 Cerrando servicio de auditoría...');

        // Procesar eventos pendientes
        if (this.queue.length > 0) {
            await this.processQueue();
        }

        // Registrar cierre
        await this.log({
            level: this.LEVELS.INFO,
            category: this.CATEGORIES.SYSTEM,
            action: this.ACTIONS.SERVICE_STOP,
            description: 'Servicio de auditoría detenido'
        });

        logger.info('📝 Servicio de auditoría cerrado');
    }
}

// Singleton
module.exports = new AuditService();