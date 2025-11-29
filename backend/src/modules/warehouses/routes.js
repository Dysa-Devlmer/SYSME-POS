/**
 * Warehouses Routes - Multi-location Inventory
 */

import express from 'express';
import {
  getWarehouses,
  getWarehouseInventory,
  getLowStockProducts,
  createTransfer,
  approveTransfer,
  receiveTransfer,
  getTransfers
} from './controller.js';

const router = express.Router();

// Warehouse routes
router.get('/', getWarehouses);
router.get('/:warehouse_id/inventory', getWarehouseInventory);
router.get('/:warehouse_id/low-stock', getLowStockProducts);

// Transfer routes
router.get('/transfers', getTransfers);
router.post('/transfers', createTransfer);
router.post('/transfers/:id/approve', approveTransfer);
router.post('/transfers/:id/receive', receiveTransfer);

export default router;
