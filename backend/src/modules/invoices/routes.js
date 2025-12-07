/**
 * Invoice Routes - Sistema de Facturación
 * Incluye integración con SII Chile
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
import siiRoutes from './sii-routes.js';

const router = express.Router();

// SII Chile - Facturación Electrónica
router.use('/sii', siiRoutes);

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
