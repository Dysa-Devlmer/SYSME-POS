/**
 * Kitchen Display System (KDS) Controller
 * Professional kitchen management for multi-station restaurants
 *
 * Features:
 * - Multi-station routing (Grill, Fryer, Salads, Drinks, Desserts)
 * - Item-level status tracking with bump functionality
 * - Priority system (Urgent, Rush, Normal, Scheduled)
 * - Real-time WebSocket updates
 * - Recall completed orders
 * - Performance analytics
 * - Timer alerts for delayed orders
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { emitToRoom, emitToStation } from '../../websockets/socketHandler.js';

// =============================================
// CONSTANTS
// =============================================

const ITEM_STATUSES = ['pending', 'preparing', 'ready', 'served', 'voided'];
const ORDER_PRIORITIES = ['scheduled', 'normal', 'rush', 'urgent'];
const DEFAULT_ALERT_MINUTES = { normal: 15, rush: 10, urgent: 5 };

// =============================================
// DATABASE INITIALIZATION
// =============================================

export const initKDSTables = async () => {
  try {
    // Kitchen Stations table
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS kds_stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        display_name TEXT,
        color TEXT DEFAULT '#3B82F6',
        icon TEXT DEFAULT 'utensils',
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        branch_id INTEGER,
        printer_id INTEGER,
        alert_minutes INTEGER DEFAULT 15,
        auto_bump_minutes INTEGER,
        show_item_notes INTEGER DEFAULT 1,
        show_modifiers INTEGER DEFAULT 1,
        sound_enabled INTEGER DEFAULT 1,
        sound_new_order TEXT DEFAULT 'ding',
        sound_urgent TEXT DEFAULT 'alert',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Category to Station routing
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS kds_category_routing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category_id INTEGER NOT NULL,
        station_id INTEGER NOT NULL,
        priority INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (station_id) REFERENCES kds_stations(id),
        UNIQUE(category_id, station_id)
      )
    `);

    // Individual item status tracking
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS kds_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        sale_item_id INTEGER NOT NULL,
        station_id INTEGER,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        position INTEGER DEFAULT 0,
        quantity INTEGER DEFAULT 1,
        product_name TEXT,
        modifiers TEXT,
        notes TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        bumped_by INTEGER,
        recalled INTEGER DEFAULT 0,
        recall_count INTEGER DEFAULT 0,
        voided_at DATETIME,
        void_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (sale_item_id) REFERENCES sale_items(id),
        FOREIGN KEY (station_id) REFERENCES kds_stations(id)
      )
    `);

    // Order priority and timing tracking
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS kds_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER UNIQUE NOT NULL,
        priority TEXT DEFAULT 'normal',
        fire_time DATETIME,
        target_time DATETIME,
        all_items_ready INTEGER DEFAULT 0,
        all_items_served INTEGER DEFAULT 0,
        expo_confirmed INTEGER DEFAULT 0,
        expo_confirmed_at DATETIME,
        expo_confirmed_by INTEGER,
        total_items INTEGER DEFAULT 0,
        ready_items INTEGER DEFAULT 0,
        served_items INTEGER DEFAULT 0,
        is_recalled INTEGER DEFAULT 0,
        recall_count INTEGER DEFAULT 0,
        last_recalled_at DATETIME,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      )
    `);

    // Performance metrics
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS kds_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        station_id INTEGER,
        sale_id INTEGER,
        sale_item_id INTEGER,
        product_id INTEGER,
        prep_time_seconds INTEGER,
        wait_time_seconds INTEGER,
        was_urgent INTEGER DEFAULT 0,
        was_recalled INTEGER DEFAULT 0,
        measured_at DATE,
        hour INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (station_id) REFERENCES kds_stations(id)
      )
    `);

    // Bump history for recall
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS kds_bump_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kds_item_id INTEGER NOT NULL,
        sale_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT,
        performed_by INTEGER,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (kds_item_id) REFERENCES kds_order_items(id)
      )
    `);

    // Insert default stations if none exist
    const existingStations = await dbService.findMany('kds_stations', {});
    if (existingStations.length === 0) {
      const defaultStations = [
        { code: 'GRILL', name: 'Parrilla', display_name: 'PARRILLA', color: '#EF4444', icon: 'fire', display_order: 1, alert_minutes: 12 },
        { code: 'FRYER', name: 'Freidora', display_name: 'FREIDORA', color: '#F59E0B', icon: 'french-fries', display_order: 2, alert_minutes: 8 },
        { code: 'SALAD', name: 'Ensaladas', display_name: 'ENSALADAS', color: '#10B981', icon: 'salad', display_order: 3, alert_minutes: 5 },
        { code: 'DRINKS', name: 'Bebidas', display_name: 'BEBIDAS', color: '#3B82F6', icon: 'glass-water', display_order: 4, alert_minutes: 3 },
        { code: 'DESSERT', name: 'Postres', display_name: 'POSTRES', color: '#EC4899', icon: 'cake', display_order: 5, alert_minutes: 10 },
        { code: 'EXPO', name: 'Expedición', display_name: 'EXPO', color: '#8B5CF6', icon: 'clipboard-check', display_order: 6, alert_minutes: 5 }
      ];

      for (const station of defaultStations) {
        await dbService.create('kds_stations', station);
      }
      logger.info('Default KDS stations created');
    }

    logger.info('KDS tables initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing KDS tables:', error);
    throw error;
  }
};

// =============================================
// STATION MANAGEMENT
// =============================================

export const getStations = async (req, res) => {
  try {
    const { active_only = true, branch_id } = req.query;

    let query = 'SELECT * FROM kds_stations WHERE 1=1';
    const params = [];

    if (active_only === 'true' || active_only === true) {
      query += ' AND is_active = 1';
    }

    if (branch_id) {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(branch_id);
    }

    query += ' ORDER BY display_order ASC';

    const stations = await dbService.raw(query, params);

    // Get item counts per station
    for (const station of stations) {
      const counts = await dbService.raw(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'preparing' THEN 1 ELSE 0 END) as preparing,
          SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready
        FROM kds_order_items
        WHERE station_id = ? AND status NOT IN ('served', 'voided')
      `, [station.id]);

      station.item_counts = counts[0] || { total: 0, pending: 0, preparing: 0, ready: 0 };
    }

    res.json({ success: true, data: stations });
  } catch (error) {
    logger.error('Error getting stations:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estaciones' });
  }
};

export const createStation = async (req, res) => {
  try {
    const stationData = req.body;

    if (!stationData.code || !stationData.name) {
      return res.status(400).json({ success: false, message: 'code y name son requeridos' });
    }

    stationData.code = stationData.code.toUpperCase();

    const station = await dbService.create('kds_stations', stationData);

    logger.info(`KDS station created: ${station.code}`);
    res.status(201).json({ success: true, data: station, message: 'Estación creada' });
  } catch (error) {
    logger.error('Error creating station:', error);
    res.status(500).json({ success: false, message: 'Error al crear estación' });
  }
};

export const updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await dbService.update('kds_stations', id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const station = await dbService.findById('kds_stations', id);
    res.json({ success: true, data: station, message: 'Estación actualizada' });
  } catch (error) {
    logger.error('Error updating station:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar estación' });
  }
};

// =============================================
// CATEGORY ROUTING
// =============================================

export const getCategoryRouting = async (req, res) => {
  try {
    const routing = await dbService.raw(`
      SELECT
        cr.*,
        c.name as category_name,
        s.name as station_name,
        s.code as station_code,
        s.color as station_color
      FROM kds_category_routing cr
      JOIN categories c ON cr.category_id = c.id
      JOIN kds_stations s ON cr.station_id = s.id
      ORDER BY c.name, cr.priority
    `);

    res.json({ success: true, data: routing });
  } catch (error) {
    logger.error('Error getting category routing:', error);
    res.status(500).json({ success: false, message: 'Error al obtener routing' });
  }
};

export const setCategoryRouting = async (req, res) => {
  try {
    const { category_id, station_id, priority = 0 } = req.body;

    // Check if routing exists
    const existing = await dbService.findOne('kds_category_routing', { category_id, station_id });

    if (existing) {
      await dbService.update('kds_category_routing', existing.id, { priority });
    } else {
      await dbService.create('kds_category_routing', { category_id, station_id, priority });
    }

    res.json({ success: true, message: 'Routing configurado' });
  } catch (error) {
    logger.error('Error setting category routing:', error);
    res.status(500).json({ success: false, message: 'Error al configurar routing' });
  }
};

// =============================================
// ORDER DISPLAY - MAIN KDS VIEW
// =============================================

export const getStationOrders = async (req, res) => {
  try {
    const { stationId } = req.params;
    const { include_ready = false, limit = 30 } = req.query;

    let statusFilter = "('pending', 'preparing')";
    if (include_ready === 'true') {
      statusFilter = "('pending', 'preparing', 'ready')";
    }

    // Get orders with items for this station
    const items = await dbService.raw(`
      SELECT
        ki.id as kds_item_id,
        ki.sale_id,
        ki.sale_item_id,
        ki.status,
        ki.priority,
        ki.quantity,
        ki.product_name,
        ki.modifiers,
        ki.notes,
        ki.started_at,
        ki.completed_at,
        ki.position,
        s.sale_number,
        s.table_number,
        s.order_type,
        s.notes as order_notes,
        s.created_at as order_created_at,
        ko.priority as order_priority,
        ko.fire_time,
        ko.target_time,
        ko.total_items,
        ko.ready_items,
        sal.name as salon_name
      FROM kds_order_items ki
      JOIN sales s ON ki.sale_id = s.id
      LEFT JOIN kds_orders ko ON s.id = ko.sale_id
      LEFT JOIN salons sal ON s.salon_id = sal.id
      WHERE ki.station_id = ?
        AND ki.status IN ${statusFilter}
        AND s.status != 'cancelled'
      ORDER BY
        CASE ki.priority
          WHEN 'urgent' THEN 1
          WHEN 'rush' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'scheduled' THEN 4
        END,
        s.created_at ASC,
        ki.position ASC
      LIMIT ?
    `, [stationId, parseInt(limit)]);

    // Group items by order
    const ordersMap = new Map();

    for (const item of items) {
      const orderId = item.sale_id;

      if (!ordersMap.has(orderId)) {
        const now = new Date();
        const created = new Date(item.order_created_at);
        const elapsed = Math.floor((now - created) / (1000 * 60));

        ordersMap.set(orderId, {
          sale_id: orderId,
          sale_number: item.sale_number,
          table_number: item.table_number,
          order_type: item.order_type,
          salon_name: item.salon_name,
          order_notes: item.order_notes,
          priority: item.order_priority || 'normal',
          fire_time: item.fire_time,
          target_time: item.target_time,
          elapsed_minutes: elapsed,
          is_urgent: elapsed > 15,
          is_late: item.target_time && new Date(item.target_time) < now,
          total_items: item.total_items,
          ready_items: item.ready_items,
          created_at: item.order_created_at,
          items: []
        });
      }

      ordersMap.get(orderId).items.push({
        kds_item_id: item.kds_item_id,
        sale_item_id: item.sale_item_id,
        status: item.status,
        priority: item.priority,
        quantity: item.quantity,
        product_name: item.product_name,
        modifiers: item.modifiers ? JSON.parse(item.modifiers) : [],
        notes: item.notes,
        started_at: item.started_at,
        completed_at: item.completed_at,
        position: item.position
      });
    }

    const orders = Array.from(ordersMap.values());

    res.json({
      success: true,
      data: {
        station_id: parseInt(stationId),
        orders,
        order_count: orders.length,
        item_count: items.length
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error getting station orders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
};

// Expo view - all stations combined
export const getExpoView = async (req, res) => {
  try {
    const { limit = 50, include_served = false } = req.query;

    let statusFilter = 'ko.all_items_served = 0';
    if (include_served === 'true') {
      statusFilter = '1=1';
    }

    const orders = await dbService.raw(`
      SELECT
        ko.*,
        s.sale_number,
        s.table_number,
        s.order_type,
        s.notes,
        s.created_at as order_created_at,
        sal.name as salon_name,
        u.first_name || ' ' || u.last_name as waiter_name
      FROM kds_orders ko
      JOIN sales s ON ko.sale_id = s.id
      LEFT JOIN salons sal ON s.salon_id = sal.id
      LEFT JOIN users u ON s.waiter_id = u.id
      WHERE ${statusFilter}
        AND s.status != 'cancelled'
      ORDER BY
        CASE ko.priority
          WHEN 'urgent' THEN 1
          WHEN 'rush' THEN 2
          WHEN 'normal' THEN 3
          WHEN 'scheduled' THEN 4
        END,
        ko.created_at ASC
      LIMIT ?
    `, [parseInt(limit)]);

    // Get items for each order with station info
    for (const order of orders) {
      const items = await dbService.raw(`
        SELECT
          ki.*,
          ks.name as station_name,
          ks.code as station_code,
          ks.color as station_color
        FROM kds_order_items ki
        LEFT JOIN kds_stations ks ON ki.station_id = ks.id
        WHERE ki.sale_id = ?
        ORDER BY ki.position
      `, [order.sale_id]);

      order.items = items;

      // Calculate timing
      const now = new Date();
      const created = new Date(order.order_created_at);
      order.elapsed_minutes = Math.floor((now - created) / (1000 * 60));
      order.is_urgent = order.elapsed_minutes > 15 || order.priority === 'urgent';
    }

    res.json({ success: true, data: orders, timestamp: new Date() });
  } catch (error) {
    logger.error('Error getting expo view:', error);
    res.status(500).json({ success: false, message: 'Error al obtener vista expo' });
  }
};

// =============================================
// BUMP ACTIONS
// =============================================

export const bumpItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { action = 'next' } = req.body;

    const item = await dbService.findById('kds_order_items', itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item no encontrado' });
    }

    const previousStatus = item.status;
    let newStatus = item.status;

    // Determine new status based on action
    if (action === 'next') {
      if (item.status === 'pending') newStatus = 'preparing';
      else if (item.status === 'preparing') newStatus = 'ready';
      else if (item.status === 'ready') newStatus = 'served';
    } else if (action === 'ready') {
      newStatus = 'ready';
    } else if (action === 'start') {
      newStatus = 'preparing';
    } else if (action === 'undo') {
      if (item.status === 'ready') newStatus = 'preparing';
      else if (item.status === 'preparing') newStatus = 'pending';
    }

    const updateData = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    if (newStatus === 'preparing' && !item.started_at) {
      updateData.started_at = new Date().toISOString();
    }

    if (newStatus === 'ready') {
      updateData.completed_at = new Date().toISOString();
      updateData.bumped_by = req.user?.id;

      // Record metric
      if (item.started_at) {
        const prepTime = Math.floor((new Date() - new Date(item.started_at)) / 1000);
        await dbService.create('kds_metrics', {
          station_id: item.station_id,
          sale_id: item.sale_id,
          sale_item_id: item.sale_item_id,
          prep_time_seconds: prepTime,
          was_urgent: item.priority === 'urgent' ? 1 : 0,
          measured_at: new Date().toISOString().slice(0, 10),
          hour: new Date().getHours()
        });
      }
    }

    await dbService.update('kds_order_items', itemId, updateData);

    // Record bump history
    await dbService.create('kds_bump_history', {
      kds_item_id: itemId,
      sale_id: item.sale_id,
      action,
      previous_status: previousStatus,
      new_status: newStatus,
      performed_by: req.user?.id
    });

    // Update order ready count
    await updateOrderReadyCount(item.sale_id);

    // Emit real-time update
    emitToRoom('kitchen', 'item_bumped', {
      item_id: parseInt(itemId),
      sale_id: item.sale_id,
      station_id: item.station_id,
      previous_status: previousStatus,
      new_status: newStatus,
      product_name: item.product_name,
      timestamp: new Date()
    });

    // If all items ready, notify expo
    const orderStatus = await checkOrderComplete(item.sale_id);
    if (orderStatus.all_ready) {
      emitToRoom('expo', 'order_ready', {
        sale_id: item.sale_id,
        message: 'Orden lista para servir'
      });
    }

    res.json({
      success: true,
      data: {
        item_id: parseInt(itemId),
        previous_status: previousStatus,
        new_status: newStatus
      },
      message: `Item ${newStatus === 'ready' ? 'listo' : 'actualizado'}`
    });
  } catch (error) {
    logger.error('Error bumping item:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar item' });
  }
};

// Bump all items in an order at once
export const bumpOrder = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { station_id, action = 'ready' } = req.body;

    let whereClause = { sale_id: saleId };
    if (station_id) {
      whereClause.station_id = station_id;
    }

    const items = await dbService.findMany('kds_order_items', whereClause);

    let bumpedCount = 0;
    for (const item of items) {
      if (item.status !== 'served' && item.status !== 'voided') {
        await dbService.update('kds_order_items', item.id, {
          status: action === 'ready' ? 'ready' : 'served',
          completed_at: new Date().toISOString(),
          bumped_by: req.user?.id,
          updated_at: new Date().toISOString()
        });
        bumpedCount++;
      }
    }

    await updateOrderReadyCount(saleId);

    // Emit update
    emitToRoom('kitchen', 'order_bumped', {
      sale_id: parseInt(saleId),
      station_id,
      action,
      items_bumped: bumpedCount,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: { items_bumped: bumpedCount },
      message: `${bumpedCount} items actualizados`
    });
  } catch (error) {
    logger.error('Error bumping order:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar orden' });
  }
};

// =============================================
// RECALL FUNCTIONALITY
// =============================================

export const recallOrder = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { station_id } = req.body;

    // Get recently bumped items
    let query = `
      SELECT ki.* FROM kds_order_items ki
      WHERE ki.sale_id = ?
        AND ki.status IN ('ready', 'served')
        AND ki.completed_at >= datetime('now', '-30 minutes')
    `;
    const params = [saleId];

    if (station_id) {
      query += ' AND ki.station_id = ?';
      params.push(station_id);
    }

    const items = await dbService.raw(query, params);

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay items para recuperar (límite 30 minutos)'
      });
    }

    // Recall items back to preparing
    for (const item of items) {
      await dbService.update('kds_order_items', item.id, {
        status: 'preparing',
        recalled: 1,
        recall_count: (item.recall_count || 0) + 1,
        updated_at: new Date().toISOString()
      });

      await dbService.create('kds_bump_history', {
        kds_item_id: item.id,
        sale_id: saleId,
        action: 'recall',
        previous_status: item.status,
        new_status: 'preparing',
        performed_by: req.user?.id
      });
    }

    // Update kds_orders
    await dbService.raw(`
      UPDATE kds_orders SET
        is_recalled = 1,
        recall_count = recall_count + 1,
        last_recalled_at = datetime('now'),
        all_items_ready = 0,
        all_items_served = 0,
        updated_at = datetime('now')
      WHERE sale_id = ?
    `, [saleId]);

    // Emit recall notification
    emitToRoom('kitchen', 'order_recalled', {
      sale_id: parseInt(saleId),
      station_id,
      items_recalled: items.length,
      timestamp: new Date()
    });

    logger.info(`Order ${saleId} recalled with ${items.length} items`);

    res.json({
      success: true,
      data: { items_recalled: items.length },
      message: `${items.length} items recuperados`
    });
  } catch (error) {
    logger.error('Error recalling order:', error);
    res.status(500).json({ success: false, message: 'Error al recuperar orden' });
  }
};

// Get recently completed for recall
export const getRecallableOrders = async (req, res) => {
  try {
    const { station_id, minutes = 30 } = req.query;

    let query = `
      SELECT DISTINCT
        s.id as sale_id,
        s.sale_number,
        s.table_number,
        ko.completed_at,
        ko.ready_items,
        ko.total_items
      FROM kds_orders ko
      JOIN sales s ON ko.sale_id = s.id
      WHERE ko.all_items_ready = 1 OR ko.all_items_served = 1
        AND ko.updated_at >= datetime('now', '-' || ? || ' minutes')
    `;
    const params = [minutes];

    if (station_id) {
      query = `
        SELECT DISTINCT
          s.id as sale_id,
          s.sale_number,
          s.table_number,
          MAX(ki.completed_at) as completed_at
        FROM kds_order_items ki
        JOIN sales s ON ki.sale_id = s.id
        WHERE ki.station_id = ?
          AND ki.status IN ('ready', 'served')
          AND ki.completed_at >= datetime('now', '-' || ? || ' minutes')
        GROUP BY s.id
      `;
      params.unshift(station_id);
    }

    query += ' ORDER BY completed_at DESC LIMIT 20';

    const orders = await dbService.raw(query, params);

    res.json({ success: true, data: orders });
  } catch (error) {
    logger.error('Error getting recallable orders:', error);
    res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
  }
};

// =============================================
// PRIORITY MANAGEMENT
// =============================================

export const setOrderPriority = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { priority, fire_time, target_time } = req.body;

    if (!ORDER_PRIORITIES.includes(priority)) {
      return res.status(400).json({ success: false, message: 'Prioridad inválida' });
    }

    // Update kds_orders
    await dbService.raw(`
      UPDATE kds_orders SET
        priority = ?,
        fire_time = ?,
        target_time = ?,
        updated_at = datetime('now')
      WHERE sale_id = ?
    `, [priority, fire_time, target_time, saleId]);

    // Update all items
    await dbService.raw(`
      UPDATE kds_order_items SET
        priority = ?,
        updated_at = datetime('now')
      WHERE sale_id = ?
    `, [priority, saleId]);

    // Emit priority change
    emitToRoom('kitchen', 'priority_changed', {
      sale_id: parseInt(saleId),
      priority,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Prioridad actualizada' });
  } catch (error) {
    logger.error('Error setting priority:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar prioridad' });
  }
};

// =============================================
// ANALYTICS
// =============================================

export const getKDSAnalytics = async (req, res) => {
  try {
    const { station_id, start_date, end_date } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    let dateFilter = `measured_at = '${today}'`;
    if (start_date && end_date) {
      dateFilter = `measured_at BETWEEN '${start_date}' AND '${end_date}'`;
    }

    // Average prep time by station
    let stationFilter = '';
    const params = [];
    if (station_id) {
      stationFilter = 'AND m.station_id = ?';
      params.push(station_id);
    }

    const avgPrepTime = await dbService.raw(`
      SELECT
        s.name as station_name,
        s.code as station_code,
        COUNT(*) as items_completed,
        ROUND(AVG(m.prep_time_seconds), 0) as avg_prep_seconds,
        ROUND(AVG(m.prep_time_seconds) / 60.0, 1) as avg_prep_minutes,
        MIN(m.prep_time_seconds) as min_prep_seconds,
        MAX(m.prep_time_seconds) as max_prep_seconds
      FROM kds_metrics m
      JOIN kds_stations s ON m.station_id = s.id
      WHERE ${dateFilter} ${stationFilter}
      GROUP BY m.station_id
      ORDER BY avg_prep_seconds DESC
    `, params);

    // Hourly performance
    const hourlyStats = await dbService.raw(`
      SELECT
        hour,
        COUNT(*) as items,
        ROUND(AVG(prep_time_seconds) / 60.0, 1) as avg_minutes
      FROM kds_metrics
      WHERE ${dateFilter} ${stationFilter}
      GROUP BY hour
      ORDER BY hour
    `, params);

    // Recall rate
    const recallStats = await dbService.raw(`
      SELECT
        COUNT(*) as total_items,
        SUM(was_recalled) as recalled_items,
        ROUND(100.0 * SUM(was_recalled) / COUNT(*), 1) as recall_rate
      FROM kds_metrics
      WHERE ${dateFilter} ${stationFilter}
    `, params);

    // Current queue depth
    const queueDepth = await dbService.raw(`
      SELECT
        s.name as station_name,
        COUNT(*) as pending_items
      FROM kds_order_items ki
      JOIN kds_stations s ON ki.station_id = s.id
      WHERE ki.status IN ('pending', 'preparing')
      GROUP BY ki.station_id
    `);

    res.json({
      success: true,
      data: {
        avg_prep_time: avgPrepTime,
        hourly_stats: hourlyStats,
        recall_stats: recallStats[0] || { total_items: 0, recalled_items: 0, recall_rate: 0 },
        current_queue: queueDepth,
        date_range: { start: start_date || today, end: end_date || today }
      }
    });
  } catch (error) {
    logger.error('Error getting KDS analytics:', error);
    res.status(500).json({ success: false, message: 'Error al obtener analytics' });
  }
};

// =============================================
// ORDER INTEGRATION - Called when new order is created
// =============================================

export const routeOrderToKDS = async (saleId) => {
  try {
    // Get sale items with categories
    const items = await dbService.raw(`
      SELECT
        si.id as sale_item_id,
        si.product_id,
        si.quantity,
        si.notes,
        si.modifiers,
        p.name as product_name,
        c.id as category_id,
        c.name as category_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE si.sale_id = ?
    `, [saleId]);

    if (items.length === 0) return;

    // Create kds_orders record
    await dbService.create('kds_orders', {
      sale_id: saleId,
      priority: 'normal',
      total_items: items.length,
      ready_items: 0,
      served_items: 0
    });

    // Route each item to appropriate station
    let position = 0;
    for (const item of items) {
      // Get station routing for this category
      const routing = await dbService.findOne('kds_category_routing', {
        category_id: item.category_id
      });

      const stationId = routing?.station_id || 1; // Default to first station

      await dbService.create('kds_order_items', {
        sale_id: saleId,
        sale_item_id: item.sale_item_id,
        station_id: stationId,
        status: 'pending',
        priority: 'normal',
        position: position++,
        quantity: item.quantity,
        product_name: item.product_name,
        modifiers: item.modifiers,
        notes: item.notes
      });
    }

    // Emit new order notification to all kitchen stations
    emitToRoom('kitchen', 'new_order', {
      sale_id: saleId,
      item_count: items.length,
      timestamp: new Date()
    });

    logger.info(`Order ${saleId} routed to KDS with ${items.length} items`);
    return true;
  } catch (error) {
    logger.error('Error routing order to KDS:', error);
    throw error;
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

const updateOrderReadyCount = async (saleId) => {
  const counts = await dbService.raw(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) as ready,
      SUM(CASE WHEN status = 'served' THEN 1 ELSE 0 END) as served
    FROM kds_order_items
    WHERE sale_id = ? AND status != 'voided'
  `, [saleId]);

  const { total, ready, served } = counts[0];

  await dbService.raw(`
    UPDATE kds_orders SET
      total_items = ?,
      ready_items = ?,
      served_items = ?,
      all_items_ready = CASE WHEN ? = ? THEN 1 ELSE 0 END,
      all_items_served = CASE WHEN ? = ? THEN 1 ELSE 0 END,
      updated_at = datetime('now')
    WHERE sale_id = ?
  `, [total, ready, served, ready + served, total, served, total, saleId]);
};

const checkOrderComplete = async (saleId) => {
  const result = await dbService.raw(`
    SELECT all_items_ready, all_items_served
    FROM kds_orders
    WHERE sale_id = ?
  `, [saleId]);

  return {
    all_ready: result[0]?.all_items_ready === 1,
    all_served: result[0]?.all_items_served === 1
  };
};
