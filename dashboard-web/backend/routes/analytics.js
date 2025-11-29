// =====================================================
// SYSME POS - Analytics Routes
// =====================================================
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// All routes require authentication
router.use(authenticateToken);

// Dashboard & Overview
router.get('/dashboard', analyticsController.getDashboard);
router.get('/sales-summary', analyticsController.getSalesSummary);

// Product Analytics
router.get('/products', analyticsController.getProductPerformance);
router.get('/categories', analyticsController.getCategoryPerformance);

// Employee Analytics
router.get('/employees', requireRole(['admin', 'manager']), analyticsController.getEmployeePerformance);

// Time-based Analytics
router.get('/hourly', analyticsController.getHourlyAnalytics);

// Customer Analytics
router.get('/customers', analyticsController.getCustomerAnalytics);

// Payment Analytics
router.get('/payment-methods', analyticsController.getPaymentAnalytics);

// Inventory Analytics
router.get('/inventory', analyticsController.getInventoryAnalytics);

// Export
router.post('/export', requireRole(['admin', 'manager']), analyticsController.exportReport);

module.exports = router;
