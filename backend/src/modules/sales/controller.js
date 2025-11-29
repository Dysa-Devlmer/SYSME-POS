/**
 * Sales Controller - Critical POS functionality
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { printKitchenTicket, printReceiptTicket } from './printerService.js';

// Get all sales
export const getSales = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, date } = req.query;
    const offset = (page - 1) * limit;

    let conditions = {};
    if (status) conditions.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      // For SQLite, we'll use simple date comparison
      conditions.created_at = { '>=': startDate, '<': endDate };
    }

    const sales = await dbService.findMany('sales', conditions, {
      orderBy: { field: 'created_at', direction: 'desc' },
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await dbService.count('sales', conditions);

    res.json({
      success: true,
      data: sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sales'
    });
  }
};

// Get sale by ID
export const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await dbService.findById('sales', id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Get sale items
    const saleItems = await dbService.findMany('sale_items', { sale_id: id });

    // Get modifiers for each sale item
    for (const item of saleItems) {
      const modifiers = await dbService.findMany('order_item_modifiers', {
        order_item_id: item.id
      });

      // Enrich with modifier details
      if (modifiers.length > 0) {
        const enrichedModifiers = [];
        for (const mod of modifiers) {
          const modifierDetails = await dbService.findById('modifiers', mod.modifier_id);
          if (modifierDetails) {
            enrichedModifiers.push({
              ...mod,
              modifier_name: modifierDetails.name,
              group_id: modifierDetails.group_id
            });
          }
        }
        item.modifiers = enrichedModifiers;
      }
    }

    // Parse payment_details if it's a JSON string
    let parsedSale = { ...sale };
    if (sale.payment_details && typeof sale.payment_details === 'string') {
      try {
        parsedSale.payment_details = JSON.parse(sale.payment_details);
      } catch (e) {
        logger.warn('Failed to parse payment_details:', e);
      }
    }

    res.json({
      success: true,
      data: {
        ...parsedSale,
        items: saleItems
      }
    });
  } catch (error) {
    logger.error('Error getting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sale'
    });
  }
};

// Process a new sale (main POS function)
export const processSale = async (req, res) => {
  try {
    const { items, customer_id, table_number, payment_method, payment_details, discount_amount = 0, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sale must have at least one item'
      });
    }

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await dbService.findById('products', item.product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product_id}`
        });
      }

      // Check inventory
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      processedItems.push({
        product_id: item.product_id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal
      });
    }

    const total = subtotal - discount_amount;

    // Validate payment for mixed payment
    if (payment_method === 'mixed' && payment_details) {
      const totalPaid = payment_details.payments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid < total) {
        return res.status(400).json({
          success: false,
          message: `Pago insuficiente. Total: $${total}, Pagado: $${totalPaid}`
        });
      }

      // Calculate change
      payment_details.change = totalPaid - total;
      payment_details.total_paid = totalPaid;
    }

    // Check for active cash session (OBLIGATORIO)
    const cashSession = await dbService.findOne('cash_sessions', {
      user_id: req.user.id,
      status: 'open'
    });

    if (!cashSession) {
      return res.status(400).json({
        success: false,
        message: 'No hay sesión de caja abierta. Debe abrir una caja antes de procesar ventas.',
        code: 'NO_CASH_SESSION'
      });
    }

    // Start transaction
    await dbService.transaction(async (trx) => {
      // Create sale record with cash_session_id
      const [saleId] = await trx('sales').insert({
        customer_id,
        table_number,
        subtotal,
        discount_amount,
        total,
        payment_method,
        payment_details: payment_details ? JSON.stringify(payment_details) : null,
        cash_session_id: cashSession.id,
        status: 'completed',
        notes,
        user_id: req.user.id,
        created_at: new Date(),
        updated_at: new Date()
      });

      // Create sale items
      for (const item of processedItems) {
        const [saleItemId] = await trx('sale_items').insert({
          sale_id: saleId,
          ...item,
          created_at: new Date()
        });

        // Save modifiers if present (from frontend SaleItem.modifiers)
        if (item.modifiers && Array.isArray(item.modifiers)) {
          for (const modifier of item.modifiers) {
            await trx('order_item_modifiers').insert({
              order_item_id: saleItemId,
              modifier_id: modifier.modifier_id,
              quantity: 1,
              unit_price: modifier.modifier_price,
              total_price: modifier.modifier_price,
              created_at: new Date()
            });
          }
        }

        // Update product inventory
        await trx('products')
          .where('id', item.product_id)
          .decrement('stock', item.quantity);
      }

      // Update cash session totals and record movements
      // For mixed payments, record multiple movements
      if (payment_method === 'mixed' && payment_details?.payments) {
        for (const payment of payment_details.payments) {
          await trx('cash_movements').insert({
            cash_session_id: cashSession.id,
            type: 'sale',
            amount: payment.amount,
            payment_method: payment.method,
            reference_id: saleId,
            reference_type: 'sale',
            reason: 'Venta',
            user_id: req.user.id,
            created_at: new Date()
          });
        }
      } else {
        // Single payment method
        await trx('cash_movements').insert({
          cash_session_id: cashSession.id,
          type: 'sale',
          amount: total,
          payment_method: payment_method,
          reference_id: saleId,
          reference_type: 'sale',
          reason: 'Venta',
          user_id: req.user.id,
          created_at: new Date()
        });
      }

      // Update session totals
      const sessionUpdates = {
        total_sales: parseFloat(cashSession.total_sales) + parseFloat(total),
        sales_count: parseInt(cashSession.sales_count) + 1
      };

      if (payment_method === 'mixed' && payment_details?.payments) {
        // For mixed payments, add to each payment method total
        for (const payment of payment_details.payments) {
          if (payment.method === 'cash') {
            sessionUpdates.total_cash = parseFloat(cashSession.total_cash) + parseFloat(payment.amount);
          } else if (payment.method === 'card') {
            sessionUpdates.total_card = parseFloat(cashSession.total_card) + parseFloat(payment.amount);
          } else {
            sessionUpdates.total_other = parseFloat(cashSession.total_other) + parseFloat(payment.amount);
          }
        }
      } else {
        // Single payment method
        if (payment_method === 'cash') {
          sessionUpdates.total_cash = parseFloat(cashSession.total_cash) + parseFloat(total);
        } else if (payment_method === 'card') {
          sessionUpdates.total_card = parseFloat(cashSession.total_card) + parseFloat(total);
        } else {
          sessionUpdates.total_other = parseFloat(cashSession.total_other) + parseFloat(total);
        }
      }

      await trx('cash_sessions')
        .where('id', cashSession.id)
        .update({
          ...sessionUpdates,
          updated_at: new Date()
        });

      // Get complete sale data
      const completeSale = await trx('sales').where('id', saleId).first();
      const saleItems = await trx('sale_items').where('sale_id', saleId);

      // After transaction commits, send response first
      res.status(201).json({
        success: true,
        data: {
          ...completeSale,
          items: saleItems
        },
        message: 'Sale processed successfully'
      });

      // Print tickets asynchronously (non-blocking)
      setImmediate(async () => {
        try {
          // Get sale items with modifiers for printing
          const itemsWithModifiers = [];
          for (const item of saleItems) {
            const modifiers = await dbService.findMany('order_item_modifiers', {
              order_item_id: item.id
            });

            const enrichedModifiers = [];
            for (const mod of modifiers) {
              const modifierDetails = await dbService.findById('modifiers', mod.modifier_id);
              if (modifierDetails) {
                enrichedModifiers.push({
                  modifier_name: modifierDetails.name,
                  modifier_price: mod.unit_price
                });
              }
            }

            itemsWithModifiers.push({
              ...item,
              modifiers: enrichedModifiers
            });
          }

          const saleWithItems = {
            ...completeSale,
            items: itemsWithModifiers,
            user_name: req.user?.username
          };

          // Print kitchen ticket
          try {
            await printKitchenTicket(saleWithItems);
            logger.info(`Kitchen ticket printed for sale ${saleId}`);
            await dbService.update('sales', saleId, { kitchen_printed: true });
          } catch (kitchenError) {
            logger.error('Error printing kitchen ticket:', kitchenError);
          }

          // Print receipt ticket
          try {
            await printReceiptTicket(saleWithItems);
            logger.info(`Receipt ticket printed for sale ${saleId}`);
            await dbService.update('sales', saleId, { receipt_printed: true });
          } catch (receiptError) {
            logger.error('Error printing receipt ticket:', receiptError);
          }

        } catch (printError) {
          logger.error('Error in print process:', printError);
          // Don't fail the sale if printing fails
        }
      });
    });

  } catch (error) {
    logger.error('Error processing sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing sale'
    });
  }
};

// Create sale (basic)
export const createSale = async (req, res) => {
  try {
    const saleData = req.body;

    const newSale = await dbService.create('sales', {
      ...saleData,
      user_id: req.user.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      data: newSale,
      message: 'Sale created successfully'
    });
  } catch (error) {
    logger.error('Error creating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating sale'
    });
  }
};

// Update sale
export const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSale = await dbService.update('sales', id, updateData);

    if (!updatedSale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: updatedSale,
      message: 'Sale updated successfully'
    });
  } catch (error) {
    logger.error('Error updating sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating sale'
    });
  }
};

// Delete sale
export const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await dbService.findById('sales', id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    await dbService.delete('sales', id);

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting sale'
    });
  }
};

// Get sales by date
export const getSalesByDate = async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const sales = await dbService.raw(
      'SELECT * FROM sales WHERE created_at >= ? AND created_at < ? ORDER BY created_at DESC',
      [startDate.toISOString(), endDate.toISOString()]
    );

    res.json({
      success: true,
      data: sales
    });
  } catch (error) {
    logger.error('Error getting sales by date:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sales by date'
    });
  }
};

// Get daily sales report
export const getDailySalesReport = async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const salesData = await dbService.raw(
      `SELECT
        COUNT(*) as total_sales,
        SUM(total) as total_revenue,
        SUM(discount_amount) as total_discounts,
        AVG(total) as average_sale
       FROM sales
       WHERE created_at >= ? AND created_at < ? AND status = 'completed'`,
      [startDate.toISOString(), endDate.toISOString()]
    );

    res.json({
      success: true,
      data: salesData[0] || {
        total_sales: 0,
        total_revenue: 0,
        total_discounts: 0,
        average_sale: 0
      }
    });
  } catch (error) {
    logger.error('Error getting daily sales report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting daily sales report'
    });
  }
};

// Split sale - Divide account between multiple payments
export const splitSale = async (req, res) => {
  try {
    const { sale_id, splits, split_method } = req.body;

    // splits structure:
    // For 'items': [{ items: [itemId1, itemId2], payment_method: 'cash', payment_details: {...} }]
    // For 'equal': [{ amount: 12500, payment_method: 'cash' }, { amount: 12500, payment_method: 'card' }]
    // For 'custom': [{ amount: 20000, percentage: 40, payment_method: 'cash' }]

    if (!sale_id || !splits || splits.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere sale_id y al menos un split'
      });
    }

    // Get original sale
    const originalSale = await dbService.findById('sales', sale_id);
    if (!originalSale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Verify sale is not already split or completed
    if (originalSale.is_split) {
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya fue dividida'
      });
    }

    // Get original sale items
    const originalItems = await dbService.findMany('sale_items', { sale_id });

    await dbService.transaction(async (trx) => {
      // Mark original sale as split
      await trx('sales').where('id', sale_id).update({
        is_split: true,
        status: 'split',
        updated_at: new Date()
      });

      // Create individual sales for each split
      for (let i = 0; i < splits.length; i++) {
        const split = splits[i];
        let splitItems = [];
        let splitSubtotal = 0;
        let splitTaxAmount = 0;
        let splitTotal = 0;

        if (split_method === 'items') {
          // Split by items - get selected items
          splitItems = originalItems.filter(item => split.items.includes(item.id));
          splitSubtotal = splitItems.reduce((sum, item) => sum + item.total_price, 0);
          splitTaxAmount = splitSubtotal * 0.19; // 19% IVA
          splitTotal = splitSubtotal + splitTaxAmount;

        } else if (split_method === 'equal' || split_method === 'custom') {
          // For equal/custom splits, amount is provided
          splitTotal = split.amount;
          splitSubtotal = splitTotal / 1.19; // Remove IVA
          splitTaxAmount = splitTotal - splitSubtotal;

          // Distribute items proportionally (for record keeping)
          const proportion = splitTotal / originalSale.total;
          splitItems = originalItems.map(item => ({
            ...item,
            quantity: item.quantity * proportion,
            total_price: item.total_price * proportion
          }));
        }

        // Create new split sale
        const [newSaleId] = await trx('sales').insert({
          sale_number: `${originalSale.sale_number}-S${i + 1}`,
          customer_id: originalSale.customer_id,
          table_id: originalSale.table_id,
          table_number: originalSale.table_number,
          salon_id: originalSale.salon_id,
          tarifa_id: originalSale.tarifa_id,
          user_id: req.user.id,
          waiter_id: originalSale.waiter_id,
          subtotal: splitSubtotal,
          tax_amount: splitTaxAmount,
          discount_amount: 0,
          total: splitTotal,
          payment_method: split.payment_method,
          payment_details: split.payment_details ? JSON.stringify(split.payment_details) : null,
          payment_status: 'paid',
          status: 'completed',
          notes: `División ${i + 1} de ${splits.length} - ${split_method}`,
          receipt_printed: false,
          kitchen_printed: originalSale.kitchen_printed,
          parent_sale_id: sale_id,
          split_number: i + 1,
          is_split: false,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Copy sale items to new split
        for (const item of splitItems) {
          const [newItemId] = await trx('sale_items').insert({
            sale_id: newSaleId,
            product_id: item.product_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            notes: item.notes,
            created_at: new Date()
          });

          // Copy modifiers if any
          if (split_method === 'items' && item.id) {
            const modifiers = await trx('order_item_modifiers')
              .where('order_item_id', item.id);

            for (const mod of modifiers) {
              await trx('order_item_modifiers').insert({
                order_item_id: newItemId,
                modifier_id: mod.modifier_id,
                quantity: mod.quantity,
                unit_price: mod.unit_price,
                total_price: mod.total_price,
                created_at: new Date()
              });
            }
          }
        }

        logger.info(`Split sale ${i + 1}/${splits.length} created with ID ${newSaleId}`);
      }
    });

    // Get all created splits
    const createdSplits = await dbService.findMany('sales', { parent_sale_id: sale_id });

    res.json({
      success: true,
      data: {
        original_sale_id: sale_id,
        splits: createdSplits
      },
      message: `Cuenta dividida exitosamente en ${splits.length} partes`
    });

  } catch (error) {
    logger.error('Error splitting sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al dividir cuenta'
    });
  }
};

// Transfer table - Move sale to different table
export const transferTable = async (req, res) => {
  try {
    const { sale_id, new_table_id } = req.body;

    if (!sale_id || !new_table_id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere sale_id y new_table_id'
      });
    }

    // Get current sale
    const sale = await dbService.findById('sales', sale_id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Verify sale is not completed
    if (sale.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'No se puede transferir una venta completada'
      });
    }

    // Get new table
    const newTable = await dbService.findById('tables', new_table_id);
    if (!newTable) {
      return res.status(404).json({
        success: false,
        message: 'Mesa destino no encontrada'
      });
    }

    // Verify new table is available
    if (newTable.status !== 'free' && newTable.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'La mesa destino no está disponible'
      });
    }

    const oldTableId = sale.table_id;

    // Perform transfer with transaction
    await dbService.transaction(async (trx) => {
      // Update sale with new table
      await trx('sales').where('id', sale_id).update({
        table_id: new_table_id,
        table_number: newTable.table_number,
        salon_id: newTable.salon_id,
        tarifa_id: newTable.tarifa_id,
        updated_at: new Date()
      });

      // Free old table if it exists
      if (oldTableId) {
        await trx('tables').where('id', oldTableId).update({
          status: 'free',
          updated_at: new Date()
        });
      }

      // Occupy new table
      await trx('tables').where('id', new_table_id).update({
        status: 'occupied',
        updated_at: new Date()
      });
    });

    // Get updated sale
    const updatedSale = await dbService.findById('sales', sale_id);

    logger.info(`Sale ${sale_id} transferred from table ${oldTableId} to ${new_table_id}`);

    res.json({
      success: true,
      data: updatedSale,
      message: `Venta transferida exitosamente a Mesa ${newTable.table_number}`
    });

  } catch (error) {
    logger.error('Error transferring table:', error);
    res.status(500).json({
      success: false,
      message: 'Error al transferir mesa'
    });
  }
};

// Park Sale - Save draft sale for later
export const parkSale = async (req, res) => {
  try {
    const { sale_id, reason, notes } = req.body;
    const userId = req.user.id;

    if (!sale_id) {
      return res.status(400).json({
        success: false,
        message: 'sale_id es requerido'
      });
    }

    // Get sale
    const sale = await dbService.findById('sales', sale_id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Update sale status to draft
    await dbService.update('sales', sale_id, {
      status: 'draft',
      updated_at: new Date()
    });

    // Create parked_sales record
    const parkedSale = await dbService.create('parked_sales', {
      sale_id,
      parker_user_id: userId,
      reason: reason || 'Sin razón especificada',
      notes
    });

    logger.info(`Sale ${sale_id} parked by user ${userId}`);

    res.json({
      success: true,
      data: parkedSale,
      message: 'Venta aparcada exitosamente'
    });

  } catch (error) {
    logger.error('Error parking sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al aparcar venta'
    });
  }
};

// Get Parked Sales - List all parked sales
export const getParkedSales = async (req, res) => {
  try {
    const parkedSales = await dbService.raw(`
      SELECT
        ps.*,
        s.sale_number,
        s.table_id,
        s.table_number,
        s.subtotal,
        s.total,
        s.created_at as sale_created_at,
        t.table_number as table_name,
        sal.name as salon_name,
        u.first_name || ' ' || u.last_name as parker_name,
        COUNT(si.id) as item_count
      FROM parked_sales ps
      JOIN sales s ON ps.sale_id = s.id
      LEFT JOIN tables t ON s.table_id = t.id
      LEFT JOIN salons sal ON t.salon_id = sal.id
      LEFT JOIN users u ON ps.parker_user_id = u.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.status = 'draft'
      GROUP BY ps.id
      ORDER BY ps.parked_at DESC
    `);

    res.json({
      success: true,
      data: parkedSales,
      count: parkedSales.length
    });

  } catch (error) {
    logger.error('Error getting parked sales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener ventas aparcadas'
    });
  }
};

// Resume Sale - Continue editing a parked sale
export const resumeSale = async (req, res) => {
  try {
    const { sale_id } = req.params;

    // Get parked sale
    const parkedSale = await dbService.findOne('parked_sales', { sale_id });
    if (!parkedSale) {
      return res.status(404).json({
        success: false,
        message: 'Venta aparcada no encontrada'
      });
    }

    // Update sale status back to 'pending' or keep as 'draft' (user will complete)
    await dbService.update('sales', sale_id, {
      status: 'pending',
      updated_at: new Date()
    });

    // Delete parked_sales record
    await dbService.delete('parked_sales', parkedSale.id);

    // Get complete sale with items
    const sale = await dbService.findById('sales', sale_id);
    const items = await dbService.findMany('sale_items', { sale_id });

    logger.info(`Sale ${sale_id} resumed from parked state`);

    res.json({
      success: true,
      data: {
        ...sale,
        items
      },
      message: 'Venta reanudada exitosamente'
    });

  } catch (error) {
    logger.error('Error resuming sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reanudar venta'
    });
  }
};