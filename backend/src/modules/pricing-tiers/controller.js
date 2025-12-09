/**
 * Pricing Tiers Controller - Multiple pricing system
 * Uses centralized database service for consistent database access
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get all pricing tiers
export const getAllTiers = async (req, res) => {
  try {
    const { include_inactive } = req.query;

    let query = 'SELECT * FROM pricing_tiers';
    if (!include_inactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY priority DESC, name ASC';

    const tiers = await dbService.query(query);

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    logger.error('Error getting pricing tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tarifas'
    });
  }
};

// Get active pricing tiers
export const getActiveTiers = async (req, res) => {
  try {
    const tiers = await dbService.query(`
      SELECT * FROM pricing_tiers
      WHERE is_active = 1
      ORDER BY priority DESC, name ASC
    `);

    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    logger.error('Error getting active tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tarifas activas'
    });
  }
};

// Get default tier
export const getDefaultTier = async (req, res) => {
  try {
    const tiers = await dbService.query(`
      SELECT * FROM pricing_tiers
      WHERE is_default = 1 AND is_active = 1
      LIMIT 1
    `);

    const tier = tiers[0];

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'No se encontró tarifa por defecto'
      });
    }

    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    logger.error('Error getting default tier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tarifa por defecto'
    });
  }
};

// Get tier by ID
export const getTierById = async (req, res) => {
  try {
    const { id } = req.params;

    const tier = await dbService.findById('pricing_tiers', id);

    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Tarifa no encontrada'
      });
    }

    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    logger.error('Error getting tier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tarifa'
    });
  }
};

// Create pricing tier
export const createTier = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      is_default = false,
      is_active = true,
      valid_days,
      valid_start_time,
      valid_end_time,
      priority = 0
    } = req.body;

    // Validations
    if (!code || !name) {
      return res.status(400).json({
        success: false,
        error: 'Código y nombre son requeridos'
      });
    }

    // If setting as default, remove default from others
    if (is_default) {
      await dbService.query('UPDATE pricing_tiers SET is_default = 0');
    }

    const tier = await dbService.create('pricing_tiers', {
      code,
      name,
      description,
      is_default: is_default ? 1 : 0,
      is_active: is_active ? 1 : 0,
      valid_days: valid_days ? JSON.stringify(valid_days) : null,
      valid_start_time,
      valid_end_time,
      priority
    });

    res.status(201).json({
      success: true,
      data: tier,
      message: 'Tarifa creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating tier:', error);
    if (error.message && error.message.includes('UNIQUE')) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una tarifa con ese código'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Error al crear tarifa'
    });
  }
};

// Update pricing tier
export const updateTier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      is_default,
      is_active,
      valid_days,
      valid_start_time,
      valid_end_time,
      priority
    } = req.body;

    // Check if tier exists
    const existingTier = await dbService.findById('pricing_tiers', id);
    if (!existingTier) {
      return res.status(404).json({
        success: false,
        error: 'Tarifa no encontrada'
      });
    }

    // If setting as default, remove default from others
    if (is_default) {
      await dbService.query('UPDATE pricing_tiers SET is_default = 0 WHERE id != ?', [id]);
    }

    // Build update data - only include non-undefined values
    const updateData = {};
    if (code !== undefined) updateData.code = code;
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_default !== undefined) updateData.is_default = is_default ? 1 : 0;
    if (is_active !== undefined) updateData.is_active = is_active ? 1 : 0;
    if (valid_days !== undefined) updateData.valid_days = valid_days ? JSON.stringify(valid_days) : null;
    if (valid_start_time !== undefined) updateData.valid_start_time = valid_start_time;
    if (valid_end_time !== undefined) updateData.valid_end_time = valid_end_time;
    if (priority !== undefined) updateData.priority = priority;

    const updatedTier = await dbService.update('pricing_tiers', id, updateData);

    res.json({
      success: true,
      data: updatedTier,
      message: 'Tarifa actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error updating tier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar tarifa'
    });
  }
};

// Delete pricing tier
export const deleteTier = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the default tier
    const tier = await dbService.findById('pricing_tiers', id);
    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'Tarifa no encontrada'
      });
    }

    if (tier.is_default) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar la tarifa por defecto'
      });
    }

    // Check if tier is being used
    const usageResult = await dbService.query(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM tables WHERE pricing_tier_id = ?
        UNION ALL
        SELECT id FROM sales WHERE pricing_tier_id = ?
      )
    `, [id, id]);

    const usageCount = usageResult[0];

    if (usageCount && usageCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar: tarifa en uso'
      });
    }

    await dbService.delete('pricing_tiers', id);

    res.json({
      success: true,
      message: 'Tarifa eliminada exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting tier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar tarifa'
    });
  }
};

// Get product prices for a tier
export const getProductPrices = async (req, res) => {
  try {
    const { tier_id } = req.params;

    const prices = await dbService.query(`
      SELECT
        ppt.*,
        p.name as product_name,
        p.price as default_price
      FROM product_pricing_tiers ppt
      JOIN products p ON ppt.product_id = p.id
      WHERE ppt.pricing_tier_id = ?
      ORDER BY p.name ASC
    `, [tier_id]);

    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    logger.error('Error getting product prices:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener precios'
    });
  }
};

// Set product price for tier
export const setProductPrice = async (req, res) => {
  try {
    const { tier_id, product_id } = req.params;
    const { price } = req.body;

    if (price === undefined || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Precio inválido'
      });
    }

    // Check if exists
    const existing = await dbService.query(
      'SELECT * FROM product_pricing_tiers WHERE product_id = ? AND pricing_tier_id = ?',
      [product_id, tier_id]
    );

    let result;
    if (existing.length > 0) {
      // Update
      await dbService.query(
        'UPDATE product_pricing_tiers SET price = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND pricing_tier_id = ?',
        [price, product_id, tier_id]
      );
      const results = await dbService.query(
        'SELECT * FROM product_pricing_tiers WHERE product_id = ? AND pricing_tier_id = ?',
        [product_id, tier_id]
      );
      result = results[0];
    } else {
      // Insert
      result = await dbService.create('product_pricing_tiers', {
        product_id,
        pricing_tier_id: tier_id,
        price
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'Precio actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error setting product price:', error);
    res.status(500).json({
      success: false,
      error: 'Error al establecer precio'
    });
  }
};

// Get applicable tier for a table/time
export const getApplicableTier = async (req, res) => {
  try {
    const { table_id } = req.query;
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    let tier = null;

    // If table specified, check table's tier
    if (table_id) {
      const tableTiers = await dbService.query(`
        SELECT pt.* FROM pricing_tiers pt
        JOIN tables t ON t.pricing_tier_id = pt.id
        WHERE t.id = ? AND pt.is_active = 1
      `, [table_id]);

      tier = tableTiers[0];

      if (tier) {
        return res.json({ success: true, data: tier });
      }
    }

    // Check time-based tiers
    const timeTiers = await dbService.query(`
      SELECT * FROM pricing_tiers
      WHERE is_active = 1
        AND valid_start_time IS NOT NULL
        AND valid_end_time IS NOT NULL
      ORDER BY priority DESC
    `);

    for (const t of timeTiers) {
      // Check days
      if (t.valid_days) {
        const validDays = JSON.parse(t.valid_days);
        if (!validDays.includes(currentDay)) continue;
      }

      // Check time
      if (currentTime >= t.valid_start_time && currentTime <= t.valid_end_time) {
        tier = t;
        break;
      }
    }

    // Default tier
    if (!tier) {
      const defaultTiers = await dbService.query(`
        SELECT * FROM pricing_tiers
        WHERE is_default = 1 AND is_active = 1
        LIMIT 1
      `);
      tier = defaultTiers[0];
    }

    res.json({
      success: true,
      data: tier
    });
  } catch (error) {
    logger.error('Error getting applicable tier:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener tarifa aplicable'
    });
  }
};
