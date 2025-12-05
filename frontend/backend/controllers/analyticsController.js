// =====================================================
// SYSME POS - Analytics Controller
// =====================================================
// Provides business intelligence, reports, and analytics
//
// @author JARVIS AI Assistant
// @date 2025-11-20
// @version 2.1.0
// =====================================================

const { dbManager } = require('../config/database');
const logger = require('../config/logger');

class AnalyticsController {
  /**
   * Get dashboard overview
   * GET /api/analytics/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const { location_id, date } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      // Today's sales summary
      const todaySales = await dbManager.get(`
        SELECT
          COUNT(*) as order_count,
          COALESCE(SUM(total_amount), 0) as total_sales,
          COALESCE(SUM(subtotal), 0) as subtotal,
          COALESCE(SUM(tax_amount), 0) as tax,
          COALESCE(SUM(tip_amount), 0) as tips,
          COALESCE(AVG(total_amount), 0) as avg_order_value
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) = ?
          AND status != 'cancelled'
          ${location_id ? 'AND location_id = ?' : ''}
      `, location_id ? [req.user.company_id, targetDate, location_id] : [req.user.company_id, targetDate]);

      // Orders by status
      const ordersByStatus = await dbManager.all(`
        SELECT
          status,
          COUNT(*) as count
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) = ?
          ${location_id ? 'AND location_id = ?' : ''}
        GROUP BY status
      `, location_id ? [req.user.company_id, targetDate, location_id] : [req.user.company_id, targetDate]);

      // Orders by type
      const ordersByType = await dbManager.all(`
        SELECT
          order_type,
          COUNT(*) as count,
          SUM(total_amount) as total
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) = ?
          AND status != 'cancelled'
          ${location_id ? 'AND location_id = ?' : ''}
        GROUP BY order_type
      `, location_id ? [req.user.company_id, targetDate, location_id] : [req.user.company_id, targetDate]);

      // Top products today
      const topProducts = await dbManager.all(`
        SELECT
          p.name,
          SUM(oi.quantity) as quantity_sold,
          SUM(oi.subtotal) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.company_id = ?
          AND DATE(o.created_at) = ?
          AND o.status != 'cancelled'
          ${location_id ? 'AND o.location_id = ?' : ''}
        GROUP BY p.id
        ORDER BY quantity_sold DESC
        LIMIT 10
      `, location_id ? [req.user.company_id, targetDate, location_id] : [req.user.company_id, targetDate]);

      // Hourly sales
      const hourlySales = await dbManager.all(`
        SELECT
          CAST(strftime('%H', created_at) AS INTEGER) as hour,
          COUNT(*) as order_count,
          SUM(total_amount) as total_sales
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) = ?
          AND status != 'cancelled'
          ${location_id ? 'AND location_id = ?' : ''}
        GROUP BY hour
        ORDER BY hour
      `, location_id ? [req.user.company_id, targetDate, location_id] : [req.user.company_id, targetDate]);

      // Active cash sessions
      const activeSessions = await dbManager.all(`
        SELECT
          cs.*,
          u.username as cashier_name,
          l.name as location_name
        FROM cash_sessions cs
        JOIN users u ON cs.cashier_id = u.id
        JOIN locations l ON cs.location_id = l.id
        WHERE cs.company_id = ? AND cs.status = 'open'
          ${location_id ? 'AND cs.location_id = ?' : ''}
      `, location_id ? [req.user.company_id, location_id] : [req.user.company_id]);

      res.json({
        success: true,
        data: {
          date: targetDate,
          summary: todaySales,
          orders_by_status: ordersByStatus,
          orders_by_type: ordersByType,
          top_products: topProducts,
          hourly_sales: hourlySales,
          active_cash_sessions: activeSessions
        }
      });
    } catch (error) {
      logger.error('Error fetching dashboard:', error);
      next(error);
    }
  }

  /**
   * Get sales summary for date range
   * GET /api/analytics/sales-summary
   */
  async getSalesSummary(req, res, next) {
    try {
      const { start_date, end_date, location_id, group_by = 'day' } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      let dateFormat;
      switch (group_by) {
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        case 'week':
          dateFormat = '%Y-W%W';
          break;
        case 'month':
          dateFormat = '%Y-%m';
          break;
        default:
          dateFormat = '%Y-%m-%d';
      }

      const salesData = await dbManager.all(`
        SELECT
          strftime(?, created_at) as period,
          COUNT(*) as order_count,
          SUM(total_amount) as total_sales,
          SUM(subtotal) as subtotal,
          SUM(tax_amount) as tax,
          SUM(tip_amount) as tips,
          SUM(discount_amount) as discounts,
          AVG(total_amount) as avg_order_value
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) BETWEEN ? AND ?
          AND status != 'cancelled'
          ${location_id ? 'AND location_id = ?' : ''}
        GROUP BY period
        ORDER BY period
      `, location_id
        ? [dateFormat, req.user.company_id, start_date, end_date, location_id]
        : [dateFormat, req.user.company_id, start_date, end_date]
      );

      // Overall totals
      const totals = await dbManager.get(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_revenue,
          AVG(total_amount) as avg_order_value,
          SUM(tip_amount) as total_tips
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) BETWEEN ? AND ?
          AND status != 'cancelled'
          ${location_id ? 'AND location_id = ?' : ''}
      `, location_id
        ? [req.user.company_id, start_date, end_date, location_id]
        : [req.user.company_id, start_date, end_date]
      );

      res.json({
        success: true,
        data: {
          period_data: salesData,
          totals
        }
      });
    } catch (error) {
      logger.error('Error fetching sales summary:', error);
      next(error);
    }
  }

  /**
   * Get product performance analytics
   * GET /api/analytics/products
   */
  async getProductPerformance(req, res, next) {
    try {
      const { start_date, end_date, location_id, category_id, limit = 50 } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      let query = `
        SELECT
          p.id,
          p.name,
          p.sku,
          c.name as category_name,
          COUNT(DISTINCT oi.order_id) as order_count,
          SUM(oi.quantity) as quantity_sold,
          SUM(oi.subtotal) as revenue,
          AVG(oi.unit_price) as avg_price,
          SUM(oi.subtotal) / NULLIF(SUM(oi.quantity), 0) as revenue_per_unit
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.company_id = ?
          AND DATE(o.created_at) BETWEEN ? AND ?
          AND o.status != 'cancelled'
      `;

      const params = [req.user.company_id, start_date, end_date];

      if (location_id) {
        query += ' AND o.location_id = ?';
        params.push(location_id);
      }

      if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }

      query += ` GROUP BY p.id ORDER BY revenue DESC LIMIT ?`;
      params.push(parseInt(limit));

      const products = await dbManager.all(query, params);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      logger.error('Error fetching product performance:', error);
      next(error);
    }
  }

  /**
   * Get category performance analytics
   * GET /api/analytics/categories
   */
  async getCategoryPerformance(req, res, next) {
    try {
      const { start_date, end_date, location_id } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const categories = await dbManager.all(`
        SELECT
          c.id,
          c.name,
          COUNT(DISTINCT oi.order_id) as order_count,
          SUM(oi.quantity) as items_sold,
          SUM(oi.subtotal) as revenue,
          AVG(oi.unit_price) as avg_price,
          COUNT(DISTINCT p.id) as unique_products
        FROM categories c
        LEFT JOIN products p ON c.id = p.category_id
        LEFT JOIN order_items oi ON p.id = oi.product_id
        LEFT JOIN orders o ON oi.order_id = o.id
        WHERE c.company_id = ?
          AND (o.id IS NULL OR (
            DATE(o.created_at) BETWEEN ? AND ?
            AND o.status != 'cancelled'
            ${location_id ? 'AND o.location_id = ?' : ''}
          ))
        GROUP BY c.id
        ORDER BY revenue DESC
      `, location_id
        ? [req.user.company_id, start_date, end_date, location_id]
        : [req.user.company_id, start_date, end_date]
      );

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      logger.error('Error fetching category performance:', error);
      next(error);
    }
  }

  /**
   * Get employee performance
   * GET /api/analytics/employees
   */
  async getEmployeePerformance(req, res, next) {
    try {
      const { start_date, end_date, location_id } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const employees = await dbManager.all(`
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.role,
          COUNT(o.id) as orders_processed,
          SUM(o.total_amount) as total_sales,
          AVG(o.total_amount) as avg_order_value,
          SUM(o.tip_amount) as total_tips
        FROM users u
        LEFT JOIN orders o ON u.id = o.cashier_id
          AND DATE(o.created_at) BETWEEN ? AND ?
          AND o.status != 'cancelled'
          ${location_id ? 'AND o.location_id = ?' : ''}
        WHERE u.company_id = ?
          AND u.role IN ('cashier', 'manager', 'admin')
        GROUP BY u.id
        ORDER BY total_sales DESC
      `, location_id
        ? [start_date, end_date, location_id, req.user.company_id]
        : [start_date, end_date, req.user.company_id]
      );

      res.json({
        success: true,
        data: employees
      });
    } catch (error) {
      logger.error('Error fetching employee performance:', error);
      next(error);
    }
  }

  /**
   * Get hourly analytics
   * GET /api/analytics/hourly
   */
  async getHourlyAnalytics(req, res, next) {
    try {
      const { start_date, end_date, location_id } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const hourlyData = await dbManager.all(`
        SELECT
          CAST(strftime('%H', created_at) AS INTEGER) as hour,
          COUNT(*) as order_count,
          SUM(total_amount) as total_sales,
          AVG(total_amount) as avg_order_value,
          COUNT(DISTINCT DATE(created_at)) as days_counted
        FROM orders
        WHERE company_id = ?
          AND DATE(created_at) BETWEEN ? AND ?
          AND status != 'cancelled'
          ${location_id ? 'AND location_id = ?' : ''}
        GROUP BY hour
        ORDER BY hour
      `, location_id
        ? [req.user.company_id, start_date, end_date, location_id]
        : [req.user.company_id, start_date, end_date]
      );

      res.json({
        success: true,
        data: hourlyData
      });
    } catch (error) {
      logger.error('Error fetching hourly analytics:', error);
      next(error);
    }
  }

  /**
   * Get customer analytics
   * GET /api/analytics/customers
   */
  async getCustomerAnalytics(req, res, next) {
    try {
      const { start_date, end_date } = req.query;

      // New vs returning customers
      const customerSegments = await dbManager.get(`
        SELECT
          COUNT(DISTINCT CASE
            WHEN (
              SELECT COUNT(*)
              FROM orders o2
              WHERE o2.customer_id = o.customer_id
                AND o2.created_at < o.created_at
            ) = 0 THEN o.customer_id
          END) as new_customers,
          COUNT(DISTINCT CASE
            WHEN (
              SELECT COUNT(*)
              FROM orders o2
              WHERE o2.customer_id = o.customer_id
                AND o2.created_at < o.created_at
            ) > 0 THEN o.customer_id
          END) as returning_customers
        FROM orders o
        WHERE o.company_id = ?
          ${start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : ''}
          AND o.customer_id IS NOT NULL
      `, start_date && end_date
        ? [req.user.company_id, start_date, end_date]
        : [req.user.company_id]
      );

      // Top customers by revenue
      const topCustomers = await dbManager.all(`
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          COUNT(o.id) as order_count,
          SUM(o.total_amount) as total_spent,
          AVG(o.total_amount) as avg_order_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        JOIN orders o ON c.id = o.customer_id
        WHERE c.company_id = ?
          ${start_date && end_date ? 'AND DATE(o.created_at) BETWEEN ? AND ?' : ''}
          AND o.status != 'cancelled'
        GROUP BY c.id
        ORDER BY total_spent DESC
        LIMIT 20
      `, start_date && end_date
        ? [req.user.company_id, start_date, end_date]
        : [req.user.company_id]
      );

      // RFM segments distribution
      const rfmSegments = await dbManager.all(`
        SELECT
          rfm_segment,
          COUNT(*) as customer_count,
          SUM(loyalty_points) as total_loyalty_points
        FROM customers
        WHERE company_id = ? AND rfm_segment IS NOT NULL
        GROUP BY rfm_segment
      `, [req.user.company_id]);

      res.json({
        success: true,
        data: {
          segments: customerSegments,
          top_customers: topCustomers,
          rfm_distribution: rfmSegments
        }
      });
    } catch (error) {
      logger.error('Error fetching customer analytics:', error);
      next(error);
    }
  }

  /**
   * Get payment method analytics
   * GET /api/analytics/payment-methods
   */
  async getPaymentAnalytics(req, res, next) {
    try {
      const { start_date, end_date, location_id } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      const paymentData = await dbManager.all(`
        SELECT
          payment_method,
          COUNT(*) as transaction_count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM payments p
        JOIN orders o ON p.order_id = o.id
        WHERE p.company_id = ?
          AND DATE(p.created_at) BETWEEN ? AND ?
          AND p.status = 'completed'
          ${location_id ? 'AND o.location_id = ?' : ''}
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `, location_id
        ? [req.user.company_id, start_date, end_date, location_id]
        : [req.user.company_id, start_date, end_date]
      );

      res.json({
        success: true,
        data: paymentData
      });
    } catch (error) {
      logger.error('Error fetching payment analytics:', error);
      next(error);
    }
  }

  /**
   * Get inventory analytics
   * GET /api/analytics/inventory
   */
  async getInventoryAnalytics(req, res, next) {
    try {
      const { location_id } = req.query;

      // Low stock items
      const lowStock = await dbManager.all(`
        SELECT
          p.name,
          p.sku,
          i.quantity_on_hand,
          i.available_quantity,
          p.min_stock_level,
          l.name as location_name
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        JOIN locations l ON i.location_id = l.id
        WHERE i.company_id = ?
          AND i.available_quantity <= p.min_stock_level
          ${location_id ? 'AND i.location_id = ?' : ''}
        ORDER BY (i.available_quantity / NULLIF(p.min_stock_level, 0)) ASC
      `, location_id ? [req.user.company_id, location_id] : [req.user.company_id]);

      // Inventory value
      const inventoryValue = await dbManager.get(`
        SELECT
          COUNT(DISTINCT i.product_id) as unique_products,
          SUM(i.quantity_on_hand * p.cost) as total_value,
          SUM(i.available_quantity * p.cost) as available_value
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        WHERE i.company_id = ?
          ${location_id ? 'AND i.location_id = ?' : ''}
      `, location_id ? [req.user.company_id, location_id] : [req.user.company_id]);

      res.json({
        success: true,
        data: {
          low_stock_items: lowStock,
          inventory_value: inventoryValue
        }
      });
    } catch (error) {
      logger.error('Error fetching inventory analytics:', error);
      next(error);
    }
  }

  /**
   * Export report data
   * POST /api/analytics/export
   */
  async exportReport(req, res, next) {
    try {
      const { report_type, start_date, end_date, location_id, format = 'json' } = req.body;

      let data;

      switch (report_type) {
        case 'sales':
          data = await this.getSalesSummary({ query: { start_date, end_date, location_id } }, { json: (d) => d }, () => {});
          break;
        case 'products':
          data = await this.getProductPerformance({ query: { start_date, end_date, location_id } }, { json: (d) => d }, () => {});
          break;
        case 'employees':
          data = await this.getEmployeePerformance({ query: { start_date, end_date, location_id } }, { json: (d) => d }, () => {});
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid report type'
          });
      }

      // In a real implementation, you would convert to CSV/Excel here
      res.json({
        success: true,
        data,
        format
      });
    } catch (error) {
      logger.error('Error exporting report:', error);
      next(error);
    }
  }
}

module.exports = new AnalyticsController();
