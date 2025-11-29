/**
 * Product Controller
 * Handles product CRUD operations, inventory management, and related functionality
 */

import { dbService } from '../../config/database.js';
import { redisService } from '../../config/redis.js';
import { logger, logAuditEvent } from '../../config/logger.js';
import { NotFoundError, ValidationError, ConflictError } from '../../middleware/errorHandler.js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// Get products with filtering and pagination
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'nombre',
      sortOrder = 'asc',
      category_id,
      subcategory_id,
      search,
      active_only = true,
      low_stock,
      price_min,
      price_max
    } = req.query;

    const offset = (page - 1) * limit;
    
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

    // Build query conditions
    let whereClause = '1=1';
    const queryParams = [];

    if (active_only) {
      whereClause += ' AND p.activo = ?';
      queryParams.push('S');
    }

    if (category_id) {
      whereClause += ' AND p.id_categoria = ?';
      queryParams.push(category_id);
    }

    if (subcategory_id) {
      whereClause += ' AND p.id_subcategoria = ?';
      queryParams.push(subcategory_id);
    }

    if (search) {
      whereClause += ' AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR p.codigo LIKE ?)';
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (low_stock) {
      whereClause += ' AND p.stock_actual <= p.stock_minimo';
    }

    if (price_min) {
      whereClause += ' AND p.precio >= ?';
      queryParams.push(price_min);
    }

    if (price_max) {
      whereClause += ' AND p.precio <= ?';
      queryParams.push(price_max);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM productos p 
      WHERE ${whereClause}
    `;
    
    const [countResult] = await dbService.raw(countQuery, queryParams);
    const total = countResult[0].total;

    // Get products
    const productsQuery = `
      SELECT 
        p.id_producto as id,
        p.nombre as name,
        p.descripcion as description,
        p.precio as price,
        p.costo as cost,
        p.codigo as sku,
        p.codigo_barras as barcode,
        p.stock_actual as stock_quantity,
        p.stock_minimo as min_stock,
        p.iva as tax_rate,
        p.activo = 'S' as is_active,
        p.imagen as image,
        p.fecha_creacion as created_at,
        p.fecha_modificacion as updated_at,
        c.nombre as category_name,
        sc.nombre as subcategory_name
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN subcategorias sc ON p.id_subcategoria = sc.id_subcategoria
      WHERE ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const [products] = await dbService.raw(productsQuery, [...queryParams, limit, offset]);

    // Process products (add image URLs, format data)
    const processedProducts = await Promise.all(products.map(async (product) => {
      return {
        ...product,
        image_url: product.image ? `/uploads/products/${product.image}` : null,
        stock_status: getStockStatus(product.stock_quantity, product.min_stock),
        margin: product.cost ? ((product.price - product.cost) / product.cost * 100).toFixed(2) : null
      };
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

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Get products error:', error);
    throw error;
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try cache first
    const cacheKey = `product:${id}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: { product: cached },
        cached: true
      });
    }

    const [products] = await dbService.raw(`
      SELECT 
        p.id_producto as id,
        p.nombre as name,
        p.descripcion as description,
        p.precio as price,
        p.costo as cost,
        p.codigo as sku,
        p.codigo_barras as barcode,
        p.stock_actual as stock_quantity,
        p.stock_minimo as min_stock,
        p.iva as tax_rate,
        p.activo = 'S' as is_active,
        p.imagen as image,
        p.alergenos as allergens,
        p.ingredientes as ingredients,
        p.fecha_creacion as created_at,
        p.fecha_modificacion as updated_at,
        p.id_categoria as category_id,
        p.id_subcategoria as subcategory_id,
        c.nombre as category_name,
        sc.nombre as subcategory_name
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      LEFT JOIN subcategorias sc ON p.id_subcategoria = sc.id_subcategoria
      WHERE p.id_producto = ?
    `, [id]);

    if (!products.length) {
      throw new NotFoundError('Product');
    }

    const product = products[0];
    
    // Process product data
    const processedProduct = {
      ...product,
      image_url: product.image ? `/uploads/products/${product.image}` : null,
      allergens: product.allergens ? JSON.parse(product.allergens) : [],
      ingredients: product.ingredients ? JSON.parse(product.ingredients) : [],
      stock_status: getStockStatus(product.stock_quantity, product.min_stock),
      margin: product.cost ? ((product.price - product.cost) / product.cost * 100).toFixed(2) : null
    };

    // Cache for 10 minutes
    await redisService.set(cacheKey, processedProduct, 600);

    res.json({
      success: true,
      data: { product: processedProduct }
    });

  } catch (error) {
    logger.error('Get product error:', error);
    throw error;
  }
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const { user } = req;
    
    // Check if product with same name exists
    const existingProduct = await dbService.findByField('productos', 'nombre', productData.name);
    if (existingProduct) {
      throw new ConflictError('Product with this name already exists');
    }

    // Check if SKU exists
    if (productData.sku) {
      const existingSKU = await dbService.findByField('productos', 'codigo', productData.sku);
      if (existingSKU) {
        throw new ConflictError('Product with this SKU already exists');
      }
    }

    // Process uploaded images
    let imagePath = null;
    if (req.files && req.files.length > 0) {
      imagePath = await processProductImage(req.files[0]);
    }

    // Prepare product data for database
    const dbProductData = {
      nombre: productData.name,
      descripcion: productData.description || '',
      precio: productData.price,
      costo: productData.cost || 0,
      codigo: productData.sku || generateSKU(),
      codigo_barras: productData.barcode || '',
      stock_actual: productData.stock_quantity || 0,
      stock_minimo: productData.min_stock || 0,
      iva: productData.tax_rate || 0,
      id_categoria: productData.category_id,
      id_subcategoria: productData.subcategory_id || null,
      activo: productData.is_active ? 'S' : 'N',
      imagen: imagePath,
      alergenos: productData.allergens ? JSON.stringify(productData.allergens) : null,
      ingredientes: productData.ingredients ? JSON.stringify(productData.ingredients) : null,
      fecha_creacion: new Date(),
      fecha_modificacion: new Date(),
      usuario_creacion: user.id
    };

    const newProduct = await dbService.create('productos', dbProductData);

    // Invalidate cache
    await redisService.invalidatePattern('products:*');

    // Log audit event
    logAuditEvent('PRODUCT_CREATED', user, {
      productId: newProduct.id_producto,
      productName: productData.name,
      ip: req.ip
    });

    // Return created product
    const createdProduct = await getProductById(newProduct.id_producto);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product: createdProduct }
    });

  } catch (error) {
    logger.error('Create product error:', error);
    throw error;
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { user } = req;

    // Check if product exists
    const existingProduct = await dbService.findById('productos', id);
    if (!existingProduct) {
      throw new NotFoundError('Product');
    }

    // Check for name conflicts (excluding current product)
    if (updateData.name) {
      const [nameConflict] = await dbService.raw(
        'SELECT id_producto FROM productos WHERE nombre = ? AND id_producto != ?',
        [updateData.name, id]
      );
      if (nameConflict.length > 0) {
        throw new ConflictError('Product with this name already exists');
      }
    }

    // Process uploaded images
    let imagePath = existingProduct.imagen;
    if (req.files && req.files.length > 0) {
      // Delete old image if exists
      if (imagePath) {
        await deleteProductImageFile(imagePath);
      }
      imagePath = await processProductImage(req.files[0]);
    }

    // Prepare update data
    const dbUpdateData = {
      ...(updateData.name && { nombre: updateData.name }),
      ...(updateData.description !== undefined && { descripcion: updateData.description }),
      ...(updateData.price && { precio: updateData.price }),
      ...(updateData.cost !== undefined && { costo: updateData.cost }),
      ...(updateData.sku && { codigo: updateData.sku }),
      ...(updateData.barcode !== undefined && { codigo_barras: updateData.barcode }),
      ...(updateData.stock_quantity !== undefined && { stock_actual: updateData.stock_quantity }),
      ...(updateData.min_stock !== undefined && { stock_minimo: updateData.min_stock }),
      ...(updateData.tax_rate !== undefined && { iva: updateData.tax_rate }),
      ...(updateData.category_id && { id_categoria: updateData.category_id }),
      ...(updateData.subcategory_id !== undefined && { id_subcategoria: updateData.subcategory_id }),
      ...(updateData.is_active !== undefined && { activo: updateData.is_active ? 'S' : 'N' }),
      ...(imagePath !== existingProduct.imagen && { imagen: imagePath }),
      ...(updateData.allergens && { alergenos: JSON.stringify(updateData.allergens) }),
      ...(updateData.ingredients && { ingredientes: JSON.stringify(updateData.ingredients) }),
      fecha_modificacion: new Date(),
      usuario_modificacion: user.id
    };

    await dbService.update('productos', id, dbUpdateData);

    // Invalidate cache
    await redisService.del(`product:${id}`);
    await redisService.invalidatePattern('products:*');

    // Log audit event
    logAuditEvent('PRODUCT_UPDATED', user, {
      productId: id,
      productName: updateData.name || existingProduct.nombre,
      updatedFields: Object.keys(dbUpdateData),
      ip: req.ip
    });

    // Return updated product
    const updatedProduct = await getProductById(id);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product: updatedProduct }
    });

  } catch (error) {
    logger.error('Update product error:', error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Check if product exists
    const product = await dbService.findById('productos', id);
    if (!product) {
      throw new NotFoundError('Product');
    }

    // Check if product is used in any sales (soft constraint)
    const [salesCount] = await dbService.raw(
      'SELECT COUNT(*) as count FROM detalle_venta WHERE id_producto = ?',
      [id]
    );

    if (salesCount[0].count > 0) {
      // Soft delete - mark as inactive instead of deleting
      await dbService.update('productos', id, {
        activo: 'N',
        fecha_modificacion: new Date(),
        usuario_modificacion: user.id
      });

      logAuditEvent('PRODUCT_DEACTIVATED', user, {
        productId: id,
        productName: product.nombre,
        reason: 'Product has sales history',
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Product deactivated (has sales history)'
      });
    } else {
      // Hard delete if no sales history
      // Delete associated image
      if (product.imagen) {
        await deleteProductImageFile(product.imagen);
      }

      await dbService.delete('productos', id);

      logAuditEvent('PRODUCT_DELETED', user, {
        productId: id,
        productName: product.nombre,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    }

    // Invalidate cache
    await redisService.del(`product:${id}`);
    await redisService.invalidatePattern('products:*');

  } catch (error) {
    logger.error('Delete product error:', error);
    throw error;
  }
};

// Search products (for POS)
export const searchProducts = async (req, res) => {
  try {
    const { q, limit = 20, category_id } = req.query;
    
    const cacheKey = `product_search:${q}:${category_id || 'all'}:${limit}`;
    const cached = await redisService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: { products: cached },
        cached: true
      });
    }

    let whereClause = "p.activo = 'S' AND (p.nombre LIKE ? OR p.codigo LIKE ? OR p.codigo_barras = ?)";
    const queryParams = [`%${q}%`, `%${q}%`, q];

    if (category_id) {
      whereClause += ' AND p.id_categoria = ?';
      queryParams.push(category_id);
    }

    const [products] = await dbService.raw(`
      SELECT 
        p.id_producto as id,
        p.nombre as name,
        p.precio as price,
        p.codigo as sku,
        p.codigo_barras as barcode,
        p.stock_actual as stock_quantity,
        p.imagen as image,
        c.nombre as category_name
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE ${whereClause}
      ORDER BY p.nombre ASC
      LIMIT ?
    `, [...queryParams, limit]);

    const processedProducts = products.map(product => ({
      ...product,
      image_url: product.image ? `/uploads/products/${product.image}` : null
    }));

    // Cache for 2 minutes (search results change frequently)
    await redisService.set(cacheKey, processedProducts, 120);

    res.json({
      success: true,
      data: { products: processedProducts }
    });

  } catch (error) {
    logger.error('Search products error:', error);
    throw error;
  }
};

// Get low stock products
export const getLowStockProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const [products] = await dbService.raw(`
      SELECT 
        p.id_producto as id,
        p.nombre as name,
        p.stock_actual as stock_quantity,
        p.stock_minimo as min_stock,
        p.precio as price,
        c.nombre as category_name
      FROM productos p
      LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
      WHERE p.activo = 'S' AND p.stock_actual <= p.stock_minimo
      ORDER BY (p.stock_actual - p.stock_minimo) ASC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({
      success: true,
      data: { products }
    });

  } catch (error) {
    logger.error('Get low stock products error:', error);
    throw error;
  }
};

// Placeholder implementations for other endpoints
export const getProductsByCategory = async (req, res) => {
  res.json({ success: true, data: { categories: [] }, message: 'Implementation pending' });
};

export const uploadProductImages = async (req, res) => {
  res.json({ success: true, message: 'Images uploaded (placeholder)' });
};

export const deleteProductImage = async (req, res) => {
  res.json({ success: true, message: 'Image deleted (placeholder)' });
};

export const duplicateProduct = async (req, res) => {
  res.json({ success: true, message: 'Product duplicated (placeholder)' });
};

export const updateProductStock = async (req, res) => {
  res.json({ success: true, message: 'Stock updated (placeholder)' });
};

export const updateProductPrice = async (req, res) => {
  res.json({ success: true, message: 'Price updated (placeholder)' });
};

export const getProductHistory = async (req, res) => {
  res.json({ success: true, data: { history: [] } });
};

export const bulkUpdateProducts = async (req, res) => {
  res.json({ success: true, message: 'Bulk update completed (placeholder)' });
};

export const exportProductsCSV = async (req, res) => {
  res.json({ success: true, message: 'Export completed (placeholder)' });
};

export const importProductsCSV = async (req, res) => {
  res.json({ success: true, message: 'Import completed (placeholder)' });
};

// Helper functions
function getStockStatus(current, minimum) {
  if (current <= 0) return 'out_of_stock';
  if (current <= minimum) return 'low_stock';
  return 'in_stock';
}

function generateSKU() {
  return 'SKU-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

async function processProductImage(file) {
  try {
    const filename = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
    const filepath = path.join('uploads/products/', filename);
    
    // Resize and optimize image
    await sharp(file.path)
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .webp({ quality: 85 })
      .toFile(filepath);
    
    // Delete original uploaded file
    await fs.unlink(file.path);
    
    return filename;
  } catch (error) {
    logger.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

async function deleteProductImageFile(imagePath) {
  try {
    const fullPath = path.join('uploads/products/', imagePath);
    await fs.unlink(fullPath);
  } catch (error) {
    logger.warn('Failed to delete image:', error.message);
  }
}

async function getProductById(id) {
  const [products] = await dbService.raw(`
    SELECT 
      p.id_producto as id,
      p.nombre as name,
      p.descripcion as description,
      p.precio as price,
      p.costo as cost,
      p.codigo as sku,
      p.stock_actual as stock_quantity,
      p.stock_minimo as min_stock,
      p.iva as tax_rate,
      p.activo = 'S' as is_active,
      p.imagen as image,
      c.nombre as category_name
    FROM productos p
    LEFT JOIN categorias c ON p.id_categoria = c.id_categoria
    WHERE p.id_producto = ?
  `, [id]);

  if (!products.length) {
    throw new NotFoundError('Product');
  }

  const product = products[0];
  return {
    ...product,
    image_url: product.image ? `/uploads/products/${product.image}` : null,
    stock_status: getStockStatus(product.stock_quantity, product.min_stock)
  };
}