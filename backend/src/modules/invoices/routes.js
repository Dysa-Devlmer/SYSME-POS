/**
 * Invoice Routes - Sistema de Facturación
 */

import express from 'express';
import {
  getInvoiceSeries,
  getNextInvoiceNumber,
  generateInvoiceFromSale,
  getInvoices,
  getInvoiceById,
  cancelInvoice,
  getInvoiceStats
} from './controller.js';

const router = express.Router();

// Invoice Series routes
router.get('/series', getInvoiceSeries);
router.get('/series/:series_id/next-number', getNextInvoiceNumber);

// Invoice routes
router.get('/', getInvoices);
router.get('/stats', getInvoiceStats);
router.get('/:id', getInvoiceById);
router.post('/generate', generateInvoiceFromSale);
router.post('/:id/cancel', cancelInvoice);

export default router;
