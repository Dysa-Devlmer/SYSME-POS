/**
 * Category Controller
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const categories = await dbService.findMany('categories', {}, {
      orderBy: { field: 'name', direction: 'asc' }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    logger.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting categories'
    });
  }
};

// Get category by ID
export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await dbService.findById('categories', id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    logger.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting category'
    });
  }
};

// Create new category
export const createCategory = async (req, res) => {
  try {
    const categoryData = req.body;

    const newCategory = await dbService.create('categories', {
      ...categoryData,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      data: newCategory,
      message: 'Category created successfully'
    });
  } catch (error) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category'
    });
  }
};

// Update category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedCategory = await dbService.update('categories', id, updateData);

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Category updated successfully'
    });
  } catch (error) {
    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category'
    });
  }
};

// Delete category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const category = await dbService.findById('categories', id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await dbService.delete('categories', id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category'
    });
  }
};