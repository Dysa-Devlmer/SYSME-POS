/**
 * Orders Controller
 * Manages restaurant orders, replicating legacy POS behavior
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { redisService } from '../../config/redis.js';
import { emitToRoom, broadcastEvent } from '../../websockets/socketHandler.js';

// Generate order number (replicating legacy format)
const generateOrderNumber = async () => {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const lastOrder = await dbService.raw(
    'SELECT sale_number FROM sales WHERE sale_number LIKE ? ORDER BY id DESC LIMIT 1',
    [`ORD${today}%`]
  );

  let sequence = 1;
  if (lastOrder.length > 0) {
    const lastNumber = lastOrder[0].sale_number;
    sequence = parseInt(lastNumber.slice(-4)) + 1;
  }

  return `ORD${today}${sequence.toString().padStart(4, '0')}`;
};

// Create new order (replicate legacy "abrir mesa" functionality)
export const createOrder = async (req, res) => {
  try {
    const {
      table_id,
      items,
      notes,
      order_type = 'table'
    } = req.body;

    const waiter_id = req.user.id;

    // Get table information (if table order)
    let table = null;
    let salon = null;
    let tarifa = null;

    if (table_id && order_type === 'table') {
      const tableInfo = await dbService.raw(`
        SELECT
          t.*,
          s.name as salon_name,
          tar.name as tarifa_name,
          tar.multiplier as tarifa_multiplier
        FROM tables t
        LEFT JOIN salons s ON t.salon_id = s.id
        LEFT JOIN tarifas tar ON t.tarifa_id = tar.id
        WHERE t.id = ? AND t.is_active = 1
      `, [table_id]);

      if (!tableInfo.length) {
        return res.status(404).json({
          success: false,
          message: 'Table not found'
        });
      }

      table = tableInfo[0];

      // Check if table is available
      if (table.status === 'occupied') {
        return res.status(400).json({
          success: false,
          message: 'Table is already occupied'
        });
      }
    }

    // Calculate order totals with tarifa multiplier
    let original_subtotal = 0;
    let subtotal = 0;
    const tarifa_multiplier = table?.tarifa_multiplier || 1.00;

    // Get product prices and calculate totals
    const orderItems = [];
    for (const item of items) {
      const product = await dbService.findById('products', item.product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.product_id} not found`
        });
      }

      const unit_price = parseFloat(product.price);
      const quantity = parseFloat(item.quantity);
      const original_line_total = unit_price * quantity;
      const adjusted_unit_price = unit_price * tarifa_multiplier;
      const adjusted_line_total = adjusted_unit_price * quantity;

      original_subtotal += original_line_total;
      subtotal += adjusted_line_total;

      orderItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: quantity,
        unit_price: adjusted_unit_price,
        total_price: adjusted_line_total,
        original_unit_price: unit_price,
        notes: item.notes || null
      });
    }

    // Calculate tax (21% default)
    const tax_rate = 0.21;
    const tax_amount = subtotal * tax_rate;
    const total = subtotal + tax_amount;

    // Generate order number
    const sale_number = await generateOrderNumber();

    // Create order in transaction
    const result = await dbService.transaction(async (trx) => {
      // Create main order
      const orderData = {
        sale_number,
        table_id: table_id || null,
        table_number: table?.table_number || null,
        salon_id: table?.salon_id || null,
        tarifa_id: table?.tarifa_id || null,
        user_id: waiter_id,
        waiter_id: waiter_id,
        original_subtotal: original_subtotal,
        subtotal: subtotal,
        tax_amount: tax_amount,
        total: total,
        tarifa_multiplier: tarifa_multiplier,
        payment_method: 'pending',
        payment_status: 'pending',
        status: 'draft', // draft -> confirmed -> completed
        kitchen_status: 'pending', // pending -> preparing -> ready -> served
        order_type: order_type,
        notes: notes || null
      };

      const [orderId] = await trx('sales').insert(orderData);

      // Create order items
      const itemsToInsert = orderItems.map(item => ({
        ...item,
        sale_id: orderId
      }));

      await trx('sale_items').insert(itemsToInsert);

      // Update table status if table order
      if (table_id && order_type === 'table') {
        await trx('tables').where('id', table_id).update({ status: 'occupied' });
      }

      return { orderId, orderData };
    });

    // Store order in cache for real-time updates
    const orderCache = {
      id: result.orderId,
      ...result.orderData,
      items: orderItems,
      table_info: table ? {
        id: table.id,
        number: table.table_number,
        salon_name: table.salon_name,
        tarifa_name: table.tarifa_name
      } : null
    };

    await redisService.set(`order:${result.orderId}`, orderCache, 3600); // 1 hour

    // Notify kitchen if has food items
    const kitchenNotification = {
      order_id: result.orderId,
      order_number: sale_number,
      table: table?.table_number || 'Takeaway',
      salon: table?.salon_name || 'N/A',
      waiter: req.user.name,
      items: orderItems,
      notes: notes,
      created_at: new Date(),
      status: 'pending'
    };

    await redisService.set(`kitchen:order:${result.orderId}`, kitchenNotification, 7200); // 2 hours

    // Send real-time notification to kitchen
    emitToRoom('kitchen', 'new_order', {
      id: result.orderId,
      order_number: sale_number,
      table_number: table?.table_number || 'Takeaway',
      salon_name: table?.salon_name || 'N/A',
      waiter_name: req.user.name,
      items: orderItems,
      notes: notes,
      created_at: new Date(),
      total: total,
      kitchen_status: 'pending'
    });

    // Notify admins/managers
    emitToRoom('admin', 'new_order', {
      id: result.orderId,
      order_number: sale_number,
      table_info: orderCache.table_info,
      total: total,
      waiter: req.user.name,
      created_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: {
        id: result.orderId,
        order_number: sale_number,
        ...orderCache
      }
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    throw error;
  }
};

// Get active orders for kitchen display
export const getKitchenOrders = async (req, res) => {
  try {
    const orders = await dbService.raw(`
      SELECT
        s.*,
        t.table_number,
        sal.name as salon_name,
        u.first_name || ' ' || u.last_name as waiter_name,
        COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN tables t ON s.table_id = t.id
      LEFT JOIN salons sal ON s.salon_id = sal.id
      LEFT JOIN users u ON s.waiter_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.kitchen_status IN ('pending', 'preparing')
      AND s.status != 'cancelled'
      GROUP BY s.id
      ORDER BY s.created_at ASC
    `);

    // Get items for each order
    for (const order of orders) {
      const items = await dbService.raw(
        'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id',
        [order.id]
      );
      order.items = items;
    }

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    logger.error('Error fetching kitchen orders:', error);
    throw error;
  }
};

// Update kitchen status
export const updateKitchenStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { kitchen_status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'served'];
    if (!validStatuses.includes(kitchen_status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid kitchen status'
      });
    }

    await dbService.update('sales', id, {
      kitchen_status,
      kitchen_printed: kitchen_status === 'preparing' ? true : undefined
    });

    // Update cache
    const orderCache = await redisService.get(`order:${id}`);
    if (orderCache) {
      orderCache.kitchen_status = kitchen_status;
      await redisService.set(`order:${id}`, orderCache, 3600);
    }

    // Update kitchen notification
    const kitchenCache = await redisService.get(`kitchen:order:${id}`);
    if (kitchenCache) {
      kitchenCache.status = kitchen_status;
      await redisService.set(`kitchen:order:${id}`, kitchenCache, 7200);
    }

    // Send real-time notification to all relevant parties
    const statusUpdate = {
      order_id: id,
      kitchen_status: kitchen_status,
      updated_at: new Date(),
      updated_by: req.user?.name || 'Kitchen'
    };

    // Notify kitchen displays
    emitToRoom('kitchen', 'order_status_updated', statusUpdate);

    // Notify waiters about order ready status
    if (kitchen_status === 'ready') {
      emitToRoom('waiter', 'order_ready', statusUpdate);
    }

    // Notify admins
    emitToRoom('admin', 'order_status_updated', statusUpdate);

    res.json({
      success: true,
      message: 'Kitchen status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating kitchen status:', error);
    throw error;
  }
};

// Get orders by table
export const getTableOrders = async (req, res) => {
  try {
    const { table_id } = req.params;

    const orders = await dbService.raw(`
      SELECT
        s.*,
        t.table_number,
        sal.name as salon_name,
        tar.name as tarifa_name,
        tar.multiplier as tarifa_multiplier,
        u.first_name || ' ' || u.last_name as waiter_name
      FROM sales s
      LEFT JOIN tables t ON s.table_id = t.id
      LEFT JOIN salons sal ON s.salon_id = sal.id
      LEFT JOIN tarifas tar ON s.tarifa_id = tar.id
      LEFT JOIN users u ON s.waiter_id = u.id
      WHERE s.table_id = ? AND s.status != 'completed'
      ORDER BY s.created_at DESC
    `, [table_id]);

    // Get items for each order
    for (const order of orders) {
      const items = await dbService.raw(
        'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id',
        [order.id]
      );
      order.items = items;
    }

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    logger.error('Error fetching table orders:', error);
    throw error;
  }
};

// Complete order and close table
export const completeOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, discount_amount = 0 } = req.body;

    const order = await dbService.findById('sales', id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Recalculate total with discount
    const final_total = order.total - discount_amount;

    await dbService.transaction(async (trx) => {
      // Update order
      await trx('sales').where('id', id).update({
        payment_method,
        discount_amount,
        total: final_total,
        payment_status: 'paid',
        status: 'completed',
        kitchen_status: 'served'
      });

      // Free the table
      if (order.table_id) {
        await trx('tables').where('id', order.table_id).update({ status: 'free' });
      }
    });

    // Clean up cache
    await redisService.del(`order:${id}`);
    await redisService.del(`kitchen:order:${id}`);

    // Send real-time notifications
    const completionData = {
      order_id: id,
      table_id: order.table_id,
      table_number: order.table_number,
      payment_method: payment_method,
      final_total: final_total,
      completed_at: new Date(),
      waiter: req.user?.name || 'System'
    };

    // Notify all relevant parties
    emitToRoom('kitchen', 'order_completed', completionData);
    emitToRoom('waiter', 'order_completed', completionData);
    emitToRoom('admin', 'order_completed', completionData);

    // If table was freed, notify about table status change
    if (order.table_id) {
      broadcastEvent('table_status_updated', {
        table_id: order.table_id,
        table_number: order.table_number,
        status: 'free',
        updated_at: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Order completed successfully',
      final_total
    });
  } catch (error) {
    logger.error('Error completing order:', error);
    throw error;
  }
};

// Get order details
export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await dbService.raw(`
      SELECT
        s.*,
        t.table_number,
        sal.name as salon_name,
        tar.name as tarifa_name,
        tar.multiplier as tarifa_multiplier,
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

    const items = await dbService.raw(
      'SELECT * FROM sale_items WHERE sale_id = ? ORDER BY id',
      [id]
    );

    const orderData = {
      ...order[0],
      items
    };

    res.json({
      success: true,
      order: orderData
    });
  } catch (error) {
    logger.error('Error fetching order:', error);
    throw error;
  }
};