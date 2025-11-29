/**
 * Tips Routes
 * API endpoints for tips system management
 */

import express from 'express';
import {
  // Settings
  getTipSettings,
  updateTipSettings,

  // Presets
  getAllTipPresets,
  getTipPreset,
  createTipPreset,
  updateTipPreset,
  deleteTipPreset,

  // Sale Tips
  addTipToSale,
  getSaleTip,
  calculateTip,

  // Reports
  getTipsReport,
  getTipsDistributionSummary
} from './controller.js';

const router = express.Router();

// ============================================
// TIP SETTINGS ROUTES
// ============================================
router.get('/settings', getTipSettings);              // Get current settings
router.put('/settings', updateTipSettings);           // Update settings

// ============================================
// TIP PRESETS ROUTES
// ============================================
router.get('/presets', getAllTipPresets);             // Get all presets
router.get('/presets/:id', getTipPreset);             // Get single preset
router.post('/presets', createTipPreset);             // Create preset
router.put('/presets/:id', updateTipPreset);          // Update preset
router.delete('/presets/:id', deleteTipPreset);       // Delete preset (soft)

// ============================================
// SALE TIPS ROUTES
// ============================================
router.post('/sale', addTipToSale);                   // Add tip to a sale
router.get('/sale/:sale_id', getSaleTip);             // Get tip for a sale
router.post('/calculate', calculateTip);              // Calculate tip amount

// ============================================
// REPORTS ROUTES
// ============================================
router.get('/report', getTipsReport);                 // Get tips report by date
router.get('/distribution', getTipsDistributionSummary); // Distribution summary

export default router;
