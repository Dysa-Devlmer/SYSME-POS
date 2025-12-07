/**
 * Multi-Branch Inventory Sync Controller
 * Sistema de sincronización de inventario entre sucursales
 *
 * Features:
 * - Stock levels per branch
 * - Transfer requests between branches
 * - Automatic low-stock alerts and suggestions
 * - Transfer approval workflow
 * - Real-time sync via WebSocket
 * - Complete transfer history and tracking
 * - Cost allocation for transfers
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { emitToRoom } from '../../websockets/socketHandler.js';

// =============================================
// DATABASE INITIALIZATION
// =============================================

export const initBranchInventoryTables = async () => {
  try {
    // Branches table (if not exists)
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        commune TEXT,
        city TEXT DEFAULT 'Santiago',
        region TEXT DEFAULT 'Metropolitana',
        phone TEXT,
        email TEXT,
        manager_id INTEGER,
        is_warehouse INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        timezone TEXT DEFAULT 'America/Santiago',
        opening_time TEXT DEFAULT '09:00',
        closing_time TEXT DEFAULT '22:00',
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_id) REFERENCES users(id)
      )
    `);

    // Branch inventory (stock per branch)
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS branch_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity REAL DEFAULT 0,
        min_stock REAL DEFAULT 5,
        max_stock REAL DEFAULT 100,
        reorder_point REAL DEFAULT 10,
        last_count_date DATE,
        last_count_quantity REAL,
        avg_daily_sales REAL DEFAULT 0,
        days_of_stock REAL,
        is_tracked INTEGER DEFAULT 1,
        location_code TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE(branch_id, product_id)
      )
    `);

    // Inventory transfers between branches
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_number TEXT UNIQUE NOT NULL,
        from_branch_id INTEGER NOT NULL,
        to_branch_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'normal',
        transfer_type TEXT DEFAULT 'manual',
        requested_by INTEGER,
        approved_by INTEGER,
        shipped_by INTEGER,
        received_by INTEGER,
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_at DATETIME,
        shipped_at DATETIME,
        received_at DATETIME,
        cancelled_at DATETIME,
        cancel_reason TEXT,
        estimated_arrival DATETIME,
        shipping_cost REAL DEFAULT 0,
        notes TEXT,
        internal_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_branch_id) REFERENCES branches(id),
        FOREIGN KEY (to_branch_id) REFERENCES branches(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (approved_by) REFERENCES users(id)
      )
    `);

    // Transfer items (products in a transfer)
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS transfer_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity_requested REAL NOT NULL,
        quantity_shipped REAL,
        quantity_received REAL,
        unit_cost REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Stock movements log
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        quantity_before REAL,
        quantity_after REAL,
        reference_type TEXT,
        reference_id INTEGER,
        unit_cost REAL,
        total_cost REAL,
        notes TEXT,
        performed_by INTEGER,
        performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (performed_by) REFERENCES users(id)
      )
    `);

    // Low stock alerts
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS low_stock_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        current_quantity REAL,
        min_stock REAL,
        reorder_point REAL,
        suggested_quantity REAL,
        suggested_from_branch_id INTEGER,
        alert_type TEXT DEFAULT 'low_stock',
        status TEXT DEFAULT 'active',
        acknowledged_by INTEGER,
        acknowledged_at DATETIME,
        resolved_at DATETIME,
        resolution_type TEXT,
        resolution_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (suggested_from_branch_id) REFERENCES branches(id)
      )
    `);

    // Auto-transfer rules
    await dbService.raw(`
      CREATE TABLE IF NOT EXISTS auto_transfer_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        from_branch_id INTEGER,
        to_branch_id INTEGER,
        product_id INTEGER,
        category_id INTEGER,
        trigger_type TEXT DEFAULT 'below_reorder',
        trigger_threshold REAL,
        transfer_quantity_type TEXT DEFAULT 'to_max',
        fixed_quantity REAL,
        is_active INTEGER DEFAULT 1,
        requires_approval INTEGER DEFAULT 1,
        last_triggered_at DATETIME,
        trigger_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_branch_id) REFERENCES branches(id),
        FOREIGN KEY (to_branch_id) REFERENCES branches(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Insert default branches if none exist
    const existingBranches = await dbService.findMany('branches', {});
    if (existingBranches.length === 0) {
      const defaultBranches = [
        { code: 'CENTRAL', name: 'Sucursal Central', address: 'Av. Principal 123', commune: 'Santiago Centro', is_warehouse: 1 },
        { code: 'NORTE', name: 'Sucursal Norte', address: 'Av. Norte 456', commune: 'Recoleta' },
        { code: 'SUR', name: 'Sucursal Sur', address: 'Av. Sur 789', commune: 'San Miguel' },
        { code: 'ORIENTE', name: 'Sucursal Oriente', address: 'Av. Oriente 321', commune: 'Las Condes' },
        { code: 'PONIENTE', name: 'Sucursal Poniente', address: 'Av. Poniente 654', commune: 'Maipú' }
      ];

      for (const branch of defaultBranches) {
        await dbService.create('branches', branch);
      }
      logger.info('Default branches created');
    }

    logger.info('Branch inventory tables initialized');
    return true;
  } catch (error) {
    logger.error('Error initializing branch inventory tables:', error);
    throw error;
  }
};

// =============================================
// BRANCH MANAGEMENT
// =============================================

export const getBranches = async (req, res) => {
  try {
    const { active_only = true, include_stock = false } = req.query;

    let query = `
      SELECT
        b.*,
        u.first_name || ' ' || u.last_name as manager_name
      FROM branches b
      LEFT JOIN users u ON b.manager_id = u.id
      WHERE 1=1
    `;

    if (active_only === 'true' || active_only === true) {
      query += ' AND b.is_active = 1';
    }

    query += ' ORDER BY b.is_warehouse DESC, b.name ASC';

    const branches = await dbService.raw(query);

    // Optionally include stock summary
    if (include_stock === 'true') {
      for (const branch of branches) {
        const stockSummary = await dbService.raw(`
          SELECT
            COUNT(DISTINCT product_id) as total_products,
            SUM(quantity) as total_units,
            SUM(CASE WHEN quantity <= min_stock THEN 1 ELSE 0 END) as low_stock_count,
            SUM(CASE WHEN quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
          FROM branch_inventory
          WHERE branch_id = ?
        `, [branch.id]);

        branch.stock_summary = stockSummary[0] || {};
      }
    }

    res.json({ success: true, data: branches });
  } catch (error) {
    logger.error('Error getting branches:', error);
    res.status(500).json({ success: false, message: 'Error al obtener sucursales' });
  }
};

export const createBranch = async (req, res) => {
  try {
    const branchData = req.body;

    if (!branchData.code || !branchData.name) {
      return res.status(400).json({ success: false, message: 'code y name son requeridos' });
    }

    branchData.code = branchData.code.toUpperCase();

    const branch = await dbService.create('branches', branchData);

    logger.info(`Branch created: ${branch.code}`);
    res.status(201).json({ success: true, data: branch, message: 'Sucursal creada' });
  } catch (error) {
    logger.error('Error creating branch:', error);
    res.status(500).json({ success: false, message: 'Error al crear sucursal' });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await dbService.update('branches', id, {
      ...updates,
      updated_at: new Date().toISOString()
    });

    const branch = await dbService.findById('branches', id);
    res.json({ success: true, data: branch, message: 'Sucursal actualizada' });
  } catch (error) {
    logger.error('Error updating branch:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar sucursal' });
  }
};

// =============================================
// BRANCH INVENTORY (Stock per branch)
// =============================================

export const getBranchInventory = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { page = 1, limit = 50, search, category_id, low_stock_only = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        bi.*,
        p.name as product_name,
        p.sku,
        p.barcode,
        p.price,
        p.cost,
        c.name as category_name,
        CASE
          WHEN bi.quantity <= 0 THEN 'out_of_stock'
          WHEN bi.quantity <= bi.min_stock THEN 'critical'
          WHEN bi.quantity <= bi.reorder_point THEN 'low'
          ELSE 'normal'
        END as stock_status
      FROM branch_inventory bi
      JOIN products p ON bi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE bi.branch_id = ?
    `;
    const params = [branchId];

    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category_id) {
      query += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (low_stock_only === 'true') {
      query += ` AND bi.quantity <= bi.reorder_point`;
    }

    // Count total
    const countQuery = query.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await dbService.raw(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ` ORDER BY
      CASE
        WHEN bi.quantity <= 0 THEN 1
        WHEN bi.quantity <= bi.min_stock THEN 2
        WHEN bi.quantity <= bi.reorder_point THEN 3
        ELSE 4
      END,
      p.name ASC
      LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const inventory = await dbService.raw(query, params);

    res.json({
      success: true,
      data: inventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting branch inventory:', error);
    res.status(500).json({ success: false, message: 'Error al obtener inventario' });
  }
};

export const updateBranchStock = async (req, res) => {
  try {
    const { branchId, productId } = req.params;
    const { quantity, movement_type = 'adjustment', notes } = req.body;

    // Get current stock
    let branchInventory = await dbService.findOne('branch_inventory', {
      branch_id: branchId,
      product_id: productId
    });

    const quantityBefore = branchInventory?.quantity || 0;
    let quantityAfter;

    if (movement_type === 'set') {
      quantityAfter = quantity;
    } else if (movement_type === 'add') {
      quantityAfter = quantityBefore + quantity;
    } else if (movement_type === 'subtract') {
      quantityAfter = Math.max(0, quantityBefore - quantity);
    } else {
      quantityAfter = quantity; // adjustment = set
    }

    if (branchInventory) {
      await dbService.update('branch_inventory', branchInventory.id, {
        quantity: quantityAfter,
        updated_at: new Date().toISOString()
      });
    } else {
      branchInventory = await dbService.create('branch_inventory', {
        branch_id: branchId,
        product_id: productId,
        quantity: quantityAfter
      });
    }

    // Log movement
    await dbService.create('stock_movements', {
      branch_id: branchId,
      product_id: productId,
      movement_type,
      quantity: quantityAfter - quantityBefore,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      notes,
      performed_by: req.user?.id
    });

    // Check for low stock alert
    await checkAndCreateLowStockAlert(branchId, productId);

    // Emit real-time update
    emitToRoom('inventory', 'stock_updated', {
      branch_id: parseInt(branchId),
      product_id: parseInt(productId),
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      movement_type,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        change: quantityAfter - quantityBefore
      },
      message: 'Stock actualizado'
    });
  } catch (error) {
    logger.error('Error updating branch stock:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar stock' });
  }
};

// Get consolidated view of product across all branches
export const getProductAcrossBranches = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await dbService.findById('products', productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const branchStock = await dbService.raw(`
      SELECT
        b.id as branch_id,
        b.code as branch_code,
        b.name as branch_name,
        b.is_warehouse,
        COALESCE(bi.quantity, 0) as quantity,
        COALESCE(bi.min_stock, 5) as min_stock,
        COALESCE(bi.reorder_point, 10) as reorder_point,
        COALESCE(bi.max_stock, 100) as max_stock,
        bi.avg_daily_sales,
        CASE
          WHEN COALESCE(bi.quantity, 0) <= 0 THEN 'out_of_stock'
          WHEN COALESCE(bi.quantity, 0) <= COALESCE(bi.min_stock, 5) THEN 'critical'
          WHEN COALESCE(bi.quantity, 0) <= COALESCE(bi.reorder_point, 10) THEN 'low'
          ELSE 'normal'
        END as status
      FROM branches b
      LEFT JOIN branch_inventory bi ON b.id = bi.branch_id AND bi.product_id = ?
      WHERE b.is_active = 1
      ORDER BY b.is_warehouse DESC, b.name
    `, [productId]);

    const totalStock = branchStock.reduce((sum, b) => sum + b.quantity, 0);
    const lowStockBranches = branchStock.filter(b => b.status === 'low' || b.status === 'critical');

    res.json({
      success: true,
      data: {
        product,
        branches: branchStock,
        summary: {
          total_stock: totalStock,
          branches_count: branchStock.length,
          low_stock_count: lowStockBranches.length,
          branches_with_stock: branchStock.filter(b => b.quantity > 0).length
        }
      }
    });
  } catch (error) {
    logger.error('Error getting product across branches:', error);
    res.status(500).json({ success: false, message: 'Error al obtener stock' });
  }
};

// =============================================
// TRANSFER MANAGEMENT
// =============================================

const generateTransferNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TRF-${dateStr}-${random}`;
};

export const createTransfer = async (req, res) => {
  try {
    const {
      from_branch_id,
      to_branch_id,
      items,
      priority = 'normal',
      notes,
      estimated_arrival
    } = req.body;

    if (!from_branch_id || !to_branch_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'from_branch_id, to_branch_id y items son requeridos'
      });
    }

    if (from_branch_id === to_branch_id) {
      return res.status(400).json({
        success: false,
        message: 'No puede transferir a la misma sucursal'
      });
    }

    // Validate stock availability
    for (const item of items) {
      const sourceStock = await dbService.findOne('branch_inventory', {
        branch_id: from_branch_id,
        product_id: item.product_id
      });

      if (!sourceStock || sourceStock.quantity < item.quantity) {
        const product = await dbService.findById('products', item.product_id);
        return res.status(400).json({
          success: false,
          message: `Stock insuficiente para ${product?.name || 'producto'}`
        });
      }
    }

    const transfer_number = generateTransferNumber();

    // Create transfer
    const transfer = await dbService.create('inventory_transfers', {
      transfer_number,
      from_branch_id,
      to_branch_id,
      status: 'pending',
      priority,
      transfer_type: 'manual',
      requested_by: req.user?.id,
      notes,
      estimated_arrival
    });

    // Create transfer items
    let totalCost = 0;
    for (const item of items) {
      const product = await dbService.findById('products', item.product_id);
      const itemCost = (product?.cost || 0) * item.quantity;
      totalCost += itemCost;

      await dbService.create('transfer_items', {
        transfer_id: transfer.id,
        product_id: item.product_id,
        quantity_requested: item.quantity,
        unit_cost: product?.cost || 0,
        total_cost: itemCost,
        notes: item.notes
      });
    }

    // Get full transfer with items
    const fullTransfer = await getTransferWithItems(transfer.id);

    // Emit notification
    emitToRoom('inventory', 'transfer_created', {
      transfer_id: transfer.id,
      transfer_number,
      from_branch_id,
      to_branch_id,
      items_count: items.length,
      timestamp: new Date()
    });

    logger.info(`Transfer ${transfer_number} created`);

    res.status(201).json({
      success: true,
      data: fullTransfer,
      message: 'Transferencia creada'
    });
  } catch (error) {
    logger.error('Error creating transfer:', error);
    res.status(500).json({ success: false, message: 'Error al crear transferencia' });
  }
};

export const getTransfers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      from_branch_id,
      to_branch_id,
      start_date,
      end_date
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        t.*,
        fb.name as from_branch_name,
        fb.code as from_branch_code,
        tb.name as to_branch_name,
        tb.code as to_branch_code,
        u.first_name || ' ' || u.last_name as requested_by_name,
        (SELECT COUNT(*) FROM transfer_items WHERE transfer_id = t.id) as items_count,
        (SELECT SUM(total_cost) FROM transfer_items WHERE transfer_id = t.id) as total_cost
      FROM inventory_transfers t
      JOIN branches fb ON t.from_branch_id = fb.id
      JOIN branches tb ON t.to_branch_id = tb.id
      LEFT JOIN users u ON t.requested_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (from_branch_id) {
      query += ` AND t.from_branch_id = ?`;
      params.push(from_branch_id);
    }

    if (to_branch_id) {
      query += ` AND t.to_branch_id = ?`;
      params.push(to_branch_id);
    }

    if (start_date) {
      query += ` AND DATE(t.created_at) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(t.created_at) <= ?`;
      params.push(end_date);
    }

    const countQuery = query.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await dbService.raw(countQuery, params);
    const total = countResult[0]?.total || 0;

    query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const transfers = await dbService.raw(query, params);

    res.json({
      success: true,
      data: transfers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting transfers:', error);
    res.status(500).json({ success: false, message: 'Error al obtener transferencias' });
  }
};

export const getTransferById = async (req, res) => {
  try {
    const { id } = req.params;
    const transfer = await getTransferWithItems(id);

    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    }

    res.json({ success: true, data: transfer });
  } catch (error) {
    logger.error('Error getting transfer:', error);
    res.status(500).json({ success: false, message: 'Error al obtener transferencia' });
  }
};

export const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;

    const transfer = await dbService.findById('inventory_transfers', id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Solo se pueden aprobar transferencias pendientes' });
    }

    await dbService.update('inventory_transfers', id, {
      status: 'approved',
      approved_by: req.user?.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    emitToRoom('inventory', 'transfer_approved', {
      transfer_id: parseInt(id),
      approved_by: req.user?.id,
      timestamp: new Date()
    });

    logger.info(`Transfer ${id} approved`);
    res.json({ success: true, message: 'Transferencia aprobada' });
  } catch (error) {
    logger.error('Error approving transfer:', error);
    res.status(500).json({ success: false, message: 'Error al aprobar transferencia' });
  }
};

export const shipTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { items_shipped } = req.body;

    const transfer = await dbService.findById('inventory_transfers', id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    }

    if (transfer.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Solo se pueden enviar transferencias aprobadas' });
    }

    // Get transfer items
    const transferItems = await dbService.findMany('transfer_items', { transfer_id: id });

    // Deduct stock from source branch
    for (const item of transferItems) {
      const shippedQty = items_shipped?.find(i => i.product_id === item.product_id)?.quantity || item.quantity_requested;

      // Update transfer item
      await dbService.update('transfer_items', item.id, {
        quantity_shipped: shippedQty,
        status: 'shipped'
      });

      // Get current stock
      const sourceStock = await dbService.findOne('branch_inventory', {
        branch_id: transfer.from_branch_id,
        product_id: item.product_id
      });

      if (sourceStock) {
        const newQuantity = Math.max(0, sourceStock.quantity - shippedQty);

        await dbService.update('branch_inventory', sourceStock.id, {
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        });

        // Log movement
        await dbService.create('stock_movements', {
          branch_id: transfer.from_branch_id,
          product_id: item.product_id,
          movement_type: 'transfer_out',
          quantity: -shippedQty,
          quantity_before: sourceStock.quantity,
          quantity_after: newQuantity,
          reference_type: 'transfer',
          reference_id: id,
          performed_by: req.user?.id
        });
      }
    }

    await dbService.update('inventory_transfers', id, {
      status: 'shipped',
      shipped_by: req.user?.id,
      shipped_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    emitToRoom('inventory', 'transfer_shipped', {
      transfer_id: parseInt(id),
      from_branch_id: transfer.from_branch_id,
      to_branch_id: transfer.to_branch_id,
      timestamp: new Date()
    });

    logger.info(`Transfer ${id} shipped`);
    res.json({ success: true, message: 'Transferencia enviada' });
  } catch (error) {
    logger.error('Error shipping transfer:', error);
    res.status(500).json({ success: false, message: 'Error al enviar transferencia' });
  }
};

export const receiveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { items_received } = req.body;

    const transfer = await dbService.findById('inventory_transfers', id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    }

    if (transfer.status !== 'shipped') {
      return res.status(400).json({ success: false, message: 'Solo se pueden recibir transferencias enviadas' });
    }

    // Get transfer items
    const transferItems = await dbService.findMany('transfer_items', { transfer_id: id });

    // Add stock to destination branch
    for (const item of transferItems) {
      const receivedQty = items_received?.find(i => i.product_id === item.product_id)?.quantity || item.quantity_shipped;

      // Update transfer item
      await dbService.update('transfer_items', item.id, {
        quantity_received: receivedQty,
        status: 'received'
      });

      // Get or create destination stock
      let destStock = await dbService.findOne('branch_inventory', {
        branch_id: transfer.to_branch_id,
        product_id: item.product_id
      });

      const quantityBefore = destStock?.quantity || 0;
      const quantityAfter = quantityBefore + receivedQty;

      if (destStock) {
        await dbService.update('branch_inventory', destStock.id, {
          quantity: quantityAfter,
          updated_at: new Date().toISOString()
        });
      } else {
        await dbService.create('branch_inventory', {
          branch_id: transfer.to_branch_id,
          product_id: item.product_id,
          quantity: quantityAfter
        });
      }

      // Log movement
      await dbService.create('stock_movements', {
        branch_id: transfer.to_branch_id,
        product_id: item.product_id,
        movement_type: 'transfer_in',
        quantity: receivedQty,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        reference_type: 'transfer',
        reference_id: id,
        performed_by: req.user?.id
      });
    }

    await dbService.update('inventory_transfers', id, {
      status: 'completed',
      received_by: req.user?.id,
      received_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    emitToRoom('inventory', 'transfer_completed', {
      transfer_id: parseInt(id),
      to_branch_id: transfer.to_branch_id,
      timestamp: new Date()
    });

    logger.info(`Transfer ${id} received and completed`);
    res.json({ success: true, message: 'Transferencia recibida' });
  } catch (error) {
    logger.error('Error receiving transfer:', error);
    res.status(500).json({ success: false, message: 'Error al recibir transferencia' });
  }
};

export const cancelTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const transfer = await dbService.findById('inventory_transfers', id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Transferencia no encontrada' });
    }

    if (['completed', 'cancelled'].includes(transfer.status)) {
      return res.status(400).json({ success: false, message: 'No se puede cancelar esta transferencia' });
    }

    // If already shipped, we need to reverse stock movements
    if (transfer.status === 'shipped') {
      const transferItems = await dbService.findMany('transfer_items', { transfer_id: id });

      for (const item of transferItems) {
        // Add back to source
        const sourceStock = await dbService.findOne('branch_inventory', {
          branch_id: transfer.from_branch_id,
          product_id: item.product_id
        });

        if (sourceStock) {
          await dbService.update('branch_inventory', sourceStock.id, {
            quantity: sourceStock.quantity + (item.quantity_shipped || 0),
            updated_at: new Date().toISOString()
          });

          await dbService.create('stock_movements', {
            branch_id: transfer.from_branch_id,
            product_id: item.product_id,
            movement_type: 'transfer_cancel',
            quantity: item.quantity_shipped || 0,
            quantity_before: sourceStock.quantity,
            quantity_after: sourceStock.quantity + (item.quantity_shipped || 0),
            reference_type: 'transfer',
            reference_id: id,
            notes: `Cancelación: ${reason || 'Sin razón'}`,
            performed_by: req.user?.id
          });
        }
      }
    }

    await dbService.update('inventory_transfers', id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString()
    });

    // Update items status
    await dbService.raw(
      `UPDATE transfer_items SET status = 'cancelled' WHERE transfer_id = ?`,
      [id]
    );

    logger.info(`Transfer ${id} cancelled: ${reason}`);
    res.json({ success: true, message: 'Transferencia cancelada' });
  } catch (error) {
    logger.error('Error cancelling transfer:', error);
    res.status(500).json({ success: false, message: 'Error al cancelar transferencia' });
  }
};

// =============================================
// LOW STOCK ALERTS
// =============================================

export const getLowStockAlerts = async (req, res) => {
  try {
    const { branch_id, status = 'active' } = req.query;

    let query = `
      SELECT
        a.*,
        b.name as branch_name,
        b.code as branch_code,
        p.name as product_name,
        p.sku,
        sb.name as suggested_branch_name,
        sb.code as suggested_branch_code,
        (SELECT quantity FROM branch_inventory WHERE branch_id = sb.id AND product_id = a.product_id) as suggested_branch_quantity
      FROM low_stock_alerts a
      JOIN branches b ON a.branch_id = b.id
      JOIN products p ON a.product_id = p.id
      LEFT JOIN branches sb ON a.suggested_from_branch_id = sb.id
      WHERE a.status = ?
    `;
    const params = [status];

    if (branch_id) {
      query += ` AND a.branch_id = ?`;
      params.push(branch_id);
    }

    query += ` ORDER BY a.created_at DESC`;

    const alerts = await dbService.raw(query, params);

    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('Error getting low stock alerts:', error);
    res.status(500).json({ success: false, message: 'Error al obtener alertas' });
  }
};

export const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('low_stock_alerts', id, {
      status: 'acknowledged',
      acknowledged_by: req.user?.id,
      acknowledged_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'Alerta reconocida' });
  } catch (error) {
    logger.error('Error acknowledging alert:', error);
    res.status(500).json({ success: false, message: 'Error al reconocer alerta' });
  }
};

export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_type, notes } = req.body;

    await dbService.update('low_stock_alerts', id, {
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_type,
      resolution_notes: notes
    });

    res.json({ success: true, message: 'Alerta resuelta' });
  } catch (error) {
    logger.error('Error resolving alert:', error);
    res.status(500).json({ success: false, message: 'Error al resolver alerta' });
  }
};

// =============================================
// ANALYTICS & REPORTS
// =============================================

export const getInventorySyncDashboard = async (req, res) => {
  try {
    // Stock summary by branch
    const branchSummary = await dbService.raw(`
      SELECT
        b.id,
        b.code,
        b.name,
        COUNT(bi.id) as total_products,
        SUM(bi.quantity) as total_units,
        SUM(CASE WHEN bi.quantity <= bi.min_stock THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN bi.quantity <= bi.reorder_point AND bi.quantity > bi.min_stock THEN 1 ELSE 0 END) as low_count,
        SUM(CASE WHEN bi.quantity <= 0 THEN 1 ELSE 0 END) as out_of_stock_count
      FROM branches b
      LEFT JOIN branch_inventory bi ON b.id = bi.branch_id
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY b.name
    `);

    // Pending transfers
    const pendingTransfers = await dbService.raw(`
      SELECT
        t.*,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        (SELECT COUNT(*) FROM transfer_items WHERE transfer_id = t.id) as items_count
      FROM inventory_transfers t
      JOIN branches fb ON t.from_branch_id = fb.id
      JOIN branches tb ON t.to_branch_id = tb.id
      WHERE t.status IN ('pending', 'approved', 'shipped')
      ORDER BY
        CASE t.status
          WHEN 'shipped' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'pending' THEN 3
        END,
        t.created_at DESC
      LIMIT 10
    `);

    // Active alerts
    const activeAlerts = await dbService.raw(`
      SELECT COUNT(*) as count
      FROM low_stock_alerts
      WHERE status = 'active'
    `);

    // Recent movements
    const recentMovements = await dbService.raw(`
      SELECT
        sm.*,
        b.name as branch_name,
        p.name as product_name
      FROM stock_movements sm
      JOIN branches b ON sm.branch_id = b.id
      JOIN products p ON sm.product_id = p.id
      ORDER BY sm.performed_at DESC
      LIMIT 20
    `);

    // Transfer statistics
    const transferStats = await dbService.raw(`
      SELECT
        COUNT(*) as total_transfers,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as in_transit,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
      FROM inventory_transfers
      WHERE created_at >= date('now', '-30 days')
    `);

    res.json({
      success: true,
      data: {
        branch_summary: branchSummary,
        pending_transfers: pendingTransfers,
        active_alerts_count: activeAlerts[0]?.count || 0,
        recent_movements: recentMovements,
        transfer_stats: transferStats[0] || {}
      }
    });
  } catch (error) {
    logger.error('Error getting inventory sync dashboard:', error);
    res.status(500).json({ success: false, message: 'Error al obtener dashboard' });
  }
};

export const getSuggestedTransfers = async (req, res) => {
  try {
    const { branch_id } = req.query;

    // Find products that are low in one branch but available in others
    let query = `
      SELECT
        bi_low.branch_id as needs_branch_id,
        b_low.name as needs_branch_name,
        bi_low.product_id,
        p.name as product_name,
        bi_low.quantity as current_quantity,
        bi_low.min_stock,
        bi_low.reorder_point,
        bi_low.max_stock,
        bi_has.branch_id as has_branch_id,
        b_has.name as has_branch_name,
        bi_has.quantity as available_quantity,
        (bi_low.max_stock - bi_low.quantity) as suggested_quantity
      FROM branch_inventory bi_low
      JOIN branches b_low ON bi_low.branch_id = b_low.id
      JOIN products p ON bi_low.product_id = p.id
      JOIN branch_inventory bi_has ON bi_low.product_id = bi_has.product_id
        AND bi_has.branch_id != bi_low.branch_id
        AND bi_has.quantity > bi_has.reorder_point
      JOIN branches b_has ON bi_has.branch_id = b_has.id
      WHERE bi_low.quantity <= bi_low.reorder_point
        AND b_low.is_active = 1
        AND b_has.is_active = 1
    `;
    const params = [];

    if (branch_id) {
      query += ` AND bi_low.branch_id = ?`;
      params.push(branch_id);
    }

    query += ` ORDER BY bi_low.quantity ASC, bi_has.quantity DESC`;

    const suggestions = await dbService.raw(query, params);

    res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error('Error getting suggested transfers:', error);
    res.status(500).json({ success: false, message: 'Error al obtener sugerencias' });
  }
};

// =============================================
// HELPER FUNCTIONS
// =============================================

const getTransferWithItems = async (transferId) => {
  const transfers = await dbService.raw(`
    SELECT
      t.*,
      fb.name as from_branch_name,
      fb.code as from_branch_code,
      tb.name as to_branch_name,
      tb.code as to_branch_code,
      ur.first_name || ' ' || ur.last_name as requested_by_name,
      ua.first_name || ' ' || ua.last_name as approved_by_name,
      us.first_name || ' ' || us.last_name as shipped_by_name,
      ue.first_name || ' ' || ue.last_name as received_by_name
    FROM inventory_transfers t
    JOIN branches fb ON t.from_branch_id = fb.id
    JOIN branches tb ON t.to_branch_id = tb.id
    LEFT JOIN users ur ON t.requested_by = ur.id
    LEFT JOIN users ua ON t.approved_by = ua.id
    LEFT JOIN users us ON t.shipped_by = us.id
    LEFT JOIN users ue ON t.received_by = ue.id
    WHERE t.id = ?
  `, [transferId]);

  if (transfers.length === 0) return null;

  const transfer = transfers[0];

  // Get items
  const items = await dbService.raw(`
    SELECT
      ti.*,
      p.name as product_name,
      p.sku,
      p.barcode,
      c.name as category_name
    FROM transfer_items ti
    JOIN products p ON ti.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ti.transfer_id = ?
    ORDER BY p.name
  `, [transferId]);

  transfer.items = items;
  transfer.total_cost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  return transfer;
};

const checkAndCreateLowStockAlert = async (branchId, productId) => {
  const inventory = await dbService.findOne('branch_inventory', {
    branch_id: branchId,
    product_id: productId
  });

  if (!inventory) return;

  // Check if already below reorder point
  if (inventory.quantity <= inventory.reorder_point) {
    // Check if alert already exists
    const existingAlert = await dbService.findOne('low_stock_alerts', {
      branch_id: branchId,
      product_id: productId,
      status: 'active'
    });

    if (!existingAlert) {
      // Find branch with most stock
      const bestSource = await dbService.raw(`
        SELECT branch_id, quantity
        FROM branch_inventory
        WHERE product_id = ? AND branch_id != ? AND quantity > reorder_point
        ORDER BY quantity DESC
        LIMIT 1
      `, [productId, branchId]);

      await dbService.create('low_stock_alerts', {
        branch_id: branchId,
        product_id: productId,
        current_quantity: inventory.quantity,
        min_stock: inventory.min_stock,
        reorder_point: inventory.reorder_point,
        suggested_quantity: inventory.max_stock - inventory.quantity,
        suggested_from_branch_id: bestSource[0]?.branch_id || null,
        alert_type: inventory.quantity <= 0 ? 'out_of_stock' : 'low_stock'
      });

      // Emit alert
      emitToRoom('inventory', 'low_stock_alert', {
        branch_id: branchId,
        product_id: productId,
        quantity: inventory.quantity,
        timestamp: new Date()
      });
    }
  }
};
