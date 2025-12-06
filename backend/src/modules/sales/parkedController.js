/**
 * Parked Sales Controller
 * Manages sales that are temporarily parked and can be resumed later
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Generate unique park number
const generateParkNumber = async () => {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const count = await dbService.count('parked_sales', {});
  return `PARK-${today}-${String(count + 1).padStart(4, '0')}`;
};

// Calculate totals from items
const calculateTotals = (items) => {
  let subtotal = 0;
  let taxAmount = 0;
  let discountAmount = 0;

  for (const item of items) {
    const itemSubtotal = item.unit_price * item.quantity;
    const itemTax = itemSubtotal * (item.tax_rate || 0.19);
    subtotal += itemSubtotal;
    taxAmount += itemTax;
    discountAmount += item.discount_amount || 0;
  }

  return {
    subtotal,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: subtotal + taxAmount - discountAmount,
    items_count: items.length
  };
};

// Get parked sales with filters
export const getParkedSales = async (req, res) => {
  try {
    const { status, table_id, parked_by_user_id, start_date, end_date, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND ps.status = ?`;
      params.push(status);
    }

    if (table_id) {
      query += ` AND ps.table_id = ?`;
      params.push(table_id);
    }

    if (parked_by_user_id) {
      query += ` AND ps.parked_by_user_id = ?`;
      params.push(parked_by_user_id);
    }

    if (start_date) {
      query += ` AND ps.parked_at >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ps.parked_at <= ?`;
      params.push(end_date);
    }

    if (search) {
      query += ` AND (ps.park_number LIKE ? OR ps.customer_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY ps.parked_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const sales = await dbService.raw(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM parked_sales ps WHERE 1=1`;
    const countParams = [];
    if (status) {
      countQuery += ` AND ps.status = ?`;
      countParams.push(status);
    }
    const countResult = await dbService.raw(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        items: sales,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error getting parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas estacionadas'
    });
  }
};

// Get active parked sales
export const getActiveParkedSales = async (req, res) => {
  try {
    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE ps.status = 'parked'
      ORDER BY ps.parked_at DESC
    `);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error getting active parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas estacionadas activas'
    });
  }
};

// Get parked sale by ID with items
export const getParkedSaleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE ps.id = ?
    `, [id]);

    const sale = sales[0];

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta estacionada no encontrada'
      });
    }

    // Get items
    const items = await dbService.findMany('parked_sale_items', { parked_sale_id: id });

    res.json({
      success: true,
      data: {
        ...sale,
        items
      }
    });
  } catch (error) {
    logger.error('Error getting parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener venta estacionada'
    });
  }
};

// Get parked sale by park number
export const getParkedSaleByNumber = async (req, res) => {
  try {
    const { park_number } = req.params;

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE ps.park_number = ?
    `, [park_number]);

    const sale = sales[0];

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta estacionada no encontrada'
      });
    }

    const items = await dbService.findMany('parked_sale_items', { parked_sale_id: sale.id });

    res.json({
      success: true,
      data: {
        ...sale,
        items
      }
    });
  } catch (error) {
    logger.error('Error getting parked sale by number:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener venta estacionada'
    });
  }
};

// Get parked sales for a table
export const getParkedSalesByTable = async (req, res) => {
  try {
    const { table_id } = req.params;

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE ps.table_id = ? AND ps.status = 'parked'
      ORDER BY ps.parked_at DESC
    `, [table_id]);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error getting parked sales by table:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas estacionadas de la mesa'
    });
  }
};

// Get my parked sales (current user)
export const getMyParkedSales = async (req, res) => {
  try {
    const userId = req.user.id;

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      WHERE ps.parked_by_user_id = ? AND ps.status = 'parked'
      ORDER BY ps.parked_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error getting my parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener mis ventas estacionadas'
    });
  }
};

// Create a new parked sale
export const createParkedSale = async (req, res) => {
  try {
    const { table_id, customer_name, customer_notes, reason, expires_at, items } = req.body;
    const userId = req.user.id;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere al menos un item'
      });
    }

    const park_number = await generateParkNumber();
    const totals = calculateTotals(items);

    // Create parked sale
    const parkedSale = await dbService.create('parked_sales', {
      park_number,
      table_id,
      customer_name,
      customer_notes,
      reason,
      expires_at,
      parked_by_user_id: userId,
      ...totals
    });

    // Create items
    for (const item of items) {
      const itemSubtotal = item.unit_price * item.quantity;
      const itemTax = itemSubtotal * (item.tax_rate || 0.19);
      const itemTotal = itemSubtotal + itemTax - (item.discount_amount || 0);

      await dbService.create('parked_sale_items', {
        parked_sale_id: parkedSale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: itemSubtotal,
        tax_rate: item.tax_rate || 0.19,
        discount_amount: item.discount_amount || 0,
        total: itemTotal,
        modifiers: item.modifiers ? JSON.stringify(item.modifiers) : null,
        notes: item.notes
      });
    }

    // Get complete parked sale with items
    const savedItems = await dbService.findMany('parked_sale_items', { parked_sale_id: parkedSale.id });

    logger.info(`Parked sale created: ${park_number}`);

    res.status(201).json({
      success: true,
      data: {
        ...parkedSale,
        items: savedItems
      },
      message: 'Venta estacionada creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear venta estacionada'
    });
  }
};

// Resume a parked sale (convert to active sale)
export const resumeParkedSale = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const parkedSale = await dbService.findById('parked_sales', id);
    if (!parkedSale) {
      return res.status(404).json({
        success: false,
        message: 'Venta estacionada no encontrada'
      });
    }

    if (parkedSale.status !== 'parked') {
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya no está estacionada'
      });
    }

    // Get items
    const items = await dbService.findMany('parked_sale_items', { parked_sale_id: id });

    // Create a pending sale from parked sale
    const saleNumber = parkedSale.park_number.replace('PARK', 'SALE');

    const newSale = await dbService.create('sales', {
      sale_number: saleNumber,
      table_id: parkedSale.table_id,
      subtotal: parkedSale.subtotal,
      tax_amount: parkedSale.tax_amount,
      discount_amount: parkedSale.discount_amount,
      total: parkedSale.total_amount,
      status: 'pending',
      notes: parkedSale.customer_notes,
      user_id: userId
    });

    // Create sale items
    for (const item of items) {
      await dbService.create('sale_items', {
        sale_id: newSale.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total
      });
    }

    // Update parked sale status
    await dbService.update('parked_sales', id, {
      status: 'resumed',
      resumed_by_user_id: userId,
      resumed_at: new Date().toISOString()
    });

    logger.info(`Parked sale ${id} resumed as sale ${newSale.id}`);

    res.json({
      success: true,
      data: {
        sale_id: newSale.id,
        message: 'Venta reanudada exitosamente'
      }
    });
  } catch (error) {
    logger.error('Error resuming parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reanudar venta estacionada'
    });
  }
};

// Cancel a parked sale
export const cancelParkedSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const parkedSale = await dbService.findById('parked_sales', id);
    if (!parkedSale) {
      return res.status(404).json({
        success: false,
        message: 'Venta estacionada no encontrada'
      });
    }

    if (parkedSale.status !== 'parked') {
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya no está estacionada'
      });
    }

    await dbService.update('parked_sales', id, {
      status: 'cancelled',
      cancelled_by_user_id: userId,
      cancelled_at: new Date().toISOString(),
      reason: reason || parkedSale.reason
    });

    const updatedSale = await dbService.findById('parked_sales', id);

    logger.info(`Parked sale ${id} cancelled`);

    res.json({
      success: true,
      data: updatedSale,
      message: 'Venta estacionada cancelada'
    });
  } catch (error) {
    logger.error('Error cancelling parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar venta estacionada'
    });
  }
};

// Update parked sale details
export const updateParkedSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_notes, expires_at } = req.body;

    const parkedSale = await dbService.findById('parked_sales', id);
    if (!parkedSale) {
      return res.status(404).json({
        success: false,
        message: 'Venta estacionada no encontrada'
      });
    }

    const updateData = {};
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_notes !== undefined) updateData.customer_notes = customer_notes;
    if (expires_at !== undefined) updateData.expires_at = expires_at;
    updateData.updated_at = new Date().toISOString();

    await dbService.update('parked_sales', id, updateData);
    const updatedSale = await dbService.findById('parked_sales', id);

    res.json({
      success: true,
      data: updatedSale,
      message: 'Venta estacionada actualizada'
    });
  } catch (error) {
    logger.error('Error updating parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar venta estacionada'
    });
  }
};

// Add item to parked sale
export const addItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, product_name, quantity, unit_price, tax_rate, discount_amount, modifiers, notes } = req.body;

    const parkedSale = await dbService.findById('parked_sales', id);
    if (!parkedSale) {
      return res.status(404).json({
        success: false,
        message: 'Venta estacionada no encontrada'
      });
    }

    const itemSubtotal = unit_price * quantity;
    const itemTax = itemSubtotal * (tax_rate || 0.19);
    const itemTotal = itemSubtotal + itemTax - (discount_amount || 0);

    const newItem = await dbService.create('parked_sale_items', {
      parked_sale_id: id,
      product_id,
      product_name,
      quantity,
      unit_price,
      subtotal: itemSubtotal,
      tax_rate: tax_rate || 0.19,
      discount_amount: discount_amount || 0,
      total: itemTotal,
      modifiers: modifiers ? JSON.stringify(modifiers) : null,
      notes
    });

    // Update totals
    const allItems = await dbService.findMany('parked_sale_items', { parked_sale_id: id });
    const totals = calculateTotals(allItems.map(i => ({
      unit_price: i.unit_price,
      quantity: i.quantity,
      tax_rate: i.tax_rate,
      discount_amount: i.discount_amount
    })));

    await dbService.update('parked_sales', id, totals);

    res.json({
      success: true,
      data: newItem,
      message: 'Item agregado exitosamente'
    });
  } catch (error) {
    logger.error('Error adding item to parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar item'
    });
  }
};

// Update item in parked sale
export const updateItem = async (req, res) => {
  try {
    const { id, item_id } = req.params;
    const updateData = req.body;

    const item = await dbService.findById('parked_sale_items', item_id);
    if (!item || item.parked_sale_id != id) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }

    // Recalculate if quantity or price changed
    if (updateData.quantity || updateData.unit_price) {
      const qty = updateData.quantity || item.quantity;
      const price = updateData.unit_price || item.unit_price;
      const taxRate = updateData.tax_rate || item.tax_rate;
      const discount = updateData.discount_amount || item.discount_amount;

      updateData.subtotal = price * qty;
      updateData.total = updateData.subtotal + (updateData.subtotal * taxRate) - discount;
    }

    await dbService.update('parked_sale_items', item_id, updateData);
    const updatedItem = await dbService.findById('parked_sale_items', item_id);

    // Update totals
    const allItems = await dbService.findMany('parked_sale_items', { parked_sale_id: id });
    const totals = calculateTotals(allItems.map(i => ({
      unit_price: i.unit_price,
      quantity: i.quantity,
      tax_rate: i.tax_rate,
      discount_amount: i.discount_amount
    })));
    await dbService.update('parked_sales', id, totals);

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    logger.error('Error updating parked sale item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar item'
    });
  }
};

// Remove item from parked sale
export const removeItem = async (req, res) => {
  try {
    const { id, item_id } = req.params;

    const item = await dbService.findById('parked_sale_items', item_id);
    if (!item || item.parked_sale_id != id) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }

    await dbService.delete('parked_sale_items', item_id);

    // Update totals
    const allItems = await dbService.findMany('parked_sale_items', { parked_sale_id: id });
    if (allItems.length > 0) {
      const totals = calculateTotals(allItems.map(i => ({
        unit_price: i.unit_price,
        quantity: i.quantity,
        tax_rate: i.tax_rate,
        discount_amount: i.discount_amount
      })));
      await dbService.update('parked_sales', id, totals);
    } else {
      await dbService.update('parked_sales', id, {
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        items_count: 0
      });
    }

    res.json({
      success: true,
      message: 'Item eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error removing item from parked sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar item'
    });
  }
};

// Update item quantity
export const updateItemQuantity = async (req, res) => {
  try {
    const { id, item_id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Cantidad inválida'
      });
    }

    const item = await dbService.findById('parked_sale_items', item_id);
    if (!item || item.parked_sale_id != id) {
      return res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
    }

    const subtotal = item.unit_price * quantity;
    const total = subtotal + (subtotal * item.tax_rate) - item.discount_amount;

    await dbService.update('parked_sale_items', item_id, {
      quantity,
      subtotal,
      total
    });

    const updatedItem = await dbService.findById('parked_sale_items', item_id);

    // Update totals
    const allItems = await dbService.findMany('parked_sale_items', { parked_sale_id: id });
    const totals = calculateTotals(allItems.map(i => ({
      unit_price: i.unit_price,
      quantity: i.quantity,
      tax_rate: i.tax_rate,
      discount_amount: i.discount_amount
    })));
    await dbService.update('parked_sales', id, totals);

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (error) {
    logger.error('Error updating item quantity:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar cantidad'
    });
  }
};

// Bulk cancel parked sales
export const bulkCancel = async (req, res) => {
  try {
    const { parked_sale_ids, reason } = req.body;
    const userId = req.user.id;

    if (!parked_sale_ids || parked_sale_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren IDs de ventas estacionadas'
      });
    }

    let cancelledCount = 0;
    for (const id of parked_sale_ids) {
      try {
        await dbService.update('parked_sales', id, {
          status: 'cancelled',
          cancelled_by_user_id: userId,
          cancelled_at: new Date().toISOString(),
          reason
        });
        cancelledCount++;
      } catch (err) {
        logger.warn(`Could not cancel parked sale ${id}:`, err.message);
      }
    }

    res.json({
      success: true,
      data: { cancelled_count: cancelledCount }
    });
  } catch (error) {
    logger.error('Error bulk cancelling parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar ventas estacionadas'
    });
  }
};

// Clean expired parked sales
export const cleanExpired = async (req, res) => {
  try {
    const now = new Date().toISOString();

    const result = await dbService.raw(`
      UPDATE parked_sales
      SET status = 'expired', updated_at = ?
      WHERE status = 'parked' AND expires_at IS NOT NULL AND expires_at < ?
    `, [now, now]);

    const expiredCount = result?.changes || 0;

    res.json({
      success: true,
      data: { expired_count: expiredCount }
    });
  } catch (error) {
    logger.error('Error cleaning expired parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al limpiar ventas expiradas'
    });
  }
};

// Auto-expire old parked sales
export const autoExpire = async (req, res) => {
  try {
    const { hours = 24 } = req.body;
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const result = await dbService.raw(`
      UPDATE parked_sales
      SET status = 'expired', updated_at = ?
      WHERE status = 'parked' AND parked_at < ?
    `, [new Date().toISOString(), cutoffDate]);

    const expiredCount = result?.changes || 0;

    res.json({
      success: true,
      data: { expired_count: expiredCount }
    });
  } catch (error) {
    logger.error('Error auto-expiring parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al expirar ventas antiguas'
    });
  }
};

// Get parked sales statistics
export const getStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];
    if (start_date && end_date) {
      dateFilter = 'AND parked_at >= ? AND parked_at <= ?';
      params.push(start_date, end_date);
    }

    // Main stats
    const stats = await dbService.raw(`
      SELECT
        COUNT(CASE WHEN status = 'parked' THEN 1 END) as currently_parked,
        COUNT(CASE WHEN status = 'resumed' THEN 1 END) as total_resumed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as total_cancelled,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as total_expired,
        COUNT(*) as total_parked,
        COALESCE(SUM(CASE WHEN status = 'parked' THEN total_amount END), 0) as total_amount_parked
      FROM parked_sales
      WHERE 1=1 ${dateFilter}
    `, params);

    // By user
    const byUser = await dbService.raw(`
      SELECT
        ps.parked_by_user_id as user_id,
        u.username,
        COUNT(CASE WHEN ps.status = 'parked' THEN 1 END) as parked_count,
        COUNT(CASE WHEN ps.status = 'resumed' THEN 1 END) as resumed_count
      FROM parked_sales ps
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY ps.parked_by_user_id
    `, params);

    // By table
    const byTable = await dbService.raw(`
      SELECT
        ps.table_id,
        t.table_number,
        COUNT(*) as parked_count
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      WHERE ps.table_id IS NOT NULL ${dateFilter}
      GROUP BY ps.table_id
    `, params);

    res.json({
      success: true,
      data: {
        ...stats[0],
        by_user: byUser,
        by_table: byTable
      }
    });
  } catch (error) {
    logger.error('Error getting parked sales stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

// Get oldest parked sales
export const getOldestParked = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE ps.status = 'parked'
      ORDER BY ps.parked_at ASC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error getting oldest parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas más antiguas'
    });
  }
};

// Get soon-to-expire parked sales
export const getSoonToExpire = async (req, res) => {
  try {
    const { hours = 2 } = req.query;
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE ps.status = 'parked'
        AND ps.expires_at IS NOT NULL
        AND ps.expires_at <= ?
        AND ps.expires_at > ?
      ORDER BY ps.expires_at ASC
    `, [futureDate, now.toISOString()]);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error getting expiring sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas por expirar'
    });
  }
};

// Search parked sales
export const search = async (req, res) => {
  try {
    const { query, status } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere término de búsqueda'
      });
    }

    let sql = `
      SELECT
        ps.*,
        t.table_number,
        u.username as parked_by_username
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      LEFT JOIN users u ON ps.parked_by_user_id = u.id
      WHERE (ps.park_number LIKE ? OR ps.customer_name LIKE ?)
    `;
    const params = [`%${query}%`, `%${query}%`];

    if (status) {
      sql += ` AND ps.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY ps.parked_at DESC LIMIT 50`;

    const sales = await dbService.raw(sql, params);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error searching parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda'
    });
  }
};

// Quick search
export const quickSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    const sales = await dbService.raw(`
      SELECT
        ps.*,
        t.table_number
      FROM parked_sales ps
      LEFT JOIN tables t ON ps.table_id = t.id
      WHERE ps.status = 'parked'
        AND (ps.park_number LIKE ? OR ps.customer_name LIKE ?)
      ORDER BY ps.parked_at DESC
      LIMIT 10
    `, [`%${q}%`, `%${q}%`]);

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error in quick search:', error);
    res.status(500).json({
      success: false,
      message: 'Error en búsqueda rápida'
    });
  }
};
