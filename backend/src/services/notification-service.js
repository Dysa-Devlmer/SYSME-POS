// SYSME Real-time Notification Service
// Sistema de notificaciones en tiempo real para restaurante

const EventEmitter = require('events');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map(); // Conexiones activas por usuario/role
    this.notificationQueue = new Map(); // Cola de notificaciones pendientes
    this.notificationHistory = []; // Historial de notificaciones
    this.maxHistorySize = 1000;
  }

  // === GESTIÓN DE CONEXIONES ===
  addConnection(socketId, userId, userRole, userName) {
    this.connections.set(socketId, {
      userId,
      userRole,
      userName,
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    console.log(`🔔 Usuario conectado: ${userName} (${userRole}) - Socket: ${socketId}`);

    // Enviar notificaciones pendientes
    this.sendPendingNotifications(socketId, userId);
  }

  removeConnection(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      console.log(`📴 Usuario desconectado: ${connection.userName} - Socket: ${socketId}`);
      this.connections.delete(socketId);
    }
  }

  updateActivity(socketId) {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  // === TIPOS DE NOTIFICACIONES ===

  // Notificaciones de órdenes
  async notifyNewOrder(orderData, io) {
    const notification = {
      id: this.generateId(),
      type: 'new_order',
      title: '🆕 Nueva Orden',
      message: `Orden #${orderData.id} - Mesa ${orderData.table_number}`,
      data: orderData,
      priority: 'high',
      targetRoles: ['kitchen', 'manager', 'admin'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      actions: [
        { id: 'view', label: 'Ver Orden', icon: '👁️' },
        { id: 'accept', label: 'Aceptar', icon: '✅' }
      ]
    };

    await this.sendNotification(notification, io);

    // Sonido especial para cocina
    await this.playNotificationSound('kitchen', 'new_order');
  }

  async notifyOrderReady(orderData, io) {
    const notification = {
      id: this.generateId(),
      type: 'order_ready',
      title: '🍽️ Orden Lista',
      message: `Orden #${orderData.id} lista para servir`,
      data: orderData,
      priority: 'high',
      targetRoles: ['waiter', 'manager'],
      targetUsers: [orderData.waiter_id],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutos
      actions: [
        { id: 'delivered', label: 'Marcar Entregado', icon: '✅' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  async notifyOrderDelayed(orderData, io) {
    const notification = {
      id: this.generateId(),
      type: 'order_delayed',
      title: '⏰ Orden Retrasada',
      message: `Orden #${orderData.id} lleva ${orderData.delayMinutes} min de retraso`,
      data: orderData,
      priority: 'medium',
      targetRoles: ['manager', 'admin'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      actions: [
        { id: 'check_kitchen', label: 'Revisar Cocina', icon: '🍳' },
        { id: 'notify_customer', label: 'Informar Cliente', icon: '💬' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  // Notificaciones de inventario
  async notifyLowStock(productData, io) {
    const notification = {
      id: this.generateId(),
      type: 'low_stock',
      title: '📦 Stock Bajo',
      message: `${productData.name}: solo ${productData.currentStock} unidades`,
      data: productData,
      priority: 'medium',
      targetRoles: ['manager', 'admin', 'inventory'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      actions: [
        { id: 'reorder', label: 'Reordenar', icon: '🛒' },
        { id: 'adjust_stock', label: 'Ajustar Stock', icon: '📝' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  async notifyStockOut(productData, io) {
    const notification = {
      id: this.generateId(),
      type: 'stock_out',
      title: '🚨 Sin Stock',
      message: `${productData.name} se ha agotado`,
      data: productData,
      priority: 'critical',
      targetRoles: ['kitchen', 'manager', 'admin'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
      actions: [
        { id: 'mark_unavailable', label: 'Marcar No Disponible', icon: '❌' },
        { id: 'emergency_reorder', label: 'Pedido Urgente', icon: '🚨' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  // Notificaciones del sistema
  async notifySystemAlert(alertData, io) {
    const notification = {
      id: this.generateId(),
      type: 'system_alert',
      title: '⚠️ Alerta del Sistema',
      message: alertData.message,
      data: alertData,
      priority: alertData.severity || 'medium',
      targetRoles: ['admin', 'manager'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
      actions: [
        { id: 'investigate', label: 'Investigar', icon: '🔍' },
        { id: 'dismiss', label: 'Descartar', icon: '✖️' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  // Notificaciones de caja
  async notifyPaymentReceived(paymentData, io) {
    const notification = {
      id: this.generateId(),
      type: 'payment_received',
      title: '💰 Pago Recibido',
      message: `$${paymentData.amount} - ${paymentData.method}`,
      data: paymentData,
      priority: 'low',
      targetRoles: ['cashier', 'manager'],
      targetUsers: [paymentData.cashier_id],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
      actions: [
        { id: 'print_receipt', label: 'Imprimir Recibo', icon: '🖨️' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  async notifyShiftChange(shiftData, io) {
    const notification = {
      id: this.generateId(),
      type: 'shift_change',
      title: '🔄 Cambio de Turno',
      message: `${shiftData.outgoingUser} → ${shiftData.incomingUser}`,
      data: shiftData,
      priority: 'medium',
      targetRoles: ['all'],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      actions: [
        { id: 'view_handover', label: 'Ver Entrega', icon: '📋' }
      ]
    };

    await this.sendNotification(notification, io);
  }

  // === ENVÍO DE NOTIFICACIONES ===
  async sendNotification(notification, io) {
    try {
      // Agregar al historial
      this.addToHistory(notification);

      // Determinar destinatarios
      const recipients = this.getRecipients(notification);

      // Enviar a conexiones activas
      recipients.active.forEach(socketId => {
        io.to(socketId).emit('notification', notification);
        this.updateActivity(socketId);
      });

      // Encolar para usuarios desconectados
      recipients.offline.forEach(userId => {
        this.addToQueue(userId, notification);
      });

      // Log de notificación
      console.log(`🔔 Notificación enviada: ${notification.type} - ${recipients.active.length} activos, ${recipients.offline.length} offline`);

      // Emitir evento para otros servicios
      this.emit('notification_sent', notification, recipients);

      return { success: true, recipients: recipients.active.length };
    } catch (error) {
      console.error('❌ Error enviando notificación:', error);
      return { success: false, error: error.message };
    }
  }

  getRecipients(notification) {
    const activeRecipients = [];
    const offlineUsers = new Set();

    for (const [socketId, connection] of this.connections) {
      const shouldReceive = this.shouldReceiveNotification(notification, connection);

      if (shouldReceive) {
        activeRecipients.push(socketId);
      }
    }

    // Verificar usuarios específicos que no están activos
    if (notification.targetUsers) {
      notification.targetUsers.forEach(userId => {
        const isActive = Array.from(this.connections.values())
          .some(conn => conn.userId === userId);

        if (!isActive) {
          offlineUsers.add(userId);
        }
      });
    }

    return {
      active: activeRecipients,
      offline: Array.from(offlineUsers)
    };
  }

  shouldReceiveNotification(notification, connection) {
    // Verificar roles específicos
    if (notification.targetRoles) {
      if (!notification.targetRoles.includes('all') &&
          !notification.targetRoles.includes(connection.userRole)) {
        return false;
      }
    }

    // Verificar usuarios específicos
    if (notification.targetUsers) {
      if (!notification.targetUsers.includes(connection.userId)) {
        return false;
      }
    }

    // Verificar si no está expirada
    if (notification.expiresAt && new Date() > notification.expiresAt) {
      return false;
    }

    return true;
  }

  // === GESTIÓN DE COLA ===
  addToQueue(userId, notification) {
    if (!this.notificationQueue.has(userId)) {
      this.notificationQueue.set(userId, []);
    }

    const userQueue = this.notificationQueue.get(userId);
    userQueue.push(notification);

    // Limitar tamaño de cola
    if (userQueue.length > 50) {
      userQueue.shift(); // Remover la más antigua
    }
  }

  sendPendingNotifications(socketId, userId) {
    const userQueue = this.notificationQueue.get(userId);
    if (!userQueue || userQueue.length === 0) return;

    // Enviar notificaciones pendientes
    userQueue.forEach(notification => {
      if (!notification.expiresAt || new Date() < notification.expiresAt) {
        // TODO: Enviar via socket
        console.log(`📧 Enviando notificación pendiente a ${userId}:`, notification.title);
      }
    });

    // Limpiar cola
    this.notificationQueue.delete(userId);
  }

  // === HISTORIAL ===
  addToHistory(notification) {
    this.notificationHistory.unshift(notification);

    // Mantener tamaño del historial
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
    }
  }

  getHistory(userId, userRole, limit = 50) {
    return this.notificationHistory
      .filter(notification => this.shouldReceiveNotification(notification, { userId, userRole }))
      .slice(0, limit);
  }

  // === ACCIONES DE NOTIFICACIONES ===
  async handleNotificationAction(notificationId, actionId, userId, io) {
    const notification = this.notificationHistory.find(n => n.id === notificationId);
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) {
      throw new Error('Acción no válida');
    }

    // Procesar acción según el tipo
    const result = await this.processAction(notification, action, userId);

    // Enviar actualización
    if (result.shouldNotify) {
      await this.sendNotification(result.notification, io);
    }

    return result;
  }

  async processAction(notification, action, userId) {
    switch (action.id) {
      case 'accept':
        return { success: true, message: 'Orden aceptada' };

      case 'delivered':
        return { success: true, message: 'Orden marcada como entregada' };

      case 'reorder':
        return {
          success: true,
          message: 'Solicitud de reorden enviada',
          shouldNotify: true,
          notification: {
            id: this.generateId(),
            type: 'reorder_request',
            title: '🛒 Solicitud de Reorden',
            message: `Reorden solicitada para ${notification.data.name}`,
            targetRoles: ['admin', 'purchasing']
          }
        };

      case 'dismiss':
        return { success: true, message: 'Notificación descartada' };

      default:
        return { success: true, message: 'Acción procesada' };
    }
  }

  // === SONIDOS DE NOTIFICACIÓN ===
  async playNotificationSound(role, notificationType) {
    // Esta función se puede extender para enviar comandos de sonido específicos
    const soundConfig = {
      kitchen: {
        new_order: 'kitchen_bell_urgent.mp3',
        order_update: 'kitchen_beep.mp3'
      },
      waiter: {
        order_ready: 'service_chime.mp3',
        table_call: 'table_bell.mp3'
      },
      manager: {
        alert: 'manager_notification.mp3',
        critical: 'urgent_alert.mp3'
      }
    };

    const soundFile = soundConfig[role]?.[notificationType];
    if (soundFile) {
      console.log(`🔊 Reproduciendo sonido: ${soundFile} para rol: ${role}`);
      // Aquí se puede implementar la lógica para reproducir sonidos
    }
  }

  // === UTILIDADES ===
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getActiveConnections() {
    return Array.from(this.connections.entries()).map(([socketId, connection]) => ({
      socketId,
      ...connection
    }));
  }

  getStatistics() {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const todaysNotifications = this.notificationHistory.filter(
      n => n.createdAt > dayAgo
    );

    return {
      activeConnections: this.connections.size,
      totalNotifications: this.notificationHistory.length,
      todaysNotifications: todaysNotifications.length,
      pendingQueues: this.notificationQueue.size,
      notificationsByType: this.getNotificationsByType(todaysNotifications),
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  getNotificationsByType(notifications) {
    const byType = {};
    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    return byType;
  }

  calculateAverageResponseTime() {
    // Placeholder - implementar cálculo real de tiempo de respuesta
    return '2.3s';
  }
}

module.exports = NotificationService;