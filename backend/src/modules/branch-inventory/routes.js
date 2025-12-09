/**
 * Multi-Branch Inventory Sync Routes
 * API endpoints for multi-branch inventory management
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  // Initialization
  initBranchInventoryTables,

  // Branches
  getBranches,
  createBranch,
  updateBranch,

  // Branch Inventory
  getBranchInventory,
  updateBranchStock,
  getProductAcrossBranches,

  // Transfers
  createTransfer,
  getTransfers,
  getTransferById,
  approveTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,

  // Alerts
  getLowStockAlerts,
  acknowledgeAlert,
  resolveAlert,

  // Analytics
  getInventorySyncDashboard,
  getSuggestedTransfers
} from './controller.js';

const router = express.Router();

// =============================================
// INITIALIZATION
// =============================================
router.post('/init', authenticate, async (req, res) => {
  try {
    await initBranchInventoryTables();
    res.json({ success: true, message: 'Branch inventory tables initialized' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error initializing tables' });
  }
});

// =============================================
// BRANCHES
// =============================================
router.get('/branches', authenticate, getBranches);
router.post('/branches', authenticate, createBranch);
router.put('/branches/:id', authenticate, updateBranch);

// =============================================
// BRANCH INVENTORY
// =============================================
// Get inventory for a specific branch
router.get('/branch/:branchId/inventory', authenticate, getBranchInventory);

// Update stock for a product in a branch
router.put('/branch/:branchId/product/:productId/stock', authenticate, updateBranchStock);

// Get product stock across all branches
router.get('/product/:productId/branches', authenticate, getProductAcrossBranches);

// =============================================
// TRANSFERS
// =============================================
router.get('/transfers', authenticate, getTransfers);
router.post('/transfers', authenticate, createTransfer);
router.get('/transfers/:id', authenticate, getTransferById);

// Transfer workflow actions
router.post('/transfers/:id/approve', authenticate, approveTransfer);
router.post('/transfers/:id/ship', authenticate, shipTransfer);
router.post('/transfers/:id/receive', authenticate, receiveTransfer);
router.post('/transfers/:id/cancel', authenticate, cancelTransfer);

// =============================================
// LOW STOCK ALERTS
// =============================================
router.get('/alerts', authenticate, getLowStockAlerts);
router.post('/alerts/:id/acknowledge', authenticate, acknowledgeAlert);
router.post('/alerts/:id/resolve', authenticate, resolveAlert);

// =============================================
// ANALYTICS & SUGGESTIONS
// =============================================
router.get('/dashboard', authenticate, getInventorySyncDashboard);
router.get('/suggestions', authenticate, getSuggestedTransfers);

export default router;
