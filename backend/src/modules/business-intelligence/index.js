/**
 * Business Intelligence Module - Main Entry Point
 * Converted from TypeScript to JavaScript
 */

import express from 'express';
import { logger } from '../../config/logger.js';

const router = express.Router();

// Placeholder services (simplified for now)
let metricsCache = {
  lastUpdate: null,
  data: {}
};

// Initialize BI Module
export function initializeBIModule() {
  logger.info('🧠 Initializing Business Intelligence Module...');

  // Update metrics every 5 minutes
  setInterval(() => {
    metricsCache.lastUpdate = new Date().toISOString();
    logger.debug('BI metrics cache updated');
  }, 5 * 60 * 1000);

  logger.info('✅ Business Intelligence Module initialized');
}

// WebSocket handlers
export const biWebSocket = {
  initializeWebSocket: (io) => {
    const biNamespace = io.of('/business-intelligence');

    biNamespace.on('connection', (socket) => {
      logger.info(`BI WebSocket client connected: ${socket.id}`);

      socket.on('subscribe:dashboard', () => {
        socket.join('dashboard-updates');
      });

      socket.on('subscribe:alerts', () => {
        socket.join('alert-updates');
      });

      socket.on('disconnect', () => {
        logger.info(`BI WebSocket client disconnected: ${socket.id}`);
      });
    });

    logger.info('✅ Business Intelligence WebSocket initialized');
  },

  emitDashboardUpdate: (data) => {
    // Placeholder for dashboard updates
  },

  emitAlert: (alert) => {
    // Placeholder for alerts
  }
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'business-intelligence',
    lastMetricsUpdate: metricsCache.lastUpdate
  });
});

// Dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');
    const db = dbService.getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    // Get basic KPIs
    const salesKPI = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as avg_ticket
      FROM sales
      WHERE DATE(created_at) = ? AND status = 'completed'
    `).get(today);

    const inventoryKPI = db.prepare(`
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) as low_stock
      FROM products WHERE is_active = 1
    `).get();

    res.json({
      success: true,
      data: {
        sales: salesKPI,
        inventory: inventoryKPI,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting BI dashboard summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// Forecasting placeholder
router.get('/forecasting/sales', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');
    const db = dbService.getDatabase();

    // Get last 30 days of sales for basic forecasting
    const historicalData = db.prepare(`
      SELECT
        DATE(created_at) as date,
        SUM(total) as revenue,
        COUNT(*) as transactions
      FROM sales
      WHERE created_at >= DATE('now', '-30 days') AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // Simple moving average forecast
    const avgRevenue = historicalData.reduce((sum, d) => sum + d.revenue, 0) / Math.max(historicalData.length, 1);

    res.json({
      success: true,
      data: {
        historical: historicalData,
        forecast: {
          next_day_estimate: Math.round(avgRevenue),
          confidence: 0.7,
          method: 'simple_moving_average'
        }
      }
    });
  } catch (error) {
    logger.error('Error getting sales forecast:', error);
    res.status(500).json({ error: 'Error al obtener pronóstico' });
  }
});

// Menu engineering placeholder
router.get('/menu-engineering', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');
    const db = dbService.getDatabase();

    const products = db.prepare(`
      SELECT
        p.id, p.name, p.price, p.cost,
        COALESCE(SUM(si.quantity), 0) as total_sold,
        COALESCE(SUM(si.subtotal), 0) as total_revenue
      FROM products p
      LEFT JOIN sale_items si ON si.product_id = p.id
      LEFT JOIN sales s ON s.id = si.sale_id AND s.status = 'completed'
        AND s.created_at >= DATE('now', '-30 days')
      WHERE p.is_active = 1
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 50
    `).all();

    // Calculate averages for classification
    const avgQuantity = products.reduce((sum, p) => sum + p.total_sold, 0) / Math.max(products.length, 1);
    const avgMargin = products.reduce((sum, p) => sum + (p.price - (p.cost || 0)), 0) / Math.max(products.length, 1);

    // Classify products (BCG matrix style)
    const classified = products.map(p => {
      const margin = p.price - (p.cost || 0);
      const highPopularity = p.total_sold >= avgQuantity;
      const highMargin = margin >= avgMargin;

      let classification;
      if (highPopularity && highMargin) classification = 'star';
      else if (!highPopularity && highMargin) classification = 'puzzle';
      else if (highPopularity && !highMargin) classification = 'plow_horse';
      else classification = 'dog';

      return { ...p, margin, classification };
    });

    res.json({
      success: true,
      data: {
        products: classified,
        summary: {
          stars: classified.filter(p => p.classification === 'star').length,
          puzzles: classified.filter(p => p.classification === 'puzzle').length,
          plow_horses: classified.filter(p => p.classification === 'plow_horse').length,
          dogs: classified.filter(p => p.classification === 'dog').length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting menu engineering:', error);
    res.status(500).json({ error: 'Error al obtener análisis de menú' });
  }
});

// RFM Analysis placeholder
router.get('/customers/rfm', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');
    const db = dbService.getDatabase();

    const customers = db.prepare(`
      SELECT
        c.id, c.name, c.phone,
        MAX(s.created_at) as last_purchase,
        COUNT(s.id) as frequency,
        COALESCE(SUM(s.total), 0) as monetary
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id AND s.status = 'completed'
      WHERE c.is_active = 1
      GROUP BY c.id
      HAVING frequency > 0
      ORDER BY monetary DESC
      LIMIT 100
    `).all();

    res.json({
      success: true,
      data: {
        customers,
        total_analyzed: customers.length
      }
    });
  } catch (error) {
    logger.error('Error getting RFM analysis:', error);
    res.status(500).json({ error: 'Error al obtener análisis RFM' });
  }
});

// Anomaly detection placeholder
router.get('/anomalies', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');
    const db = dbService.getDatabase();

    // Check for anomalies in recent sales
    const anomalies = [];

    // High value transactions
    const highValueSales = db.prepare(`
      SELECT id, total, created_at
      FROM sales
      WHERE total > (SELECT AVG(total) * 3 FROM sales WHERE status = 'completed')
        AND status = 'completed'
        AND created_at >= DATE('now', '-7 days')
    `).all();

    highValueSales.forEach(s => {
      anomalies.push({
        type: 'high_value_transaction',
        severity: 'medium',
        data: s,
        message: `Venta inusualmente alta: $${s.total.toLocaleString()}`
      });
    });

    // Excessive refunds
    const refundCount = db.prepare(`
      SELECT COUNT(*) as count FROM sales
      WHERE status = 'refunded' AND created_at >= DATE('now', '-1 day')
    `).get();

    if (refundCount.count > 5) {
      anomalies.push({
        type: 'excessive_refunds',
        severity: 'high',
        data: refundCount,
        message: `${refundCount.count} devoluciones en las últimas 24 horas`
      });
    }

    res.json({
      success: true,
      data: {
        anomalies,
        checked_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Error al detectar anomalías' });
  }
});

export default router;
