/**
 * Suppliers & Purchase Orders Routes
 */

import express from 'express';
import {
  // Suppliers
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,

  // Purchase Orders
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,

  // Payments
  getPayments,
  createPayment,

  // Reports
  getSupplierStats
} from './controller.js';

const router = express.Router();

// ============================================
// SUPPLIERS ROUTES
// ============================================
router.get('/suppliers', getSuppliers);
router.get('/suppliers/:id', getSupplierById);
router.post('/suppliers', createSupplier);
router.put('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// ============================================
// PURCHASE ORDERS ROUTES
// ============================================
router.get('/purchase-orders', getPurchaseOrders);
router.get('/purchase-orders/:id', getPurchaseOrderById);
router.post('/purchase-orders', createPurchaseOrder);
router.put('/purchase-orders/:id', updatePurchaseOrder);
router.post('/purchase-orders/:id/approve', approvePurchaseOrder);
router.post('/purchase-orders/:id/receive', receivePurchaseOrder);

// ============================================
// PAYMENTS ROUTES
// ============================================
router.get('/payments', getPayments);
router.post('/payments', createPayment);

// ============================================
// REPORTS ROUTES
// ============================================
router.get('/stats', getSupplierStats);

export default router;
