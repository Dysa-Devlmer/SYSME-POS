/**
 * Suppliers & Purchase Orders Controller
 * Handles supplier management, purchase orders, and payments
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generate unique supplier code
const generateSupplierCode = async () => {
  const count = await dbService.raw('SELECT COUNT(*) as count FROM suppliers');
  const number = (count[0].count + 1).toString().padStart(4, '0');
  return `SUP-${number}`;
};

// Generate unique PO number
const generatePONumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `PO-${dateStr}-${random}`;
};

// Generate unique payment number
const generatePaymentNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `PAY-${dateStr}-${random}`;
};

// ============================================
// SUPPLIERS ENDPOINTS
// ============================================

export const getSuppliers = async (req, res) => {
  try {
    const { category, is_active, search } = req.query;

    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (search) {
      query += ' AND (business_name LIKE ? OR trade_name LIKE ? OR tax_id LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY business_name ASC';

    const suppliers = await dbService.raw(query, params);

    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    logger.error('Error getting suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting suppliers'
    });
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await dbService.findOne('suppliers', { id });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get purchase orders for this supplier
    const purchaseOrders = await dbService.raw(
      'SELECT * FROM purchase_orders WHERE supplier_id = ? ORDER BY order_date DESC LIMIT 10',
      [id]
    );

    // Get payment history
    const payments = await dbService.raw(
      'SELECT * FROM supplier_payments WHERE supplier_id = ? ORDER BY payment_date DESC LIMIT 10',
      [id]
    );

    res.json({
      success: true,
      data: {
        ...supplier,
        recent_orders: purchaseOrders,
        recent_payments: payments
      }
    });
  } catch (error) {
    logger.error('Error getting supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting supplier'
    });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const supplierData = req.body;

    // Generate supplier code if not provided
    if (!supplierData.supplier_code) {
      supplierData.supplier_code = await generateSupplierCode();
    }

    // Set created_by
    supplierData.created_by = req.user?.id;

    const [supplierId] = await dbService.create('suppliers', supplierData);

    const supplier = await dbService.findOne('suppliers', { id: supplierId });

    res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully'
    });
  } catch (error) {
    logger.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier'
    });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if exists
    const existing = await dbService.findOne('suppliers', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    await dbService.update('suppliers', { id }, updates);

    const supplier = await dbService.findOne('suppliers', { id });

    res.json({
      success: true,
      data: supplier,
      message: 'Supplier updated successfully'
    });
  } catch (error) {
    logger.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier'
    });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if has purchase orders
    const orders = await dbService.raw(
      'SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?',
      [id]
    );

    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with existing purchase orders. Deactivate instead.'
      });
    }

    await dbService.delete('suppliers', { id });

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting supplier'
    });
  }
};

// ============================================
// PURCHASE ORDERS ENDPOINTS
// ============================================

export const getPurchaseOrders = async (req, res) => {
  try {
    const { status, payment_status, supplier_id, start_date, end_date } = req.query;

    let query = `
      SELECT po.*, s.business_name as supplier_name, s.supplier_code
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }

    if (payment_status) {
      query += ' AND po.payment_status = ?';
      params.push(payment_status);
    }

    if (supplier_id) {
      query += ' AND po.supplier_id = ?';
      params.push(supplier_id);
    }

    if (start_date && end_date) {
      query += ' AND po.order_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY po.order_date DESC';

    const orders = await dbService.raw(query, params);

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('Error getting purchase orders:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting purchase orders'
    });
  }
};

export const getPurchaseOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await dbService.raw(
      `SELECT po.*, s.business_name as supplier_name, s.supplier_code,
              s.email as supplier_email, s.phone as supplier_phone
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = ?`,
      [id]
    );

    if (!po || po.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Get items
    const items = await dbService.raw(
      `SELECT poi.*, p.name as product_name, p.sku, p.unit as product_unit
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...po[0],
        items
      }
    });
  } catch (error) {
    logger.error('Error getting purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting purchase order'
    });
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier_id, warehouse_id, order_date, expected_delivery_date, items, notes } = req.body;

    if (!supplier_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier and items are required'
      });
    }

    // Generate PO number
    const po_number = generatePONumber();

    // Create purchase order
    const [poId] = await dbService.create('purchase_orders', {
      po_number,
      supplier_id,
      warehouse_id,
      order_date: order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date,
      status: 'draft',
      notes,
      created_by: req.user?.id
    });

    // Create items
    for (const item of items) {
      await dbService.create('purchase_order_items', {
        purchase_order_id: poId,
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 19,
        discount_percentage: item.discount_percentage || 0,
        notes: item.notes
      });
    }

    // Fetch complete PO with items
    const po = await dbService.raw(
      `SELECT po.*, s.business_name as supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = ?`,
      [poId]
    );

    const poItems = await dbService.raw(
      `SELECT poi.*, p.name as product_name
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = ?`,
      [poId]
    );

    res.status(201).json({
      success: true,
      data: {
        ...po[0],
        items: poItems
      },
      message: 'Purchase order created successfully'
    });
  } catch (error) {
    logger.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating purchase order'
    });
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if exists
    const existing = await dbService.findOne('purchase_orders', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await dbService.update('purchase_orders', { id }, updates);

    const po = await dbService.findOne('purchase_orders', { id });

    res.json({
      success: true,
      data: po,
      message: 'Purchase order updated successfully'
    });
  } catch (error) {
    logger.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating purchase order'
    });
  }
};

export const approvePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('purchase_orders', { id }, {
      status: 'confirmed',
      approved_by: req.user?.id,
      approved_date: new Date().toISOString()
    });

    const po = await dbService.findOne('purchase_orders', { id });

    res.json({
      success: true,
      data: po,
      message: 'Purchase order approved'
    });
  } catch (error) {
    logger.error('Error approving purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving purchase order'
    });
  }
};

export const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, reception_notes } = req.body;

    // Update item quantities
    for (const item of items) {
      await dbService.update('purchase_order_items', { id: item.id }, {
        quantity_received: item.quantity_received,
        quantity_accepted: item.quantity_accepted || item.quantity_received,
        quantity_rejected: item.quantity_rejected || 0,
        rejection_reason: item.rejection_reason
      });

      // Update product inventory if fully accepted
      if (item.quantity_accepted > 0) {
        await dbService.raw(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity_accepted, item.product_id]
        );
      }
    }

    // Update PO status
    const poItems = await dbService.findMany('purchase_order_items', { purchase_order_id: id });
    const allReceived = poItems.every(item => item.quantity_received >= item.quantity_ordered);
    const anyReceived = poItems.some(item => item.quantity_received > 0);

    await dbService.update('purchase_orders', { id }, {
      status: allReceived ? 'received' : (anyReceived ? 'partial' : 'confirmed'),
      received_by: req.user?.id,
      received_date: new Date().toISOString(),
      reception_notes
    });

    const po = await dbService.findOne('purchase_orders', { id });

    res.json({
      success: true,
      data: po,
      message: 'Purchase order received successfully'
    });
  } catch (error) {
    logger.error('Error receiving purchase order:', error);
    res.status(500).json({
      success: false,
      message: 'Error receiving purchase order'
    });
  }
};

// ============================================
// PAYMENTS ENDPOINTS
// ============================================

export const getPayments = async (req, res) => {
  try {
    const { supplier_id, start_date, end_date, status } = req.query;

    let query = `
      SELECT sp.*, s.business_name as supplier_name,
             po.po_number
      FROM supplier_payments sp
      JOIN suppliers s ON sp.supplier_id = s.id
      LEFT JOIN purchase_orders po ON sp.purchase_order_id = po.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id) {
      query += ' AND sp.supplier_id = ?';
      params.push(supplier_id);
    }

    if (start_date && end_date) {
      query += ' AND sp.payment_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (status) {
      query += ' AND sp.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sp.payment_date DESC';

    const payments = await dbService.raw(query, params);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    logger.error('Error getting payments:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting payments'
    });
  }
};

export const createPayment = async (req, res) => {
  try {
    const paymentData = req.body;

    // Generate payment number
    paymentData.payment_number = generatePaymentNumber();
    paymentData.created_by = req.user?.id;

    const [paymentId] = await dbService.create('supplier_payments', paymentData);

    const payment = await dbService.findOne('supplier_payments', { id: paymentId });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment'
    });
  }
};

// ============================================
// REPORTS
// ============================================

export const getSupplierStats = async (req, res) => {
  try {
    const stats = await dbService.raw(`
      SELECT
        COUNT(*) as total_suppliers,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_suppliers,
        SUM(total_purchases) as total_purchases,
        SUM(total_paid) as total_paid,
        SUM(current_balance) as total_owed
      FROM suppliers
    `);

    const topSuppliers = await dbService.raw(`
      SELECT business_name, total_purchases, current_balance
      FROM suppliers
      WHERE is_active = 1
      ORDER BY total_purchases DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        summary: stats[0],
        top_suppliers: topSuppliers
      }
    });
  } catch (error) {
    logger.error('Error getting supplier stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting supplier stats'
    });
  }
};
