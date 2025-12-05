/**
 * Permissions Service - API calls for RBAC Permission Management System
 * Manages roles, permissions, and user-specific permission overrides
 */

import { api, ApiResponse } from './client';

// Types
export interface Role {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_system: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  action: string;
  description?: string;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  role_id: number;
  permission_id: number;
  granted_at: string;
}

export interface UserPermission {
  id: number;
  user_id: number;
  permission_id: number;
  grant_type: 'allow' | 'deny';
  granted_by_user_id: number;
  reason?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
  permission_count: number;
}

export interface UserWithPermissions {
  user_id: number;
  username: string;
  email?: string;
  role: Role;
  role_permissions: Permission[];
  user_specific_permissions: Array<{
    permission: Permission;
    grant_type: 'allow' | 'deny';
    reason?: string;
    expires_at?: string;
  }>;
  effective_permissions: Permission[];
}

export interface PermissionCheck {
  has_permission: boolean;
  source: 'role' | 'user_override' | 'none';
  permission: Permission | null;
  reason?: string;
}

export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  resource_type: string;
  resource_id?: number;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
  priority?: number;
  permission_ids?: number[];
}

export interface CreatePermissionRequest {
  code: string;
  name: string;
  module: string;
  action: string;
  description?: string;
}

export interface GrantUserPermissionRequest {
  user_id: number;
  permission_id: number;
  grant_type: 'allow' | 'deny';
  reason?: string;
  expires_at?: string;
}

export interface PermissionModule {
  module: string;
  permissions: Permission[];
  description?: string;
}

// Permissions Service API
export const permissionsService = {
  // Role Management
  /**
   * Get all roles
   */
  getAllRoles: async (include_inactive?: boolean): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/permissions/roles', {
      params: { include_inactive }
    });
    return response.data.data || [];
  },

  /**
   * Get active roles
   */
  getActiveRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/permissions/roles/active');
    return response.data.data || [];
  },

  /**
   * Get role by ID with permissions
   */
  getRoleById: async (id: number): Promise<RoleWithPermissions> => {
    const response = await api.get<ApiResponse<RoleWithPermissions>>(`/permissions/roles/${id}`);
    return response.data.data!;
  },

  /**
   * Get role by code
   */
  getRoleByCode: async (code: string): Promise<RoleWithPermissions> => {
    const response = await api.get<ApiResponse<RoleWithPermissions>>(`/permissions/roles/code/${code}`);
    return response.data.data!;
  },

  /**
   * Create a new role
   */
  createRole: async (data: CreateRoleRequest): Promise<RoleWithPermissions> => {
    const response = await api.post<ApiResponse<RoleWithPermissions>>('/permissions/roles', data);
    return response.data.data!;
  },

  /**
   * Update a role
   */
  updateRole: async (id: number, data: Partial<CreateRoleRequest>): Promise<RoleWithPermissions> => {
    const response = await api.put<ApiResponse<RoleWithPermissions>>(`/permissions/roles/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete a role
   */
  deleteRole: async (id: number): Promise<void> => {
    await api.delete(`/permissions/roles/${id}`);
  },

  /**
   * Toggle role active status
   */
  toggleRoleActive: async (id: number): Promise<Role> => {
    const response = await api.patch<ApiResponse<Role>>(`/permissions/roles/${id}/toggle-active`);
    return response.data.data!;
  },

  // Permission Management
  /**
   * Get all permissions
   */
  getAllPermissions: async (): Promise<Permission[]> => {
    const response = await api.get<ApiResponse<Permission[]>>('/permissions');
    return response.data.data || [];
  },

  /**
   * Get permissions grouped by module
   */
  getPermissionsByModule: async (): Promise<PermissionModule[]> => {
    const response = await api.get<ApiResponse<PermissionModule[]>>('/permissions/by-module');
    return response.data.data || [];
  },

  /**
   * Get permission by ID
   */
  getPermissionById: async (id: number): Promise<Permission> => {
    const response = await api.get<ApiResponse<Permission>>(`/permissions/${id}`);
    return response.data.data!;
  },

  /**
   * Get permission by code
   */
  getPermissionByCode: async (code: string): Promise<Permission> => {
    const response = await api.get<ApiResponse<Permission>>(`/permissions/code/${code}`);
    return response.data.data!;
  },

  /**
   * Create a new permission
   */
  createPermission: async (data: CreatePermissionRequest): Promise<Permission> => {
    const response = await api.post<ApiResponse<Permission>>('/permissions', data);
    return response.data.data!;
  },

  /**
   * Update a permission
   */
  updatePermission: async (id: number, data: Partial<CreatePermissionRequest>): Promise<Permission> => {
    const response = await api.put<ApiResponse<Permission>>(`/permissions/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete a permission
   */
  deletePermission: async (id: number): Promise<void> => {
    await api.delete(`/permissions/${id}`);
  },

  // Role-Permission Assignment
  /**
   * Get permissions for a role
   */
  getRolePermissions: async (role_id: number): Promise<Permission[]> => {
    const response = await api.get<ApiResponse<Permission[]>>(`/permissions/roles/${role_id}/permissions`);
    return response.data.data || [];
  },

  /**
   * Assign permission to role
   */
  assignPermissionToRole: async (role_id: number, permission_id: number): Promise<void> => {
    await api.post(`/permissions/roles/${role_id}/permissions/${permission_id}`);
  },

  /**
   * Remove permission from role
   */
  removePermissionFromRole: async (role_id: number, permission_id: number): Promise<void> => {
    await api.delete(`/permissions/roles/${role_id}/permissions/${permission_id}`);
  },

  /**
   * Bulk assign permissions to role
   */
  bulkAssignPermissions: async (role_id: number, permission_ids: number[]): Promise<void> => {
    await api.post(`/permissions/roles/${role_id}/permissions/bulk`, {
      permission_ids
    });
  },

  /**
   * Replace all role permissions
   */
  replaceRolePermissions: async (role_id: number, permission_ids: number[]): Promise<void> => {
    await api.put(`/permissions/roles/${role_id}/permissions`, {
      permission_ids
    });
  },

  // User-Specific Permissions
  /**
   * Get user permissions (role + overrides)
   */
  getUserPermissions: async (user_id: number): Promise<UserWithPermissions> => {
    const response = await api.get<ApiResponse<UserWithPermissions>>(`/permissions/users/${user_id}`);
    return response.data.data!;
  },

  /**
   * Get user-specific permission overrides
   */
  getUserOverrides: async (user_id: number): Promise<UserPermission[]> => {
    const response = await api.get<ApiResponse<UserPermission[]>>(`/permissions/users/${user_id}/overrides`);
    return response.data.data || [];
  },

  /**
   * Grant user-specific permission
   */
  grantUserPermission: async (data: GrantUserPermissionRequest): Promise<UserPermission> => {
    const response = await api.post<ApiResponse<UserPermission>>('/permissions/users/grant', data);
    return response.data.data!;
  },

  /**
   * Revoke user-specific permission
   */
  revokeUserPermission: async (user_permission_id: number): Promise<void> => {
    await api.delete(`/permissions/users/overrides/${user_permission_id}`);
  },

  /**
   * Revoke all user overrides
   */
  revokeAllUserOverrides: async (user_id: number): Promise<void> => {
    await api.delete(`/permissions/users/${user_id}/overrides`);
  },

  /**
   * Update user permission expiration
   */
  updatePermissionExpiration: async (user_permission_id: number, expires_at: string | null): Promise<UserPermission> => {
    const response = await api.patch<ApiResponse<UserPermission>>(
      `/permissions/users/overrides/${user_permission_id}/expiration`,
      { expires_at }
    );
    return response.data.data!;
  },

  // Permission Checking
  /**
   * Check if user has a specific permission
   */
  checkUserPermission: async (user_id: number, permission_code: string): Promise<PermissionCheck> => {
    const response = await api.get<ApiResponse<PermissionCheck>>('/permissions/check', {
      params: { user_id, permission_code }
    });
    return response.data.data!;
  },

  /**
   * Check multiple permissions at once
   */
  checkMultiplePermissions: async (
    user_id: number,
    permission_codes: string[]
  ): Promise<Record<string, PermissionCheck>> => {
    const response = await api.post<ApiResponse<Record<string, PermissionCheck>>>('/permissions/check/bulk', {
      user_id,
      permission_codes
    });
    return response.data.data || {};
  },

  /**
   * Check current user's permission (uses session)
   */
  checkMyPermission: async (permission_code: string): Promise<PermissionCheck> => {
    const response = await api.get<ApiResponse<PermissionCheck>>('/permissions/check/me', {
      params: { permission_code }
    });
    return response.data.data!;
  },

  // Audit Logs
  /**
   * Get audit logs
   */
  getAuditLogs: async (filters?: {
    user_id?: number;
    action?: string;
    resource_type?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> => {
    const response = await api.get<ApiResponse>('/permissions/audit-logs', {
      params: filters
    });
    return response.data.data || { logs: [], total: 0 };
  },

  /**
   * Get audit logs for a specific user
   */
  getUserAuditLogs: async (user_id: number, limit: number = 50): Promise<AuditLog[]> => {
    const response = await api.get<ApiResponse<AuditLog[]>>(`/permissions/audit-logs/user/${user_id}`, {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Log custom audit event
   */
  logAudit: async (action: string, resource_type: string, resource_id?: number, details?: string): Promise<void> => {
    await api.post('/permissions/audit-logs', {
      action,
      resource_type,
      resource_id,
      details
    });
  },

  // Utility Functions
  /**
   * Clone role with permissions
   */
  cloneRole: async (role_id: number, new_name: string, new_code: string): Promise<RoleWithPermissions> => {
    const response = await api.post<ApiResponse<RoleWithPermissions>>(`/permissions/roles/${role_id}/clone`, {
      name: new_name,
      code: new_code
    });
    return response.data.data!;
  },

  /**
   * Get permission statistics
   */
  getStats: async (): Promise<{
    total_roles: number;
    total_permissions: number;
    total_user_overrides: number;
    most_assigned_permissions: Array<{ permission: Permission; count: number }>;
  }> => {
    const response = await api.get<ApiResponse>('/permissions/stats');
    return response.data.data!;
  },

  /**
   * Clean expired user permissions
   */
  cleanExpiredPermissions: async (): Promise<{ removed_count: number }> => {
    const response = await api.post<ApiResponse<{ removed_count: number }>>('/permissions/cleanup/expired');
    return response.data.data!;
  }
};

export default permissionsService;
