// =====================================================
// SYSME POS - Sales Routes
// =====================================================
const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const { auth, checkPermission } = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// =====================================================
// ORDERS
// =====================================================
router.get('/orders', checkPermission('read_orders'), salesController.getOrders);
router.post('/orders', checkPermission('create_orders'), salesController.createOrder);
router.get('/orders/:id', checkPermission('read_orders'), salesController.getOrder);
router.patch('/orders/:id/status', checkPermission('update_orders'), salesController.updateOrderStatus);
router.post('/orders/:id/payment', checkPermission('process_payments'), salesController.processPayment);

// =====================================================
// TABLES
// =====================================================
router.get('/tables', checkPermission('read_tables'), salesController.getTables);
router.patch('/tables/:id', checkPermission('update_tables'), salesController.updateTableStatus);

module.exports = router;
