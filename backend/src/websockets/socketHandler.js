/**
 * WebSocket Handler for Kitchen Communication
 * Manages real-time communication for kitchen orders and status updates
 */

import { Server } from 'socket.io';
import { logger } from '../config/logger.js';
import { dbService } from '../config/database.js';

let io = null;

// Order statuses
const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 * @param {Object} options - Socket.IO options
 */
export const initializeSocket = (httpServer, options = {}) => {
  try {
    io = new Server(httpServer, {
      cors: {
        origin: options.corsOrigin || '*',
        methods: ['GET', 'POST'],
        credentials: true
      },
      ...options
    });

    logger.info('Socket.IO server initialized');

    // Connection handler
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join room based on client type (kitchen, waiter, admin)
      socket.on('join', (data) => {
        handleJoin(socket, data);
      });

      // New order created
      socket.on('new_order', (data) => {
        handleNewOrder(socket, data);
      });

      // Order status update
      socket.on('update_order_status', (data) => {
        handleOrderStatusUpdate(socket, data);
      });

      // Request all pending orders
      socket.on('get_pending_orders', async () => {
        await handleGetPendingOrders(socket);
      });

      // Request specific order details
      socket.on('get_order', async (data) => {
        await handleGetOrder(socket, data);
      });

      // Cancel order
      socket.on('cancel_order', (data) => {
        handleCancelOrder(socket, data);
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error('Socket error:', error);
      });
    });

    return io;
  } catch (error) {
    logger.error('Error initializing Socket.IO:', error);
    throw error;
  }
};

/**
 * Handle client joining a room
 */
const handleJoin = (socket, data) => {
  try {
    const { room, userId, userName } = data;

    if (!room) {
      socket.emit('error', { message: 'Room is required' });
      return;
    }

    socket.join(room);
    socket.data.room = room;
    socket.data.userId = userId;
    socket.data.userName = userName;

    logger.info(`Client ${socket.id} (${userName}) joined room: ${room}`);

    socket.emit('joined', {
      room,
      message: `Successfully joined ${room}`
    });

    // Notify others in the room
    socket.to(room).emit('user_joined', {
      userId,
      userName,
      socketId: socket.id
    });
  } catch (error) {
    logger.error('Error handling join:', error);
    socket.emit('error', { message: 'Failed to join room' });
  }
};

/**
 * Handle new order creation
 */
const handleNewOrder = async (socket, data) => {
  try {
    const { orderId, tableNumber, items, notes } = data;

    if (!orderId) {
      socket.emit('error', { message: 'Order ID is required' });
      return;
    }

    // Get full order details from database
    let orderDetails;
    try {
      const order = await dbService.findById('sales', orderId);
      const orderItems = await dbService.findMany('sale_items', { sale_id: orderId });

      orderDetails = {
        id: order.id,
        table_number: order.table_number || tableNumber,
        status: ORDER_STATUS.PENDING,
        items: orderItems,
        notes: order.notes || notes,
        created_at: order.created_at,
        total: order.total
      };
    } catch (dbError) {
      logger.warn('Could not fetch order from database, using provided data');
      orderDetails = {
        id: orderId,
        table_number: tableNumber,
        status: ORDER_STATUS.PENDING,
        items: items || [],
        notes: notes || '',
        created_at: new Date(),
        total: 0
      };
    }

    // Emit to kitchen room
    io.to('kitchen').emit('new_order', orderDetails);

    // Emit to admin room
    io.to('admin').emit('new_order', orderDetails);

    logger.info(`New order broadcast - Order ID: ${orderId}, Table: ${tableNumber}`);

    socket.emit('order_created', {
      success: true,
      orderId,
      message: 'Order sent to kitchen'
    });
  } catch (error) {
    logger.error('Error handling new order:', error);
    socket.emit('error', { message: 'Failed to process new order' });
  }
};

/**
 * Handle order status update
 */
const handleOrderStatusUpdate = async (socket, data) => {
  try {
    const { orderId, status, updatedBy } = data;

    if (!orderId || !status) {
      socket.emit('error', { message: 'Order ID and status are required' });
      return;
    }

    // Validate status
    if (!Object.values(ORDER_STATUS).includes(status)) {
      socket.emit('error', { message: 'Invalid order status' });
      return;
    }

    // Update order in database (if kitchen_orders table exists)
    try {
      await dbService.raw(
        `UPDATE kitchen_orders SET status = ?, updated_at = ?, updated_by = ? WHERE order_id = ?`,
        [status, new Date().toISOString(), updatedBy, orderId]
      );
    } catch (dbError) {
      // Table might not exist, just log it
      logger.warn('Could not update kitchen_orders table:', dbError.message);
    }

    const updateData = {
      orderId,
      status,
      updatedBy,
      updatedAt: new Date()
    };

    // Broadcast to all rooms
    io.to('kitchen').emit('order_status_updated', updateData);
    io.to('waiter').emit('order_status_updated', updateData);
    io.to('admin').emit('order_status_updated', updateData);

    logger.info(`Order ${orderId} status updated to ${status} by ${updatedBy}`);

    socket.emit('status_updated', {
      success: true,
      orderId,
      status,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    logger.error('Error handling order status update:', error);
    socket.emit('error', { message: 'Failed to update order status' });
  }
};

/**
 * Get all pending orders
 */
const handleGetPendingOrders = async (socket) => {
  try {
    let pendingOrders = [];

    try {
      // Try to get from kitchen_orders table
      pendingOrders = await dbService.raw(
        `SELECT ko.*, s.table_number, s.total, s.created_at
         FROM kitchen_orders ko
         INNER JOIN sales s ON ko.order_id = s.id
         WHERE ko.status IN (?, ?)
         ORDER BY ko.created_at ASC`,
        [ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING]
      );

      // Get items for each order
      for (const order of pendingOrders) {
        const items = await dbService.findMany('sale_items', { sale_id: order.order_id });
        order.items = items;
      }
    } catch (dbError) {
      // Fallback to sales table
      logger.warn('Using fallback method for pending orders');
      const sales = await dbService.raw(
        `SELECT * FROM sales WHERE status = ? ORDER BY created_at DESC LIMIT 20`,
        ['completed']
      );

      for (const sale of sales) {
        const items = await dbService.findMany('sale_items', { sale_id: sale.id });
        pendingOrders.push({
          order_id: sale.id,
          table_number: sale.table_number,
          status: ORDER_STATUS.PENDING,
          total: sale.total,
          created_at: sale.created_at,
          items
        });
      }
    }

    socket.emit('pending_orders', {
      success: true,
      orders: pendingOrders,
      count: pendingOrders.length
    });
  } catch (error) {
    logger.error('Error getting pending orders:', error);
    socket.emit('error', { message: 'Failed to get pending orders' });
  }
};

/**
 * Get specific order details
 */
const handleGetOrder = async (socket, data) => {
  try {
    const { orderId } = data;

    if (!orderId) {
      socket.emit('error', { message: 'Order ID is required' });
      return;
    }

    // Get order details
    const order = await dbService.findById('sales', orderId);

    if (!order) {
      socket.emit('error', { message: 'Order not found' });
      return;
    }

    // Get order items
    const items = await dbService.findMany('sale_items', { sale_id: orderId });

    // Try to get kitchen order status
    let kitchenStatus = ORDER_STATUS.PENDING;
    try {
      const kitchenOrder = await dbService.raw(
        `SELECT status FROM kitchen_orders WHERE order_id = ? LIMIT 1`,
        [orderId]
      );
      if (kitchenOrder.length > 0) {
        kitchenStatus = kitchenOrder[0].status;
      }
    } catch (err) {
      // Kitchen orders table might not exist
      logger.warn('Could not fetch kitchen order status');
    }

    socket.emit('order_details', {
      success: true,
      order: {
        ...order,
        items,
        kitchen_status: kitchenStatus
      }
    });
  } catch (error) {
    logger.error('Error getting order:', error);
    socket.emit('error', { message: 'Failed to get order details' });
  }
};

/**
 * Handle order cancellation
 */
const handleCancelOrder = async (socket, data) => {
  try {
    const { orderId, reason, cancelledBy } = data;

    if (!orderId) {
      socket.emit('error', { message: 'Order ID is required' });
      return;
    }

    // Update order status
    try {
      await dbService.raw(
        `UPDATE kitchen_orders SET status = ?, updated_at = ?, cancel_reason = ?, cancelled_by = ? WHERE order_id = ?`,
        [ORDER_STATUS.CANCELLED, new Date().toISOString(), reason, cancelledBy, orderId]
      );
    } catch (dbError) {
      logger.warn('Could not update kitchen_orders table');
    }

    const cancelData = {
      orderId,
      status: ORDER_STATUS.CANCELLED,
      reason,
      cancelledBy,
      cancelledAt: new Date()
    };

    // Broadcast to all rooms
    io.to('kitchen').emit('order_cancelled', cancelData);
    io.to('waiter').emit('order_cancelled', cancelData);
    io.to('admin').emit('order_cancelled', cancelData);

    logger.info(`Order ${orderId} cancelled by ${cancelledBy}`);

    socket.emit('order_cancelled', {
      success: true,
      orderId,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    logger.error('Error cancelling order:', error);
    socket.emit('error', { message: 'Failed to cancel order' });
  }
};

/**
 * Emit event to specific room
 */
export const emitToRoom = (room, event, data) => {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }

  io.to(room).emit(event, data);
};

/**
 * Broadcast event to all clients
 */
export const broadcastEvent = (event, data) => {
  if (!io) {
    logger.warn('Socket.IO not initialized');
    return;
  }

  io.emit(event, data);
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    logger.warn('Socket.IO not initialized');
  }
  return io;
};

export { ORDER_STATUS };
export default {
  initializeSocket,
  emitToRoom,
  broadcastEvent,
  getIO,
  ORDER_STATUS
};
