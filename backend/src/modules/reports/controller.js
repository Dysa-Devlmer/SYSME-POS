/**
 * Reports Controller
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get sales report
export const getSalesReport = async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1); // Include end date

    // Convert dates to Unix timestamps (milliseconds)
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    // Get sales summary
    const summary = await dbService.raw(
      `SELECT
        COUNT(*) as total_sales,
        SUM(total) as total_revenue,
        SUM(subtotal) as total_subtotal,
        SUM(discount_amount) as total_discounts,
        AVG(total) as average_sale,
        MIN(total) as min_sale,
        MAX(total) as max_sale
       FROM sales
       WHERE created_at >= ? AND created_at < ? AND status = 'completed'`,
      [startTimestamp, endTimestamp]
    );

    // Get sales by date grouping
    let groupByClause;
    if (group_by === 'hour') {
      groupByClause = "strftime('%Y-%m-%d %H:00:00', datetime(created_at/1000, 'unixepoch'))";
    } else if (group_by === 'month') {
      groupByClause = "strftime('%Y-%m', datetime(created_at/1000, 'unixepoch'))";
    } else {
      groupByClause = "DATE(datetime(created_at/1000, 'unixepoch'))";
    }

    const salesByPeriod = await dbService.raw(
      `SELECT
        ${groupByClause} as period,
        COUNT(*) as sales_count,
        SUM(total) as revenue,
        AVG(total) as average_sale
       FROM sales
       WHERE created_at >= ? AND created_at < ? AND status = 'completed'
       GROUP BY period
       ORDER BY period ASC`,
      [startTimestamp, endTimestamp]
    );

    res.json({
      success: true,
      data: {
        summary: summary[0] || {
          total_sales: 0,
          total_revenue: 0,
          total_subtotal: 0,
          total_discounts: 0,
          average_sale: 0,
          min_sale: 0,
          max_sale: 0
        },
        by_period: salesByPeriod
      }
    });
  } catch (error) {
    logger.error('Error getting sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sales report'
    });
  }
};

// Get inventory report
export const getInventoryReport = async (req, res) => {
  try {
    // Get inventory summary
    const summary = await dbService.raw(
      `SELECT
        COUNT(*) as total_products,
        SUM(stock) as total_stock,
        SUM(stock * price) as total_value,
        COUNT(CASE WHEN stock <= 10 THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock_count
       FROM products
       WHERE is_active = 1`
    );

    // Get products by category
    const byCategory = await dbService.raw(
      `SELECT
        c.name as category_name,
        COUNT(p.id) as product_count,
        SUM(p.stock) as total_stock,
        SUM(p.stock * p.price) as total_value
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = 1
       GROUP BY c.id, c.name
       ORDER BY total_value DESC`
    );

    // Get low stock items
    const lowStock = await dbService.raw(
      `SELECT
        p.id,
        p.name,
        p.sku,
        p.stock,
        p.price,
        c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock <= 10 AND p.is_active = 1
       ORDER BY p.stock ASC
       LIMIT 20`
    );

    res.json({
      success: true,
      data: {
        summary: summary[0] || {
          total_products: 0,
          total_stock: 0,
          total_value: 0,
          low_stock_count: 0,
          out_of_stock_count: 0
        },
        by_category: byCategory,
        low_stock_items: lowStock
      }
    });
  } catch (error) {
    logger.error('Error getting inventory report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting inventory report'
    });
  }
};

// Get product performance report
export const getProductPerformance = async (req, res) => {
  try {
    const { start_date, end_date, limit = 20 } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const productPerformance = await dbService.raw(
      `SELECT
        p.id,
        p.name,
        p.sku,
        SUM(si.quantity) as units_sold,
        SUM(si.total_price) as total_revenue,
        AVG(si.unit_price) as average_price,
        COUNT(DISTINCT si.sale_id) as number_of_sales
       FROM sale_items si
       INNER JOIN sales s ON si.sale_id = s.id
       INNER JOIN products p ON si.product_id = p.id
       WHERE s.created_at >= ? AND s.created_at < ? AND s.status = 'completed'
       GROUP BY p.id, p.name, p.sku
       ORDER BY total_revenue DESC
       LIMIT ?`,
      [startTimestamp, endTimestamp, parseInt(limit)]
    );

    res.json({
      success: true,
      data: productPerformance
    });
  } catch (error) {
    logger.error('Error getting product performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting product performance'
    });
  }
};

// Get category performance report
export const getCategoryPerformance = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const categoryPerformance = await dbService.raw(
      `SELECT
        c.id,
        c.name,
        COUNT(DISTINCT p.id) as products_count,
        SUM(si.quantity) as units_sold,
        SUM(si.total_price) as total_revenue,
        AVG(si.unit_price) as average_price
       FROM sale_items si
       INNER JOIN sales s ON si.sale_id = s.id
       INNER JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE s.created_at >= ? AND s.created_at < ? AND s.status = 'completed'
       GROUP BY c.id, c.name
       ORDER BY total_revenue DESC`,
      [startTimestamp, endTimestamp]
    );

    res.json({
      success: true,
      data: categoryPerformance
    });
  } catch (error) {
    logger.error('Error getting category performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting category performance'
    });
  }
};

// Get payment methods report
export const getPaymentMethodsReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const paymentMethods = await dbService.raw(
      `SELECT
        payment_method,
        COUNT(*) as transaction_count,
        SUM(total) as total_amount,
        AVG(total) as average_transaction,
        MIN(total) as min_transaction,
        MAX(total) as max_transaction
       FROM sales
       WHERE created_at >= ? AND created_at < ? AND status = 'completed'
       GROUP BY payment_method
       ORDER BY total_amount DESC`,
      [startTimestamp, endTimestamp]
    );

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    logger.error('Error getting payment methods report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting payment methods report'
    });
  }
};

// Get hourly sales report
export const getHourlySalesReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const hourlySales = await dbService.raw(
      `SELECT
        strftime('%H', datetime(created_at/1000, 'unixepoch')) as hour,
        COUNT(*) as sales_count,
        SUM(total) as revenue,
        AVG(total) as average_sale
       FROM sales
       WHERE created_at >= ? AND created_at < ? AND status = 'completed'
       GROUP BY hour
       ORDER BY hour ASC`,
      [startTimestamp, endTimestamp]
    );

    // Fill in missing hours with zeros
    const fullDayData = [];
    for (let i = 0; i < 24; i++) {
      const hourStr = i.toString().padStart(2, '0');
      const hourData = hourlySales.find(h => h.hour === hourStr);

      fullDayData.push({
        hour: hourStr,
        sales_count: hourData?.sales_count || 0,
        revenue: hourData?.revenue || 0,
        average_sale: hourData?.average_sale || 0
      });
    }

    res.json({
      success: true,
      data: fullDayData
    });
  } catch (error) {
    logger.error('Error getting hourly sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting hourly sales report'
    });
  }
};

// Get cash sessions report
export const getCashSessionsReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        cs.id,
        cs.session_number,
        cs.user_id,
        u.username,
        cs.opened_at,
        cs.closed_at,
        cs.opening_balance,
        cs.closing_balance,
        cs.expected_balance,
        cs.difference,
        cs.total_sales,
        cs.total_cash,
        cs.total_card,
        cs.sales_count,
        cs.notes,
        cs.status
      FROM cash_sessions cs
      LEFT JOIN users u ON cs.user_id = u.id
    `;

    const params = [];

    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      endDate.setDate(endDate.getDate() + 1);

      query += ` WHERE cs.opened_at >= ? AND cs.opened_at < ?`;
      params.push(startDate.toISOString(), endDate.toISOString());
    }

    query += ` ORDER BY cs.opened_at DESC`;

    const sessions = await dbService.raw(query, params);

    // Calculate summary
    const summary = {
      total_sessions: sessions.length,
      open_sessions: sessions.filter(s => s.status === 'open').length,
      closed_sessions: sessions.filter(s => s.status === 'closed').length,
      total_opening: sessions.reduce((sum, s) => sum + (s.opening_balance || 0), 0),
      total_closing: sessions.reduce((sum, s) => sum + (s.closing_balance || 0), 0),
      total_sales: sessions.reduce((sum, s) => sum + (s.total_sales || 0), 0),
      total_difference: sessions.reduce((sum, s) => sum + (s.difference || 0), 0)
    };

    res.json({
      success: true,
      data: {
        summary,
        sessions
      }
    });
  } catch (error) {
    logger.error('Error getting cash sessions report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting cash sessions report'
    });
  }
};

// Get waiter performance report
export const getWaiterPerformance = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setDate(endDate.getDate() + 1);

    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    const waiterPerformance = await dbService.raw(
      `SELECT
        u.id,
        u.username,
        u.first_name || ' ' || u.last_name as full_name,
        COUNT(DISTINCT s.id) as total_sales,
        SUM(s.total) as total_revenue,
        AVG(s.total) as average_sale,
        COALESCE(SUM(s.tip_amount), 0) as total_tips,
        COALESCE(AVG(s.tip_amount), 0) as average_tip
       FROM users u
       INNER JOIN sales s ON s.waiter_id = u.id
       WHERE s.created_at >= ? AND s.created_at < ? AND s.status = 'completed'
       GROUP BY u.id, u.username
       ORDER BY total_revenue DESC`,
      [startTimestamp, endTimestamp]
    );

    res.json({
      success: true,
      data: waiterPerformance
    });
  } catch (error) {
    logger.error('Error getting waiter performance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting waiter performance'
    });
  }
};

// Get custom report (flexible query builder)
export const getCustomReport = async (req, res) => {
  try {
    const { query, params = [] } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    // Basic SQL injection prevention - only allow SELECT queries
    if (!query.trim().toUpperCase().startsWith('SELECT')) {
      return res.status(400).json({
        success: false,
        message: 'Only SELECT queries are allowed'
      });
    }

    const results = await dbService.raw(query, params);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error executing custom report:', error);
    res.status(500).json({
      success: false,
      message: 'Error executing custom report',
      error: error.message
    });
  }
};
