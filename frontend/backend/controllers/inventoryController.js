// =====================================================
// SYSME POS - Inventory Controller
// =====================================================
// Manages inventory, stock counts, transfers, purchase orders
//
// @author JARVIS AI Assistant
// @date 2025-11-20
// @version 2.1.0
// =====================================================

const { dbManager } = require('../config/database');
const logger = require('../config/logger');

class InventoryController {
  /**
   * Get inventory for all products across locations
   * GET /api/inventory
   */
  async getInventory(req, res, next) {
    try {
      const { location_id, product_id, low_stock } = req.query;

      let query = `
        SELECT
          i.*,
          p.name as product_name,
          p.sku,
          p.unit_of_measure,
          p.min_stock_level,
          p.max_stock_level,
          l.name as location_name,
          CASE
            WHEN i.available_quantity <= p.min_stock_level THEN 'low'
            WHEN i.available_quantity >= p.max_stock_level THEN 'overstocked'
            ELSE 'normal'
          END as stock_status
        FROM inventory i
        JOIN products p ON i.product_id = p.id
        JOIN locations l ON i.location_id = l.id
        WHERE i.company_id = ?
      `;

      const params = [req.user.company_id];

      if (location_id) {
        query += ' AND i.location_id = ?';
        params.push(location_id);
      }

      if (product_id) {
        query += ' AND i.product_id = ?';
        params.push(product_id);
      }

      if (low_stock === 'true') {
        query += ' AND i.available_quantity <= p.min_stock_level';
      }

      query += ' ORDER BY p.name';

      const inventory = await dbManager.all(query, params);

      res.json({
        success: true,
        data: inventory,
        meta: {
          total: inventory.length,
          low_stock_items: inventory.filter(i => i.stock_status === 'low').length
        }
      });
    } catch (error) {
      logger.error('Error fetching inventory:', error);
      next(error);
    }
  }

  /**
   * Get inventory for a specific product
   * GET /api/inventory/:product_id
   */
  async getProductInventory(req, res, next) {
    try {
      const { product_id } = req.params;

      const inventory = await dbManager.all(`
        SELECT
          i.*,
          l.name as location_name,
          l.address
        FROM inventory i
        JOIN locations l ON i.location_id = l.id
        WHERE i.product_id = ? AND i.company_id = ?
        ORDER BY l.name
      `, [product_id, req.user.company_id]);

      if (!inventory.length) {
        return res.status(404).json({
          success: false,
          message: 'Product inventory not found'
        });
      }

      // Get recent transactions
      const transactions = await dbManager.all(`
        SELECT
          it.*,
          u.username as created_by_name
        FROM inventory_transactions it
        LEFT JOIN users u ON it.created_by = u.id
        WHERE it.product_id = ? AND it.company_id = ?
        ORDER BY it.created_at DESC
        LIMIT 50
      `, [product_id, req.user.company_id]);

      res.json({
        success: true,
        data: {
          inventory,
          recent_transactions: transactions,
          total_quantity: inventory.reduce((sum, i) => sum + i.quantity_on_hand, 0),
          total_available: inventory.reduce((sum, i) => sum + i.available_quantity, 0)
        }
      });
    } catch (error) {
      logger.error('Error fetching product inventory:', error);
      next(error);
    }
  }

  /**
   * Update inventory quantity (manual adjustment)
   * PUT /api/inventory/:id
   */
  async updateInventory(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity_change, reason, notes } = req.body;

      if (!quantity_change || !reason) {
        return res.status(400).json({
          success: false,
          message: 'Quantity change and reason are required'
        });
      }

      // Get current inventory
      const inventory = await dbManager.get(`
        SELECT * FROM inventory WHERE id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      if (!inventory) {
        return res.status(404).json({
          success: false,
          message: 'Inventory record not found'
        });
      }

      const new_quantity = inventory.quantity_on_hand + quantity_change;

      if (new_quantity < 0) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient inventory quantity'
        });
      }

      // Create adjustment record
      const adjustment = await dbManager.run(`
        INSERT INTO inventory_adjustments (
          company_id, location_id, product_id,
          quantity_before, quantity_after, quantity_changed,
          reason, notes, adjusted_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.company_id,
        inventory.location_id,
        inventory.product_id,
        inventory.quantity_on_hand,
        new_quantity,
        quantity_change,
        reason,
        notes || null,
        req.user.id
      ]);

      // Update inventory
      await dbManager.run(`
        UPDATE inventory
        SET quantity_on_hand = ?,
            available_quantity = available_quantity + ?,
            last_counted_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [new_quantity, quantity_change, id]);

      // Create transaction record
      await dbManager.run(`
        INSERT INTO inventory_transactions (
          company_id, location_id, product_id,
          transaction_type, quantity, reference_type, reference_id,
          created_by
        ) VALUES (?, ?, ?, 'adjustment', ?, 'adjustment', ?, ?)
      `, [
        req.user.company_id,
        inventory.location_id,
        inventory.product_id,
        quantity_change,
        adjustment.lastID,
        req.user.id
      ]);

      logger.info(`Inventory adjusted for product ${inventory.product_id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Inventory updated successfully',
        data: {
          adjustment_id: adjustment.lastID,
          old_quantity: inventory.quantity_on_hand,
          new_quantity,
          quantity_change
        }
      });
    } catch (error) {
      logger.error('Error updating inventory:', error);
      next(error);
    }
  }

  /**
   * Create inventory transfer between locations
   * POST /api/inventory/transfers
   */
  async createTransfer(req, res, next) {
    try {
      const {
        from_location_id,
        to_location_id,
        product_id,
        quantity,
        notes
      } = req.body;

      if (!from_location_id || !to_location_id || !product_id || !quantity) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      if (quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be greater than 0'
        });
      }

      // Check source inventory
      const sourceInventory = await dbManager.get(`
        SELECT * FROM inventory
        WHERE location_id = ? AND product_id = ? AND company_id = ?
      `, [from_location_id, product_id, req.user.company_id]);

      if (!sourceInventory || sourceInventory.available_quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient inventory at source location'
        });
      }

      // Create transfer record
      const transfer = await dbManager.run(`
        INSERT INTO inventory_transfers (
          company_id, from_location_id, to_location_id,
          product_id, quantity, status, notes,
          initiated_by
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `, [
        req.user.company_id,
        from_location_id,
        to_location_id,
        product_id,
        quantity,
        notes || null,
        req.user.id
      ]);

      // Reduce source inventory
      await dbManager.run(`
        UPDATE inventory
        SET quantity_on_hand = quantity_on_hand - ?,
            available_quantity = available_quantity - ?
        WHERE location_id = ? AND product_id = ?
      `, [quantity, quantity, from_location_id, product_id]);

      // Create transaction for source
      await dbManager.run(`
        INSERT INTO inventory_transactions (
          company_id, location_id, product_id,
          transaction_type, quantity, reference_type, reference_id,
          created_by
        ) VALUES (?, ?, ?, 'transfer_out', ?, 'transfer', ?, ?)
      `, [
        req.user.company_id,
        from_location_id,
        product_id,
        -quantity,
        transfer.lastID,
        req.user.id
      ]);

      logger.info(`Transfer ${transfer.lastID} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Transfer created successfully',
        data: { transfer_id: transfer.lastID }
      });
    } catch (error) {
      logger.error('Error creating transfer:', error);
      next(error);
    }
  }

  /**
   * Receive/Complete inventory transfer
   * POST /api/inventory/transfers/:id/receive
   */
  async receiveTransfer(req, res, next) {
    try {
      const { id } = req.params;
      const { received_quantity, notes } = req.body;

      // Get transfer
      const transfer = await dbManager.get(`
        SELECT * FROM inventory_transfers
        WHERE id = ? AND company_id = ? AND status = 'pending'
      `, [id, req.user.company_id]);

      if (!transfer) {
        return res.status(404).json({
          success: false,
          message: 'Transfer not found or already completed'
        });
      }

      const quantity = received_quantity || transfer.quantity;

      // Check/create destination inventory
      let destInventory = await dbManager.get(`
        SELECT * FROM inventory
        WHERE location_id = ? AND product_id = ?
      `, [transfer.to_location_id, transfer.product_id]);

      if (!destInventory) {
        // Create new inventory record for destination
        await dbManager.run(`
          INSERT INTO inventory (
            company_id, location_id, product_id,
            quantity_on_hand, available_quantity
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          req.user.company_id,
          transfer.to_location_id,
          transfer.product_id,
          quantity,
          quantity
        ]);
      } else {
        // Update existing inventory
        await dbManager.run(`
          UPDATE inventory
          SET quantity_on_hand = quantity_on_hand + ?,
              available_quantity = available_quantity + ?
          WHERE location_id = ? AND product_id = ?
        `, [quantity, quantity, transfer.to_location_id, transfer.product_id]);
      }

      // Update transfer status
      await dbManager.run(`
        UPDATE inventory_transfers
        SET status = 'completed',
            received_quantity = ?,
            received_at = CURRENT_TIMESTAMP,
            received_by = ?,
            received_notes = ?
        WHERE id = ?
      `, [quantity, req.user.id, notes || null, id]);

      // Create transaction for destination
      await dbManager.run(`
        INSERT INTO inventory_transactions (
          company_id, location_id, product_id,
          transaction_type, quantity, reference_type, reference_id,
          created_by
        ) VALUES (?, ?, ?, 'transfer_in', ?, 'transfer', ?, ?)
      `, [
        req.user.company_id,
        transfer.to_location_id,
        transfer.product_id,
        quantity,
        id,
        req.user.id
      ]);

      logger.info(`Transfer ${id} received by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Transfer received successfully',
        data: { received_quantity: quantity }
      });
    } catch (error) {
      logger.error('Error receiving transfer:', error);
      next(error);
    }
  }

  /**
   * Get all inventory transfers
   * GET /api/inventory/transfers
   */
  async getTransfers(req, res, next) {
    try {
      const { status, location_id } = req.query;

      let query = `
        SELECT
          it.*,
          p.name as product_name,
          p.sku,
          fl.name as from_location_name,
          tl.name as to_location_name,
          u1.username as initiated_by_name,
          u2.username as received_by_name
        FROM inventory_transfers it
        JOIN products p ON it.product_id = p.id
        JOIN locations fl ON it.from_location_id = fl.id
        JOIN locations tl ON it.to_location_id = tl.id
        LEFT JOIN users u1 ON it.initiated_by = u1.id
        LEFT JOIN users u2 ON it.received_by = u2.id
        WHERE it.company_id = ?
      `;

      const params = [req.user.company_id];

      if (status) {
        query += ' AND it.status = ?';
        params.push(status);
      }

      if (location_id) {
        query += ' AND (it.from_location_id = ? OR it.to_location_id = ?)';
        params.push(location_id, location_id);
      }

      query += ' ORDER BY it.created_at DESC LIMIT 100';

      const transfers = await dbManager.all(query, params);

      res.json({
        success: true,
        data: transfers
      });
    } catch (error) {
      logger.error('Error fetching transfers:', error);
      next(error);
    }
  }

  /**
   * Create purchase order
   * POST /api/inventory/purchase-orders
   */
  async createPurchaseOrder(req, res, next) {
    try {
      const {
        supplier_id,
        location_id,
        items, // Array of { product_id, quantity, unit_price }
        notes,
        expected_delivery_date
      } = req.body;

      if (!supplier_id || !location_id || !items || !items.length) {
        return res.status(400).json({
          success: false,
          message: 'Supplier, location, and items are required'
        });
      }

      // Calculate total
      const subtotal = items.reduce((sum, item) => {
        return sum + (item.quantity * item.unit_price);
      }, 0);

      const tax_amount = subtotal * 0.16; // 16% IVA
      const total_amount = subtotal + tax_amount;

      // Create purchase order
      const po = await dbManager.run(`
        INSERT INTO purchase_orders (
          company_id, supplier_id, location_id,
          po_number, status, subtotal, tax_amount, total_amount,
          notes, expected_delivery_date, created_by
        ) VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
      `, [
        req.user.company_id,
        supplier_id,
        location_id,
        `PO-${Date.now()}`,
        subtotal,
        tax_amount,
        total_amount,
        notes || null,
        expected_delivery_date || null,
        req.user.id
      ]);

      // Create line items
      for (const item of items) {
        await dbManager.run(`
          INSERT INTO purchase_order_items (
            purchase_order_id, product_id,
            quantity_ordered, unit_price, subtotal
          ) VALUES (?, ?, ?, ?, ?)
        `, [
          po.lastID,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price
        ]);
      }

      logger.info(`Purchase order ${po.lastID} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Purchase order created successfully',
        data: {
          po_id: po.lastID,
          total_amount
        }
      });
    } catch (error) {
      logger.error('Error creating purchase order:', error);
      next(error);
    }
  }

  /**
   * Get all purchase orders
   * GET /api/inventory/purchase-orders
   */
  async getPurchaseOrders(req, res, next) {
    try {
      const { status, supplier_id } = req.query;

      let query = `
        SELECT
          po.*,
          s.name as supplier_name,
          l.name as location_name,
          u.username as created_by_name,
          (
            SELECT COUNT(*)
            FROM purchase_order_items
            WHERE purchase_order_id = po.id
          ) as item_count
        FROM purchase_orders po
        JOIN suppliers s ON po.supplier_id = s.id
        JOIN locations l ON po.location_id = l.id
        LEFT JOIN users u ON po.created_by = u.id
        WHERE po.company_id = ?
      `;

      const params = [req.user.company_id];

      if (status) {
        query += ' AND po.status = ?';
        params.push(status);
      }

      if (supplier_id) {
        query += ' AND po.supplier_id = ?';
        params.push(supplier_id);
      }

      query += ' ORDER BY po.created_at DESC';

      const orders = await dbManager.all(query, params);

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      logger.error('Error fetching purchase orders:', error);
      next(error);
    }
  }

  /**
   * Receive purchase order (receive inventory)
   * POST /api/inventory/purchase-orders/:id/receive
   */
  async receivePurchaseOrder(req, res, next) {
    try {
      const { id } = req.params;
      const { items, notes } = req.body; // items: [{ product_id, received_quantity }]

      // Get purchase order
      const po = await dbManager.get(`
        SELECT * FROM purchase_orders
        WHERE id = ? AND company_id = ? AND status IN ('approved', 'partial')
      `, [id, req.user.company_id]);

      if (!po) {
        return res.status(404).json({
          success: false,
          message: 'Purchase order not found or cannot be received'
        });
      }

      // Process each item
      for (const item of items) {
        // Update inventory
        const inventory = await dbManager.get(`
          SELECT * FROM inventory
          WHERE location_id = ? AND product_id = ?
        `, [po.location_id, item.product_id]);

        if (inventory) {
          await dbManager.run(`
            UPDATE inventory
            SET quantity_on_hand = quantity_on_hand + ?,
                available_quantity = available_quantity + ?
            WHERE id = ?
          `, [item.received_quantity, item.received_quantity, inventory.id]);
        } else {
          await dbManager.run(`
            INSERT INTO inventory (
              company_id, location_id, product_id,
              quantity_on_hand, available_quantity
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            req.user.company_id,
            po.location_id,
            item.product_id,
            item.received_quantity,
            item.received_quantity
          ]);
        }

        // Update PO item
        await dbManager.run(`
          UPDATE purchase_order_items
          SET quantity_received = quantity_received + ?
          WHERE purchase_order_id = ? AND product_id = ?
        `, [item.received_quantity, id, item.product_id]);

        // Create transaction
        await dbManager.run(`
          INSERT INTO inventory_transactions (
            company_id, location_id, product_id,
            transaction_type, quantity, reference_type, reference_id,
            created_by
          ) VALUES (?, ?, ?, 'purchase', ?, 'purchase_order', ?, ?)
        `, [
          req.user.company_id,
          po.location_id,
          item.product_id,
          item.received_quantity,
          id,
          req.user.id
        ]);
      }

      // Check if all items received
      const poItems = await dbManager.all(`
        SELECT * FROM purchase_order_items WHERE purchase_order_id = ?
      `, [id]);

      const allReceived = poItems.every(item =>
        item.quantity_received >= item.quantity_ordered
      );

      const newStatus = allReceived ? 'completed' : 'partial';

      // Update PO status
      await dbManager.run(`
        UPDATE purchase_orders
        SET status = ?,
            received_at = CURRENT_TIMESTAMP,
            received_notes = ?
        WHERE id = ?
      `, [newStatus, notes || null, id]);

      logger.info(`Purchase order ${id} received by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Items received successfully',
        data: { status: newStatus }
      });
    } catch (error) {
      logger.error('Error receiving purchase order:', error);
      next(error);
    }
  }

  /**
   * Start stock count
   * POST /api/inventory/stock-counts
   */
  async startStockCount(req, res, next) {
    try {
      const { location_id, notes } = req.body;

      if (!location_id) {
        return res.status(400).json({
          success: false,
          message: 'Location is required'
        });
      }

      // Create stock count
      const count = await dbManager.run(`
        INSERT INTO stock_counts (
          company_id, location_id, status, notes, started_by
        ) VALUES (?, ?, 'in_progress', ?, ?)
      `, [req.user.company_id, location_id, notes || null, req.user.id]);

      logger.info(`Stock count ${count.lastID} started by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Stock count started',
        data: { count_id: count.lastID }
      });
    } catch (error) {
      logger.error('Error starting stock count:', error);
      next(error);
    }
  }
}

module.exports = new InventoryController();
