// core/notification-system.cjs
// Sistema de Notificaciones Push para JARVIS v2.0

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

/**
 * Sistema de Notificaciones Push
 *
 * Características:
 * - Notificaciones push del navegador
 * - Centro de notificaciones in-app
 * - Sistema de prioridades (info/success/warning/error)
 * - Persistencia en SQLite
 * - Preferencias configurables
 * - Auto-limpieza de notificaciones antiguas
 */
class NotificationSystem extends EventEmitter {
  constructor(options = {}) {
    super();

    this.projectRoot = options.projectRoot || process.cwd();
    this.metricsPersistence = options.metricsPersistence;

    // Configuración
    this.config = {
      maxNotifications: options.maxNotifications || 100,
      retentionDays: options.retentionDays || 30,
      priorities: {
        info: { level: 1, color: 'blue', icon: 'ℹ️' },
        success: { level: 2, color: 'green', icon: '✅' },
        warning: { level: 3, color: 'yellow', icon: '⚠️' },
        error: { level: 4, color: 'red', icon: '❌' },
        critical: { level: 5, color: 'red', icon: '🚨' }
      }
    };

    // Estado
    this.notifications = [];
    this.preferences = this.loadPreferences();
    this.isInitialized = false;
  }

  /**
   * Inicializa el sistema de notificaciones
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔔 [Notifications] Inicializando sistema...');

    // Crear tabla de notificaciones si no existe
    if (this.metricsPersistence) {
      this.createNotificationsTable();
      await this.loadRecentNotifications();
    }

    this.isInitialized = true;
    console.log('✅ [Notifications] Sistema listo');
  }

  /**
   * Crea la tabla de notificaciones en SQLite
   */
  createNotificationsTable() {
    const db = this.metricsPersistence.db;

    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        priority TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        read INTEGER DEFAULT 0,
        dismissed INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
      );

      CREATE INDEX IF NOT EXISTS idx_notifications_timestamp
        ON notifications(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_priority
        ON notifications(priority);
      CREATE INDEX IF NOT EXISTS idx_notifications_read
        ON notifications(read);
    `);

    console.log('✅ [Notifications] Tabla creada/verificada');
  }

  /**
   * Carga notificaciones recientes desde la base de datos
   */
  async loadRecentNotifications() {
    const db = this.metricsPersistence.db;

    try {
      const notifications = db.prepare(`
        SELECT * FROM notifications
        WHERE dismissed = 0
        ORDER BY timestamp DESC
        LIMIT ?
      `).all(this.config.maxNotifications);

      this.notifications = notifications.map(n => ({
        id: n.id,
        timestamp: n.timestamp,
        priority: n.priority,
        category: n.category,
        title: n.title,
        message: n.message,
        data: n.data ? JSON.parse(n.data) : null,
        read: Boolean(n.read),
        dismissed: Boolean(n.dismissed)
      }));

      console.log(`📋 [Notifications] Cargadas ${this.notifications.length} notificaciones`);
    } catch (error) {
      console.error('❌ [Notifications] Error cargando notificaciones:', error);
      this.notifications = [];
    }
  }

  /**
   * Envía una nueva notificación
   *
   * @param {Object} notification
   * @param {string} notification.priority - info/success/warning/error/critical
   * @param {string} notification.category - task/system/maintenance/learning/etc
   * @param {string} notification.title - Título de la notificación
   * @param {string} notification.message - Mensaje descriptivo
   * @param {Object} notification.data - Datos adicionales opcionales
   * @param {boolean} notification.push - Enviar push notification (default: true)
   */
  async notify({ priority = 'info', category, title, message, data = null, push = true }) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Verificar si las notificaciones están habilitadas para esta categoría/prioridad
    if (!this.shouldNotify(priority, category)) {
      console.log(`🔕 [Notifications] Notificación bloqueada por preferencias: ${title}`);
      return null;
    }

    const notification = {
      timestamp: Date.now(),
      priority,
      category,
      title,
      message,
      data,
      read: false,
      dismissed: false
    };

    // Guardar en base de datos
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      const result = db.prepare(`
        INSERT INTO notifications (timestamp, priority, category, title, message, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        notification.timestamp,
        notification.priority,
        notification.category,
        notification.title,
        notification.message,
        notification.data ? JSON.stringify(notification.data) : null
      );

      notification.id = result.lastInsertRowid;
    } else {
      notification.id = Date.now();
    }

    // Agregar a memoria
    this.notifications.unshift(notification);
    if (this.notifications.length > this.config.maxNotifications) {
      this.notifications.pop();
    }

    // Emitir evento
    this.emit('notification', notification);

    // Log
    const icon = this.config.priorities[priority]?.icon || '🔔';
    console.log(`${icon} [Notification] ${title}: ${message}`);

    return notification;
  }

  /**
   * Verifica si debe notificar según preferencias
   */
  shouldNotify(priority, category) {
    // Si no hay preferencias, notificar todo
    if (!this.preferences) return true;

    // Verificar si la categoría está habilitada
    if (this.preferences.categories && this.preferences.categories[category] === false) {
      return false;
    }

    // Verificar nivel mínimo de prioridad
    if (this.preferences.minPriority) {
      const currentLevel = this.config.priorities[priority]?.level || 1;
      const minLevel = this.config.priorities[this.preferences.minPriority]?.level || 1;
      if (currentLevel < minLevel) {
        return false;
      }
    }

    return true;
  }

  /**
   * Marca una notificación como leída
   */
  markAsRead(notificationId) {
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(notificationId);
    }

    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.emit('notification:read', notification);
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead() {
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare('UPDATE notifications SET read = 1 WHERE read = 0').run();
    }

    this.notifications.forEach(n => n.read = true);
    this.emit('notifications:all-read');
  }

  /**
   * Descarta una notificación
   */
  dismiss(notificationId) {
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare('UPDATE notifications SET dismissed = 1 WHERE id = ?').run(notificationId);
    }

    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications[index];
      notification.dismissed = true;
      this.notifications.splice(index, 1);
      this.emit('notification:dismissed', notification);
    }
  }

  /**
   * Descarta todas las notificaciones
   */
  dismissAll() {
    if (this.metricsPersistence) {
      const db = this.metricsPersistence.db;
      db.prepare('UPDATE notifications SET dismissed = 1 WHERE dismissed = 0').run();
    }

    this.notifications = [];
    this.emit('notifications:all-dismissed');
  }

  /**
   * Obtiene todas las notificaciones activas
   */
  getNotifications(options = {}) {
    let notifications = [...this.notifications];

    // Filtrar por leídas/no leídas
    if (options.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    // Filtrar por prioridad
    if (options.priority) {
      notifications = notifications.filter(n => n.priority === options.priority);
    }

    // Filtrar por categoría
    if (options.category) {
      notifications = notifications.filter(n => n.category === options.category);
    }

    // Limitar cantidad
    if (options.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  getStats() {
    const total = this.notifications.length;
    const unread = this.notifications.filter(n => !n.read).length;

    const byPriority = {};
    const byCategory = {};

    this.notifications.forEach(n => {
      byPriority[n.priority] = (byPriority[n.priority] || 0) + 1;
      byCategory[n.category] = (byCategory[n.category] || 0) + 1;
    });

    return {
      total,
      unread,
      read: total - unread,
      byPriority,
      byCategory
    };
  }

  /**
   * Limpia notificaciones antiguas
   */
  async cleanOldNotifications() {
    if (!this.metricsPersistence) return;

    const db = this.metricsPersistence.db;
    const cutoffTime = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

    const result = db.prepare(`
      DELETE FROM notifications
      WHERE timestamp < ? AND dismissed = 1
    `).run(cutoffTime);

    console.log(`🧹 [Notifications] Eliminadas ${result.changes} notificaciones antiguas`);
    return result.changes;
  }

  /**
   * Carga preferencias del usuario
   */
  loadPreferences() {
    const prefsPath = path.join(this.projectRoot, 'memory', 'notification-preferences.json');

    try {
      if (fs.existsSync(prefsPath)) {
        const data = fs.readFileSync(prefsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ [Notifications] Error cargando preferencias:', error);
    }

    // Preferencias por defecto
    return {
      enabled: true,
      pushEnabled: true,
      minPriority: 'info',
      categories: {
        task: true,
        system: true,
        maintenance: true,
        learning: true,
        error: true
      }
    };
  }

  /**
   * Guarda preferencias del usuario
   */
  savePreferences(preferences) {
    const prefsPath = path.join(this.projectRoot, 'memory', 'notification-preferences.json');

    try {
      const memoryDir = path.join(this.projectRoot, 'memory');
      if (!fs.existsSync(memoryDir)) {
        fs.mkdirSync(memoryDir, { recursive: true });
      }

      fs.writeFileSync(prefsPath, JSON.stringify(preferences, null, 2));
      this.preferences = preferences;

      console.log('✅ [Notifications] Preferencias guardadas');
      this.emit('preferences:updated', preferences);
    } catch (error) {
      console.error('❌ [Notifications] Error guardando preferencias:', error);
    }
  }

  /**
   * Actualiza preferencias
   */
  updatePreferences(updates) {
    this.preferences = {
      ...this.preferences,
      ...updates
    };
    this.savePreferences(this.preferences);
  }

  /**
   * Obtiene preferencias actuales
   */
  getPreferences() {
    return { ...this.preferences };
  }
}

module.exports = NotificationSystem;
