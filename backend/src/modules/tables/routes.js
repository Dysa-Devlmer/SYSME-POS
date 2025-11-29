/**
 * Tables Routes
 * Routes for table and salon management
 */

import express from 'express';
import Joi from 'joi';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate, validateQuery, validateParams, commonSchemas } from '../../middleware/validation.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import * as tablesController from './controller.js';

const router = express.Router();

// Validation schemas
const tableSchema = {
  create: Joi.object({
    table_number: Joi.string().max(20).required(),
    description: Joi.string().max(100).optional(),
    salon_id: commonSchemas.id,
    tarifa_id: commonSchemas.id,
    max_capacity: Joi.number().integer().min(1).max(50).default(4),
    position_x: Joi.number().min(0).max(1000).default(0),
    position_y: Joi.number().min(0).max(1000).default(0)
  }),

  update: Joi.object({
    table_number: Joi.string().max(20).optional(),
    description: Joi.string().max(100).optional(),
    salon_id: commonSchemas.optionalId,
    tarifa_id: commonSchemas.optionalId,
    max_capacity: Joi.number().integer().min(1).max(50).optional(),
    position_x: Joi.number().min(0).max(1000).optional(),
    position_y: Joi.number().min(0).max(1000).optional()
  }),

  updateStatus: Joi.object({
    status: Joi.string().valid('free', 'occupied', 'reserved', 'maintenance').required()
  })
};

const querySchema = {
  salon_id: commonSchemas.optionalId
};

const paramsSchema = {
  id: commonSchemas.id,
  salon_id: commonSchemas.id
};

// Public routes (for POS interface)

// GET /tables/salons - Get all salons
router.get('/salons',
  asyncHandler(tablesController.getSalons)
);

// GET /tables/tarifas - Get all pricing tiers
router.get('/tarifas',
  asyncHandler(tablesController.getTarifas)
);

// GET /tables - Get all tables
router.get('/',
  validateQuery(Joi.object(querySchema)),
  asyncHandler(tablesController.getTables)
);

// GET /tables/:id - Get single table
router.get('/:id',
  validateParams(Joi.object({ id: paramsSchema.id })),
  asyncHandler(tablesController.getTable)
);

// GET /tables/salon/:salon_id/layout - Get salon layout
router.get('/salon/:salon_id/layout',
  validateParams(Joi.object({ salon_id: paramsSchema.salon_id })),
  asyncHandler(tablesController.getSalonLayout)
);

// Protected routes (require authentication)

// PATCH /tables/:id/status - Update table status
router.patch('/:id/status',
  authenticate,
  validateParams(Joi.object({ id: paramsSchema.id })),
  validate(tableSchema.updateStatus),
  asyncHandler(tablesController.updateTableStatus)
);

// POST /tables - Create new table
router.post('/',
  authenticate,
  requirePermission('tables.create'),
  validate(tableSchema.create),
  asyncHandler(tablesController.createTable)
);

// PUT /tables/:id - Update table
router.put('/:id',
  authenticate,
  requirePermission('tables.update'),
  validateParams(Joi.object({ id: paramsSchema.id })),
  validate(tableSchema.update),
  asyncHandler(tablesController.updateTable)
);

// DELETE /tables/:id - Delete table
router.delete('/:id',
  authenticate,
  requirePermission('tables.delete'),
  validateParams(Joi.object({ id: paramsSchema.id })),
  asyncHandler(tablesController.deleteTable)
);

export default router;