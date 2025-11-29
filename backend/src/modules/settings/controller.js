/**
 * Settings Controller
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get all settings
export const getSettings = async (req, res) => {
  try {
    const { category } = req.query;

    let conditions = {};
    if (category) {
      conditions.category = category;
    }

    const settings = await dbService.findMany('settings', conditions, {
      orderBy: { field: 'category', direction: 'asc' }
    });

    // Convert to key-value object for easier frontend consumption
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        category: setting.category,
        description: setting.description,
        data_type: setting.data_type
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: settingsObject,
      raw: settings
    });
  } catch (error) {
    logger.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting settings'
    });
  }
};

// Get setting by key
export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;

    const settings = await dbService.findMany('settings', { key });

    if (!settings || settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const setting = settings[0];

    res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    logger.error('Error getting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting setting'
    });
  }
};

// Create new setting
export const createSetting = async (req, res) => {
  try {
    const { key, value, category = 'general', description = '', data_type = 'string' } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Key and value are required'
      });
    }

    // Check if setting already exists
    const existing = await dbService.findMany('settings', { key });
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Setting with this key already exists'
      });
    }

    const newSetting = await dbService.create('settings', {
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      category,
      description,
      data_type,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      data: newSetting,
      message: 'Setting created successfully'
    });
  } catch (error) {
    logger.error('Error creating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating setting'
    });
  }
};

// Update setting
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, category, description, data_type } = req.body;

    // Find setting by key
    const settings = await dbService.findMany('settings', { key });

    if (!settings || settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const setting = settings[0];
    const updateData = {
      updated_at: new Date()
    };

    if (value !== undefined) {
      updateData.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
    }
    if (category !== undefined) {
      updateData.category = category;
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (data_type !== undefined) {
      updateData.data_type = data_type;
    }

    const updatedSetting = await dbService.update('settings', setting.id, updateData);

    res.json({
      success: true,
      data: updatedSetting,
      message: 'Setting updated successfully'
    });
  } catch (error) {
    logger.error('Error updating setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating setting'
    });
  }
};

// Delete setting
export const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;

    // Find setting by key
    const settings = await dbService.findMany('settings', { key });

    if (!settings || settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    const setting = settings[0];
    await dbService.delete('settings', setting.id);

    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting setting:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting setting'
    });
  }
};

// Get settings by category
export const getSettingsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const settings = await dbService.findMany('settings', { category }, {
      orderBy: { field: 'key', direction: 'asc' }
    });

    // Convert to key-value object
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        data_type: setting.data_type
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: settingsObject,
      raw: settings
    });
  } catch (error) {
    logger.error('Error getting settings by category:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting settings by category'
    });
  }
};

// Bulk update settings
export const bulkUpdateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({
        success: false,
        message: 'Settings array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const settingUpdate of settings) {
      try {
        const { key, value } = settingUpdate;

        if (!key || value === undefined) {
          errors.push({ key, error: 'Key and value are required' });
          continue;
        }

        // Find setting by key
        const existingSettings = await dbService.findMany('settings', { key });

        if (!existingSettings || existingSettings.length === 0) {
          errors.push({ key, error: 'Setting not found' });
          continue;
        }

        const existing = existingSettings[0];
        const updated = await dbService.update('settings', existing.id, {
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          updated_at: new Date()
        });

        results.push({ key, success: true, data: updated });
      } catch (error) {
        errors.push({ key: settingUpdate.key, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0
        ? 'All settings updated successfully'
        : `${results.length} settings updated, ${errors.length} errors`
    });
  } catch (error) {
    logger.error('Error bulk updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error bulk updating settings'
    });
  }
};
