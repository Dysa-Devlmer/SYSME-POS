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
  splitSale,
  parkSale,
  getParkedSales,
  resumeSale
} from './controller.js';
import { printKitchenTicket, printReceiptTicket, getPrinterStatus, testPrinter } from './printerService.js';

const router = express.Router();

// Sales routes
router.get('/', getSales);
router.get('/daily-report', getDailySalesReport);
router.get('/by-date/:date', getSalesByDate);
router.get('/parked', getParkedSales); // Get all parked sales
router.get('/:id', getSale);
router.post('/', processSale); // Main POS sale processing - changed from createSale
router.post('/process', processSale); // Alias for compatibility
router.post('/transfer-table', transferTable); // Transfer sale to different table
router.post('/split', splitSale); // Split bill/account
router.post('/park', parkSale); // Park/hold sale for later
router.post('/resume/:sale_id', resumeSale); // Resume parked sale
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

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

export default router;
