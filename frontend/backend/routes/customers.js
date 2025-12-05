// =====================================================
// SYSME POS - Customers Routes
// =====================================================
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const customersController = require('../controllers/customersController');

// All routes require authentication
router.use(authenticateToken);

// Customer CRUD
router.get('/', customersController.getCustomers);
router.get('/stats', customersController.getCustomerStats);
router.get('/:id', customersController.getCustomer);
router.post('/', customersController.createCustomer);
router.put('/:id', customersController.updateCustomer);
router.delete('/:id', requireRole(['admin', 'manager']), customersController.deleteCustomer);

// Customer orders
router.get('/:id/orders', customersController.getCustomerOrders);

// Loyalty
router.get('/:id/loyalty', customersController.getCustomerLoyalty);
router.post('/:id/loyalty/add-points', requireRole(['admin', 'manager']), customersController.addLoyaltyPoints);
router.post('/:id/loyalty/redeem', customersController.redeemReward);

module.exports = router;
