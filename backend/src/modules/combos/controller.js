/**
 * Combos Controller - Product Bundles and Menus
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Get all active combos
export const getCombos = async (req, res) => {
  try {
    const { combo_type, category_id } = req.query;

    let query = 'SELECT * FROM combos WHERE is_active = 1';
    const params = [];

    if (combo_type) {
      query += ' AND combo_type = ?';
      params.push(combo_type);
    }

    if (category_id) {
      query += ' AND category_id = ?';
      params.push(category_id);
    }

    query += ' ORDER BY display_order, name';

    const combos = await dbService.query(query, params);
    res.json({ success: true, data: combos });
  } catch (error) {
    logger.error('Error fetching combos:', error);
    res.status(500).json({ success: false, message: 'Error al obtener combos' });
  }
};

// Get combo details with items and variants
export const getComboById = async (req, res) => {
  try {
    const { id } = req.params;

    const combo = await dbService.findById('combos', id);
    if (!combo) {
      return res.status(404).json({ success: false, message: 'Combo no encontrado' });
    }

    // Get required items
    const items = await dbService.query(
      `SELECT ci.*, p.name as product_name, p.code as product_code, p.price as product_price
       FROM combo_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.combo_id = ?
       ORDER BY ci.group_name, p.name`,
      [id]
    );

    // Get variant options
    const variants = await dbService.query(
      `SELECT cv.*, p.name as product_name, p.code as product_code
       FROM combo_item_variants cv
       JOIN products p ON cv.product_id = p.id
       WHERE cv.combo_id = ?
       ORDER BY cv.group_name, cv.display_order`,
      [id]
    );

    // Group variants by group_name
    const variantGroups = variants.reduce((acc, variant) => {
      if (!acc[variant.group_name]) {
        acc[variant.group_name] = [];
      }
      acc[variant.group_name].push(variant);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        ...combo,
        items,
        variant_groups: variantGroups
      }
    });
  } catch (error) {
    logger.error('Error fetching combo details:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalles del combo' });
  }
};

// Create new combo
export const createCombo = async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      combo_type,
      price,
      original_price,
      category_id,
      items,
      variants,
      ...rest
    } = req.body;

    const result = await dbService.transaction(async () => {
      // Calculate discount percent
      const discountPercent = original_price
        ? ((original_price - price) / original_price) * 100
        : 0;

      // Create combo
      const combo = await dbService.create('combos', {
        code,
        name,
        description: description || null,
        combo_type: combo_type || 'pack',
        price,
        original_price: original_price || null,
        discount_percent: discountPercent,
        category_id: category_id || null,
        is_active: 1,
        created_at: new Date(),
        updated_at: new Date(),
        ...rest
      });

      // Add items
      if (items && items.length > 0) {
        for (const item of items) {
          await dbService.create('combo_items', {
            combo_id: combo.id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
            is_required: item.is_required !== false ? 1 : 0,
            is_customizable: item.is_customizable ? 1 : 0,
            group_name: item.group_name || null,
            max_selections: item.max_selections || null,
            notes: item.notes || null
          });
        }
      }

      // Add variants
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          await dbService.create('combo_item_variants', {
            combo_id: combo.id,
            group_name: variant.group_name,
            product_id: variant.product_id,
            additional_price: variant.additional_price || 0,
            is_default: variant.is_default ? 1 : 0,
            display_order: variant.display_order || 0
          });
        }
      }

      logger.info(`Combo ${code} created`);
      return combo;
    });

    res.json({
      success: true,
      data: result,
      message: 'Combo creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating combo:', error);
    res.status(500).json({ success: false, message: 'Error al crear combo' });
  }
};

// Update combo
export const updateCombo = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, variants, ...updateData } = req.body;

    const combo = await dbService.findById('combos', id);
    if (!combo) {
      return res.status(404).json({ success: false, message: 'Combo no encontrado' });
    }

    await dbService.transaction(async () => {
      // Update combo
      if (updateData.price && updateData.original_price) {
        updateData.discount_percent =
          ((updateData.original_price - updateData.price) / updateData.original_price) * 100;
      }

      await dbService.update('combos', id, {
        ...updateData,
        updated_at: new Date()
      });

      // Update items if provided
      if (items) {
        await dbService.query('DELETE FROM combo_items WHERE combo_id = ?', [id]);
        for (const item of items) {
          await dbService.create('combo_items', {
            combo_id: id,
            product_id: item.product_id,
            quantity: item.quantity || 1,
            is_required: item.is_required !== false ? 1 : 0,
            is_customizable: item.is_customizable ? 1 : 0,
            group_name: item.group_name || null,
            max_selections: item.max_selections || null,
            notes: item.notes || null
          });
        }
      }

      // Update variants if provided
      if (variants) {
        await dbService.query('DELETE FROM combo_item_variants WHERE combo_id = ?', [id]);
        for (const variant of variants) {
          await dbService.create('combo_item_variants', {
            combo_id: id,
            group_name: variant.group_name,
            product_id: variant.product_id,
            additional_price: variant.additional_price || 0,
            is_default: variant.is_default ? 1 : 0,
            display_order: variant.display_order || 0
          });
        }
      }
    });

    res.json({ success: true, message: 'Combo actualizado exitosamente' });
  } catch (error) {
    logger.error('Error updating combo:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar combo' });
  }
};

// Delete combo (soft delete)
export const deleteCombo = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('combos', id, {
      is_active: 0,
      updated_at: new Date()
    });

    res.json({ success: true, message: 'Combo desactivado exitosamente' });
  } catch (error) {
    logger.error('Error deleting combo:', error);
    res.status(500).json({ success: false, message: 'Error al desactivar combo' });
  }
};

// Check if combo is available now (time/date validation)
export const checkComboAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const combo = await dbService.findById('combos', id);
    if (!combo || !combo.is_active) {
      return res.json({ success: true, available: false, reason: 'Combo no activo' });
    }

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
    const currentDate = now.toISOString().split('T')[0];
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Check date range
    if (combo.start_date && currentDate < combo.start_date) {
      return res.json({ success: true, available: false, reason: 'Combo aún no disponible' });
    }

    if (combo.end_date && currentDate > combo.end_date) {
      return res.json({ success: true, available: false, reason: 'Combo expirado' });
    }

    // Check time range
    if (combo.available_from_time && currentTime < combo.available_from_time) {
      return res.json({
        success: true,
        available: false,
        reason: `Disponible desde ${combo.available_from_time}`
      });
    }

    if (combo.available_to_time && currentTime > combo.available_to_time) {
      return res.json({
        success: true,
        available: false,
        reason: `Disponible hasta ${combo.available_to_time}`
      });
    }

    // Check available days
    if (combo.available_days) {
      try {
        const allowedDays = JSON.parse(combo.available_days);
        if (!allowedDays.includes(currentDay)) {
          return res.json({
            success: true,
            available: false,
            reason: `Solo disponible: ${allowedDays.join(', ')}`
          });
        }
      } catch (e) {
        logger.error('Error parsing available_days:', e);
      }
    }

    res.json({ success: true, available: true });
  } catch (error) {
    logger.error('Error checking availability:', error);
    res.status(500).json({ success: false, message: 'Error al verificar disponibilidad' });
  }
};

// Get combo sales stats
export const getComboStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        c.id,
        c.code,
        c.name,
        COUNT(sci.id) as times_sold,
        SUM(sci.quantity) as total_quantity,
        SUM(sci.total_price) as total_revenue
      FROM combos c
      LEFT JOIN sale_combo_items sci ON c.id = sci.combo_id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(sci.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(sci.created_at) <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY c.id ORDER BY total_revenue DESC';

    const stats = await dbService.query(query, params);
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Error fetching combo stats:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
};
