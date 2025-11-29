/**
 * Reports Routes
 */

import express from 'express';
import {
  getSalesReport,
  getInventoryReport,
  getProductPerformance,
  getCategoryPerformance,
  getPaymentMethodsReport,
  getHourlySalesReport,
  getCashSessionsReport,
  getWaiterPerformance,
  getCustomReport
} from './controller.js';

const router = express.Router();

// Reports routes
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/product-performance', getProductPerformance);
router.get('/category-performance', getCategoryPerformance);
router.get('/payment-methods', getPaymentMethodsReport);
router.get('/hourly-sales', getHourlySalesReport);
router.get('/cash-sessions', getCashSessionsReport);
router.get('/waiter-performance', getWaiterPerformance);
router.post('/custom', getCustomReport);

export default router;
