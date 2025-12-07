/**
 * Tips Controller - Sistema de Propinas Configurable
 * Manages tip settings, presets, and tip tracking per sale
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// ============================================
// TIP SETTINGS CRUD
// ============================================

/**
 * Get current tip settings
 */
export const getTipSettings = async (req, res) => {
  try {
    // There should only be one settings row
    const settings = await dbService.query('SELECT * FROM tip_settings ORDER BY id DESC LIMIT 1');

    if (!settings || settings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración de propinas no encontrada'
      });
    }

    // Parse suggested_percentages from JSON string
    const settingsData = settings[0];
    if (settingsData.suggested_percentages) {
      try {
        settingsData.suggested_percentages = JSON.parse(settingsData.suggested_percentages);
      } catch (e) {
        settingsData.suggested_percentages = [10, 15, 20];
      }
    }

    res.json({
      success: true,
      data: settingsData
    });
  } catch (error) {
    logger.error('Error getting tip settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener configuración de propinas'
    });
  }
};

/**
 * Update tip settings
 */
export const updateTipSettings = async (req, res) => {
  try {
    const updates = req.body;

    // Get current settings
    const current = await dbService.query('SELECT * FROM tip_settings ORDER BY id DESC LIMIT 1');
    if (!current || current.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Configuración no encontrada'
      });
    }

    const settingsId = current[0].id;

    // If suggested_percentages is an array, convert to JSON string
    if (Array.isArray(updates.suggested_percentages)) {
      updates.suggested_percentages = JSON.stringify(updates.suggested_percentages);
    }

    // Update settings
    const updated = await dbService.update('tip_settings', settingsId, updates);

    logger.info(`Tip settings updated by user ${req.user?.id}`);

    res.json({
      success: true,
      data: updated,
      message: 'Configuración actualizada exitosamente'
    });
  } catch (error) {
    logger.error('Error updating tip settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar configuración'
    });
  }
};

// ============================================
// TIP PRESETS CRUD
// ============================================

/**
 * Get all tip presets
 */
export const getAllTipPresets = async (req, res) => {
  try {
    const { active_only } = req.query;

    let conditions = {};
    if (active_only === 'true') {
      conditions.is_active = 1;
    }

    const presets = await dbService.findMany('tip_presets', conditions, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    logger.error('Error getting tip presets:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener presets de propinas'
    });
  }
};

/**
 * Get single tip preset
 */
export const getTipPreset = async (req, res) => {
  try {
    const { id } = req.params;

    const preset = await dbService.findOne('tip_presets', { id });

    if (!preset) {
      return res.status(404).json({
        success: false,
        message: 'Preset no encontrado'
      });
    }

    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    logger.error('Error getting tip preset:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener preset'
    });
  }
};

/**
 * Create tip preset
 */
export const createTipPreset = async (req, res) => {
  try {
    const {
      name,
      description,
      percentage = 0,
      fixed_amount = 0,
      is_percentage = true,
      display_order = 0
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido'
      });
    }

    const preset = await dbService.create('tip_presets', {
      name,
      description,
      percentage,
      fixed_amount,
      is_percentage: is_percentage ? 1 : 0,
      display_order,
      is_active: 1
    });

    logger.info(`Tip preset created: ${preset.id} - ${name}`);

    res.status(201).json({
      success: true,
      data: preset,
      message: 'Preset creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating tip preset:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear preset'
    });
  }
};

/**
 * Update tip preset
 */
export const updateTipPreset = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await dbService.findOne('tip_presets', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Preset no encontrado'
      });
    }

    const updated = await dbService.update('tip_presets', id, updates);

    logger.info(`Tip preset updated: ${id}`);

    res.json({
      success: true,
      data: updated,
      message: 'Preset actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating tip preset:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar preset'
    });
  }
};

/**
 * Delete tip preset (soft delete)
 */
export const deleteTipPreset = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbService.findOne('tip_presets', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Preset no encontrado'
      });
    }

    await dbService.update('tip_presets', id, { is_active: 0 });

    logger.info(`Tip preset deleted: ${id}`);

    res.json({
      success: true,
      message: 'Preset eliminado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting tip preset:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar preset'
    });
  }
};

// ============================================
// SALE TIPS OPERATIONS
// ============================================

/**
 * Add tip to sale
 */
export const addTipToSale = async (req, res) => {
  try {
    const {
      sale_id,
      tip_amount,
      tip_percentage = null,
      tip_method = 'percentage',
      calculation_base = 0,
      preset_id = null,
      distribution_method = 'waiters',
      notes = null
    } = req.body;

    // Validation
    if (!sale_id || tip_amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere sale_id y tip_amount'
      });
    }

    // Get sale info
    const sale = await dbService.findOne('sales', { id: sale_id });
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Venta no encontrada'
      });
    }

    // Check if tip already exists for this sale
    const existingTip = await dbService.findOne('sale_tips', { sale_id });
    if (existingTip) {
      return res.status(400).json({
        success: false,
        message: 'Esta venta ya tiene una propina asignada'
      });
    }

    await dbService.transaction(async (trx) => {
      // Create sale tip record
      const [saleTipId] = await trx('sale_tips').insert({
        sale_id,
        tip_amount,
        tip_percentage,
        tip_method,
        calculation_base,
        preset_id,
        waiter_id: sale.waiter_id || req.user?.id,
        distribution_method,
        notes,
        created_at: new Date()
      });

      // Update sale with tip amount
      await trx('sales').where('id', sale_id).update({
        tip_amount,
        tip_included: 1,
        total: sale.total + tip_amount,
        updated_at: new Date()
      });

      // Handle distribution based on method
      if (distribution_method === 'waiters' && sale.waiter_id) {
        // All tip goes to the waiter
        await trx('tip_distribution').insert({
          sale_tip_id: saleTipId,
          user_id: sale.waiter_id,
          amount: tip_amount,
          percentage: 100,
          role: 'waiter',
          created_at: new Date()
        });
      } else if (distribution_method === 'kitchen_split') {
        // 60% waiter, 40% kitchen (example split)
        const waiterAmount = tip_amount * 0.6;
        const kitchenAmount = tip_amount * 0.4;

        if (sale.waiter_id) {
          await trx('tip_distribution').insert({
            sale_tip_id: saleTipId,
            user_id: sale.waiter_id,
            amount: waiterAmount,
            percentage: 60,
            role: 'waiter',
            created_at: new Date()
          });
        }

        // Get kitchen staff (users with role 'kitchen')
        const kitchenStaff = await trx('users').where('role', 'kitchen').where('is_active', 1);
        if (kitchenStaff.length > 0) {
          const amountPerKitchen = kitchenAmount / kitchenStaff.length;
          const percentagePerKitchen = 40 / kitchenStaff.length;

          for (const staff of kitchenStaff) {
            await trx('tip_distribution').insert({
              sale_tip_id: saleTipId,
              user_id: staff.id,
              amount: amountPerKitchen,
              percentage: percentagePerKitchen,
              role: 'kitchen',
              created_at: new Date()
            });
          }
        }
      }
      // For 'pool' and 'custom', distribution can be handled separately
    });

    logger.info(`Tip added to sale ${sale_id}: $${tip_amount}`);

    res.status(201).json({
      success: true,
      message: 'Propina agregada exitosamente',
      data: {
        sale_id,
        tip_amount,
        distribution_method
      }
    });
  } catch (error) {
    logger.error('Error adding tip to sale:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar propina'
    });
  }
};

/**
 * Get tip for a sale
 */
export const getSaleTip = async (req, res) => {
  try {
    const { sale_id } = req.params;

    const tip = await dbService.findOne('sale_tips', { sale_id });

    if (!tip) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró propina para esta venta'
      });
    }

    // Get distribution
    const distribution = await dbService.findMany('tip_distribution', {
      sale_tip_id: tip.id
    });

    // Enrich distribution with user names
    for (const dist of distribution) {
      const user = await dbService.findOne('users', { id: dist.user_id });
      dist.user_name = user?.username || 'Unknown';
    }

    res.json({
      success: true,
      data: {
        ...tip,
        distribution
      }
    });
  } catch (error) {
    logger.error('Error getting sale tip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener propina'
    });
  }
};

/**
 * Get tips report by date range
 */
export const getTipsReport = async (req, res) => {
  try {
    const { start_date, end_date, waiter_id } = req.query;

    let query = 'SELECT * FROM sale_tips WHERE 1=1';
    const params = [];

    if (start_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(end_date);
    }

    if (waiter_id) {
      query += ' AND waiter_id = ?';
      params.push(waiter_id);
    }

    query += ' ORDER BY created_at DESC';

    const tips = await dbService.query(query, params);

    // Calculate summary
    const summary = {
      total_tips: tips.reduce((sum, t) => sum + (t.tip_amount || 0), 0),
      count: tips.length,
      avg_tip: tips.length > 0 ? tips.reduce((sum, t) => sum + (t.tip_amount || 0), 0) / tips.length : 0,
      avg_percentage: tips.filter(t => t.tip_percentage).length > 0
        ? tips.filter(t => t.tip_percentage).reduce((sum, t) => sum + t.tip_percentage, 0) / tips.filter(t => t.tip_percentage).length
        : 0
    };

    res.json({
      success: true,
      data: {
        tips,
        summary
      }
    });
  } catch (error) {
    logger.error('Error getting tips report:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reporte de propinas'
    });
  }
};

/**
 * Get tips distribution summary
 */
export const getTipsDistributionSummary = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = `
      SELECT
        td.user_id,
        u.username,
        u.role,
        COUNT(DISTINCT td.sale_tip_id) as num_tips,
        SUM(td.amount) as total_amount,
        AVG(td.amount) as avg_amount
      FROM tip_distribution td
      JOIN users u ON td.user_id = u.id
      JOIN sale_tips st ON td.sale_tip_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (start_date) {
      query += ' AND DATE(st.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(st.created_at) <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY td.user_id ORDER BY total_amount DESC';

    const distribution = await dbService.query(query, params);

    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    logger.error('Error getting distribution summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de distribución'
    });
  }
};

/**
 * Calculate tip amount based on method
 */
export const calculateTip = async (req, res) => {
  try {
    const {
      sale_total,
      percentage = null,
      fixed_amount = null,
      preset_id = null
    } = req.body;

    if (!sale_total) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere sale_total'
      });
    }

    let tipAmount = 0;
    let tipPercentage = null;
    let method = 'custom';

    // Get settings to check if we calculate before or after tax
    const settings = await dbService.query('SELECT * FROM tip_settings ORDER BY id DESC LIMIT 1');
    const applyBeforeTax = settings && settings[0] ? settings[0].apply_before_tax : false;

    // For simplicity, assuming sale_total already includes tax
    // In production, you'd pass subtotal separately if needed
    const calculationBase = sale_total;

    if (preset_id) {
      const preset = await dbService.findOne('tip_presets', { id: preset_id });
      if (preset) {
        if (preset.is_percentage) {
          tipAmount = (calculationBase * preset.percentage) / 100;
          tipPercentage = preset.percentage;
          method = 'percentage';
        } else {
          tipAmount = preset.fixed_amount;
          method = 'fixed';
        }
      }
    } else if (percentage !== null) {
      tipAmount = (calculationBase * percentage) / 100;
      tipPercentage = percentage;
      method = 'percentage';
    } else if (fixed_amount !== null) {
      tipAmount = fixed_amount;
      method = 'fixed';
    }

    res.json({
      success: true,
      data: {
        tip_amount: Math.round(tipAmount),
        tip_percentage: tipPercentage,
        tip_method: method,
        calculation_base: calculationBase
      }
    });
  } catch (error) {
    logger.error('Error calculating tip:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular propina'
    });
  }
};
