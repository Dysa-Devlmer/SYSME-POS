/**
 * Modifiers Routes
 * API endpoints for product modifiers and customization
 */

import express from 'express';
import {
  // Modifier Groups
  getAllModifierGroups,
  getModifierGroup,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,

  // Modifiers
  getAllModifiers,
  getModifier,
  createModifier,
  updateModifier,
  deleteModifier,

  // Product Associations
  getProductModifierGroups,
  assignModifierGroupsToProduct,
  removeModifierGroupFromProduct
} from './controller.js';

const router = express.Router();

// ============================================
// MODIFIER GROUPS ROUTES
// ============================================
router.get('/groups', getAllModifierGroups);              // Get all groups
router.get('/groups/:id', getModifierGroup);              // Get single group with modifiers
router.post('/groups', createModifierGroup);              // Create new group
router.put('/groups/:id', updateModifierGroup);           // Update group
router.delete('/groups/:id', deleteModifierGroup);        // Soft delete group

// ============================================
// MODIFIERS ROUTES
// ============================================
router.get('/modifiers', getAllModifiers);                // Get all modifiers (filterable by group_id)
router.get('/modifiers/:id', getModifier);                // Get single modifier
router.post('/modifiers', createModifier);                // Create new modifier
router.put('/modifiers/:id', updateModifier);             // Update modifier
router.delete('/modifiers/:id', deleteModifier);          // Soft delete modifier

// ============================================
// PRODUCT ASSOCIATIONS ROUTES
// ============================================
router.get('/products/:product_id/groups', getProductModifierGroups);                    // Get all modifier groups for a product
router.post('/products/:product_id/groups', assignModifierGroupsToProduct);              // Assign modifier groups to product
router.delete('/products/:product_id/groups/:group_id', removeModifierGroupFromProduct); // Remove group from product

export default router;
