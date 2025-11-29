/**
 * Combos Routes - Product Bundles and Menus
 */

import express from 'express';
import {
  getCombos,
  getComboById,
  createCombo,
  updateCombo,
  deleteCombo,
  checkComboAvailability,
  getComboStats
} from './controller.js';

const router = express.Router();

// Combo routes
router.get('/', getCombos);
router.get('/stats', getComboStats);
router.get('/:id', getComboById);
router.get('/:id/availability', checkComboAvailability);
router.post('/', createCombo);
router.put('/:id', updateCombo);
router.delete('/:id', deleteCombo);

export default router;
