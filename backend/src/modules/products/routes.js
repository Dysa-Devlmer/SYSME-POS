/**
 * Product Routes
 * Routes for product management (CRUD operations)
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import Joi from 'joi';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate, validateQuery, validateParams, productSchemas, commonSchemas, validateFileUpload } from '../../middleware/validation.js';
import { authorize, requirePermission } from '../../middleware/auth.js';
import * as productController from './controller.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Query validation schema for product listing
const productQuerySchema = {
  ...commonSchemas.pagination,
  category_id: commonSchemas.optionalId,
  subcategory_id: commonSchemas.optionalId,
  search: Joi.string().max(100).optional(),
  active_only: Joi.boolean().default(true),
  low_stock: Joi.boolean().optional(),
  price_min: Joi.number().min(0).optional(),
  price_max: Joi.number().min(0).optional()
};

// Params validation schema
const productParamsSchema = {
  id: commonSchemas.id
};

// GET /products - List all products with filtering and pagination
router.get('/',
  validateQuery(Joi.object(productQuerySchema)),
  asyncHandler(productController.getProducts)
);

// GET /products/search - Search products (public endpoint for POS)
router.get('/search',
  validateQuery(Joi.object({
    q: Joi.string().min(1).max(100).required(),
    limit: Joi.number().min(1).max(50).default(20),
    category_id: commonSchemas.optionalId
  })),
  asyncHandler(productController.searchProducts)
);

// GET /products/low-stock - Get products with low stock
router.get('/low-stock',
  requirePermission('inventory.read'),
  validateQuery(Joi.object(commonSchemas.pagination)),
  asyncHandler(productController.getLowStockProducts)
);

// GET /products/categories - Get products grouped by categories
router.get('/categories',
  asyncHandler(productController.getProductsByCategory)
);

// GET /products/:id - Get single product
router.get('/:id',
  validateParams(Joi.object(productParamsSchema)),
  asyncHandler(productController.getProduct)
);

// POST /products - Create new product
router.post('/',
  requirePermission('products.create'),
  upload.array('images', 5),
  validateFileUpload({ required: false }),
  validate(productSchemas.create),
  asyncHandler(productController.createProduct)
);

// PUT /products/:id - Update product
router.put('/:id',
  requirePermission('products.update'),
  validateParams(Joi.object(productParamsSchema)),
  upload.array('images', 5),
  validateFileUpload({ required: false }),
  validate(productSchemas.update),
  asyncHandler(productController.updateProduct)
);

// DELETE /products/:id - Delete product
router.delete('/:id',
  requirePermission('products.delete'),
  validateParams(Joi.object(productParamsSchema)),
  asyncHandler(productController.deleteProduct)
);

// POST /products/:id/images - Upload product images
router.post('/:id/images',
  requirePermission('products.update'),
  validateParams(Joi.object(productParamsSchema)),
  upload.array('images', 5),
  validateFileUpload({ required: true }),
  asyncHandler(productController.uploadProductImages)
);

// DELETE /products/:id/images/:imageId - Delete product image
router.delete('/:id/images/:imageId',
  requirePermission('products.update'),
  validateParams(Joi.object({
    id: commonSchemas.id,
    imageId: commonSchemas.id
  })),
  asyncHandler(productController.deleteProductImage)
);

// POST /products/:id/duplicate - Duplicate product
router.post('/:id/duplicate',
  requirePermission('products.create'),
  validateParams(Joi.object(productParamsSchema)),
  asyncHandler(productController.duplicateProduct)
);

// PATCH /products/:id/stock - Update product stock
router.patch('/:id/stock',
  requirePermission('inventory.update'),
  validateParams(Joi.object(productParamsSchema)),
  validate(Joi.object({
    quantity: Joi.number().integer().required(),
    operation: Joi.string().valid('add', 'subtract', 'set').required(),
    reason: Joi.string().max(200).optional()
  })),
  asyncHandler(productController.updateProductStock)
);

// PATCH /products/:id/price - Update product price
router.patch('/:id/price',
  requirePermission('products.update'),
  validateParams(Joi.object(productParamsSchema)),
  validate(Joi.object({
    price: Joi.number().precision(2).positive().required(),
    cost: Joi.number().precision(2).positive().optional(),
    effective_date: Joi.date().iso().optional()
  })),
  asyncHandler(productController.updateProductPrice)
);

// GET /products/:id/history - Get product history
router.get('/:id/history',
  requirePermission('products.read'),
  validateParams(Joi.object(productParamsSchema)),
  validateQuery(Joi.object(commonSchemas.pagination)),
  asyncHandler(productController.getProductHistory)
);

// POST /products/bulk-update - Bulk update products
router.post('/bulk-update',
  requirePermission('products.update'),
  validate(Joi.object({
    product_ids: Joi.array().items(commonSchemas.id).min(1).max(100).required(),
    updates: Joi.object({
      category_id: commonSchemas.optionalId,
      tax_rate: Joi.number().min(0).max(100).optional(),
      is_active: Joi.boolean().optional(),
      price_adjustment: Joi.object({
        type: Joi.string().valid('percentage', 'fixed').required(),
        value: Joi.number().required()
      }).optional()
    }).min(1).required()
  })),
  asyncHandler(productController.bulkUpdateProducts)
);

// GET /products/export/csv - Export products to CSV
router.get('/export/csv',
  requirePermission('products.export'),
  validateQuery(Joi.object({
    category_id: commonSchemas.optionalId,
    active_only: Joi.boolean().default(true)
  })),
  asyncHandler(productController.exportProductsCSV)
);

// POST /products/import/csv - Import products from CSV
router.post('/import/csv',
  requirePermission('products.import'),
  upload.single('csv_file'),
  validateFileUpload({
    required: true,
    allowedTypes: ['text/csv', 'application/vnd.ms-excel']
  }),
  asyncHandler(productController.importProductsCSV)
);

// ============================================
// FAVORITES ROUTES
// ============================================
import * as favoritesController from './favorites.js';

// GET /products/favorites - Get all favorite products
router.get('/favorites',
  asyncHandler(favoritesController.getFavorites)
);

// POST /products/favorites - Add product to favorites
router.post('/favorites',
  asyncHandler(favoritesController.addFavorite)
);

// DELETE /products/favorites/:product_id - Remove from favorites
router.delete('/favorites/:product_id',
  asyncHandler(favoritesController.removeFavorite)
);

// POST /products/favorites/:product_id/toggle - Toggle favorite status
router.post('/favorites/:product_id/toggle',
  asyncHandler(favoritesController.toggleFavorite)
);

// PUT /products/favorites/reorder - Reorder favorites
router.put('/favorites/reorder',
  asyncHandler(favoritesController.reorderFavorites)
);

export default router;