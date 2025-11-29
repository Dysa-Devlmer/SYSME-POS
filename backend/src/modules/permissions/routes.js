/**
 * Permissions Routes - RBAC Management
 */

import express from 'express';
import {
  getRoles,
  getPermissions,
  getRolePermissions,
  updateRolePermissions,
  getUserRolesAndPermissions,
  assignRoleToUser,
  removeRoleFromUser,
  grantPermissionToUser,
  getPermissionAuditLog
} from './controller.js';
import { requirePermission } from '../../middleware/permissions.js';

const router = express.Router();

// Roles routes
router.get('/roles', requirePermission('users.read'), getRoles);
router.get('/roles/:role_id/permissions', requirePermission('users.manage_roles'), getRolePermissions);
router.put('/roles/:role_id/permissions', requirePermission('users.manage_roles'), updateRolePermissions);

// Permissions routes
router.get('/permissions', requirePermission('users.read'), getPermissions);

// User roles and permissions
router.get('/users/:user_id/roles-permissions', requirePermission('users.read'), getUserRolesAndPermissions);
router.post('/users/assign-role', requirePermission('users.manage_roles'), assignRoleToUser);
router.post('/users/remove-role', requirePermission('users.manage_roles'), removeRoleFromUser);
router.post('/users/grant-permission', requirePermission('users.manage_roles'), grantPermissionToUser);

// Audit log
router.get('/audit-log', requirePermission('users.manage_roles'), getPermissionAuditLog);

export default router;
