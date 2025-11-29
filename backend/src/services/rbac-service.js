/**
 * Sistema RBAC (Role-Based Access Control) Avanzado
 * Control de acceso basado en roles con permisos granulares
 *
 * @module RBACService
 * @version 2.1.0
 */

const EventEmitter = require('events');

/**
 * Servicio de control de acceso basado en roles
 */
class RBACService extends EventEmitter {
  constructor() {
    super();

    this.roles = new Map();
    this.permissions = new Map();
    this.userRoles = new Map(); // userId -> Set of roles
    this.roleHierarchy = new Map(); // role -> parent roles
    this.permissionCache = new Map(); // Cache de permisos resueltos

    this.config = {
      cacheEnabled: true,
      cacheTTL: 300000, // 5 minutos
      auditEnabled: true,
      strictMode: false // Si true, deniega acceso ante cualquier duda
    };

    // Inicializar roles y permisos por defecto
    this.initializeDefaults();
  }

  /**
   * Inicializa roles y permisos por defecto
   */
  initializeDefaults() {
    // Definir permisos base
    const basePermissions = [
      // Usuarios
      { resource: 'users', action: 'create', description: 'Crear usuarios' },
      { resource: 'users', action: 'read', description: 'Ver usuarios' },
      { resource: 'users', action: 'update', description: 'Actualizar usuarios' },
      { resource: 'users', action: 'delete', description: 'Eliminar usuarios' },

      // Productos
      { resource: 'products', action: 'create', description: 'Crear productos' },
      { resource: 'products', action: 'read', description: 'Ver productos' },
      { resource: 'products', action: 'update', description: 'Actualizar productos' },
      { resource: 'products', action: 'delete', description: 'Eliminar productos' },

      // Órdenes
      { resource: 'orders', action: 'create', description: 'Crear órdenes' },
      { resource: 'orders', action: 'read', description: 'Ver órdenes' },
      { resource: 'orders', action: 'update', description: 'Actualizar órdenes' },
      { resource: 'orders', action: 'delete', description: 'Eliminar órdenes' },
      { resource: 'orders', action: 'cancel', description: 'Cancelar órdenes' },

      // Inventario
      { resource: 'inventory', action: 'create', description: 'Agregar inventario' },
      { resource: 'inventory', action: 'read', description: 'Ver inventario' },
      { resource: 'inventory', action: 'update', description: 'Actualizar inventario' },
      { resource: 'inventory', action: 'delete', description: 'Eliminar inventario' },
      { resource: 'inventory', action: 'adjust', description: 'Ajustar inventario' },

      // Reportes
      { resource: 'reports', action: 'read', description: 'Ver reportes' },
      { resource: 'reports', action: 'export', description: 'Exportar reportes' },

      // Configuración
      { resource: 'settings', action: 'read', description: 'Ver configuración' },
      { resource: 'settings', action: 'update', description: 'Actualizar configuración' },

      // Caja
      { resource: 'cash', action: 'open', description: 'Abrir caja' },
      { resource: 'cash', action: 'close', description: 'Cerrar caja' },
      { resource: 'cash', action: 'view', description: 'Ver movimientos de caja' },

      // Pagos
      { resource: 'payments', action: 'process', description: 'Procesar pagos' },
      { resource: 'payments', action: 'refund', description: 'Reembolsar pagos' },

      // Analytics
      { resource: 'analytics', action: 'read', description: 'Ver analytics' },
      { resource: 'analytics', action: 'export', description: 'Exportar analytics' }
    ];

    // Registrar permisos
    basePermissions.forEach(perm => {
      this.definePermission(perm.resource, perm.action, perm.description);
    });

    // Definir roles base
    this.defineRole('super_admin', {
      name: 'Super Administrador',
      description: 'Acceso total al sistema',
      permissions: ['*:*'] // Wildcard para todos los permisos
    });

    this.defineRole('admin', {
      name: 'Administrador',
      description: 'Gestión completa del restaurante',
      permissions: [
        'users:*',
        'products:*',
        'orders:*',
        'inventory:*',
        'reports:*',
        'settings:read',
        'cash:*',
        'payments:*',
        'analytics:*'
      ]
    });

    this.defineRole('manager', {
      name: 'Gerente',
      description: 'Gestión operativa del restaurante',
      permissions: [
        'users:read',
        'products:read',
        'products:update',
        'orders:*',
        'inventory:read',
        'inventory:update',
        'inventory:adjust',
        'reports:read',
        'reports:export',
        'cash:*',
        'payments:process',
        'analytics:read'
      ]
    });

    this.defineRole('cashier', {
      name: 'Cajero',
      description: 'Manejo de caja y pagos',
      permissions: [
        'orders:create',
        'orders:read',
        'products:read',
        'cash:open',
        'cash:close',
        'cash:view',
        'payments:process'
      ]
    });

    this.defineRole('waiter', {
      name: 'Mesero',
      description: 'Toma de órdenes',
      permissions: [
        'orders:create',
        'orders:read',
        'orders:update',
        'products:read'
      ]
    });

    this.defineRole('kitchen', {
      name: 'Cocina',
      description: 'Personal de cocina',
      permissions: [
        'orders:read',
        'orders:update',
        'products:read',
        'inventory:read'
      ]
    });

    this.defineRole('inventory_manager', {
      name: 'Encargado de Inventario',
      description: 'Gestión de inventario',
      permissions: [
        'inventory:*',
        'products:read',
        'products:update',
        'reports:read'
      ]
    });

    this.defineRole('viewer', {
      name: 'Visualizador',
      description: 'Solo lectura',
      permissions: [
        'products:read',
        'orders:read',
        'inventory:read',
        'reports:read',
        'analytics:read'
      ]
    });

    console.log('✅ Roles y permisos por defecto inicializados');
  }

  /**
   * Define un permiso
   */
  definePermission(resource, action, description = '') {
    const permissionKey = `${resource}:${action}`;

    if (this.permissions.has(permissionKey)) {
      console.warn(`⚠️  Permiso ya existe: ${permissionKey}`);
      return false;
    }

    this.permissions.set(permissionKey, {
      resource,
      action,
      description,
      createdAt: Date.now()
    });

    return true;
  }

  /**
   * Define un rol
   */
  defineRole(roleId, options) {
    const {
      name,
      description = '',
      permissions = [],
      parentRoles = [],
      metadata = {}
    } = options;

    if (this.roles.has(roleId)) {
      console.warn(`⚠️  Rol ya existe: ${roleId}`);
      return false;
    }

    const role = {
      id: roleId,
      name,
      description,
      permissions: new Set(permissions),
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.roles.set(roleId, role);

    // Configurar jerarquía
    if (parentRoles.length > 0) {
      this.roleHierarchy.set(roleId, new Set(parentRoles));
    }

    // Invalidar cache
    this.invalidateCache();

    console.log(`✅ Rol definido: ${roleId} (${name})`);
    this.emit('role:created', role);

    return true;
  }

  /**
   * Asigna un rol a un usuario
   */
  assignRole(userId, roleId) {
    if (!this.roles.has(roleId)) {
      throw new Error(`Rol no encontrado: ${roleId}`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    const userRoleSet = this.userRoles.get(userId);
    userRoleSet.add(roleId);

    // Invalidar cache para este usuario
    this.invalidateCacheForUser(userId);

    console.log(`✅ Rol asignado: ${roleId} -> usuario ${userId}`);
    this.emit('role:assigned', { userId, roleId });

    return true;
  }

  /**
   * Remueve un rol de un usuario
   */
  removeRole(userId, roleId) {
    if (!this.userRoles.has(userId)) {
      return false;
    }

    const userRoleSet = this.userRoles.get(userId);
    const removed = userRoleSet.delete(roleId);

    if (removed) {
      // Invalidar cache
      this.invalidateCacheForUser(userId);

      console.log(`❌ Rol removido: ${roleId} -> usuario ${userId}`);
      this.emit('role:removed', { userId, roleId });
    }

    return removed;
  }

  /**
   * Obtiene roles de un usuario
   */
  getUserRoles(userId) {
    const roles = this.userRoles.get(userId);
    if (!roles) return [];

    return Array.from(roles).map(roleId => this.roles.get(roleId));
  }

  /**
   * Obtiene todos los permisos de un usuario (incluyendo herencia)
   */
  getUserPermissions(userId) {
    const cacheKey = `user:${userId}:permissions`;

    // Verificar cache
    if (this.config.cacheEnabled) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.permissions;
      }
    }

    const userRoleSet = this.userRoles.get(userId);
    if (!userRoleSet || userRoleSet.size === 0) {
      return [];
    }

    const allPermissions = new Set();

    // Resolver permisos de cada rol (incluyendo herencia)
    for (const roleId of userRoleSet) {
      const rolePermissions = this.resolveRolePermissions(roleId);
      rolePermissions.forEach(perm => allPermissions.add(perm));
    }

    const permissionsArray = Array.from(allPermissions);

    // Guardar en cache
    if (this.config.cacheEnabled) {
      this.permissionCache.set(cacheKey, {
        permissions: permissionsArray,
        timestamp: Date.now()
      });
    }

    return permissionsArray;
  }

  /**
   * Resuelve permisos de un rol incluyendo herencia
   */
  resolveRolePermissions(roleId, visited = new Set()) {
    // Prevenir ciclos
    if (visited.has(roleId)) {
      return new Set();
    }
    visited.add(roleId);

    const role = this.roles.get(roleId);
    if (!role) {
      return new Set();
    }

    const permissions = new Set(role.permissions);

    // Agregar permisos de roles padres
    const parentRoles = this.roleHierarchy.get(roleId);
    if (parentRoles) {
      for (const parentRoleId of parentRoles) {
        const parentPermissions = this.resolveRolePermissions(parentRoleId, visited);
        parentPermissions.forEach(perm => permissions.add(perm));
      }
    }

    return permissions;
  }

  /**
   * Verifica si un usuario tiene un permiso específico
   */
  can(userId, resource, action) {
    const permissions = this.getUserPermissions(userId);

    // Verificar wildcard de super admin
    if (permissions.includes('*:*')) {
      return true;
    }

    // Verificar permiso específico
    const specificPermission = `${resource}:${action}`;
    if (permissions.includes(specificPermission)) {
      return true;
    }

    // Verificar wildcards de resource
    const resourceWildcard = `${resource}:*`;
    if (permissions.includes(resourceWildcard)) {
      return true;
    }

    // Verificar wildcards de action
    const actionWildcard = `*:${action}`;
    if (permissions.includes(actionWildcard)) {
      return true;
    }

    // Log si auditoría está habilitada
    if (this.config.auditEnabled) {
      this.emit('access:denied', { userId, resource, action });
    }

    return this.config.strictMode ? false : false;
  }

  /**
   * Verifica múltiples permisos (AND)
   */
  canAll(userId, permissions) {
    return permissions.every(({ resource, action }) =>
      this.can(userId, resource, action)
    );
  }

  /**
   * Verifica múltiples permisos (OR)
   */
  canAny(userId, permissions) {
    return permissions.some(({ resource, action }) =>
      this.can(userId, resource, action)
    );
  }

  /**
   * Middleware para Express
   */
  middleware(resource, action) {
    return (req, res, next) => {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'No autenticado',
          code: 'UNAUTHENTICATED'
        });
      }

      const hasPermission = this.can(userId, resource, action);

      if (!hasPermission) {
        // Log de acceso denegado
        if (this.config.auditEnabled) {
          console.warn(`🚫 Acceso denegado: usuario ${userId} -> ${resource}:${action}`);
        }

        return res.status(403).json({
          error: 'Acceso denegado',
          code: 'FORBIDDEN',
          required: `${resource}:${action}`
        });
      }

      // Log de acceso permitido
      if (this.config.auditEnabled) {
        this.emit('access:granted', { userId, resource, action, ip: req.ip });
      }

      next();
    };
  }

  /**
   * Middleware flexible que acepta múltiples permisos
   */
  middlewareAny(...permissions) {
    return (req, res, next) => {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          error: 'No autenticado',
          code: 'UNAUTHENTICATED'
        });
      }

      const hasAnyPermission = this.canAny(
        userId,
        permissions.map(p => {
          const [resource, action] = p.split(':');
          return { resource, action };
        })
      );

      if (!hasAnyPermission) {
        return res.status(403).json({
          error: 'Acceso denegado',
          code: 'FORBIDDEN',
          required: permissions
        });
      }

      next();
    };
  }

  /**
   * Agrega permiso a un rol
   */
  addPermissionToRole(roleId, resource, action) {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Rol no encontrado: ${roleId}`);
    }

    const permission = `${resource}:${action}`;
    role.permissions.add(permission);
    role.updatedAt = Date.now();

    // Invalidar cache
    this.invalidateCache();

    console.log(`✅ Permiso agregado: ${permission} -> ${roleId}`);
    this.emit('permission:added', { roleId, permission });

    return true;
  }

  /**
   * Remueve permiso de un rol
   */
  removePermissionFromRole(roleId, resource, action) {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error(`Rol no encontrado: ${roleId}`);
    }

    const permission = `${resource}:${action}`;
    const removed = role.permissions.delete(permission);

    if (removed) {
      role.updatedAt = Date.now();

      // Invalidar cache
      this.invalidateCache();

      console.log(`❌ Permiso removido: ${permission} -> ${roleId}`);
      this.emit('permission:removed', { roleId, permission });
    }

    return removed;
  }

  /**
   * Establece jerarquía de roles
   */
  setRoleHierarchy(childRoleId, parentRoleIds) {
    if (!this.roles.has(childRoleId)) {
      throw new Error(`Rol hijo no encontrado: ${childRoleId}`);
    }

    for (const parentRoleId of parentRoleIds) {
      if (!this.roles.has(parentRoleId)) {
        throw new Error(`Rol padre no encontrado: ${parentRoleId}`);
      }
    }

    this.roleHierarchy.set(childRoleId, new Set(parentRoleIds));

    // Invalidar cache
    this.invalidateCache();

    console.log(`✅ Jerarquía establecida: ${childRoleId} <- ${parentRoleIds.join(', ')}`);

    return true;
  }

  /**
   * Invalida todo el cache de permisos
   */
  invalidateCache() {
    this.permissionCache.clear();
  }

  /**
   * Invalida cache de un usuario específico
   */
  invalidateCacheForUser(userId) {
    const cacheKey = `user:${userId}:permissions`;
    this.permissionCache.delete(cacheKey);
  }

  /**
   * Obtiene información de un rol
   */
  getRole(roleId) {
    const role = this.roles.get(roleId);
    if (!role) return null;

    return {
      ...role,
      permissions: Array.from(role.permissions),
      parentRoles: this.roleHierarchy.has(roleId)
        ? Array.from(this.roleHierarchy.get(roleId))
        : []
    };
  }

  /**
   * Lista todos los roles
   */
  listRoles() {
    return Array.from(this.roles.values()).map(role => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissionCount: role.permissions.size
    }));
  }

  /**
   * Lista todos los permisos
   */
  listPermissions() {
    return Array.from(this.permissions.values());
  }

  /**
   * Obtiene estadísticas del sistema RBAC
   */
  getStats() {
    return {
      roles: this.roles.size,
      permissions: this.permissions.size,
      users: this.userRoles.size,
      cacheSize: this.permissionCache.size,
      hierarchies: this.roleHierarchy.size
    };
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    this.permissionCache.clear();
    console.log('✅ Servicio RBAC limpiado');
  }
}

// Singleton
const rbacService = new RBACService();

module.exports = rbacService;
