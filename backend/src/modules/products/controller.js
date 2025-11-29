/**
 * Product Controller - Production Version
 * Updated to use new database schema (products, categories tables)
 */

import { getDatabase } from '../../config/database.js';
import { redisService } from '../../config/redis.js';
import { logger, logAuditEvent } from '../../config/logger.js';

// Get products with filtering and pagination
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc',
      category_id,
      search,
      active_only = true,
      low_stock,
      price_min,
      price_max
    } = req.query;

    const offset = (page - 1) * limit;
    const db = getDatabase();

    // Build cache key
    const cacheKey = `products:${JSON.stringify(req.query)}`;

    // Try to get from cache
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true
      });
    }

    // Build query with new schema
    let query = db('products as p')
      .leftJoin('categories as c', 'p.category_id', 'c.id')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.price',
        'p.cost',
        'p.sku',
        'p.barcode',
        'p.stock',
        'p.min_stock',
        'p.is_active',
        'p.image_url',
        'p.created_at',
        'p.updated_at',
        'c.name as category_name'
      ]);

    // Apply filters
    if (active_only) {
      query = query.where('p.is_active', true);
    }

    if (category_id) {
      query = query.where('p.category_id', category_id);
    }

    if (search) {
      query = query.where(function() {
        this.where('p.name', 'like', `%${search}%`)
            .orWhere('p.description', 'like', `%${search}%`)
            .orWhere('p.sku', 'like', `%${search}%`);
      });
    }

    if (low_stock) {
      query = query.whereRaw('p.stock <= p.min_stock');
    }

    if (price_min) {
      query = query.where('p.price', '>=', price_min);
    }

    if (price_max) {
      query = query.where('p.price', '<=', price_max);
    }

    // Get total count
    const totalQuery = query.clone();
    const [{ count: total }] = await totalQuery.count('* as count');

    // Get paginated results
    const products = await query
      .orderBy(`p.${sortBy}`, sortOrder)
      .limit(limit)
      .offset(offset);

    // Process products (add calculated fields)
    const processedProducts = products.map(product => ({
      ...product,
      stock_status: getStockStatus(product.stock, product.min_stock),
      margin: product.cost ? ((product.price - product.cost) / product.cost * 100).toFixed(2) : null,
      image_url: product.image_url || null
    }));

    const result = {
      products: processedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache the result for 5 minutes
    await redisService.set(cacheKey, result, 300);

    // Log audit event
    logAuditEvent('PRODUCTS_VIEWED', req.user?.id, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      filters: req.query
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Get single product by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const product = await db('products as p')
      .leftJoin('categories as c', 'p.category_id', 'c.id')
      .select([
        'p.*',
        'c.name as category_name',
        'c.color as category_color'
      ])
      .where('p.id', id)
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        statusCode: 404
      });
    }

    // Add calculated fields
    const processedProduct = {
      ...product,
      stock_status: getStockStatus(product.stock, product.min_stock),
      margin: product.cost ? ((product.price - product.cost) / product.cost * 100).toFixed(2) : null
    };

    res.json({
      success: true,
      data: processedProduct
    });

  } catch (error) {
    logger.error('Get product by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Get categories
export const getCategories = async (req, res) => {
  try {
    const db = getDatabase();

    const categories = await db('categories')
      .select('*')
      .where('is_active', true)
      .orderBy('sort_order', 'asc')
      .orderBy('name', 'asc');

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Helper function to determine stock status
function getStockStatus(currentStock, minStock) {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStock) return 'low_stock';
  if (currentStock <= minStock * 2) return 'medium_stock';
  return 'in_stock';
}

// Create new product
export const createProduct = async (req, res) => {
  try {
    const db = getDatabase();
    const productData = req.body;

    // Validate required fields
    if (!productData.name || !productData.price) {
      return res.status(400).json({
        success: false,
        error: 'Name and price are required',
        statusCode: 400
      });
    }

    // Insert product
    const [productId] = await db('products').insert({
      name: productData.name,
      description: productData.description || '',
      price: parseFloat(productData.price),
      cost: parseFloat(productData.cost) || 0,
      category_id: productData.category_id || null,
      stock: parseInt(productData.stock) || 0,
      min_stock: parseInt(productData.min_stock) || 5,
      sku: productData.sku || '',
      barcode: productData.barcode || '',
      is_active: productData.is_active !== false,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Get the created product
    const newProduct = await db('products')
      .where('id', productId)
      .first();

    // Clear cache
    await redisService.deletePattern('products:*');

    // Log audit event
    logAuditEvent('PRODUCT_CREATED', req.user?.id, {
      productId,
      productName: productData.name,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: newProduct,
      message: 'Product created successfully'
    });

  } catch (error) {
    logger.error('Create product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = getDatabase();

    // Check if product exists
    const existingProduct = await db('products')
      .where('id', id)
      .first();

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        statusCode: 404
      });
    }

    // Update product
    await db('products')
      .where('id', id)
      .update({
        ...updates,
        updated_at: new Date()
      });

    // Get updated product
    const updatedProduct = await db('products')
      .where('id', id)
      .first();

    // Clear cache
    await redisService.deletePattern('products:*');

    // Log audit event
    logAuditEvent('PRODUCT_UPDATED', req.user?.id, {
      productId: id,
      changes: updates,
      ip: req.ip
    });

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    logger.error('Update product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // Check if product exists
    const existingProduct = await db('products')
      .where('id', id)
      .first();

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        statusCode: 404
      });
    }

    // Soft delete (mark as inactive)
    await db('products')
      .where('id', id)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    // Clear cache
    await redisService.deletePattern('products:*');

    // Log audit event
    logAuditEvent('PRODUCT_DELETED', req.user?.id, {
      productId: id,
      productName: existingProduct.name,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Additional required functions for full compatibility

// Get single product (alias for getProductById)
export const getProduct = async (req, res) => {
  return getProductById(req, res);
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { q, limit = 20, category_id } = req.query;
    const db = getDatabase();

    let query = db('products as p')
      .leftJoin('categories as c', 'p.category_id', 'c.id')
      .select([
        'p.id',
        'p.name',
        'p.description',
        'p.price',
        'p.sku',
        'p.stock',
        'c.name as category_name'
      ])
      .where('p.is_active', true)
      .where(function() {
        this.where('p.name', 'like', `%${q}%`)
            .orWhere('p.description', 'like', `%${q}%`)
            .orWhere('p.sku', 'like', `%${q}%`);
      })
      .limit(limit);

    if (category_id) {
      query = query.where('p.category_id', category_id);
    }

    const products = await query;

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    logger.error('Search products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Get products with low stock
export const getLowStockProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const db = getDatabase();

    const products = await db('products')
      .select('*')
      .whereRaw('stock <= min_stock')
      .where('is_active', true)
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: products
    });

  } catch (error) {
    logger.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Get products grouped by categories
export const getProductsByCategory = async (req, res) => {
  try {
    const db = getDatabase();

    const categories = await db('categories')
      .select('*')
      .where('is_active', true)
      .orderBy('sort_order', 'asc');

    const result = [];
    for (const category of categories) {
      const products = await db('products')
        .select('*')
        .where('category_id', category.id)
        .where('is_active', true)
        .orderBy('name', 'asc');

      result.push({
        category,
        products
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get products by category error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      statusCode: 500
    });
  }
};

// Stub functions for other missing endpoints
export const uploadProductImages = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const deleteProductImage = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const duplicateProduct = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const updateProductStock = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const updateProductPrice = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const getProductHistory = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const bulkUpdateProducts = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const exportProductsCSV = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};

export const importProductsCSV = async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
};