/**
 * Parked Sales Routes
 * Routes for managing parked/held sales
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  getParkedSales,
  getActiveParkedSales,
  getParkedSaleById,
  getParkedSaleByNumber,
  getParkedSalesByTable,
  getMyParkedSales,
  createParkedSale,
  resumeParkedSale,
  cancelParkedSale,
  updateParkedSale,
  addItem,
  updateItem,
  removeItem,
  updateItemQuantity,
  bulkCancel,
  cleanExpired,
  autoExpire,
  getStats,
  getOldestParked,
  getSoonToExpire,
  search,
  quickSearch
} from './parkedController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// List and search routes
router.get('/', getParkedSales);
router.get('/active', getActiveParkedSales);
router.get('/my', getMyParkedSales);
router.get('/search', search);
router.get('/quick-search', quickSearch);
router.get('/oldest', getOldestParked);
router.get('/expiring-soon', getSoonToExpire);
router.get('/stats', getStats);

// Individual parked sale routes
router.get('/number/:park_number', getParkedSaleByNumber);
router.get('/table/:table_id', getParkedSalesByTable);
router.get('/:id', getParkedSaleById);

// Create and manage parked sales
router.post('/', createParkedSale);
router.put('/:id', updateParkedSale);
router.post('/:id/resume', resumeParkedSale);
router.post('/:id/cancel', cancelParkedSale);

// Resume by park number (alternative route)
router.post('/resume/:park_number', async (req, res, next) => {
  // Find by park number and resume
  const { dbService } = await import('../../config/database.js');
  const sales = await dbService.findMany('parked_sales', { park_number: req.params.park_number });
  if (sales.length === 0) {
    return res.status(404).json({ success: false, message: 'Venta estacionada no encontrada' });
  }
  req.params.id = sales[0].id;
  return resumeParkedSale(req, res, next);
});

// Items management
router.post('/:id/items', addItem);
router.put('/:id/items/:item_id', updateItem);
router.delete('/:id/items/:item_id', removeItem);
router.patch('/:id/items/:item_id/quantity', updateItemQuantity);

// Bulk operations
router.post('/bulk/cancel', bulkCancel);
router.post('/cleanup/expired', cleanExpired);
router.post('/auto-expire', autoExpire);

export default router;
