/**
 * Sales Routes - Critical POS functionality
 */

import express from 'express';
import {
  getSales,
  getSale,
  createSale,
  updateSale,
  deleteSale,
  processSale,
  getSalesByDate,
  getDailySalesReport,
  transferTable,
  splitSale
} from './controller.js';
import { printKitchenTicket, printReceiptTicket, getPrinterStatus, testPrinter } from './printerService.js';
import parkedRoutes from './parkedRoutes.js';

const router = express.Router();

// Mount parked sales routes
router.use('/parked', parkedRoutes);

// Sales routes
router.get('/', getSales);
router.get('/daily-report', getDailySalesReport);
router.get('/by-date/:date', getSalesByDate);
router.post('/', processSale); // Main POS sale processing
router.post('/process', processSale); // Alias for compatibility
router.post('/transfer-table', transferTable); // Transfer sale to different table
router.post('/split', splitSale); // Split bill/account

// Printer routes
router.post('/:id/print-kitchen', async (req, res) => {
  try {
    const { id } = req.params;
    const { dbService } = await import('../../config/database.js');

    // Get sale with items
    const sale = await dbService.findById('sales', id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const items = await dbService.findMany('sale_items', { sale_id: id });

    const result = await printKitchenTicket({ ...sale, items });

    res.json({
      success: true,
      data: result,
      message: 'Kitchen ticket printed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error printing kitchen ticket',
      error: error.message
    });
  }
});

router.post('/:id/print-receipt', async (req, res) => {
  try {
    const { id } = req.params;
    const { dbService } = await import('../../config/database.js');

    // Get sale with items and modifiers
    const sale = await dbService.findById('sales', id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const items = await dbService.findMany('sale_items', { sale_id: id });

    // Get modifiers for each item
    for (const item of items) {
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

      item.modifiers = enrichedModifiers;
    }

    const result = await printReceiptTicket({ ...sale, items });

    // Mark as printed
    await dbService.update('sales', id, { receipt_printed: true });

    res.json({
      success: true,
      data: result,
      message: 'Receipt ticket printed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error printing receipt ticket',
      error: error.message
    });
  }
});

router.get('/printer/status', (req, res) => {
  const status = getPrinterStatus();
  res.json({ success: true, data: status });
});

// Get last completed sale (for reprinting - F4 shortcut)
router.get('/last-sale', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');

    // Get the most recent completed sale
    const lastSales = await dbService.raw(
      `SELECT * FROM sales
       WHERE status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (!lastSales || lastSales.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay ventas completadas'
      });
    }

    const lastSale = lastSales[0];

    // Get sale items
    const items = await dbService.findMany('sale_items', { sale_id: lastSale.id });

    // Get modifiers for each item
    for (const item of items) {
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
      item.modifiers = enrichedModifiers;
    }

    res.json({
      success: true,
      data: {
        ...lastSale,
        items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error obteniendo última venta',
      error: error.message
    });
  }
});

// Reprint last receipt (F4 shortcut functionality)
router.post('/reprint-last', async (req, res) => {
  try {
    const { dbService } = await import('../../config/database.js');

    // Get the most recent completed sale
    const lastSales = await dbService.raw(
      `SELECT * FROM sales
       WHERE status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (!lastSales || lastSales.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay ventas para reimprimir'
      });
    }

    const lastSale = lastSales[0];

    // Get sale items
    const items = await dbService.findMany('sale_items', { sale_id: lastSale.id });

    // Get modifiers for each item
    for (const item of items) {
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
      item.modifiers = enrichedModifiers;
    }

    // Print the receipt
    const result = await printReceiptTicket({ ...lastSale, items });

    // Update reprint count
    const currentReprintCount = lastSale.reprint_count || 0;
    await dbService.update('sales', lastSale.id, {
      reprint_count: currentReprintCount + 1,
      last_reprinted_at: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        sale: {
          id: lastSale.id,
          sale_number: lastSale.sale_number,
          total: lastSale.total,
          created_at: lastSale.created_at
        },
        print_result: result,
        reprint_count: currentReprintCount + 1
      },
      message: `Ticket de venta ${lastSale.sale_number} reimpreso exitosamente`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reimprimiendo ticket',
      error: error.message
    });
  }
});

router.post('/printer/test/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const result = await testPrinter(type);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Printer test failed',
      error: error.message
    });
  }
});

// Individual sale routes (must be at the end to avoid conflicts with specific paths)
router.get('/:id', getSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;
