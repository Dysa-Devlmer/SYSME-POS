/**
 * Analytics Controller - ES Modules Version
 * Provides metrics, KPIs and analytics endpoints
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Helper function to get date range
const getDateRange = (startDate, endDate) => {
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

// Calculate growth percentage
const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous * 100).toFixed(2);
};

/**
 * Get sales metrics
 */
export const getSalesMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = getDateRange(startDate, endDate);

    // Get current period metrics
    const currentSales = await dbService.query(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as average_ticket,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(discount_amount), 0) as total_discount
      FROM sales
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
    `, [dateRange.start, dateRange.end]);

    // Get previous period for comparison
    const daysDiff = Math.ceil((new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24));
    const prevEnd = new Date(dateRange.start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - daysDiff);

    const previousSales = await dbService.query(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total), 0) as total_sales,
        COALESCE(AVG(total), 0) as average_ticket
      FROM sales
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
    `, [prevStart.toISOString().split('T')[0], prevEnd.toISOString().split('T')[0]]);

    // Sales by day timeline
    const timeline = await dbService.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [dateRange.start, dateRange.end]);

    // Top products
    const topProducts = await dbService.query(`
      SELECT
        si.product_name,
        SUM(si.quantity) as quantity,
        SUM(si.total_price) as revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
        AND DATE(s.created_at) BETWEEN ? AND ?
      GROUP BY si.product_name
      ORDER BY revenue DESC
      LIMIT 10
    `, [dateRange.start, dateRange.end]);

    // Sales by payment method
    const paymentBreakdown = await dbService.query(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as total
      FROM sales
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
      GROUP BY payment_method
    `, [dateRange.start, dateRange.end]);

    const current = currentSales[0] || {};
    const previous = previousSales[0] || {};

    res.json({
      success: true,
      data: {
        totalSales: parseFloat(current.total_sales) || 0,
        totalTransactions: parseInt(current.total_transactions) || 0,
        averageTicket: parseFloat(current.average_ticket) || 0,
        totalTax: parseFloat(current.total_tax) || 0,
        totalDiscount: parseFloat(current.total_discount) || 0,
        salesGrowth: calculateGrowth(current.total_sales, previous.total_sales),
        transactionGrowth: calculateGrowth(current.total_transactions, previous.total_transactions),
        ticketGrowth: calculateGrowth(current.average_ticket, previous.average_ticket),
        timeline,
        topProducts,
        paymentBreakdown,
        dateRange
      }
    });
  } catch (error) {
    logger.error('Error getting sales metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get inventory metrics
 */
export const getInventoryMetrics = async (req, res) => {
  try {
    // Total products
    const productStats = await dbService.query(`
      SELECT
        COUNT(*) as total_products,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_products,
        SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END) as low_stock_count,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock
      FROM products
    `);

    // Stock value
    const stockValue = await dbService.query(`
      SELECT
        COALESCE(SUM(stock * cost), 0) as cost_value,
        COALESCE(SUM(stock * price), 0) as retail_value
      FROM products
      WHERE is_active = 1
    `);

    // Low stock items
    const lowStockItems = await dbService.query(`
      SELECT id, name, stock, min_stock, price
      FROM products
      WHERE stock <= min_stock AND is_active = 1
      ORDER BY stock ASC
      LIMIT 10
    `);

    // Category breakdown
    const categoryBreakdown = await dbService.query(`
      SELECT
        c.name as category,
        COUNT(p.id) as product_count,
        COALESCE(SUM(p.stock), 0) as total_stock,
        COALESCE(SUM(p.stock * p.price), 0) as stock_value
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      GROUP BY c.id, c.name
      ORDER BY stock_value DESC
    `);

    const stats = productStats[0] || {};
    const values = stockValue[0] || {};

    res.json({
      success: true,
      data: {
        totalProducts: parseInt(stats.total_products) || 0,
        activeProducts: parseInt(stats.active_products) || 0,
        lowStockCount: parseInt(stats.low_stock_count) || 0,
        outOfStockCount: parseInt(stats.out_of_stock) || 0,
        stockCostValue: parseFloat(values.cost_value) || 0,
        stockRetailValue: parseFloat(values.retail_value) || 0,
        lowStockItems,
        categoryBreakdown
      }
    });
  } catch (error) {
    logger.error('Error getting inventory metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get customer metrics
 */
export const getCustomerMetrics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = getDateRange(startDate, endDate);

    // Sales by customer (user_id represents waiter/cashier in this context)
    const userSales = await dbService.query(`
      SELECT
        u.username,
        u.first_name,
        u.last_name,
        COUNT(s.id) as transactions,
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(AVG(s.total), 0) as average_ticket
      FROM users u
      LEFT JOIN sales s ON u.id = s.user_id
        AND s.status = 'completed'
        AND DATE(s.created_at) BETWEEN ? AND ?
      WHERE u.role IN ('waiter', 'cashier')
      GROUP BY u.id
      ORDER BY total_sales DESC
    `, [dateRange.start, dateRange.end]);

    res.json({
      success: true,
      data: {
        staffPerformance: userSales,
        dateRange
      }
    });
  } catch (error) {
    logger.error('Error getting customer metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = async (req, res) => {
  try {
    // Get system stats
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Database stats
    const dbStats = await dbService.query(`
      SELECT
        (SELECT COUNT(*) FROM sales) as total_sales,
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM sales WHERE DATE(created_at) = DATE('now')) as today_sales
    `);

    res.json({
      success: true,
      data: {
        system: {
          uptime: Math.floor(uptime),
          memoryUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          memoryTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          memoryExternal: Math.round(memoryUsage.external / 1024 / 1024)
        },
        database: dbStats[0] || {}
      }
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get KPIs
 */
export const getKPIs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = getDateRange(startDate, endDate);

    // Key performance indicators
    const salesKPI = await dbService.query(`
      SELECT
        COALESCE(SUM(total), 0) as total_revenue,
        COUNT(*) as total_orders,
        COALESCE(AVG(total), 0) as avg_order_value
      FROM sales
      WHERE status = 'completed'
        AND DATE(created_at) BETWEEN ? AND ?
    `, [dateRange.start, dateRange.end]);

    const productKPI = await dbService.query(`
      SELECT
        COUNT(*) as products_sold,
        COUNT(DISTINCT si.product_id) as unique_products
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status = 'completed'
        AND DATE(s.created_at) BETWEEN ? AND ?
    `, [dateRange.start, dateRange.end]);

    const sales = salesKPI[0] || {};
    const products = productKPI[0] || {};

    res.json({
      success: true,
      data: {
        revenue: {
          value: parseFloat(sales.total_revenue) || 0,
          target: 1000000, // Example target
          progress: ((parseFloat(sales.total_revenue) || 0) / 1000000 * 100).toFixed(1)
        },
        orders: {
          value: parseInt(sales.total_orders) || 0,
          target: 500,
          progress: ((parseInt(sales.total_orders) || 0) / 500 * 100).toFixed(1)
        },
        averageTicket: {
          value: parseFloat(sales.avg_order_value) || 0,
          target: 15000,
          progress: ((parseFloat(sales.avg_order_value) || 0) / 15000 * 100).toFixed(1)
        },
        productsSold: parseInt(products.products_sold) || 0,
        uniqueProducts: parseInt(products.unique_products) || 0,
        dateRange
      }
    });
  } catch (error) {
    logger.error('Error getting KPIs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get trend analysis
 */
export const getTrendAnalysis = async (req, res) => {
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
        dateFormat = '%Y-%W';
        break;
      case 'monthly':
        groupBy = "strftime('%Y-%m', created_at)";
        dateFormat = '%Y-%m';
        break;
      case 'yearly':
        groupBy = "strftime('%Y', created_at)";
        dateFormat = '%Y';
        break;
      default:
        groupBy = "DATE(created_at)";
    }

    const trends = await dbService.query(`
      SELECT
        ${groupBy} as period,
        COUNT(*) as transactions,
        COALESCE(SUM(total), 0) as revenue
      FROM sales
      WHERE status = 'completed'
      GROUP BY ${groupBy}
      ORDER BY period DESC
      LIMIT 30
    `);

    res.json({
      success: true,
      data: {
        metric,
        period,
        trends: trends.reverse()
      }
    });
  } catch (error) {
    logger.error('Error getting trend analysis:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Get predictions (simplified version)
 */
export const getPredictions = async (req, res) => {
  try {
    const { metric, days = 7 } = req.query;

    // Get historical data
    const historical = await dbService.query(`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(total), 0) as value
      FROM sales
      WHERE status = 'completed'
        AND created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Simple prediction based on average
    const values = historical.map(h => parseFloat(h.value) || 0);
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    // Generate predictions
    const predictions = [];
    const today = new Date();
    for (let i = 1; i <= parseInt(days); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      predictions.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(average * (0.9 + Math.random() * 0.2)),
        confidence: 0.75
      });
    }

    res.json({
      success: true,
      data: {
        metric,
        historical,
        predictions,
        averageValue: Math.round(average)
      }
    });
  } catch (error) {
    logger.error('Error getting predictions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Compare periods
 */
export const compareAnalysis = async (req, res) => {
  try {
    const { period1, period2 } = req.body;

    const [sales1, sales2] = await Promise.all([
      dbService.query(`
        SELECT
          COUNT(*) as transactions,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(AVG(total), 0) as average_ticket
        FROM sales
        WHERE status = 'completed'
          AND DATE(created_at) BETWEEN ? AND ?
      `, [period1.start, period1.end]),
      dbService.query(`
        SELECT
          COUNT(*) as transactions,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(AVG(total), 0) as average_ticket
        FROM sales
        WHERE status = 'completed'
          AND DATE(created_at) BETWEEN ? AND ?
      `, [period2.start, period2.end])
    ]);

    const p1 = sales1[0] || {};
    const p2 = sales2[0] || {};

    res.json({
      success: true,
      data: {
        period1: {
          ...period1,
          transactions: parseInt(p1.transactions) || 0,
          revenue: parseFloat(p1.revenue) || 0,
          averageTicket: parseFloat(p1.average_ticket) || 0
        },
        period2: {
          ...period2,
          transactions: parseInt(p2.transactions) || 0,
          revenue: parseFloat(p2.revenue) || 0,
          averageTicket: parseFloat(p2.average_ticket) || 0
        },
        comparison: {
          transactionsChange: calculateGrowth(p1.transactions, p2.transactions),
          revenueChange: calculateGrowth(p1.revenue, p2.revenue),
          ticketChange: calculateGrowth(p1.average_ticket, p2.average_ticket)
        }
      }
    });
  } catch (error) {
    logger.error('Error comparing periods:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Export metrics (returns data for export)
 */
export const exportMetrics = async (req, res) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;
    const dateRange = getDateRange(startDate, endDate);

    const sales = await dbService.query(`
      SELECT
        s.sale_number,
        s.created_at,
        s.total,
        s.payment_method,
        s.status,
        u.username as cashier
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
      ORDER BY s.created_at DESC
    `, [dateRange.start, dateRange.end]);

    res.json({
      success: true,
      data: {
        format,
        dateRange,
        records: sales,
        count: sales.length
      }
    });
  } catch (error) {
    logger.error('Error exporting metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
