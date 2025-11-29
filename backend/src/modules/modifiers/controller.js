/**
 * Modifiers Controller - Product Customization System
 * Manages modifier groups, modifiers, and product associations
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// ============================================
// MODIFIER GROUPS CRUD
// ============================================

/**
 * Get all modifier groups
 */
export const getAllModifierGroups = async (req, res) => {
  try {
    const { active_only } = req.query;

    let conditions = {};
    if (active_only === 'true') {
      conditions.is_active = 1;
    }

    const groups = await dbService.findMany('modifier_groups', conditions, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    // Get modifiers count for each group
    for (const group of groups) {
      const modifiers = await dbService.findMany('modifiers', {
        group_id: group.id,
        is_active: 1
      });
      group.modifiers_count = modifiers.length;
    }

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    logger.error('Error getting modifier groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener grupos de modificadores'
    });
  }
};

/**
 * Get a single modifier group with its modifiers
 */
export const getModifierGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await dbService.findOne('modifier_groups', { id });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de modificadores no encontrado'
      });
    }

    // Get all modifiers in this group
    const modifiers = await dbService.findMany('modifiers', {
      group_id: id
    }, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    group.modifiers = modifiers;

    res.json({
      success: true,
      data: group
    });
  } catch (error) {
    logger.error('Error getting modifier group:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener grupo de modificadores'
    });
  }
};

/**
 * Create a new modifier group
 */
export const createModifierGroup = async (req, res) => {
  try {
    const {
      name,
      description,
      type = 'optional',
      min_selections = 0,
      max_selections = 1,
      display_order = 0
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre es requerido'
      });
    }

    if (!['required', 'optional'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo debe ser "required" u "optional"'
      });
    }

    if (max_selections > 0 && max_selections < min_selections) {
      return res.status(400).json({
        success: false,
        message: 'El máximo de selecciones debe ser mayor o igual al mínimo'
      });
    }

    const group = await dbService.create('modifier_groups', {
      name,
      description,
      type,
      min_selections,
      max_selections,
      display_order,
      is_active: 1
    });

    logger.info(`Modifier group created: ${group.id} - ${name}`);

    res.status(201).json({
      success: true,
      data: group,
      message: 'Grupo de modificadores creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating modifier group:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear grupo de modificadores'
    });
  }
};

/**
 * Update a modifier group
 */
export const updateModifierGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if exists
    const existing = await dbService.findOne('modifier_groups', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de modificadores no encontrado'
      });
    }

    // Validate type if provided
    if (updates.type && !['required', 'optional'].includes(updates.type)) {
      return res.status(400).json({
        success: false,
        message: 'El tipo debe ser "required" u "optional"'
      });
    }

    // Validate selections
    const minSel = updates.min_selections ?? existing.min_selections;
    const maxSel = updates.max_selections ?? existing.max_selections;
    if (maxSel > 0 && maxSel < minSel) {
      return res.status(400).json({
        success: false,
        message: 'El máximo de selecciones debe ser mayor o igual al mínimo'
      });
    }

    const updated = await dbService.update('modifier_groups', { id }, updates);

    logger.info(`Modifier group updated: ${id}`);

    res.json({
      success: true,
      data: updated,
      message: 'Grupo actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating modifier group:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar grupo de modificadores'
    });
  }
};

/**
 * Delete (soft) a modifier group
 */
export const deleteModifierGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbService.findOne('modifier_groups', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de modificadores no encontrado'
      });
    }

    // Soft delete
    await dbService.update('modifier_groups', { id }, { is_active: 0 });

    // Also deactivate all modifiers in this group
    await dbService.query(
      'UPDATE modifiers SET is_active = 0 WHERE group_id = ?',
      [id]
    );

    logger.info(`Modifier group deactivated: ${id}`);

    res.json({
      success: true,
      message: 'Grupo desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting modifier group:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar grupo de modificadores'
    });
  }
};

// ============================================
// MODIFIERS CRUD
// ============================================

/**
 * Get all modifiers (optionally filtered by group)
 */
export const getAllModifiers = async (req, res) => {
  try {
    const { group_id, active_only } = req.query;

    let conditions = {};
    if (group_id) {
      conditions.group_id = group_id;
    }
    if (active_only === 'true') {
      conditions.is_active = 1;
    }

    const modifiers = await dbService.findMany('modifiers', conditions, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    // Include group information
    for (const modifier of modifiers) {
      const group = await dbService.findOne('modifier_groups', {
        id: modifier.group_id
      });
      modifier.group_name = group?.name;
    }

    res.json({
      success: true,
      data: modifiers
    });
  } catch (error) {
    logger.error('Error getting modifiers:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener modificadores'
    });
  }
};

/**
 * Get a single modifier
 */
export const getModifier = async (req, res) => {
  try {
    const { id } = req.params;

    const modifier = await dbService.findOne('modifiers', { id });

    if (!modifier) {
      return res.status(404).json({
        success: false,
        message: 'Modificador no encontrado'
      });
    }

    // Include group information
    const group = await dbService.findOne('modifier_groups', {
      id: modifier.group_id
    });
    modifier.group = group;

    res.json({
      success: true,
      data: modifier
    });
  } catch (error) {
    logger.error('Error getting modifier:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener modificador'
    });
  }
};

/**
 * Create a new modifier
 */
export const createModifier = async (req, res) => {
  try {
    const {
      group_id,
      name,
      code,
      price = 0,
      is_default = false,
      display_order = 0
    } = req.body;

    // Validation
    if (!group_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El grupo y el nombre son requeridos'
      });
    }

    // Verify group exists
    const group = await dbService.findOne('modifier_groups', { id: group_id });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Grupo de modificadores no encontrado'
      });
    }

    const modifier = await dbService.create('modifiers', {
      group_id,
      name,
      code,
      price,
      is_default: is_default ? 1 : 0,
      is_active: 1,
      display_order
    });

    logger.info(`Modifier created: ${modifier.id} - ${name}`);

    res.status(201).json({
      success: true,
      data: modifier,
      message: 'Modificador creado exitosamente'
    });
  } catch (error) {
    logger.error('Error creating modifier:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear modificador'
    });
  }
};

/**
 * Update a modifier
 */
export const updateModifier = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = await dbService.findOne('modifiers', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Modificador no encontrado'
      });
    }

    // If changing group, verify it exists
    if (updates.group_id) {
      const group = await dbService.findOne('modifier_groups', {
        id: updates.group_id
      });
      if (!group) {
        return res.status(404).json({
          success: false,
          message: 'Grupo de modificadores no encontrado'
        });
      }
    }

    const updated = await dbService.update('modifiers', { id }, updates);

    logger.info(`Modifier updated: ${id}`);

    res.json({
      success: true,
      data: updated,
      message: 'Modificador actualizado exitosamente'
    });
  } catch (error) {
    logger.error('Error updating modifier:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar modificador'
    });
  }
};

/**
 * Delete (soft) a modifier
 */
export const deleteModifier = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await dbService.findOne('modifiers', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Modificador no encontrado'
      });
    }

    // Soft delete
    await dbService.update('modifiers', { id }, { is_active: 0 });

    logger.info(`Modifier deactivated: ${id}`);

    res.json({
      success: true,
      message: 'Modificador desactivado exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting modifier:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar modificador'
    });
  }
};

// ============================================
// PRODUCT-MODIFIER ASSOCIATIONS
// ============================================

/**
 * Get modifier groups for a specific product
 */
export const getProductModifierGroups = async (req, res) => {
  try {
    const { product_id } = req.params;

    // Get associations
    const associations = await dbService.findMany('product_modifier_groups', {
      product_id
    }, {
      orderBy: { field: 'display_order', direction: 'asc' }
    });

    // Get full group and modifier data
    const groups = [];
    for (const assoc of associations) {
      const group = await dbService.findOne('modifier_groups', {
        id: assoc.modifier_group_id,
        is_active: 1
      });

      if (group) {
        const modifiers = await dbService.findMany('modifiers', {
          group_id: group.id,
          is_active: 1
        }, {
          orderBy: { field: 'display_order', direction: 'asc' }
        });

        groups.push({
          ...group,
          is_required: assoc.is_required,
          modifiers
        });
      }
    }

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    logger.error('Error getting product modifier groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener modificadores del producto'
    });
  }
};

/**
 * Assign modifier groups to a product
 */
export const assignModifierGroupsToProduct = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { groups } = req.body; // Array of {modifier_group_id, is_required, display_order}

    if (!Array.isArray(groups)) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de grupos'
      });
    }

    // Verify product exists
    const product = await dbService.findOne('products', { id: product_id });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Remove existing associations
    await dbService.query(
      'DELETE FROM product_modifier_groups WHERE product_id = ?',
      [product_id]
    );

    // Create new associations
    const associations = [];
    for (const group of groups) {
      const assoc = await dbService.create('product_modifier_groups', {
        product_id,
        modifier_group_id: group.modifier_group_id,
        is_required: group.is_required ? 1 : 0,
        display_order: group.display_order || 0
      });
      associations.push(assoc);
    }

    logger.info(`Modifier groups assigned to product ${product_id}: ${associations.length} groups`);

    res.json({
      success: true,
      data: associations,
      message: 'Modificadores asignados exitosamente'
    });
  } catch (error) {
    logger.error('Error assigning modifier groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar modificadores al producto'
    });
  }
};

/**
 * Remove a modifier group from a product
 */
export const removeModifierGroupFromProduct = async (req, res) => {
  try {
    const { product_id, group_id } = req.params;

    await dbService.query(
      'DELETE FROM product_modifier_groups WHERE product_id = ? AND modifier_group_id = ?',
      [product_id, group_id]
    );

    logger.info(`Modifier group ${group_id} removed from product ${product_id}`);

    res.json({
      success: true,
      message: 'Grupo de modificadores removido del producto'
    });
  } catch (error) {
    logger.error('Error removing modifier group from product:', error);
    res.status(500).json({
      success: false,
      message: 'Error al remover modificadores del producto'
    });
  }
};
