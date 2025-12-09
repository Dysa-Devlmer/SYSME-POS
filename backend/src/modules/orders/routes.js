/**
 * Orders Routes
 * Routes for restaurant orders and sales management
 */

import express from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate, validateParams, commonSchemas } from '../../middleware/validation.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import * as ordersController from './controller.js';

const router = express.Router();

// Validation schemas
const orderSchema = {
  create: Joi.object({
    table_id: commonSchemas.optionalId,
    order_type: Joi.string().valid('table', 'takeaway', 'delivery').default('table'),
    items: Joi.array().items(
      Joi.object({
        product_id: commonSchemas.id,
        quantity: Joi.number().min(0.01).max(100).required(),
        notes: Joi.string().max(200).optional()
      })
    ).min(1).required(),
    notes: Joi.string().max(500).optional()
  }),

  updateKitchenStatus: Joi.object({
    kitchen_status: Joi.string().valid('pending', 'preparing', 'ready', 'served').required()
  }),

  complete: Joi.object({
    payment_method: Joi.string().valid('cash', 'card', 'transfer', 'mixed').required(),
    discount_amount: Joi.number().min(0).default(0)
  })
};

const paramsSchema = {
  id: commonSchemas.id,
  table_id: commonSchemas.id
};

// All routes require authentication
router.use(authenticate);

// POST /orders - Create new order
router.post('/',
  validate(orderSchema.create),
  asyncHandler(ordersController.createOrder)
);

// GET /orders/kitchen - Get orders for kitchen display
router.get('/kitchen',
  requirePermission('kitchen.view_orders'),
  asyncHandler(ordersController.getKitchenOrders)
);

// GET /orders/table/:table_id - Get orders for specific table
router.get('/table/:table_id',
  validateParams(Joi.object({ table_id: paramsSchema.table_id })),
  asyncHandler(ordersController.getTableOrders)
);

// GET /orders/:id - Get specific order details
router.get('/:id',
  validateParams(Joi.object({ id: paramsSchema.id })),
  asyncHandler(ordersController.getOrder)
);

// PATCH /orders/:id/kitchen-status - Update kitchen status
router.patch('/:id/kitchen-status',
  requirePermission('kitchen.update_status'),
  validateParams(Joi.object({ id: paramsSchema.id })),
  validate(orderSchema.updateKitchenStatus),
  asyncHandler(ordersController.updateKitchenStatus)
);

// POST /orders/:id/complete - Complete order and close table
router.post('/:id/complete',
  validateParams(Joi.object({ id: paramsSchema.id })),
  validate(orderSchema.complete),
  asyncHandler(ordersController.completeOrder)
);

export default router;