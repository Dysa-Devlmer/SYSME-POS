/**
 * Analytics Controller - ES Modules Version
 * Provides metrics, KPIs and analytics endpoints
 */

import { getDatabase } from '../../config/database.js';

// Helper para obtener la conexión
const getDb = () => getDatabase();

class AnalyticsController {
  constructor() {
    this.CACHE_TTL = {
      SALES: 300,
      INVENTORY: 600,
      CUSTOMERS: 900,
      PERFORMANCE: 60,
      KPI: 300,
      TRENDS: 1800,
      PREDICTIONS: 3600
    };
  }

  /**
   * Obtiene métricas de ventas
   */
  async getSalesMetrics(req, res) {
    try {
      const { startDate, endDate } = req.query;

      let dateFilter = '';
      const params = [];

      if (startDate && endDate) {
        dateFilter = 'WHERE created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else {
        dateFilter = "WHERE created_at >= date('now', '-30 days')";
      }

      const salesData = getDb().prepare(`
        SELECT
          COUNT(*) as total_transactions,
          COALESCE(SUM(total), 0) as total_revenue,
          COALESCE(AVG(total), 0) as avg_ticket,
          COALESCE(MAX(total), 0) as max_sale,
          COALESCE(MIN(total), 0) as min_sale
        FROM sales
        ${dateFilter}
      `).get(...params);

      const dailySales = getDb().prepare(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as transactions,
          COALESCE(SUM(total), 0) as revenue
        FROM sales
        ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `).all(...params);

      res.json({
        success: true,
        data: {
          summary: salesData,
          daily: dailySales
        }
      });
    } catch (error) {
      console.error('Error getting sales metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de ventas',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de inventario
   */
  async getInventoryMetrics(req, res) {
    try {
      const inventoryData = getDb().prepare(`
        SELECT
          COUNT(*) as total_products,
          COALESCE(SUM(stock), 0) as total_units,
          COALESCE(SUM(stock * cost), 0) as total_cost_value,
          COALESCE(SUM(stock * price), 0) as total_retail_value,
          COUNT(CASE WHEN stock <= min_stock THEN 1 END) as low_stock_count,
          COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count
        FROM products
        WHERE is_active = 1
      `).get();

      const lowStockProducts = getDb().prepare(`
        SELECT id, name, stock, min_stock, price
        FROM products
        WHERE is_active = 1 AND stock <= min_stock
        ORDER BY stock ASC
        LIMIT 10
      `).all();

      res.json({
        success: true,
        data: {
          summary: inventoryData,
          low_stock: lowStockProducts
        }
      });
    } catch (error) {
      console.error('Error getting inventory metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de inventario',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de clientes
   */
  async getCustomerMetrics(req, res) {
    try {
      const customerData = getDb().prepare(`
        SELECT
          COUNT(*) as total_customers,
          COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as new_customers,
          COALESCE(AVG(total_spent), 0) as avg_lifetime_value,
          COALESCE(AVG(visit_count), 0) as avg_visits
        FROM customers
      `).get();

      const topCustomers = getDb().prepare(`
        SELECT id, name, email, total_spent, visit_count
        FROM customers
        ORDER BY total_spent DESC
        LIMIT 10
      `).all();

      res.json({
        success: true,
        data: {
          summary: customerData,
          top_customers: topCustomers
        }
      });
    } catch (error) {
      console.error('Error getting customer metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de clientes',
        error: error.message
      });
    }
  }

  /**
   * Obtiene métricas de rendimiento del sistema
   */
  async getPerformanceMetrics(req, res) {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();

      res.json({
        success: true,
        data: {
          memory: {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
            external: Math.round(memUsage.external / 1024 / 1024),
            rss: Math.round(memUsage.rss / 1024 / 1024)
          },
          uptime: {
            seconds: Math.round(uptime),
            formatted: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
          },
          nodeVersion: process.version,
          platform: process.platform
        }
      });
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener métricas de rendimiento',
        error: error.message
      });
    }
  }

  /**
   * Obtiene KPIs configurados
   */
  async getKPIs(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const kpis = {
        sales_today: getDb().prepare(`
          SELECT COALESCE(SUM(total), 0) as value
          FROM sales
          WHERE DATE(created_at) = ?
        `).get(today)?.value || 0,

        transactions_today: getDb().prepare(`
          SELECT COUNT(*) as value
          FROM sales
          WHERE DATE(created_at) = ?
        `).get(today)?.value || 0,

        avg_ticket_today: getDb().prepare(`
          SELECT COALESCE(AVG(total), 0) as value
          FROM sales
          WHERE DATE(created_at) = ?
        `).get(today)?.value || 0,

        products_sold_today: getDb().prepare(`
          SELECT COALESCE(SUM(si.quantity), 0) as value
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          WHERE DATE(s.created_at) = ?
        `).get(today)?.value || 0
      };

      res.json({
        success: true,
        data: kpis
      });
    } catch (error) {
      console.error('Error getting KPIs:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener KPIs',
        error: error.message
      });
    }
  }

  /**
   * Obtiene análisis de tendencias
   */
  async getTrendAnalysis(req, res) {
    try {
      const { metric, period } = req.query;

      let groupBy, dateFormat;
      switch (period) {
        case 'daily':
          groupBy = "DATE(created_at)";
          dateFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          groupBy = "strftime('%Y-%W', created_at)";
          dateFormat = '%Y-W%W';
          break;
        case 'monthly':
          groupBy = "strftime('%Y-%m', created_at)";
          dateFormat = '%Y-%m';
          break;
        default:
          groupBy = "DATE(created_at)";
          dateFormat = '%Y-%m-%d';
      }

      const trends = getDb().prepare(`
        SELECT
          ${groupBy} as period,
          COUNT(*) as transactions,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(AVG(total), 0) as avg_ticket
        FROM sales
        WHERE created_at >= date('now', '-90 days')
        GROUP BY ${groupBy}
        ORDER BY period DESC
        LIMIT 30
      `).all();

      res.json({
        success: true,
        data: {
          metric,
          period,
          trends: trends.reverse()
        }
      });
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener análisis de tendencias',
        error: error.message
      });
    }
  }

  /**
   * Obtiene predicciones
   */
  async getPredictions(req, res) {
    try {
      const { metric, days = 7 } = req.query;

      // Obtener datos históricos
      const historical = getDb().prepare(`
        SELECT
          DATE(created_at) as date,
          COALESCE(SUM(total), 0) as value
        FROM sales
        WHERE created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `).all();

      // Calcular promedio para predicción simple
      const avgValue = historical.reduce((sum, d) => sum + d.value, 0) / historical.length || 0;

      // Generar predicciones simples
      const predictions = [];
      const today = new Date();
      for (let i = 1; i <= parseInt(days); i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        predictions.push({
          date: date.toISOString().split('T')[0],
          predicted_value: Math.round(avgValue * (0.9 + Math.random() * 0.2)),
          confidence: 0.7 - (i * 0.05)
        });
      }

      res.json({
        success: true,
        data: {
          metric,
          historical: historical.slice(-7),
          predictions,
          method: 'moving_average'
        }
      });
    } catch (error) {
      console.error('Error getting predictions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener predicciones',
        error: error.message
      });
    }
  }

  /**
   * Análisis comparativo entre períodos
   */
  async compareAnalysis(req, res) {
    try {
      const { period1, period2 } = req.body;

      const getPeriodData = (start, end) => {
        return getDb().prepare(`
          SELECT
            COUNT(*) as transactions,
            COALESCE(SUM(total), 0) as revenue,
            COALESCE(AVG(total), 0) as avg_ticket
          FROM sales
          WHERE created_at BETWEEN ? AND ?
        `).get(start, end);
      };

      const data1 = getPeriodData(period1.start, period1.end);
      const data2 = getPeriodData(period2.start, period2.end);

      const calculateChange = (old, current) => {
        if (old === 0) return current > 0 ? 100 : 0;
        return ((current - old) / old * 100).toFixed(2);
      };

      res.json({
        success: true,
        data: {
          period1: { ...period1, ...data1 },
          period2: { ...period2, ...data2 },
          changes: {
            transactions: calculateChange(data1.transactions, data2.transactions),
            revenue: calculateChange(data1.revenue, data2.revenue),
            avg_ticket: calculateChange(data1.avg_ticket, data2.avg_ticket)
          }
        }
      });
    } catch (error) {
      console.error('Error comparing analysis:', error);
      res.status(500).json({
        success: false,
        message: 'Error al comparar períodos',
        error: error.message
      });
    }
  }

  /**
   * Exportar métricas
   */
  async exportMetrics(req, res) {
    try {
      const { format = 'csv', startDate, endDate } = req.query;

      const data = getDb().prepare(`
        SELECT *
        FROM sales
        WHERE created_at BETWEEN ? AND ?
        ORDER BY created_at DESC
      `).all(
        startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate || new Date().toISOString()
      );

      if (format === 'csv') {
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map(row => Object.values(row).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
        return res.send(csv);
      }

      res.json({
        success: true,
        data,
        format
      });
    } catch (error) {
      console.error('Error exporting metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Error al exportar métricas',
        error: error.message
      });
    }
  }
}

const analyticsController = new AnalyticsController();
export default analyticsController;
