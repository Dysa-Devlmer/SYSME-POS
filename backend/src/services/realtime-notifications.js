/**
 * Sistema de Notificaciones en Tiempo Real con WebSockets
 * Maneja todas las notificaciones del sistema con prioridades y categorías
 */

const EventEmitter = require('events');
const logger = require('../config/logger');

class RealtimeNotificationService extends EventEmitter {
    constructor() {
        super();
        this.io = null;
        this.notifications = new Map();
        this.userSockets = new Map(); // userId -> socketIds[]
        this.socketUsers = new Map(); // socketId -> userId
        this.notificationQueue = [];
        this.processingQueue = false;

        // Categorías de notificaciones
        this.CATEGORIES = {
            STOCK: 'stock',
            SALES: 'sales',
            ORDERS: 'orders',
            ALERTS: 'alerts',
            SYSTEM: 'system',
            KITCHEN: 'kitchen',
            PAYMENTS: 'payments',
            AI_PREDICTIONS: 'ai_predictions',
            PROMOTIONS: 'promotions'
        };

        // Niveles de prioridad
        this.PRIORITIES = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            INFO: 'info'
        };

        // Tipos de notificación
        this.TYPES = {
            STOCK_LOW: 'stock_low',
            STOCK_OUT: 'stock_out',
            NEW_ORDER: 'new_order',
            ORDER_READY: 'order_ready',
            PAYMENT_RECEIVED: 'payment_received',
            SYSTEM_UPDATE: 'system_update',
            AI_ALERT: 'ai_alert',
            PRICE_CHANGE: 'price_change',
            PROMOTION_ACTIVE: 'promotion_active',
            ERROR: 'error'
        };
    }

    /**
     * Inicializa el servicio con Socket.io
     */
    initialize(io) {
        this.io = io;
        this.setupSocketHandlers();
        this.startQueueProcessor();
        logger.info('🔔 Sistema de Notificaciones en Tiempo Real inicializado');
    }

    /**
     * Configura los manejadores de Socket.io
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            logger.info(`📱 Cliente conectado: ${socket.id}`);

            // Autenticación del socket
            socket.on('authenticate', async (data) => {
                try {
                    const { userId, token } = data;
                    // Aquí validarías el token JWT

                    // Registrar usuario-socket
                    this.registerUserSocket(userId, socket.id);

                    // Unir a salas específicas del usuario
                    socket.join(`user:${userId}`);
                    socket.join('broadcast'); // Para notificaciones generales

                    // Enviar notificaciones pendientes
                    await this.sendPendingNotifications(userId, socket);

                    socket.emit('authenticated', { success: true });
                    logger.info(`✅ Usuario ${userId} autenticado en socket ${socket.id}`);
                } catch (error) {
                    socket.emit('authentication_error', { error: error.message });
                    logger.error('Error en autenticación de socket:', error);
                }
            });

            // Marcar notificación como leída
            socket.on('notification:read', async (notificationId) => {
                try {
                    await this.markAsRead(notificationId);
                    socket.emit('notification:read:success', { notificationId });
                } catch (error) {
                    socket.emit('notification:read:error', { error: error.message });
                }
            });

            // Suscribirse a categorías específicas
            socket.on('subscribe', (categories) => {
                if (Array.isArray(categories)) {
                    categories.forEach(category => {
                        if (this.CATEGORIES[category.toUpperCase()]) {
                            socket.join(`category:${category}`);
                            logger.info(`Socket ${socket.id} suscrito a categoría: ${category}`);
                        }
                    });
                }
            });

            // Desconexión
            socket.on('disconnect', () => {
                this.unregisterSocket(socket.id);
                logger.info(`📴 Cliente desconectado: ${socket.id}`);
            });
        });
    }

    /**
     * Registra la relación usuario-socket
     */
    registerUserSocket(userId, socketId) {
        // Agregar socket al usuario
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, []);
        }
        const sockets = this.userSockets.get(userId);
        if (!sockets.includes(socketId)) {
            sockets.push(socketId);
        }

        // Registrar usuario del socket
        this.socketUsers.set(socketId, userId);
    }

    /**
     * Desregistra un socket
     */
    unregisterSocket(socketId) {
        const userId = this.socketUsers.get(socketId);
        if (userId) {
            const sockets = this.userSockets.get(userId);
            if (sockets) {
                const index = sockets.indexOf(socketId);
                if (index > -1) {
                    sockets.splice(index, 1);
                }
                if (sockets.length === 0) {
                    this.userSockets.delete(userId);
                }
            }
            this.socketUsers.delete(socketId);
        }
    }

    /**
     * Crea y envía una notificación
     */
    async createNotification(data) {
        try {
            const notification = {
                id: this.generateNotificationId(),
                type: data.type || this.TYPES.SYSTEM_UPDATE,
                category: data.category || this.CATEGORIES.SYSTEM,
                priority: data.priority || this.PRIORITIES.MEDIUM,
                title: data.title,
                message: data.message,
                data: data.data || {},
                userId: data.userId || null,
                role: data.role || null,
                timestamp: new Date(),
                read: false,
                actionRequired: data.actionRequired || false,
                actions: data.actions || [],
                expiresAt: data.expiresAt || null,
                persistent: data.persistent !== false // Por defecto las notificaciones son persistentes
            };

            // Guardar notificación si es persistente
            if (notification.persistent) {
                this.notifications.set(notification.id, notification);
                // Aquí también podrías guardar en base de datos
            }

            // Agregar a la cola de procesamiento
            this.notificationQueue.push(notification);

            // Procesar cola si no está siendo procesada
            if (!this.processingQueue) {
                this.processQueue();
            }

            return notification;
        } catch (error) {
            logger.error('Error creando notificación:', error);
            throw error;
        }
    }

    /**
     * Procesa la cola de notificaciones
     */
    async processQueue() {
        if (this.processingQueue || this.notificationQueue.length === 0) {
            return;
        }

        this.processingQueue = true;

        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.sendNotification(notification);
        }

        this.processingQueue = false;
    }

    /**
     * Envía una notificación
     */
    async sendNotification(notification) {
        try {
            // Determinar destinatarios
            const targets = this.determineTargets(notification);

            // Enviar a cada target
            for (const target of targets) {
                if (target.type === 'user') {
                    this.sendToUser(target.id, notification);
                } else if (target.type === 'role') {
                    this.sendToRole(target.id, notification);
                } else if (target.type === 'category') {
                    this.sendToCategory(target.id, notification);
                } else if (target.type === 'broadcast') {
                    this.broadcast(notification);
                }
            }

            // Emitir evento para otros servicios
            this.emit('notification:sent', notification);

            // Log según prioridad
            if (notification.priority === this.PRIORITIES.CRITICAL) {
                logger.warn(`🚨 Notificación CRÍTICA enviada: ${notification.title}`);
            } else {
                logger.info(`📨 Notificación enviada: ${notification.title}`);
            }
        } catch (error) {
            logger.error('Error enviando notificación:', error);
            this.emit('notification:error', { notification, error });
        }
    }

    /**
     * Determina los destinatarios de una notificación
     */
    determineTargets(notification) {
        const targets = [];

        if (notification.userId) {
            targets.push({ type: 'user', id: notification.userId });
        }

        if (notification.role) {
            targets.push({ type: 'role', id: notification.role });
        }

        if (notification.category) {
            targets.push({ type: 'category', id: notification.category });
        }

        if (!notification.userId && !notification.role && notification.category === this.CATEGORIES.SYSTEM) {
            targets.push({ type: 'broadcast', id: 'all' });
        }

        return targets;
    }

    /**
     * Envía notificación a un usuario específico
     */
    sendToUser(userId, notification) {
        const sockets = this.userSockets.get(userId);
        if (sockets && sockets.length > 0) {
            sockets.forEach(socketId => {
                this.io.to(socketId).emit('notification', notification);
            });
        }
        // Si el usuario no está conectado, la notificación queda pendiente
    }

    /**
     * Envía notificación a usuarios con un rol específico
     */
    sendToRole(role, notification) {
        this.io.to(`role:${role}`).emit('notification', notification);
    }

    /**
     * Envía notificación a una categoría
     */
    sendToCategory(category, notification) {
        this.io.to(`category:${category}`).emit('notification', notification);
    }

    /**
     * Broadcast a todos los usuarios conectados
     */
    broadcast(notification) {
        this.io.to('broadcast').emit('notification', notification);
    }

    /**
     * Envía notificaciones pendientes a un usuario
     */
    async sendPendingNotifications(userId, socket) {
        try {
            // Aquí consultarías la base de datos por notificaciones no leídas
            const pendingNotifications = Array.from(this.notifications.values())
                .filter(n => n.userId === userId && !n.read)
                .sort((a, b) => b.timestamp - a.timestamp);

            if (pendingNotifications.length > 0) {
                socket.emit('notifications:pending', pendingNotifications);
                logger.info(`📬 Enviadas ${pendingNotifications.length} notificaciones pendientes al usuario ${userId}`);
            }
        } catch (error) {
            logger.error('Error enviando notificaciones pendientes:', error);
        }
    }

    /**
     * Marca una notificación como leída
     */
    async markAsRead(notificationId) {
        const notification = this.notifications.get(notificationId);
        if (notification) {
            notification.read = true;
            notification.readAt = new Date();
            // Aquí también actualizarías en base de datos
        }
    }

    /**
     * Elimina notificaciones expiradas
     */
    cleanupExpiredNotifications() {
        const now = new Date();
        for (const [id, notification] of this.notifications.entries()) {
            if (notification.expiresAt && notification.expiresAt < now) {
                this.notifications.delete(id);
            }
        }
    }

    /**
     * Inicia el procesador de cola
     */
    startQueueProcessor() {
        // Procesar cola cada 100ms
        setInterval(() => {
            if (this.notificationQueue.length > 0 && !this.processingQueue) {
                this.processQueue();
            }
        }, 100);

        // Limpiar notificaciones expiradas cada minuto
        setInterval(() => {
            this.cleanupExpiredNotifications();
        }, 60000);
    }

    /**
     * Genera ID único para notificación
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtiene estadísticas del servicio
     */
    getStats() {
        return {
            totalNotifications: this.notifications.size,
            pendingQueue: this.notificationQueue.length,
            connectedUsers: this.userSockets.size,
            activeSockets: this.socketUsers.size
        };
    }
}

// Singleton
const notificationService = new RealtimeNotificationService();

module.exports = notificationService;