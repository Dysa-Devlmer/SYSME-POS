/**
 * =====================================================
 * Proactive Alerts Service - AI/ML
 * =====================================================
 * Monitors system and business metrics to send
 * intelligent, proactive alerts for:
 * - Low stock / stockout predictions
 * - Sales anomalies
 * - Expiring products
 * - Revenue anomalies
 * - Performance issues
 *
 * @module services/ai/proactive-alerts
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const Database = require('better-sqlite3');
const path = require('path');
const DemandForecastingService = require('./demand-forecasting.service');

class ProactiveAlertsService {
  constructor() {
    this.db = null;
    this.alertRules = [];
    this.activeAlerts = new Map();
    this.alertHistory = [];
  }

  /**
   * Initialize database connection
   */
  initDB() {
    if (!this.db) {
      const dbPath = path.join(__dirname, '../../database.sqlite');
      this.db = new Database(dbPath);
    }
    return this.db;
  }

  /**
   * Monitor all metrics and generate alerts
   */
  async monitorAndAlert() {
    const alerts = [];

    try {
      // Check inventory alerts
      const inventoryAlerts = await this.checkInventoryAlerts();
      alerts.push(...inventoryAlerts);

      // Check sales anomalies
      const salesAlerts = await this.checkSalesAnomalies();
      alerts.push(...salesAlerts);

      // Check expiring products
      const expiringAlerts = await this.checkExpiringProducts();
      alerts.push(...expiringAlerts);

      // Check revenue anomalies
      const revenueAlerts = await this.checkRevenueAnomalies();
      alerts.push(...revenueAlerts);

      // Check performance metrics
      const performanceAlerts = await this.checkPerformanceMetrics();
      alerts.push(...performanceAlerts);

      // Save alerts to database
      this.saveAlerts(alerts);

      return {
        total_alerts: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        high: alerts.filter(a => a.severity === 'high').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        low: alerts.filter(a => a.severity === 'low').length,
        alerts: alerts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
      };

    } catch (error) {
      console.error('Error in monitoring:', error);
      return { total_alerts: 0, alerts: [], error: error.message };
    }
  }

  /**
   * Check inventory for low stock and predicted stockouts
   */
  async checkInventoryAlerts() {
    const db = this.initDB();
    const alerts = [];

    // Get products with low stock
    const lowStockProducts = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.sku,
        p.reorder_point,
        COALESCE(SUM(i.quantity), 0) as current_stock,
        p.reorder_quantity
      FROM products p
      LEFT JOIN inventory_items i ON p.product_id = i.product_id
      WHERE p.is_active = 1
      GROUP BY p.product_id
      HAVING current_stock <= p.reorder_point OR current_stock <= 10
    `).all();

    for (const product of lowStockProducts) {
      try {
        // Predict when stock will run out
        const forecast = await DemandForecastingService.predictDemand(product.product_id, 7);

        if (forecast.predictions && forecast.predictions.length > 0) {
          const totalPredictedDemand = forecast.predictions.reduce(
            (sum, p) => sum + p.predicted_quantity, 0
          );

          const daysUntilStockout = product.current_stock / (totalPredictedDemand / 7);

          let severity = 'low';
          if (daysUntilStockout < 2) severity = 'critical';
          else if (daysUntilStockout < 3) severity = 'high';
          else if (daysUntilStockout < 5) severity = 'medium';

          alerts.push({
            type: 'low_stock',
            severity,
            product_id: product.product_id,
            product_name: product.name,
            sku: product.sku,
            current_stock: product.current_stock,
            predicted_demand_7d: Math.round(totalPredictedDemand),
            days_until_stockout: Math.round(daysUntilStockout * 10) / 10,
            message: `${product.name} - Low stock alert`,
            description: `Current stock: ${product.current_stock} units. Predicted to run out in ${Math.round(daysUntilStockout)} days.`,
            recommended_action: 'reorder',
            recommended_quantity: Math.max(
              product.reorder_quantity || 0,
              Math.round(totalPredictedDemand * 1.2)
            ),
            auto_action_available: true
          });
        }
      } catch (error) {
        console.error(`Error forecasting for product ${product.product_id}:`, error);
      }
    }

    return alerts;
  }

  /**
   * Check for sales anomalies
   */
  async checkSalesAnomalies() {
    const db = this.initDB();
    const alerts = [];

    // Get today's sales
    const todaySales = db.prepare(`
      SELECT
        COUNT(DISTINCT order_id) as order_count,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM orders
      WHERE DATE(created_at) = DATE('now')
        AND status = 'completed'
    `).get();

    // Get average for this day of week over last 4 weeks
    const dayOfWeek = new Date().getDay();
    const historicalAverage = db.prepare(`
      SELECT
        AVG(daily_orders) as avg_orders,
        AVG(daily_revenue) as avg_revenue
      FROM (
        SELECT
          DATE(created_at) as date,
          COUNT(DISTINCT order_id) as daily_orders,
          SUM(total_amount) as daily_revenue
        FROM orders
        WHERE CAST(strftime('%w', created_at) AS INTEGER) = ?
          AND created_at >= datetime('now', '-28 days')
          AND created_at < datetime('now', 'start of day')
          AND status = 'completed'
        GROUP BY DATE(created_at)
      )
    `).get(dayOfWeek);

    if (historicalAverage.avg_revenue > 0) {
      const revenueVariance = (todaySales.total_revenue - historicalAverage.avg_revenue) /
        historicalAverage.avg_revenue;

      // Alert if variance is significant
      if (Math.abs(revenueVariance) > 0.3) { // 30% deviation
        const isPositive = revenueVariance > 0;

        alerts.push({
          type: 'sales_anomaly',
          severity: isPositive ? 'medium' : 'high',
          today_revenue: todaySales.total_revenue,
          expected_revenue: historicalAverage.avg_revenue,
          variance_percentage: (revenueVariance * 100).toFixed(1),
          today_orders: todaySales.order_count,
          expected_orders: historicalAverage.avg_orders,
          message: isPositive
            ? `Sales ${(revenueVariance * 100).toFixed(0)}% above expected`
            : `Sales ${Math.abs(revenueVariance * 100).toFixed(0)}% below expected`,
          description: isPositive
            ? `Great news! Today's sales are significantly higher than usual for this day.`
            : `Warning: Today's sales are significantly lower than expected for this day.`,
          recommended_action: isPositive ? 'monitor' : 'investigate',
          impact_estimate: Math.abs(todaySales.total_revenue - historicalAverage.avg_revenue)
        });
      }
    }

    return alerts;
  }

  /**
   * Check for expiring products
   */
  async checkExpiringProducts() {
    const db = this.initDB();
    const alerts = [];

    // Check for products expiring soon
    const expiringProducts = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.sku,
        i.quantity,
        i.expiry_date,
        julianday(i.expiry_date) - julianday('now') as days_until_expiry,
        p.cost * i.quantity as total_value
      FROM inventory_items i
      JOIN products p ON i.product_id = p.product_id
      WHERE i.expiry_date IS NOT NULL
        AND i.expiry_date >= date('now')
        AND julianday(i.expiry_date) - julianday('now') <= 7
        AND i.quantity > 0
      ORDER BY days_until_expiry ASC
    `).all();

    expiringProducts.forEach(product => {
      let severity = 'low';
      if (product.days_until_expiry < 1) severity = 'critical';
      else if (product.days_until_expiry < 2) severity = 'high';
      else if (product.days_until_expiry < 4) severity = 'medium';

      alerts.push({
        type: 'expiring_product',
        severity,
        product_id: product.product_id,
        product_name: product.name,
        sku: product.sku,
        quantity: product.quantity,
        expiry_date: product.expiry_date,
        days_until_expiry: Math.round(product.days_until_expiry * 10) / 10,
        estimated_loss: product.total_value,
        message: `${product.name} expiring soon`,
        description: `${product.quantity} units expire in ${Math.round(product.days_until_expiry)} days. Potential loss: $${product.total_value.toFixed(2)}`,
        recommended_action: 'promote_or_discount',
        discount_suggestion: product.days_until_expiry < 2 ? 50 : 25
      });
    });

    return alerts;
  }

  /**
   * Check revenue anomalies by hour
   */
  async checkRevenueAnomalies() {
    const db = this.initDB();
    const alerts = [];

    const currentHour = new Date().getHours();

    // Get revenue for current hour
    const hourlyRevenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM orders
      WHERE DATE(created_at) = DATE('now')
        AND CAST(strftime('%H', created_at) AS INTEGER) = ?
        AND status = 'completed'
    `).get(currentHour);

    // Get average for this hour over last 7 days
    const historicalHourly = db.prepare(`
      SELECT AVG(hourly_revenue) as avg_revenue
      FROM (
        SELECT
          DATE(created_at) as date,
          SUM(total_amount) as hourly_revenue
        FROM orders
        WHERE CAST(strftime('%H', created_at) AS INTEGER) = ?
          AND created_at >= datetime('now', '-7 days')
          AND created_at < datetime('now', 'start of day')
          AND status = 'completed'
        GROUP BY DATE(created_at)
      )
    `).get(currentHour);

    if (historicalHourly.avg_revenue > 0 && hourlyRevenue.revenue > 0) {
      const variance = (hourlyRevenue.revenue - historicalHourly.avg_revenue) /
        historicalHourly.avg_revenue;

      if (variance < -0.5) { // 50% below expected
        alerts.push({
          type: 'hourly_revenue_low',
          severity: 'medium',
          hour: currentHour,
          current_revenue: hourlyRevenue.revenue,
          expected_revenue: historicalHourly.avg_revenue,
          variance_percentage: (variance * 100).toFixed(1),
          message: `Low revenue for hour ${currentHour}:00`,
          description: `Revenue is ${Math.abs(variance * 100).toFixed(0)}% below average for this hour.`,
          recommended_action: 'check_operations'
        });
      }
    }

    return alerts;
  }

  /**
   * Check system performance metrics
   */
  async checkPerformanceMetrics() {
    const alerts = [];

    // This would integrate with actual monitoring tools
    // For now, we'll check database size and response times

    const db = this.initDB();

    // Check database size
    const dbStats = db.prepare(`
      SELECT page_count * page_size as size
      FROM pragma_page_count(), pragma_page_size()
    `).get();

    const dbSizeMB = dbStats.size / 1024 / 1024;

    if (dbSizeMB > 500) { // 500MB threshold
      alerts.push({
        type: 'database_size',
        severity: dbSizeMB > 1000 ? 'high' : 'medium',
        size_mb: Math.round(dbSizeMB),
        message: 'Database size growing large',
        description: `Database size is ${Math.round(dbSizeMB)}MB. Consider archiving old data.`,
        recommended_action: 'archive_old_data'
      });
    }

    // Check for slow queries (would need actual metrics)
    // This is a placeholder
    const slowQueries = db.prepare(`
      SELECT COUNT(*) as count
      FROM sqlite_master
      WHERE type = 'table'
    `).get();

    return alerts;
  }

  /**
   * Save alerts to database
   */
  saveAlerts(alerts) {
    const db = this.initDB();

    const insert = db.prepare(`
      INSERT INTO ai_alerts (
        alert_type, severity, message, details,
        created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const insertMany = db.transaction((alerts) => {
      for (const alert of alerts) {
        insert.run(
          alert.type,
          alert.severity,
          alert.message,
          JSON.stringify(alert)
        );
      }
    });

    insertMany(alerts);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filter = {}) {
    const db = this.initDB();

    let query = `
      SELECT *
      FROM ai_alerts
      WHERE is_dismissed = 0
    `;

    const params = [];

    if (filter.severity) {
      query += ' AND severity = ?';
      params.push(filter.severity);
    }

    if (filter.type) {
      query += ' AND alert_type = ?';
      params.push(filter.type);
    }

    query += ' ORDER BY created_at DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    const alerts = db.prepare(query).all(...params);

    return alerts.map(alert => ({
      ...alert,
      details: JSON.parse(alert.details)
    }));
  }

  /**
   * Dismiss an alert
   */
  dismissAlert(alertId) {
    const db = this.initDB();

    db.prepare(`
      UPDATE ai_alerts
      SET is_dismissed = 1,
          dismissed_at = datetime('now')
      WHERE alert_id = ?
    `).run(alertId);

    return { success: true };
  }

  /**
   * Take automated action on an alert
   */
  async takeAutomatedAction(alertId, action) {
    const db = this.initDB();

    // Get alert details
    const alert = db.prepare(`
      SELECT * FROM ai_alerts WHERE alert_id = ?
    `).get(alertId);

    if (!alert) {
      throw new Error('Alert not found');
    }

    const details = JSON.parse(alert.details);

    let result = {};

    switch (action) {
      case 'auto_reorder':
        result = await this.executeAutoReorder(details);
        break;

      case 'apply_discount':
        result = await this.applyExpiryDiscount(details);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Update alert with action taken
    db.prepare(`
      UPDATE ai_alerts
      SET action_taken = ?,
          is_dismissed = 1,
          dismissed_at = datetime('now')
      WHERE alert_id = ?
    `).run(JSON.stringify({ action, result, timestamp: new Date().toISOString() }), alertId);

    return result;
  }

  /**
   * Execute auto-reorder for low stock
   */
  async executeAutoReorder(alertDetails) {
    const db = this.initDB();

    // Create purchase order
    const result = db.prepare(`
      INSERT INTO purchase_orders (
        supplier_id, status, total_amount, notes, created_at
      ) VALUES (?, 'draft', 0, ?, datetime('now'))
    `).run(
      1, // Default supplier - should be configurable
      `Auto-generated from low stock alert for ${alertDetails.product_name}`
    );

    const poId = result.lastInsertRowid;

    // Add item to purchase order
    db.prepare(`
      INSERT INTO purchase_order_items (
        po_id, product_id, quantity, unit_cost
      ) VALUES (?, ?, ?, 0)
    `).run(poId, alertDetails.product_id, alertDetails.recommended_quantity);

    return {
      success: true,
      purchase_order_id: poId,
      product_id: alertDetails.product_id,
      quantity: alertDetails.recommended_quantity,
      message: `Purchase order ${poId} created for ${alertDetails.product_name}`
    };
  }

  /**
   * Apply discount to expiring products
   */
  async applyExpiryDiscount(alertDetails) {
    const db = this.initDB();

    // Create promotion
    const result = db.prepare(`
      INSERT INTO promotions (
        name, type, discount_type, discount_value,
        start_date, end_date, is_active, created_at
      ) VALUES (?, 'product', 'percentage', ?, date('now'), ?, 1, datetime('now'))
    `).run(
      `Expiring Soon - ${alertDetails.product_name}`,
      alertDetails.discount_suggestion,
      alertDetails.expiry_date
    );

    const promotionId = result.lastInsertRowid;

    // Link promotion to product
    db.prepare(`
      INSERT INTO promotion_products (promotion_id, product_id)
      VALUES (?, ?)
    `).run(promotionId, alertDetails.product_id);

    return {
      success: true,
      promotion_id: promotionId,
      product_id: alertDetails.product_id,
      discount: alertDetails.discount_suggestion,
      message: `${alertDetails.discount_suggestion}% discount applied to ${alertDetails.product_name}`
    };
  }

  /**
   * Get severity weight for sorting
   */
  getSeverityWeight(severity) {
    const weights = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1
    };
    return weights[severity] || 0;
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(daysBack = 30) {
    const db = this.initDB();

    return db.prepare(`
      SELECT
        alert_type,
        severity,
        COUNT(*) as count,
        SUM(CASE WHEN is_dismissed = 1 THEN 1 ELSE 0 END) as dismissed,
        SUM(CASE WHEN action_taken IS NOT NULL THEN 1 ELSE 0 END) as acted_upon
      FROM ai_alerts
      WHERE created_at >= datetime('now', '-' || ? || ' days')
      GROUP BY alert_type, severity
      ORDER BY count DESC
    `).all(daysBack);
  }
}

module.exports = new ProactiveAlertsService();
