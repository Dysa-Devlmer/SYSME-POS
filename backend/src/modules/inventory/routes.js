/**
 * Inventory Routes
 */

import express from 'express';
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustStock,
  getLowStockItems,
  getInventoryHistory
} from './controller.js';

const router = express.Router();

// Inventory routes
router.get('/', getInventoryItems);
router.get('/low-stock', getLowStockItems);
router.get('/history/:product_id', getInventoryHistory);
router.get('/:id', getInventoryItem);
router.post('/', createInventoryItem);
router.post('/adjust-stock', adjustStock);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);

export default router;
