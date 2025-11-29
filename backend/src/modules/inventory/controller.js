/**
 * Inventory Controller
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get all inventory items
export const getInventoryItems = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    let conditions = {};
    if (search) {
      // For SQLite, we'll use a simple LIKE query
      const items = await dbService.raw(
        `SELECT p.*, c.name as category_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.id
         WHERE p.name LIKE ? OR p.sku LIKE ?
         ORDER BY p.name ASC
         LIMIT ? OFFSET ?`,
        [`%${search}%`, `%${search}%`, parseInt(limit), parseInt(offset)]
      );

      const total = await dbService.raw(
        `SELECT COUNT(*) as count FROM products WHERE name LIKE ? OR sku LIKE ?`,
        [`%${search}%`, `%${search}%`]
      );

      return res.json({
        success: true,
        data: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      });
    }

    const items = await dbService.raw(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ORDER BY p.name ASC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );

    const total = await dbService.count('products', {});

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error getting inventory items:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting inventory items'
    });
  }
};

// Get inventory item by ID
export const getInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await dbService.findById('products', id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    // Get category info if exists
    if (item.category_id) {
      const category = await dbService.findById('categories', item.category_id);
      item.category_name = category?.name || null;
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('Error getting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting inventory item'
    });
  }
};

// Create new inventory item
export const createInventoryItem = async (req, res) => {
  try {
    const itemData = req.body;

    const newItem = await dbService.create('products', {
      ...itemData,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Inventory item created successfully'
    });
  } catch (error) {
    logger.error('Error creating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating inventory item'
    });
  }
};

// Update inventory item
export const updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedItem = await dbService.update('products', id, {
      ...updateData,
      updated_at: new Date()
    });

    if (!updatedItem) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.json({
      success: true,
      data: updatedItem,
      message: 'Inventory item updated successfully'
    });
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating inventory item'
    });
  }
};

// Delete inventory item
export const deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await dbService.findById('products', id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    await dbService.delete('products', id);

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting inventory item'
    });
  }
};

// Adjust stock (manual adjustment)
export const adjustStock = async (req, res) => {
  try {
    const { product_id, quantity, adjustment_type, reason } = req.body;

    if (!product_id || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }

    const product = await dbService.findById('products', product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Calculate new stock based on adjustment type
    let newStock = product.stock;
    if (adjustment_type === 'add') {
      newStock += quantity;
    } else if (adjustment_type === 'subtract') {
      newStock -= quantity;
    } else if (adjustment_type === 'set') {
      newStock = quantity;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment type. Use: add, subtract, or set'
      });
    }

    // Ensure stock doesn't go negative
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock cannot be negative'
      });
    }

    // Update product stock
    const updatedProduct = await dbService.update('products', product_id, {
      stock: newStock,
      updated_at: new Date()
    });

    // Log the adjustment in inventory_movements table (if exists)
    try {
      await dbService.create('inventory_movements', {
        product_id,
        quantity,
        adjustment_type,
        previous_stock: product.stock,
        new_stock: newStock,
        reason: reason || 'Manual adjustment',
        user_id: req.user?.id || null,
        created_at: new Date()
      });
    } catch (err) {
      // If inventory_movements table doesn't exist, just log it
      logger.warn('Inventory movements table not found, skipping movement log');
    }

    res.json({
      success: true,
      data: updatedProduct,
      message: 'Stock adjusted successfully'
    });
  } catch (error) {
    logger.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      message: 'Error adjusting stock'
    });
  }
};

// Get low stock items
export const getLowStockItems = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;

    const lowStockItems = await dbService.raw(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.stock <= ?
       ORDER BY p.stock ASC`,
      [parseInt(threshold)]
    );

    res.json({
      success: true,
      data: lowStockItems,
      count: lowStockItems.length
    });
  } catch (error) {
    logger.error('Error getting low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting low stock items'
    });
  }
};

// Get inventory history for a product
export const getInventoryHistory = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Try to get inventory movements (if table exists)
    try {
      const movements = await dbService.raw(
        `SELECT * FROM inventory_movements
         WHERE product_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [product_id, parseInt(limit), parseInt(offset)]
      );

      const total = await dbService.raw(
        `SELECT COUNT(*) as count FROM inventory_movements WHERE product_id = ?`,
        [product_id]
      );

      res.json({
        success: true,
        data: movements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total[0].count,
          pages: Math.ceil(total[0].count / limit)
        }
      });
    } catch (err) {
      // If table doesn't exist, return empty array
      res.json({
        success: true,
        data: [],
        message: 'Inventory history not available',
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      });
    }
  } catch (error) {
    logger.error('Error getting inventory history:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting inventory history'
    });
  }
};
