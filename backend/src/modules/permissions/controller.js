/**
 * Permissions Controller - RBAC Management
 * Handles roles, permissions, and assignments
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { getUserPermissions } from '../../middleware/permissions.js';

/**
 * Get all roles
 */
export const getRoles = async (req, res) => {
  try {
    const roles = await dbService.findMany('roles', { is_active: 1 });
    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    logger.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles'
    });
  }
};

/**
 * Get all permissions grouped by module
 */
export const getPermissions = async (req, res) => {
  try {
    const permissions = await dbService.query(
      'SELECT * FROM permissions ORDER BY module, action'
    );

    // Group by module
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        all: permissions,
        grouped
      }
    });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener permisos'
    });
  }
};

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = async (req, res) => {
  try {
    const { role_id } = req.params;

    const permissions = await dbService.query(
      `SELECT p.*
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = ?
       ORDER BY p.module, p.action`,
      [role_id]
    );

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    logger.error('Error fetching role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener permisos del rol'
    });
  }
};

/**
 * Update role permissions
 */
export const updateRolePermissions = async (req, res) => {
  try {
    const { role_id } = req.params;
    const { permission_ids } = req.body;
    const userId = req.user.id;

    // Check if role is system role
    const role = await dbService.findById('roles', role_id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    if (role.is_system) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden modificar permisos de roles del sistema'
      });
    }

    await dbService.transaction(async () => {
      // Delete existing permissions
      await dbService.query(
        'DELETE FROM role_permissions WHERE role_id = ?',
        [role_id]
      );

      // Insert new permissions
      for (const permId of permission_ids) {
        await dbService.create('role_permissions', {
          role_id,
          permission_id: permId,
          granted_by: userId,
          granted_at: new Date()
        });
      }
    });

    logger.info(`Role ${role_id} permissions updated by user ${userId}`);

    res.json({
      success: true,
      message: 'Permisos del rol actualizados exitosamente'
    });
  } catch (error) {
    logger.error('Error updating role permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar permisos del rol'
    });
  }
};

/**
 * Get user roles and permissions
 */
export const getUserRolesAndPermissions = async (req, res) => {
  try {
    const { user_id } = req.params;

    // Get user roles
    const roles = await dbService.query(
      `SELECT r.*, ur.assigned_at, ur.expires_at
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?
         AND r.is_active = 1
         AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
      [user_id]
    );

    // Get all permissions for user
    const permissions = await getUserPermissions(user_id);

    res.json({
      success: true,
      data: {
        roles,
        permissions
      }
    });
  } catch (error) {
    logger.error('Error fetching user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles del usuario'
    });
  }
};

/**
 * Assign role to user
 */
export const assignRoleToUser = async (req, res) => {
  try {
    const { user_id, role_id, expires_at } = req.body;
    const assignedBy = req.user.id;

    // Check if assignment already exists
    const existing = await dbService.query(
      'SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?',
      [user_id, role_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El usuario ya tiene este rol asignado'
      });
    }

    await dbService.create('user_roles', {
      user_id,
      role_id,
      assigned_by: assignedBy,
      assigned_at: new Date(),
      expires_at: expires_at || null
    });

    logger.info(`Role ${role_id} assigned to user ${user_id} by user ${assignedBy}`);

    res.json({
      success: true,
      message: 'Rol asignado exitosamente'
    });
  } catch (error) {
    logger.error('Error assigning role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar rol'
    });
  }
};

/**
 * Remove role from user
 */
export const removeRoleFromUser = async (req, res) => {
  try {
    const { user_id, role_id } = req.body;

    await dbService.query(
      'DELETE FROM user_roles WHERE user_id = ? AND role_id = ?',
      [user_id, role_id]
    );

    logger.info(`Role ${role_id} removed from user ${user_id}`);

    res.json({
      success: true,
      message: 'Rol removido exitosamente'
    });
  } catch (error) {
    logger.error('Error removing role:', error);
    res.status(500).json({
      success: false,
      message: 'Error al remover rol'
    });
  }
};

/**
 * Grant specific permission to user (override)
 */
export const grantPermissionToUser = async (req, res) => {
  try {
    const { user_id, permission_id, is_granted, reason, expires_at } = req.body;
    const grantedBy = req.user.id;

    // Check if already exists
    const existing = await dbService.query(
      'SELECT * FROM user_permissions WHERE user_id = ? AND permission_id = ?',
      [user_id, permission_id]
    );

    if (existing.length > 0) {
      // Update existing
      await dbService.query(
        `UPDATE user_permissions
         SET is_granted = ?, granted_by = ?, granted_at = ?, reason = ?, expires_at = ?
         WHERE user_id = ? AND permission_id = ?`,
        [is_granted ? 1 : 0, grantedBy, new Date(), reason || null, expires_at || null, user_id, permission_id]
      );
    } else {
      // Create new
      await dbService.create('user_permissions', {
        user_id,
        permission_id,
        is_granted: is_granted ? 1 : 0,
        granted_by: grantedBy,
        granted_at: new Date(),
        reason: reason || null,
        expires_at: expires_at || null
      });
    }

    logger.info(`Permission ${permission_id} ${is_granted ? 'granted to' : 'revoked from'} user ${user_id}`);

    res.json({
      success: true,
      message: `Permiso ${is_granted ? 'otorgado' : 'revocado'} exitosamente`
    });
  } catch (error) {
    logger.error('Error granting permission:', error);
    res.status(500).json({
      success: false,
      message: 'Error al modificar permiso'
    });
  }
};

/**
 * Get permission audit log
 */
export const getPermissionAuditLog = async (req, res) => {
  try {
    const { user_id, start_date, end_date, limit = 100 } = req.query;

    let query = 'SELECT * FROM permission_audit_log WHERE 1=1';
    const params = [];

    if (user_id) {
      query += ' AND user_id = ?';
      params.push(user_id);
    }

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const logs = await dbService.query(query, params);

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener log de auditoría'
    });
  }
};
