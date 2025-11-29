/**
 * Pricing Tiers Controller - Multiple pricing system
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../database/sysme.db');
const db = new Database(dbPath);

// Get all pricing tiers
export const getAllTiers = (req, res) => {
  try {
    const { include_inactive } = req.query;

    let query = 'SELECT * FROM pricing_tiers';
    if (!include_inactive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY priority DESC, name ASC';

    const tiers = db.prepare(query).all();

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
export const getActiveTiers = (req, res) => {
  try {
    const tiers = db.prepare(`
      SELECT * FROM pricing_tiers
      WHERE is_active = 1
      ORDER BY priority DESC, name ASC
    `).all();

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
export const getDefaultTier = (req, res) => {
  try {
    const tier = db.prepare(`
      SELECT * FROM pricing_tiers
      WHERE is_default = 1 AND is_active = 1
      LIMIT 1
    `).get();

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
export const getTierById = (req, res) => {
  try {
    const { id } = req.params;

    const tier = db.prepare('SELECT * FROM pricing_tiers WHERE id = ?').get(id);

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
export const createTier = (req, res) => {
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
      db.prepare('UPDATE pricing_tiers SET is_default = 0').run();
    }

    const result = db.prepare(`
      INSERT INTO pricing_tiers (
        code, name, description, is_default, is_active,
        valid_days, valid_start_time, valid_end_time, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code,
      name,
      description,
      is_default ? 1 : 0,
      is_active ? 1 : 0,
      valid_days ? JSON.stringify(valid_days) : null,
      valid_start_time,
      valid_end_time,
      priority
    );

    const tier = db.prepare('SELECT * FROM pricing_tiers WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      data: tier,
      message: 'Tarifa creada exitosamente'
    });
  } catch (error) {
    logger.error('Error creating tier:', error);
    if (error.message.includes('UNIQUE')) {
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
export const updateTier = (req, res) => {
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
    const existingTier = db.prepare('SELECT * FROM pricing_tiers WHERE id = ?').get(id);
    if (!existingTier) {
      return res.status(404).json({
        success: false,
        error: 'Tarifa no encontrada'
      });
    }

    // If setting as default, remove default from others
    if (is_default) {
      db.prepare('UPDATE pricing_tiers SET is_default = 0 WHERE id != ?').run(id);
    }

    db.prepare(`
      UPDATE pricing_tiers
      SET code = COALESCE(?, code),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          is_default = COALESCE(?, is_default),
          is_active = COALESCE(?, is_active),
          valid_days = COALESCE(?, valid_days),
          valid_start_time = COALESCE(?, valid_start_time),
          valid_end_time = COALESCE(?, valid_end_time),
          priority = COALESCE(?, priority)
      WHERE id = ?
    `).run(
      code,
      name,
      description,
      is_default !== undefined ? (is_default ? 1 : 0) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      valid_days ? JSON.stringify(valid_days) : null,
      valid_start_time,
      valid_end_time,
      priority,
      id
    );

    const updatedTier = db.prepare('SELECT * FROM pricing_tiers WHERE id = ?').get(id);

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
export const deleteTier = (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's the default tier
    const tier = db.prepare('SELECT * FROM pricing_tiers WHERE id = ?').get(id);
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
    const usageCount = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM tables WHERE pricing_tier_id = ?
        UNION ALL
        SELECT id FROM sales WHERE pricing_tier_id = ?
      )
    `).get(id, id);

    if (usageCount.count > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar: tarifa en uso'
      });
    }

    db.prepare('DELETE FROM pricing_tiers WHERE id = ?').run(id);

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
export const getProductPrices = (req, res) => {
  try {
    const { tier_id } = req.params;

    const prices = db.prepare(`
      SELECT
        ppt.*,
        p.name as product_name,
        p.base_price as default_price
      FROM product_pricing_tiers ppt
      JOIN products p ON ppt.product_id = p.id
      WHERE ppt.pricing_tier_id = ?
      ORDER BY p.name ASC
    `).all(tier_id);

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
export const setProductPrice = (req, res) => {
  try {
    const { tier_id, product_id } = req.params;
    const { price } = req.body;

    if (price === undefined || price < 0) {
      return res.status(400).json({
        success: false,
        error: 'Precio inválido'
      });
    }

    // Upsert
    db.prepare(`
      INSERT INTO product_pricing_tiers (product_id, pricing_tier_id, price)
      VALUES (?, ?, ?)
      ON CONFLICT(product_id, pricing_tier_id)
      DO UPDATE SET price = ?, updated_at = CURRENT_TIMESTAMP
    `).run(product_id, tier_id, price, price);

    const result = db.prepare(`
      SELECT * FROM product_pricing_tiers
      WHERE product_id = ? AND pricing_tier_id = ?
    `).get(product_id, tier_id);

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
export const getApplicableTier = (req, res) => {
  try {
    const { table_id } = req.query;
    const now = new Date();
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM

    let tier = null;

    // If table specified, check table's tier
    if (table_id) {
      tier = db.prepare(`
        SELECT pt.* FROM pricing_tiers pt
        JOIN tables t ON t.pricing_tier_id = pt.id
        WHERE t.id = ? AND pt.is_active = 1
      `).get(table_id);

      if (tier) {
        return res.json({ success: true, data: tier });
      }
    }

    // Check time-based tiers
    const timeTiers = db.prepare(`
      SELECT * FROM pricing_tiers
      WHERE is_active = 1
        AND valid_start_time IS NOT NULL
        AND valid_end_time IS NOT NULL
      ORDER BY priority DESC
    `).all();

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
      tier = db.prepare(`
        SELECT * FROM pricing_tiers
        WHERE is_default = 1 AND is_active = 1
        LIMIT 1
      `).get();
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
