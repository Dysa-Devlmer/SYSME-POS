/**
 * Permissions Middleware - RBAC Authorization
 * Checks if user has required permissions to perform actions
 */

import { dbService } from '../config/database.js';
import { logger } from '../config/logger.js';

/**
 * Check if user has a specific permission
 * @param {number} userId - User ID
 * @param {string} permissionName - Permission name (e.g., 'sales.create')
 * @returns {Promise<boolean>}
 */
export async function userHasPermission(userId, permissionName) {
  try {
    // 1. Check user-specific permission overrides (highest priority)
    const userPermission = await dbService.query(
      `SELECT up.is_granted, up.expires_at
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ? AND p.name = ?`,
      [userId, permissionName]
    );

    if (userPermission.length > 0) {
      const perm = userPermission[0];
      // Check if expired
      if (perm.expires_at && new Date(perm.expires_at) < new Date()) {
        return false;
      }
      return perm.is_granted === 1;
    }

    // 2. Check role-based permissions
    const rolePermissions = await dbService.query(
      `SELECT COUNT(*) as has_permission
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?
         AND p.name = ?
         AND r.is_active = 1
         AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
      [userId, permissionName]
    );

    return rolePermissions[0]?.has_permission > 0;
  } catch (error) {
    logger.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all permissions for a user
 * @param {number} userId
 * @returns {Promise<string[]>} Array of permission names
 */
export async function getUserPermissions(userId) {
  try {
    // Get role-based permissions
    const rolePerms = await dbService.query(
      `SELECT DISTINCT p.name
       FROM user_roles ur
       JOIN role_permissions rp ON ur.role_id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?
         AND r.is_active = 1
         AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
      [userId]
    );

    // Get user-specific permissions
    const userPerms = await dbService.query(
      `SELECT p.name, up.is_granted
       FROM user_permissions up
       JOIN permissions p ON up.permission_id = p.id
       WHERE up.user_id = ?
         AND (up.expires_at IS NULL OR up.expires_at > datetime('now'))`,
      [userId]
    );

    // Combine permissions
    const permissions = new Set(rolePerms.map(p => p.name));

    // Apply user-specific overrides
    userPerms.forEach(p => {
      if (p.is_granted === 1) {
        permissions.add(p.name);
      } else {
        permissions.delete(p.name);
      }
    });

    return Array.from(permissions);
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Middleware to check if user has required permission
 * @param {string|string[]} requiredPermission - Permission name or array of permissions (OR logic)
 * @returns {Function} Express middleware
 */
export function requirePermission(requiredPermission) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      const permissions = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      // Check if user has any of the required permissions (OR logic)
      let hasPermission = false;
      for (const perm of permissions) {
        if (await userHasPermission(req.user.id, perm)) {
          hasPermission = true;
          break;
        }
      }

      if (!hasPermission) {
        // Log unauthorized access attempt
        await logPermissionAttempt(
          req.user.id,
          permissions[0],
          'access_denied',
          false,
          req.ip,
          req.get('user-agent')
        );

        return res.status(403).json({
          success: false,
          message: 'No tiene permisos para realizar esta acción',
          required_permission: permissions
        });
      }

      // Log successful access
      await logPermissionAttempt(
        req.user.id,
        permissions[0],
        'access_granted',
        true,
        req.ip,
        req.get('user-agent')
      );

      next();
    } catch (error) {
      logger.error('Error in permission middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar permisos'
      });
    }
  };
}

/**
 * Middleware to check if user has ALL required permissions (AND logic)
 * @param {string[]} requiredPermissions - Array of permission names
 * @returns {Function} Express middleware
 */
export function requireAllPermissions(requiredPermissions) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'No autenticado'
        });
      }

      // Check if user has ALL required permissions
      for (const perm of requiredPermissions) {
        if (!(await userHasPermission(req.user.id, perm))) {
          await logPermissionAttempt(
            req.user.id,
            perm,
            'access_denied',
            false,
            req.ip,
            req.get('user-agent')
          );

          return res.status(403).json({
            success: false,
            message: 'No tiene todos los permisos requeridos',
            required_permissions: requiredPermissions,
            missing_permission: perm
          });
        }
      }

      next();
    } catch (error) {
      logger.error('Error in requireAllPermissions middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar permisos'
      });
    }
  };
}

/**
 * Log permission access attempt
 */
async function logPermissionAttempt(userId, permissionName, action, wasGranted, ipAddress, userAgent) {
  try {
    await dbService.create('permission_audit_log', {
      user_id: userId,
      permission_name: permissionName,
      action_attempted: action,
      was_granted: wasGranted ? 1 : 0,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      created_at: new Date()
    });
  } catch (error) {
    logger.error('Error logging permission attempt:', error);
  }
}

export default {
  userHasPermission,
  getUserPermissions,
  requirePermission,
  requireAllPermissions
};
