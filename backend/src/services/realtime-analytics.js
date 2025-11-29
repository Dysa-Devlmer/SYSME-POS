/**
 * Servicio de Analytics en Tiempo Real
 * Gestiona WebSocket para métricas en vivo
 */

const EventEmitter = require('events');
const cacheManager = require('./cache-manager');
const db = require('../config/database');
const moment = require('moment');

class RealtimeAnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.updateIntervals = new Map();
    this.metrics = {
      sales: { total: 0, transactions: 0, lastUpdate: Date.now() },
      inventory: { movements: 0, alerts: 0, lastUpdate: Date.now() },
      customers: { active: 0, new: 0, lastUpdate: Date.now() },
      performance: { cpu: 0, memory: 0, requests: 0, lastUpdate: Date.now() }
    };

    // Configuración de intervalos de actualización (en ms)
    this.UPDATE_FREQUENCIES = {
      sales: 5000,        // 5 segundos
      inventory: 10000,   // 10 segundos
      customers: 15000,   // 15 segundos
      performance: 3000,  // 3 segundos
      kpis: 30000,       // 30 segundos
      alerts: 1000       // 1 segundo para alertas críticas
    };

    // Umbrales para alertas
    this.ALERT_THRESHOLDS = {
      lowStock: 10,
      highTransaction: 100,
      errorRate: 5,
      responseTime: 1000,
      cpuUsage: 80,
      memoryUsage: 90
    };

    this.initialize();
  }

  /**
   * Inicializa el servicio
   */
  initialize() {
    console.log('🚀 Iniciando servicio de analytics en tiempo real');

    // Iniciar actualizaciones periódicas
    this.startMetricsUpdates();

    // Escuchar eventos del sistema
    this.setupSystemEventListeners();

    // Limpiar conexiones inactivas cada minuto
    setInterval(() => this.cleanupInactiveConnections(), 60000);
  }

  /**
   * Maneja nueva conexión WebSocket
   */
  handleConnection(ws, userId) {
    const connectionId = this.generateConnectionId();

    // Guardar conexión
    this.connections.set(connectionId, {
      ws,
      userId,
      subscriptions: new Set(),
      lastActivity: Date.now()
    });

    console.log(`✅ Nueva conexión de analytics: ${connectionId} (Usuario: ${userId})`);

    // Configurar event listeners
    ws.on('message', (message) => this.handleMessage(connectionId, message));
    ws.on('close', () => this.handleDisconnection(connectionId));
    ws.on('error', (error) => this.handleError(connectionId, error));

    // Enviar métricas iniciales
    this.sendInitialMetrics(connectionId);

    return connectionId;
  }

  /**
   * Maneja mensajes del cliente
   */
  handleMessage(connectionId, message) {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) return;

      const data = JSON.parse(message);
      connection.lastActivity = Date.now();

      switch (data.type) {
        case 'subscribe':
          this.handleSubscription(connectionId, data.metrics);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(connectionId, data.metrics);
          break;

        case 'ping':
          this.sendToConnection(connectionId, { type: 'pong' });
          break;

        case 'request':
          this.handleMetricRequest(connectionId, data.metric, data.params);
          break;

        case 'alert_ack':
          this.acknowledgeAlert(connectionId, data.alertId);
          break;

        default:
          console.warn(`Tipo de mensaje desconocido: ${data.type}`);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      this.sendError(connectionId, 'Error procesando mensaje');
    }
  }

  /**
   * Maneja suscripciones a métricas
   */
  handleSubscription(connectionId, metrics) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Agregar suscripciones
    metrics.forEach(metric => {
      connection.subscriptions.add(metric);

      // Iniciar actualización específica si no existe
      if (!this.updateIntervals.has(metric)) {
        this.startMetricUpdate(metric);
      }
    });

    // Confirmar suscripción
    this.sendToConnection(connectionId, {
      type: 'subscription_confirmed',
      metrics
    });

    console.log(`📊 Suscripción a métricas: ${metrics.join(', ')}`);
  }

  /**
   * Maneja desuscripciones
   */
  handleUnsubscription(connectionId, metrics) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    metrics.forEach(metric => {
      connection.subscriptions.delete(metric);
    });

    // Verificar si alguna conexión sigue suscrita
    metrics.forEach(metric => {
      if (!this.hasSubscribers(metric)) {
        this.stopMetricUpdate(metric);
      }
    });
  }

  /**
   * Inicia actualizaciones de métricas
   */
  startMetricsUpdates() {
    // Actualización de ventas
    this.updateIntervals.set('sales', setInterval(async () => {
      await this.updateSalesMetrics();
    }, this.UPDATE_FREQUENCIES.sales));

    // Actualización de rendimiento
    this.updateIntervals.set('performance', setInterval(async () => {
      await this.updatePerformanceMetrics();
    }, this.UPDATE_FREQUENCIES.performance));

    // Verificación de alertas
    this.updateIntervals.set('alerts', setInterval(async () => {
      await this.checkAlerts();
    }, this.UPDATE_FREQUENCIES.alerts));
  }

  /**
   * Actualiza métricas de ventas
   */
  async updateSalesMetrics() {
    try {
      // Obtener ventas de los últimos 5 minutos
      const recentSales = await db('sales')
        .select(
          db.raw('COUNT(*) as count'),
          db.raw('SUM(total) as total')
        )
        .where('created_at', '>=', moment().subtract(5, 'minutes').toDate())
        .first();

      // Obtener ventas del día
      const todaySales = await db('sales')
        .select(
          db.raw('COUNT(*) as count'),
          db.raw('SUM(total) as total')
        )
        .where('created_at', '>=', moment().startOf('day').toDate())
        .first();

      // Calcular tendencia
      const previousHourSales = await db('sales')
        .sum('total as total')
        .where('created_at', '>=', moment().subtract(2, 'hours').toDate())
        .where('created_at', '<', moment().subtract(1, 'hour').toDate())
        .first();

      const currentHourSales = await db('sales')
        .sum('total as total')
        .where('created_at', '>=', moment().subtract(1, 'hour').toDate())
        .first();

      const trend = this.calculateTrend(
        previousHourSales.total || 0,
        currentHourSales.total || 0
      );

      const metrics = {
        recent: {
          transactions: recentSales.count || 0,
          total: recentSales.total || 0
        },
        today: {
          transactions: todaySales.count || 0,
          total: todaySales.total || 0
        },
        trend,
        timestamp: Date.now()
      };

      // Actualizar caché local
      this.metrics.sales = metrics;

      // Broadcast a suscriptores
      this.broadcastToSubscribers('sales', {
        type: 'metric_update',
        metric: 'sales',
        data: metrics
      });
    } catch (error) {
      console.error('Error actualizando métricas de ventas:', error);
    }
  }

  /**
   * Actualiza métricas de rendimiento
   */
  async updatePerformanceMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const metrics = {
        memory: {
          used: Math.round(memUsage.heapUsed / 1024 / 1024),
          total: Math.round(memUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
          percentage: Math.min(100, Math.round((cpuUsage.user + cpuUsage.system) / 1000000))
        },
        uptime: process.uptime(),
        timestamp: Date.now()
      };

      // Verificar umbrales
      if (metrics.memory.percentage > this.ALERT_THRESHOLDS.memoryUsage) {
        this.triggerAlert('high_memory_usage', metrics.memory);
      }

      if (metrics.cpu.percentage > this.ALERT_THRESHOLDS.cpuUsage) {
        this.triggerAlert('high_cpu_usage', metrics.cpu);
      }

      // Actualizar caché local
      this.metrics.performance = metrics;

      // Broadcast a suscriptores
      this.broadcastToSubscribers('performance', {
        type: 'metric_update',
        metric: 'performance',
        data: metrics
      });
    } catch (error) {
      console.error('Error actualizando métricas de rendimiento:', error);
    }
  }

  /**
   * Verifica y genera alertas
   */
  async checkAlerts() {
    try {
      const alerts = [];

      // Verificar stock bajo
      const lowStockProducts = await db('products')
        .select('id', 'name', 'stock', 'min_stock')
        .where('stock', '<=', db.raw('min_stock'))
        .limit(10);

      if (lowStockProducts.length > 0) {
        alerts.push({
          id: `low_stock_${Date.now()}`,
          type: 'low_stock',
          severity: 'warning',
          message: `${lowStockProducts.length} productos con stock bajo`,
          data: lowStockProducts,
          timestamp: Date.now()
        });
      }

      // Verificar productos vencidos o próximos a vencer
      const expiringProducts = await db('products')
        .select('id', 'name', 'expiry_date')
        .where('expiry_date', '<=', moment().add(7, 'days').toDate())
        .where('expiry_date', '>', new Date())
        .limit(10);

      if (expiringProducts.length > 0) {
        alerts.push({
          id: `expiring_products_${Date.now()}`,
          type: 'expiring_products',
          severity: 'warning',
          message: `${expiringProducts.length} productos próximos a vencer`,
          data: expiringProducts,
          timestamp: Date.now()
        });
      }

      // Broadcast alertas
      if (alerts.length > 0) {
        this.broadcastToAll({
          type: 'alerts',
          data: alerts
        });
      }
    } catch (error) {
      console.error('Error verificando alertas:', error);
    }
  }

  /**
   * Dispara una alerta específica
   */
  triggerAlert(type, data) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity: this.getAlertSeverity(type),
      message: this.getAlertMessage(type, data),
      data,
      timestamp: Date.now(),
      acknowledged: false
    };

    // Emitir evento
    this.emit('alert', alert);

    // Broadcast a todas las conexiones
    this.broadcastToAll({
      type: 'alert',
      data: alert
    });

    console.log(`🚨 Alerta disparada: ${alert.message}`);
  }

  /**
   * Obtiene severidad de alerta
   */
  getAlertSeverity(type) {
    const severityMap = {
      high_memory_usage: 'critical',
      high_cpu_usage: 'critical',
      low_stock: 'warning',
      expiring_products: 'warning',
      high_error_rate: 'critical',
      slow_response: 'warning'
    };

    return severityMap[type] || 'info';
  }

  /**
   * Obtiene mensaje de alerta
   */
  getAlertMessage(type, data) {
    const messages = {
      high_memory_usage: `Uso de memoria alto: ${data.percentage}%`,
      high_cpu_usage: `Uso de CPU alto: ${data.percentage}%`,
      low_stock: 'Productos con stock bajo detectados',
      expiring_products: 'Productos próximos a vencer',
      high_error_rate: 'Tasa de errores elevada',
      slow_response: 'Tiempo de respuesta lento detectado'
    };

    return messages[type] || 'Alerta del sistema';
  }

  /**
   * Envía métricas iniciales a nueva conexión
   */
  sendInitialMetrics(connectionId) {
    const initialData = {
      type: 'initial_metrics',
      data: {
        sales: this.metrics.sales,
        performance: this.metrics.performance,
        timestamp: Date.now()
      }
    };

    this.sendToConnection(connectionId, initialData);
  }

  /**
   * Broadcast a suscriptores de una métrica específica
   */
  broadcastToSubscribers(metric, data) {
    let count = 0;

    this.connections.forEach((connection, connectionId) => {
      if (connection.subscriptions.has(metric)) {
        this.sendToConnection(connectionId, data);
        count++;
      }
    });

    if (count > 0) {
      console.log(`📡 Broadcast de ${metric} a ${count} suscriptores`);
    }
  }

  /**
   * Broadcast a todas las conexiones
   */
  broadcastToAll(data) {
    let count = 0;

    this.connections.forEach((connection, connectionId) => {
      this.sendToConnection(connectionId, data);
      count++;
    });

    console.log(`📡 Broadcast general a ${count} conexiones`);
  }

  /**
   * Envía datos a una conexión específica
   */
  sendToConnection(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.ws.readyState !== 1) return;

    try {
      connection.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`Error enviando a conexión ${connectionId}:`, error);
      this.handleDisconnection(connectionId);
    }
  }

  /**
   * Envía error a conexión
   */
  sendError(connectionId, message) {
    this.sendToConnection(connectionId, {
      type: 'error',
      message,
      timestamp: Date.now()
    });
  }

  /**
   * Maneja desconexión
   */
  handleDisconnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    console.log(`❌ Desconexión de analytics: ${connectionId}`);

    // Limpiar suscripciones
    connection.subscriptions.forEach(metric => {
      if (!this.hasSubscribers(metric)) {
        this.stopMetricUpdate(metric);
      }
    });

    // Eliminar conexión
    this.connections.delete(connectionId);
  }

  /**
   * Maneja errores de conexión
   */
  handleError(connectionId, error) {
    console.error(`Error en conexión ${connectionId}:`, error);
    this.handleDisconnection(connectionId);
  }

  /**
   * Limpia conexiones inactivas
   */
  cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutos

    this.connections.forEach((connection, connectionId) => {
      if (now - connection.lastActivity > timeout) {
        console.log(`🧹 Limpiando conexión inactiva: ${connectionId}`);
        this.handleDisconnection(connectionId);
      }
    });
  }

  /**
   * Verifica si hay suscriptores para una métrica
   */
  hasSubscribers(metric) {
    for (const [, connection] of this.connections) {
      if (connection.subscriptions.has(metric)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Inicia actualización de métrica específica
   */
  startMetricUpdate(metric) {
    if (this.updateIntervals.has(metric)) return;

    const frequency = this.UPDATE_FREQUENCIES[metric] || 10000;

    const interval = setInterval(async () => {
      await this.updateMetric(metric);
    }, frequency);

    this.updateIntervals.set(metric, interval);
    console.log(`▶️ Iniciada actualización de ${metric} cada ${frequency}ms`);
  }

  /**
   * Detiene actualización de métrica
   */
  stopMetricUpdate(metric) {
    const interval = this.updateIntervals.get(metric);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(metric);
      console.log(`⏹️ Detenida actualización de ${metric}`);
    }
  }

  /**
   * Actualiza métrica específica
   */
  async updateMetric(metric) {
    try {
      switch (metric) {
        case 'inventory':
          await this.updateInventoryMetrics();
          break;

        case 'customers':
          await this.updateCustomerMetrics();
          break;

        case 'kpis':
          await this.updateKPIMetrics();
          break;

        default:
          console.warn(`Métrica no implementada: ${metric}`);
      }
    } catch (error) {
      console.error(`Error actualizando métrica ${metric}:`, error);
    }
  }

  /**
   * Actualiza métricas de inventario
   */
  async updateInventoryMetrics() {
    // Implementación específica de inventario
    const metrics = {
      totalProducts: await db('products').count('id as count').first(),
      lowStock: await db('products')
        .where('stock', '<=', db.raw('min_stock'))
        .count('id as count')
        .first(),
      movements: await db('stock_movements')
        .where('created_at', '>=', moment().subtract(1, 'hour').toDate())
        .count('id as count')
        .first(),
      timestamp: Date.now()
    };

    this.metrics.inventory = metrics;

    this.broadcastToSubscribers('inventory', {
      type: 'metric_update',
      metric: 'inventory',
      data: metrics
    });
  }

  /**
   * Actualiza métricas de clientes
   */
  async updateCustomerMetrics() {
    const metrics = {
      activeNow: await db('user_sessions')
        .where('last_activity', '>=', moment().subtract(5, 'minutes').toDate())
        .count('id as count')
        .first(),
      newToday: await db('customers')
        .where('created_at', '>=', moment().startOf('day').toDate())
        .count('id as count')
        .first(),
      timestamp: Date.now()
    };

    this.metrics.customers = metrics;

    this.broadcastToSubscribers('customers', {
      type: 'metric_update',
      metric: 'customers',
      data: metrics
    });
  }

  /**
   * Actualiza KPIs
   */
  async updateKPIMetrics() {
    // Implementación de KPIs en tiempo real
    // Por ahora retorna datos de ejemplo
    const kpis = [
      { id: 'sales_target', value: Math.random() * 100000, target: 100000 },
      { id: 'conversion_rate', value: Math.random() * 100, target: 70 },
      { id: 'customer_satisfaction', value: Math.random() * 100, target: 85 }
    ];

    this.broadcastToSubscribers('kpis', {
      type: 'metric_update',
      metric: 'kpis',
      data: kpis
    });
  }

  /**
   * Calcula tendencia
   */
  calculateTrend(previous, current) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Genera ID de conexión único
   */
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Configura listeners de eventos del sistema
   */
  setupSystemEventListeners() {
    // Escuchar eventos de ventas
    if (global.eventBus) {
      global.eventBus.on('sale_completed', (sale) => {
        this.handleSaleEvent(sale);
      });

      global.eventBus.on('product_updated', (product) => {
        this.handleProductEvent(product);
      });

      global.eventBus.on('customer_registered', (customer) => {
        this.handleCustomerEvent(customer);
      });
    }
  }

  /**
   * Maneja evento de venta
   */
  handleSaleEvent(sale) {
    // Actualizar métricas inmediatamente
    this.updateSalesMetrics();

    // Broadcast evento
    this.broadcastToSubscribers('sales', {
      type: 'event',
      event: 'sale_completed',
      data: sale
    });
  }

  /**
   * Maneja evento de producto
   */
  handleProductEvent(product) {
    // Verificar alertas de stock
    if (product.stock <= product.min_stock) {
      this.triggerAlert('low_stock', product);
    }

    // Actualizar métricas de inventario
    this.updateInventoryMetrics();
  }

  /**
   * Maneja evento de cliente
   */
  handleCustomerEvent(customer) {
    // Actualizar métricas de clientes
    this.updateCustomerMetrics();

    // Broadcast evento
    this.broadcastToSubscribers('customers', {
      type: 'event',
      event: 'customer_registered',
      data: customer
    });
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    return {
      connections: this.connections.size,
      activeMetrics: Array.from(this.updateIntervals.keys()),
      metrics: this.metrics,
      uptime: process.uptime()
    };
  }

  /**
   * Limpia recursos al cerrar
   */
  cleanup() {
    // Detener todas las actualizaciones
    this.updateIntervals.forEach((interval) => {
      clearInterval(interval);
    });

    // Cerrar todas las conexiones
    this.connections.forEach((connection) => {
      connection.ws.close();
    });

    console.log('🛑 Servicio de analytics en tiempo real detenido');
  }
}

// Singleton
const realtimeAnalytics = new RealtimeAnalyticsService();

// Exportar
module.exports = realtimeAnalytics;