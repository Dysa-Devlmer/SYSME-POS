/**
 * Kitchen Routes
 * Routes for kitchen display and order management
 */

import express from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate, validateParams, validateQuery, commonSchemas } from '../../middleware/validation.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import * as kitchenController from './controller.js';

const router = express.Router();

// Validation schemas
const kitchenSchema = {
  updateStatus: Joi.object({
    kitchen_status: Joi.string().valid('pending', 'preparing', 'ready', 'served').required(),
    notes: Joi.string().max(500).optional()
  })
};

const querySchema = {
  status: Joi.string().valid('pending', 'preparing', 'ready', 'served').optional(),
  limit: Joi.number().integer().min(1).max(100).default(50).optional()
};

const paramsSchema = {
  id: commonSchemas.id
};

// All kitchen routes require authentication
router.use(authenticate);

// GET /kitchen/orders - Get active kitchen orders
router.get('/orders',
  requirePermission('kitchen.read'),
  validateQuery(Joi.object(querySchema)),
  asyncHandler(kitchenController.getKitchenOrders)
);

// GET /kitchen/orders/:id - Get specific order details for kitchen
router.get('/orders/:id',
  requirePermission('kitchen.read'),
  validateParams(Joi.object({ id: paramsSchema.id })),
  asyncHandler(kitchenController.getKitchenOrderDetails)
);

// PATCH /kitchen/orders/:id/status - Update kitchen status
router.patch('/orders/:id/status',
  requirePermission('kitchen.update'),
  validateParams(Joi.object({ id: paramsSchema.id })),
  validate(kitchenSchema.updateStatus),
  asyncHandler(kitchenController.updateKitchenStatus)
);

// POST /kitchen/orders/:id/print - Mark order as printed
router.post('/orders/:id/print',
  requirePermission('kitchen.update'),
  validateParams(Joi.object({ id: paramsSchema.id })),
  asyncHandler(kitchenController.markOrderPrinted)
);

// GET /kitchen/stats - Get kitchen statistics
router.get('/stats',
  requirePermission('kitchen.read'),
  asyncHandler(kitchenController.getKitchenStats)
);

export default router;