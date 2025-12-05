// =====================================================
// SYSME POS - Inventory Routes
// =====================================================
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');

// All routes require authentication
router.use(authenticateToken);

// Inventory endpoints
router.get('/inventory', inventoryController.getInventory);
router.get('/inventory/:product_id', inventoryController.getProductInventory);
router.put('/inventory/:id', requireRole(['admin', 'manager']), inventoryController.updateInventory);

// Transfers
router.get('/transfers', inventoryController.getTransfers);
router.post('/transfers', requireRole(['admin', 'manager']), inventoryController.createTransfer);
router.post('/transfers/:id/receive', requireRole(['admin', 'manager']), inventoryController.receiveTransfer);

// Purchase Orders
router.get('/purchase-orders', inventoryController.getPurchaseOrders);
router.post('/purchase-orders', requireRole(['admin', 'manager']), inventoryController.createPurchaseOrder);
router.post('/purchase-orders/:id/receive', requireRole(['admin', 'manager']), inventoryController.receivePurchaseOrder);

// Stock Counts
router.post('/stock-counts', requireRole(['admin', 'manager']), inventoryController.startStockCount);

module.exports = router;
