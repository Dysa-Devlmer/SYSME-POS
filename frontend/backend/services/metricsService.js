// =====================================================
// SYSME POS - Prometheus Metrics Service
// =====================================================

const promClient = require('prom-client');
const logger = require('../config/logger');

class MetricsService {
  constructor(app) {
    this.register = new promClient.Registry();

    // Add default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({
      register: this.register,
      prefix: 'sysme_pos_'
    });

    // Custom metrics
    this.setupCustomMetrics();

    // Attach to Express app
    if (app) {
      this.attachMiddleware(app);
    }

    logger.info('Metrics service initialized');
  }

  /**
   * Setup custom business metrics
   */
  setupCustomMetrics() {
    // HTTP request duration
    this.httpRequestDuration = new promClient.Histogram({
      name: 'sysme_pos_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
    });
    this.register.registerMetric(this.httpRequestDuration);

    // HTTP request counter
    this.httpRequestCounter = new promClient.Counter({
      name: 'sysme_pos_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code']
    });
    this.register.registerMetric(this.httpRequestCounter);

    // Sales counter
    this.salesCounter = new promClient.Counter({
      name: 'sysme_pos_sales_total',
      help: 'Total number of sales',
      labelNames: ['payment_method', 'sale_type']
    });
    this.register.registerMetric(this.salesCounter);

    // Sales revenue gauge
    this.salesRevenue = new promClient.Gauge({
      name: 'sysme_pos_sales_revenue_total',
      help: 'Total sales revenue',
      labelNames: ['currency']
    });
    this.register.registerMetric(this.salesRevenue);

    // Orders in kitchen gauge
    this.kitchenOrders = new promClient.Gauge({
      name: 'sysme_pos_kitchen_orders_pending',
      help: 'Number of pending orders in kitchen'
    });
    this.register.registerMetric(this.kitchenOrders);

    // Tables occupied gauge
    this.tablesOccupied = new promClient.Gauge({
      name: 'sysme_pos_tables_occupied',
      help: 'Number of occupied tables'
    });
    this.register.registerMetric(this.tablesOccupied);

    // Active users gauge
    this.activeUsers = new promClient.Gauge({
      name: 'sysme_pos_active_users',
      help: 'Number of active logged-in users'
    });
    this.register.registerMetric(this.activeUsers);

    // Cash sessions open gauge
    this.cashSessionsOpen = new promClient.Gauge({
      name: 'sysme_pos_cash_sessions_open',
      help: 'Number of open cash sessions'
    });
    this.register.registerMetric(this.cashSessionsOpen);

    // Inventory alerts counter
    this.inventoryAlerts = new promClient.Counter({
      name: 'sysme_pos_inventory_alerts_total',
      help: 'Total number of inventory alerts (low stock)',
      labelNames: ['alert_type']
    });
    this.register.registerMetric(this.inventoryAlerts);

    // Database query duration
    this.dbQueryDuration = new promClient.Histogram({
      name: 'sysme_pos_db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['query_type'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5]
    });
    this.register.registerMetric(this.dbQueryDuration);

    // Websocket connections gauge
    this.wsConnections = new promClient.Gauge({
      name: 'sysme_pos_websocket_connections',
      help: 'Number of active WebSocket connections'
    });
    this.register.registerMetric(this.wsConnections);

    // Errors counter
    this.errorsCounter = new promClient.Counter({
      name: 'sysme_pos_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity']
    });
    this.register.registerMetric(this.errorsCounter);

    // Loyalty points awarded counter
    this.loyaltyPointsAwarded = new promClient.Counter({
      name: 'sysme_pos_loyalty_points_awarded_total',
      help: 'Total loyalty points awarded'
    });
    this.register.registerMetric(this.loyaltyPointsAwarded);

    // Delivery orders counter
    this.deliveryOrders = new promClient.Counter({
      name: 'sysme_pos_delivery_orders_total',
      help: 'Total delivery orders',
      labelNames: ['platform', 'status']
    });
    this.register.registerMetric(this.deliveryOrders);
  }

  /**
   * Attach middleware to track HTTP metrics
   */
  attachMiddleware(app) {
    app.use((req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : req.path;

        // Record duration
        this.httpRequestDuration.observe(
          {
            method: req.method,
            route: route,
            status_code: res.statusCode
          },
          duration
        );

        // Increment counter
        this.httpRequestCounter.inc({
          method: req.method,
          route: route,
          status_code: res.statusCode
        });
      });

      next();
    });
  }

  /**
   * Record a sale
   */
  recordSale(saleAmount, paymentMethod, saleType = 'dine-in', currency = 'CLP') {
    this.salesCounter.inc({
      payment_method: paymentMethod,
      sale_type: saleType
    });

    this.salesRevenue.inc({ currency }, saleAmount);
  }

  /**
   * Update kitchen orders count
   */
  updateKitchenOrders(count) {
    this.kitchenOrders.set(count);
  }

  /**
   * Update occupied tables count
   */
  updateTablesOccupied(count) {
    this.tablesOccupied.set(count);
  }

  /**
   * Update active users count
   */
  updateActiveUsers(count) {
    this.activeUsers.set(count);
  }

  /**
   * Update open cash sessions count
   */
  updateCashSessions(count) {
    this.cashSessionsOpen.set(count);
  }

  /**
   * Record inventory alert
   */
  recordInventoryAlert(alertType = 'low_stock') {
    this.inventoryAlerts.inc({ alert_type: alertType });
  }

  /**
   * Record database query
   */
  recordDbQuery(queryType, duration) {
    this.dbQueryDuration.observe({ query_type: queryType }, duration);
  }

  /**
   * Update WebSocket connections count
   */
  updateWsConnections(count) {
    this.wsConnections.set(count);
  }

  /**
   * Record error
   */
  recordError(type, severity = 'error') {
    this.errorsCounter.inc({ type, severity });
  }

  /**
   * Record loyalty points awarded
   */
  recordLoyaltyPoints(points) {
    this.loyaltyPointsAwarded.inc(points);
  }

  /**
   * Record delivery order
   */
  recordDeliveryOrder(platform, status) {
    this.deliveryOrders.inc({ platform, status });
  }

  /**
   * Get current metrics
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * Get metrics in JSON format
   */
  async getMetricsJSON() {
    const metrics = await this.register.getMetricsAsJSON();
    return metrics;
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.register.resetMetrics();
    logger.info('Metrics reset');
  }
}

module.exports = MetricsService;
