/**
 * Pricing Tiers Routes - Multiple pricing system
 */

import express from 'express';
import {
  getAllTiers,
  getActiveTiers,
  getDefaultTier,
  getTierById,
  createTier,
  updateTier,
  deleteTier,
  getProductPrices,
  setProductPrice,
  getApplicableTier
} from './controller.js';

const router = express.Router();

// Get all pricing tiers (with optional filter for inactive)
router.get('/', getAllTiers);

// Get only active tiers
router.get('/active', getActiveTiers);

// Get default tier
router.get('/default', getDefaultTier);

// Get applicable tier for a table/time
router.get('/applicable', getApplicableTier);

// Get tier by ID
router.get('/:id', getTierById);

// Create new pricing tier
router.post('/', createTier);

// Update pricing tier
router.put('/:id', updateTier);

// Delete pricing tier
router.delete('/:id', deleteTier);

// Get product prices for a tier
router.get('/:tier_id/products', getProductPrices);

// Set product price for tier
router.post('/:tier_id/products/:product_id', setProductPrice);

export default router;
