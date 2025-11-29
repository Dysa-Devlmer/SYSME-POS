/**
 * Cash Register Routes
 * Endpoints for cash session and Z report management
 */

import express from 'express';
import {
  getCurrentSession,
  openSession,
  closeSession,
  addMovement,
  recordSale,
  generateZReport,
  getSessionsHistory,
  getZReportsHistory,
  markZReportPrinted
} from './controller.js';

const router = express.Router();

// Cash session routes
router.get('/current', getCurrentSession);          // Get current active session
router.post('/open', openSession);                  // Open new cash session
router.post('/close', closeSession);                // Close current session
router.post('/movement', addMovement);              // Add cash movement (in/out)
router.post('/record-sale', recordSale);            // Record a sale in session
router.get('/history', getSessionsHistory);         // Get sessions history

// Z Report routes
router.post('/z-report/:session_id', generateZReport);  // Generate Z report
router.get('/z-reports', getZReportsHistory);           // Get Z reports history
router.patch('/z-report/:id/printed', markZReportPrinted); // Mark report as printed

export default router;
