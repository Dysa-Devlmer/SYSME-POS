/**
 * Kitchen Controller
 * Manages kitchen display, order processing, and real-time updates
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { redisService } from '../../config/redis.js';
import { emitToRoom } from '../../websockets/socketHandler.js';

// Get all active kitchen orders (pending, preparing, ready)
export const getKitchenOrders = async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    let whereClause = `s.kitchen_status IN ('pending', 'preparing', 'ready') AND s.status != 'cancelled'`;
    const params = [];

    if (status) {
      whereClause = `s.kitchen_status = ? AND s.status != 'cancelled'`;
      params.push(status);
    }

    const orders = await dbService.raw(`
      SELECT
        s.id,
        s.sale_number,
        s.table_id,
        s.table_number,
        s.salon_id,
        s.kitchen_status,
        s.order_type,
        s.notes,
        s.created_at,
        s.total,
        sal.name as salon_name,
        u.first_name || ' ' || u.last_name as waiter_name,
        COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN tables t ON s.table_id = t.id
      LEFT JOIN salons sal ON s.salon_id = sal.id
      LEFT JOIN users u ON s.waiter_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY
        CASE s.kitchen_status
          WHEN 'preparing' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'ready' THEN 3
        END,
        s.created_at ASC
      LIMIT ?
    `, [...params, parseInt(limit)]);

    // Get items for each order
    for (const order of orders) {
      const items = await dbService.raw(`
        SELECT
          si.*,
          p.name as product_name,
          c.name as category_name
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE si.sale_id = ?
        ORDER BY c.kitchen_order ASC, si.id ASC
      `, [order.id]);

      order.items = items;

      // Calculate time since order creation
      const now = new Date();
      const created = new Date(order.created_at);
      order.elapsed_minutes = Math.floor((now - created) / (1000 * 60));

      // Mark orders over 15 minutes as urgent
      order.is_urgent = order.elapsed_minutes > 15;
    }

    res.json({
      success: true,
      orders,
      count: orders.length,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error fetching kitchen orders:', error);
    throw error;
  }
};

// Update kitchen status for an order
export const updateKitchenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { kitchen_status, notes } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(kitchen_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid kitchen status'
      });
    }

    // Get current order
    const order = await dbService.findById('sales', id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    const updateData = {
      kitchen_status,
      kitchen_printed: kitchen_status === 'preparing' ? true : order.kitchen_printed
    };

    if (notes) {
      updateData.kitchen_notes = notes;
    }

    if (kitchen_status === 'preparing' && order.kitchen_status === 'pending') {
      updateData.kitchen_started_at = new Date();
    }

    if (kitchen_status === 'ready' && order.kitchen_status !== 'ready') {
      updateData.kitchen_completed_at = new Date();
    }

    await dbService.update('sales', id, updateData);

    // Update cache
    const orderCache = await redisService.get(`order:${id}`);
    if (orderCache) {
      orderCache.kitchen_status = kitchen_status;
      await redisService.set(`order:${id}`, orderCache, 3600);
    }

    // Send real-time notification
    const statusUpdate = {
      order_id: parseInt(id),
      order_number: order.sale_number,
      table_number: order.table_number,
      salon_name: order.salon_name,
      kitchen_status: kitchen_status,
      updated_at: new Date(),
      updated_by: req.user?.name || 'Kitchen',
      notes: notes
    };

    // Notify all relevant parties
    emitToRoom('kitchen', 'order_status_updated', statusUpdate);

    // Special notification for waiters when order is ready
    if (kitchen_status === 'ready') {
      emitToRoom('waiter', 'order_ready', {
        ...statusUpdate,
        message: `Order ${order.sale_number} is ready for pickup!`
      });
    }

    emitToRoom('admin', 'order_status_updated', statusUpdate);

    res.json({
      success: true,
      message: 'Kitchen status updated successfully',
      order: {
        id: parseInt(id),
        kitchen_status,
        updated_at: new Date()
      }
    });
  } catch (error) {
    logger.error('Error updating kitchen status:', error);
    throw error;
  }
};

// Get kitchen statistics
export const getKitchenStats = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const stats = await dbService.raw(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN kitchen_status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN kitchen_status = 'preparing' THEN 1 END) as preparing_orders,
        COUNT(CASE WHEN kitchen_status = 'ready' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN kitchen_status = 'served' THEN 1 END) as served_orders,
        AVG(CASE
          WHEN kitchen_completed_at IS NOT NULL AND kitchen_started_at IS NOT NULL
          THEN (julianday(kitchen_completed_at) - julianday(kitchen_started_at)) * 24 * 60
        END) as avg_preparation_minutes
      FROM sales
      WHERE DATE(created_at) = ? AND status != 'cancelled'
    `, [today]);

    // Get peak hours data
    const hourlyStats = await dbService.raw(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as order_count
      FROM sales
      WHERE DATE(created_at) = ? AND status != 'cancelled'
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `, [today]);

    res.json({
      success: true,
      stats: stats[0],
      hourly_stats: hourlyStats,
      date: today
    });
  } catch (error) {
    logger.error('Error fetching kitchen stats:', error);
    throw error;
  }
};

// Mark order as printed
export const markOrderPrinted = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('sales', id, {
      kitchen_printed: true,
      kitchen_printed_at: new Date()
    });

    // Update cache
    const orderCache = await redisService.get(`order:${id}`);
    if (orderCache) {
      orderCache.kitchen_printed = true;
      await redisService.set(`order:${id}`, orderCache, 3600);
    }

    // Notify kitchen displays
    emitToRoom('kitchen', 'order_printed', {
      order_id: parseInt(id),
      printed_at: new Date()
    });

    res.json({
      success: true,
      message: 'Order marked as printed'
    });
  } catch (error) {
    logger.error('Error marking order as printed:', error);
    throw error;
  }
};

// Get order details for kitchen
export const getKitchenOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await dbService.raw(`
      SELECT
        s.*,
        t.table_number,
        sal.name as salon_name,
        tar.name as tarifa_name,
        u.first_name || ' ' || u.last_name as waiter_name
      FROM sales s
      LEFT JOIN tables t ON s.table_id = t.id
      LEFT JOIN salons sal ON s.salon_id = sal.id
      LEFT JOIN tarifas tar ON s.tarifa_id = tar.id
      LEFT JOIN users u ON s.waiter_id = u.id
      WHERE s.id = ?
    `, [id]);

    if (!order.length) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const items = await dbService.raw(`
      SELECT
        si.*,
        p.name as product_name,
        p.description as product_description,
        c.name as category_name,
        c.kitchen_order as category_order
      FROM sale_items si
      LEFT JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE si.sale_id = ?
      ORDER BY c.kitchen_order ASC, si.id ASC
    `, [id]);

    const orderData = {
      ...order[0],
      items
    };

    // Calculate timing information
    const now = new Date();
    const created = new Date(orderData.created_at);
    orderData.elapsed_minutes = Math.floor((now - created) / (1000 * 60));
    orderData.is_urgent = orderData.elapsed_minutes > 15;

    if (orderData.kitchen_started_at) {
      const started = new Date(orderData.kitchen_started_at);
      orderData.preparation_minutes = Math.floor((now - started) / (1000 * 60));
    }

    res.json({
      success: true,
      order: orderData
    });
  } catch (error) {
    logger.error('Error fetching kitchen order details:', error);
    throw error;
  }
};