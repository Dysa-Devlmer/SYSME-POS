/**
 * Pruebas Unitarias - RBAC Service
 * @jest-environment node
 */

const rbacService = require('../../src/services/rbac-service');

describe('RBAC Service', () => {
  const testUserId = 9999;

  afterEach(() => {
    // Limpiar roles de usuario de prueba
    if (rbacService.userRoles.has(testUserId)) {
      rbacService.userRoles.delete(testUserId);
    }
    rbacService.invalidateCacheForUser(testUserId);
  });

  describe('Initialization', () => {
    test('should have predefined roles', () => {
      const roles = rbacService.listRoles();
      expect(roles.length).toBeGreaterThanOrEqual(8);
    });

    test('should have predefined permissions', () => {
      const permissions = rbacService.listPermissions();
      expect(permissions.length).toBeGreaterThanOrEqual(30);
    });

    test('should have super_admin role', () => {
      const role = rbacService.getRole('super_admin');
      expect(role).toBeDefined();
      expect(role.name).toBe('Super Administrador');
    });
  });

  describe('Role Management', () => {
    test('should assign role to user', () => {
      rbacService.assignRole(testUserId, 'manager');
      const roles = rbacService.getUserRoles(testUserId);

      expect(roles.length).toBe(1);
      expect(roles[0].id).toBe('manager');
    });

    test('should assign multiple roles to user', () => {
      rbacService.assignRole(testUserId, 'manager');
      rbacService.assignRole(testUserId, 'cashier');

      const roles = rbacService.getUserRoles(testUserId);
      expect(roles.length).toBe(2);
    });

    test('should remove role from user', () => {
      rbacService.assignRole(testUserId, 'manager');
      const removed = rbacService.removeRole(testUserId, 'manager');

      expect(removed).toBe(true);
      expect(rbacService.getUserRoles(testUserId).length).toBe(0);
    });

    test('should return false when removing non-existent role', () => {
      const removed = rbacService.removeRole(testUserId, 'non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('Permission Checking', () => {
    test('super_admin should have all permissions', () => {
      rbacService.assignRole(testUserId, 'super_admin');

      const canDoAnything = rbacService.can(testUserId, 'anything', 'everything');
      expect(canDoAnything).toBe(true);
    });

    test('manager should create orders', () => {
      rbacService.assignRole(testUserId, 'manager');

      const canCreate = rbacService.can(testUserId, 'orders', 'create');
      expect(canCreate).toBe(true);
    });

    test('cashier should process payments', () => {
      rbacService.assignRole(testUserId, 'cashier');

      const canProcess = rbacService.can(testUserId, 'payments', 'process');
      expect(canProcess).toBe(true);
    });

    test('waiter should NOT delete products', () => {
      rbacService.assignRole(testUserId, 'waiter');

      const canDelete = rbacService.can(testUserId, 'products', 'delete');
      expect(canDelete).toBe(false);
    });

    test('viewer should only read', () => {
      rbacService.assignRole(testUserId, 'viewer');

      const canRead = rbacService.can(testUserId, 'products', 'read');
      const canCreate = rbacService.can(testUserId, 'products', 'create');

      expect(canRead).toBe(true);
      expect(canCreate).toBe(false);
    });
  });

  describe('Wildcard Permissions', () => {
    test('should support resource wildcard', () => {
      rbacService.assignRole(testUserId, 'admin');

      const canCreateProduct = rbacService.can(testUserId, 'products', 'create');
      const canDeleteProduct = rbacService.can(testUserId, 'products', 'delete');

      expect(canCreateProduct).toBe(true);
      expect(canDeleteProduct).toBe(true);
    });

    test('should support action wildcard', () => {
      rbacService.assignRole(testUserId, 'inventory_manager');

      const canCreate = rbacService.can(testUserId, 'inventory', 'create');
      const canUpdate = rbacService.can(testUserId, 'inventory', 'update');
      const canDelete = rbacService.can(testUserId, 'inventory', 'delete');

      expect(canCreate).toBe(true);
      expect(canUpdate).toBe(true);
      expect(canDelete).toBe(true);
    });
  });

  describe('Multiple Permissions', () => {
    test('canAll should check all permissions (AND)', () => {
      rbacService.assignRole(testUserId, 'manager');

      const canAll = rbacService.canAll(testUserId, [
        { resource: 'orders', action: 'create' },
        { resource: 'orders', action: 'update' },
        { resource: 'orders', action: 'read' }
      ]);

      expect(canAll).toBe(true);
    });

    test('canAny should check any permission (OR)', () => {
      rbacService.assignRole(testUserId, 'waiter');

      const canAny = rbacService.canAny(testUserId, [
        { resource: 'orders', action: 'create' },
        { resource: 'products', action: 'delete' },
        { resource: 'users', action: 'create' }
      ]);

      expect(canAny).toBe(true); // Puede crear orders
    });
  });

  describe('Role Details', () => {
    test('should get role with permissions', () => {
      const role = rbacService.getRole('manager');

      expect(role).toBeDefined();
      expect(role.name).toBe('Gerente');
      expect(Array.isArray(role.permissions)).toBe(true);
      expect(role.permissions.length).toBeGreaterThan(0);
    });

    test('should return null for non-existent role', () => {
      const role = rbacService.getRole('non-existent');
      expect(role).toBeNull();
    });
  });

  describe('Permission Management', () => {
    test('should add permission to role', () => {
      const added = rbacService.addPermissionToRole('cashier', 'reports', 'export');
      expect(added).toBe(true);

      // Verificar que se agregó
      rbacService.assignRole(testUserId, 'cashier');
      const canExport = rbacService.can(testUserId, 'reports', 'export');
      expect(canExport).toBe(true);

      // Limpiar
      rbacService.removePermissionFromRole('cashier', 'reports', 'export');
    });

    test('should remove permission from role', () => {
      rbacService.addPermissionToRole('waiter', 'test', 'action');
      const removed = rbacService.removePermissionFromRole('waiter', 'test', 'action');

      expect(removed).toBe(true);
    });
  });

  describe('Statistics', () => {
    test('should return statistics', () => {
      const stats = rbacService.getStats();

      expect(stats).toBeDefined();
      expect(stats.roles).toBeGreaterThan(0);
      expect(stats.permissions).toBeGreaterThan(0);
      expect(typeof stats.users).toBe('number');
    });
  });

  describe('Middleware', () => {
    test('should create middleware function', () => {
      const middleware = rbacService.middleware('products', 'create');

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    test('should create middlewareAny function', () => {
      const middleware = rbacService.middlewareAny('products:create', 'orders:create');

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3);
    });
  });

  describe('Cache', () => {
    test('should cache user permissions', () => {
      rbacService.assignRole(testUserId, 'manager');

      // Primera llamada - sin cache
      const perms1 = rbacService.getUserPermissions(testUserId);

      // Segunda llamada - con cache
      const perms2 = rbacService.getUserPermissions(testUserId);

      expect(perms1).toEqual(perms2);
      expect(perms1.length).toBeGreaterThan(0);
    });

    test('should invalidate cache when role changes', () => {
      rbacService.assignRole(testUserId, 'waiter');
      const perms1 = rbacService.getUserPermissions(testUserId);

      rbacService.assignRole(testUserId, 'manager');
      const perms2 = rbacService.getUserPermissions(testUserId);

      expect(perms2.length).toBeGreaterThan(perms1.length);
    });
  });
});
