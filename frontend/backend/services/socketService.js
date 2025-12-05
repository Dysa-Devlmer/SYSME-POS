// =====================================================
// SYSME POS - Socket.IO Service for Real-Time Updates
// =====================================================

const socketIO = require('socket.io');
const logger = require('../config/logger');
const config = require('../config/config');

class SocketService {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.connectedClients = new Map();
    this.setupEventHandlers();

    logger.info('Socket.IO service initialized');
  }

  /**
   * Setup event handlers for socket connections
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, {
        id: socket.id,
        connectedAt: new Date(),
        rooms: []
      });

      // ============================================
      // ROOM MANAGEMENT
      // ============================================

      socket.on('join-kitchen', (data) => {
        socket.join('kitchen');
        this.connectedClients.get(socket.id).rooms.push('kitchen');
        logger.debug(`Client ${socket.id} joined kitchen room`);
        socket.emit('room-joined', { room: 'kitchen' });
      });

      socket.on('leave-kitchen', () => {
        socket.leave('kitchen');
        logger.debug(`Client ${socket.id} left kitchen room`);
      });

      socket.on('join-cashier', (data) => {
        socket.join('cashier');
        this.connectedClients.get(socket.id).rooms.push('cashier');
        logger.debug(`Client ${socket.id} joined cashier room`);
        socket.emit('room-joined', { room: 'cashier' });
      });

      socket.on('join-table', (tableId) => {
        const room = `table-${tableId}`;
        socket.join(room);
        this.connectedClients.get(socket.id).rooms.push(room);
        logger.debug(`Client ${socket.id} joined ${room}`);
        socket.emit('room-joined', { room });
      });

      socket.on('leave-table', (tableId) => {
        const room = `table-${tableId}`;
        socket.leave(room);
        logger.debug(`Client ${socket.id} left ${room}`);
      });

      // ============================================
      // DISCONNECTION
      // ============================================

      socket.on('disconnect', (reason) => {
        logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Emit new order to kitchen
   */
  emitNewOrder(order) {
    this.io.to('kitchen').emit('new-order', {
      type: 'NEW_ORDER',
      data: order,
      timestamp: new Date().toISOString()
    });
    logger.debug(`Emitted new order to kitchen: Order #${order.id}`);
  }

  /**
   * Emit order status update
   */
  emitOrderUpdate(order) {
    this.io.emit('order-updated', {
      type: 'ORDER_UPDATED',
      data: order,
      timestamp: new Date().toISOString()
    });

    // Also emit to specific table if exists
    if (order.table_id) {
      this.io.to(`table-${order.table_id}`).emit('table-order-updated', {
        type: 'TABLE_ORDER_UPDATED',
        data: order,
        timestamp: new Date().toISOString()
      });
    }

    logger.debug(`Emitted order update: Order #${order.id}`);
  }

  /**
   * Emit order ready notification
   */
  emitOrderReady(order) {
    this.io.emit('order-ready', {
      type: 'ORDER_READY',
      data: order,
      timestamp: new Date().toISOString()
    });

    if (order.table_id) {
      this.io.to(`table-${order.table_id}`).emit('table-order-ready', {
        type: 'TABLE_ORDER_READY',
        data: order,
        timestamp: new Date().toISOString()
      });
    }

    logger.debug(`Emitted order ready: Order #${order.id}`);
  }

  /**
   * Emit table status change
   */
  emitTableUpdate(table) {
    this.io.emit('table-updated', {
      type: 'TABLE_UPDATED',
      data: table,
      timestamp: new Date().toISOString()
    });

    this.io.to(`table-${table.id}`).emit('table-status-changed', {
      type: 'TABLE_STATUS_CHANGED',
      data: table,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted table update: Table #${table.id}`);
  }

  /**
   * Emit cash session update
   */
  emitCashUpdate(cashSession) {
    this.io.to('cashier').emit('cash-updated', {
      type: 'CASH_UPDATED',
      data: cashSession,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted cash session update: Session #${cashSession.id}`);
  }

  /**
   * Emit sale completed
   */
  emitSaleCompleted(sale) {
    this.io.emit('sale-completed', {
      type: 'SALE_COMPLETED',
      data: sale,
      timestamp: new Date().toISOString()
    });

    this.io.to('cashier').emit('new-sale', {
      type: 'NEW_SALE',
      data: sale,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted sale completed: Sale #${sale.id}`);
  }

  /**
   * Emit inventory alert (low stock)
   */
  emitInventoryAlert(alert) {
    this.io.emit('inventory-alert', {
      type: 'INVENTORY_ALERT',
      data: alert,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted inventory alert: ${alert.product_name}`);
  }

  /**
   * Emit reservation update
   */
  emitReservationUpdate(reservation) {
    this.io.emit('reservation-updated', {
      type: 'RESERVATION_UPDATED',
      data: reservation,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted reservation update: #${reservation.id}`);
  }

  /**
   * Emit delivery order update
   */
  emitDeliveryUpdate(deliveryOrder) {
    this.io.emit('delivery-updated', {
      type: 'DELIVERY_UPDATED',
      data: deliveryOrder,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted delivery update: Order #${deliveryOrder.id}`);
  }

  /**
   * Emit system notification to all clients
   */
  emitSystemNotification(notification) {
    this.io.emit('system-notification', {
      type: 'SYSTEM_NOTIFICATION',
      data: notification,
      timestamp: new Date().toISOString()
    });

    logger.info(`Emitted system notification: ${notification.message}`);
  }

  /**
   * Emit notification to specific user
   */
  emitUserNotification(userId, notification) {
    this.io.to(`user-${userId}`).emit('user-notification', {
      type: 'USER_NOTIFICATION',
      data: notification,
      timestamp: new Date().toISOString()
    });

    logger.debug(`Emitted user notification to user ${userId}`);
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get room participants
   */
  getRoomParticipants(room) {
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    return roomSockets ? roomSockets.size : 0;
  }

  /**
   * Close all connections
   */
  close() {
    this.io.close();
    this.connectedClients.clear();
    logger.info('Socket.IO service closed');
  }
}

module.exports = SocketService;
