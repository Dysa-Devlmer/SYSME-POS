/**
 * Warehouses Controller - Multi-location Inventory Management
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get all warehouses
export const getWarehouses = async (req, res) => {
  try {
    const warehouses = await dbService.findMany('warehouses', { is_active: 1 });
    res.json({ success: true, data: warehouses });
  } catch (error) {
    logger.error('Error fetching warehouses:', error);
    res.status(500).json({ success: false, message: 'Error al obtener almacenes' });
  }
};

// Get warehouse inventory
export const getWarehouseInventory = async (req, res) => {
  try {
    const { warehouse_id } = req.params;

    const inventory = await dbService.query(
      `SELECT wi.*, p.name as product_name, p.code as product_code, p.category_id
       FROM warehouse_inventory wi
       JOIN products p ON wi.product_id = p.id
       WHERE wi.warehouse_id = ?
       ORDER BY p.name`,
      [warehouse_id]
    );

    res.json({ success: true, data: inventory });
  } catch (error) {
    logger.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, message: 'Error al obtener inventario' });
  }
};

// Get low stock products
export const getLowStockProducts = async (req, res) => {
  try {
    const { warehouse_id } = req.params;

    const lowStock = await dbService.query(
      `SELECT wi.*, p.name as product_name, p.code as product_code
       FROM warehouse_inventory wi
       JOIN products p ON wi.product_id = p.id
       WHERE wi.warehouse_id = ? AND wi.quantity <= wi.min_stock
       ORDER BY wi.quantity ASC`,
      [warehouse_id]
    );

    res.json({ success: true, data: lowStock });
  } catch (error) {
    logger.error('Error fetching low stock:', error);
    res.status(500).json({ success: false, message: 'Error al obtener productos con stock bajo' });
  }
};

// Create warehouse transfer
export const createTransfer = async (req, res) => {
  try {
    const { from_warehouse_id, to_warehouse_id, items, notes } = req.body;
    const userId = req.user.id;

    // Validate warehouses are different
    if (from_warehouse_id === to_warehouse_id) {
      return res.status(400).json({
        success: false,
        message: 'Los almacenes de origen y destino deben ser diferentes'
      });
    }

    // Generate transfer number
    const count = await dbService.query('SELECT COUNT(*) as count FROM warehouse_transfers');
    const transferNumber = `TRANS-${String(count[0].count + 1).padStart(6, '0')}`;

    const result = await dbService.transaction(async () => {
      // Create transfer
      const transfer = await dbService.create('warehouse_transfers', {
        transfer_number: transferNumber,
        from_warehouse_id,
        to_warehouse_id,
        transfer_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        requested_by: userId,
        notes: notes || null,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Add items
      for (const item of items) {
        await dbService.create('warehouse_transfer_items', {
          transfer_id: transfer.id,
          product_id: item.product_id,
          requested_quantity: item.quantity,
          unit_cost: item.unit_cost || 0,
          notes: item.notes || null
        });
      }

      logger.info(`Transfer ${transferNumber} created by user ${userId}`);
      return transfer;
    });

    res.json({
      success: true,
      data: result,
      message: `Traspaso ${result.transfer_number} creado exitosamente`
    });
  } catch (error) {
    logger.error('Error creating transfer:', error);
    res.status(500).json({ success: false, message: 'Error al crear traspaso' });
  }
};

// Approve and execute transfer
export const approveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const transfer = await dbService.findById('warehouse_transfers', id);
    if (!transfer) {
      return res.status(404).json({ success: false, message: 'Traspaso no encontrado' });
    }

    if (transfer.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden aprobar traspasos pendientes'
      });
    }

    await dbService.transaction(async () => {
      // Get items
      const items = await dbService.findMany('warehouse_transfer_items', { transfer_id: id });

      // Deduct from source warehouse
      for (const item of items) {
        const inventory = await dbService.query(
          'SELECT * FROM warehouse_inventory WHERE warehouse_id = ? AND product_id = ?',
          [transfer.from_warehouse_id, item.product_id]
        );

        if (!inventory[0] || inventory[0].quantity < item.requested_quantity) {
          throw new Error(`Stock insuficiente para producto ID ${item.product_id}`);
        }

        const newQty = inventory[0].quantity - item.requested_quantity;
        await dbService.query(
          'UPDATE warehouse_inventory SET quantity = ? WHERE warehouse_id = ? AND product_id = ?',
          [newQty, transfer.from_warehouse_id, item.product_id]
        );

        // Log movement
        await dbService.create('inventory_movements', {
          warehouse_id: transfer.from_warehouse_id,
          product_id: item.product_id,
          movement_type: 'transfer_out',
          quantity: -item.requested_quantity,
          previous_quantity: inventory[0].quantity,
          new_quantity: newQty,
          reference_type: 'transfer',
          reference_id: id,
          user_id: userId,
          created_at: new Date()
        });
      }

      // Update transfer status
      await dbService.update('warehouse_transfers', id, {
        status: 'in_transit',
        approved_by: userId,
        updated_at: new Date()
      });
    });

    res.json({ success: true, message: 'Traspaso aprobado y en tránsito' });
  } catch (error) {
    logger.error('Error approving transfer:', error);
    res.status(500).json({ success: false, message: error.message || 'Error al aprobar traspaso' });
  }
};

// Receive transfer at destination
export const receiveTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { received_quantities } = req.body; // { product_id: quantity }
    const userId = req.user.id;

    const transfer = await dbService.findById('warehouse_transfers', id);
    if (!transfer || transfer.status !== 'in_transit') {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden recibir traspasos en tránsito'
      });
    }

    await dbService.transaction(async () => {
      const items = await dbService.findMany('warehouse_transfer_items', { transfer_id: id });

      for (const item of items) {
        const receivedQty = received_quantities[item.product_id] || item.requested_quantity;

        // Update received quantity
        await dbService.query(
          'UPDATE warehouse_transfer_items SET received_quantity = ? WHERE id = ?',
          [receivedQty, item.id]
        );

        // Add to destination warehouse
        const destInventory = await dbService.query(
          'SELECT * FROM warehouse_inventory WHERE warehouse_id = ? AND product_id = ?',
          [transfer.to_warehouse_id, item.product_id]
        );

        if (destInventory[0]) {
          const newQty = destInventory[0].quantity + receivedQty;
          await dbService.query(
            'UPDATE warehouse_inventory SET quantity = ? WHERE warehouse_id = ? AND product_id = ?',
            [newQty, transfer.to_warehouse_id, item.product_id]
          );

          await dbService.create('inventory_movements', {
            warehouse_id: transfer.to_warehouse_id,
            product_id: item.product_id,
            movement_type: 'transfer_in',
            quantity: receivedQty,
            previous_quantity: destInventory[0].quantity,
            new_quantity: newQty,
            reference_type: 'transfer',
            reference_id: id,
            user_id: userId,
            created_at: new Date()
          });
        } else {
          await dbService.create('warehouse_inventory', {
            warehouse_id: transfer.to_warehouse_id,
            product_id: item.product_id,
            quantity: receivedQty,
            min_stock: 0
          });

          await dbService.create('inventory_movements', {
            warehouse_id: transfer.to_warehouse_id,
            product_id: item.product_id,
            movement_type: 'transfer_in',
            quantity: receivedQty,
            previous_quantity: 0,
            new_quantity: receivedQty,
            reference_type: 'transfer',
            reference_id: id,
            user_id: userId,
            created_at: new Date()
          });
        }
      }

      await dbService.update('warehouse_transfers', id, {
        status: 'completed',
        received_by: userId,
        completed_at: new Date(),
        updated_at: new Date()
      });
    });

    res.json({ success: true, message: 'Traspaso recibido exitosamente' });
  } catch (error) {
    logger.error('Error receiving transfer:', error);
    res.status(500).json({ success: false, message: 'Error al recibir traspaso' });
  }
};

// Get all transfers
export const getTransfers = async (req, res) => {
  try {
    const { status, warehouse_id } = req.query;

    let query = `
      SELECT t.*,
        w1.name as from_warehouse_name,
        w2.name as to_warehouse_name,
        u.name as requested_by_name
      FROM warehouse_transfers t
      JOIN warehouses w1 ON t.from_warehouse_id = w1.id
      JOIN warehouses w2 ON t.to_warehouse_id = w2.id
      JOIN users u ON t.requested_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (warehouse_id) {
      query += ' AND (t.from_warehouse_id = ? OR t.to_warehouse_id = ?)';
      params.push(warehouse_id, warehouse_id);
    }

    query += ' ORDER BY t.created_at DESC';

    const transfers = await dbService.query(query, params);
    res.json({ success: true, data: transfers });
  } catch (error) {
    logger.error('Error fetching transfers:', error);
    res.status(500).json({ success: false, message: 'Error al obtener traspasos' });
  }
};
