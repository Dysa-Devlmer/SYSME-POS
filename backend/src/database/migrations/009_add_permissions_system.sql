-- Migration: Granular Permissions System (RBAC)
-- Date: 2025-01-17
-- Purpose: Complete Role-Based Access Control for employee management

-- Roles table (predefined roles with permissions)
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT 0, -- System roles cannot be deleted
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table (granular permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'sales.create', 'cash.close_session'
    display_name VARCHAR(150) NOT NULL, -- e.g., 'Crear Ventas'
    description TEXT,
    module VARCHAR(50) NOT NULL, -- e.g., 'sales', 'cash', 'inventory', 'users'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete', 'manage'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER, -- User who granted this permission
    UNIQUE(role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- User-Role mapping (many-to-many, users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER, -- User who assigned this role
    expires_at DATETIME, -- Optional expiration for temporary roles
    UNIQUE(user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- User-specific permissions override (for exceptional cases)
CREATE TABLE IF NOT EXISTS user_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    is_granted BOOLEAN DEFAULT 1, -- 1 = grant, 0 = revoke (even if role has it)
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    reason TEXT,
    expires_at DATETIME,
    UNIQUE(user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Permission audit log
CREATE TABLE IF NOT EXISTS permission_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    action_attempted VARCHAR(50) NOT NULL,
    was_granted BOOLEAN NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_log_user_id ON permission_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

-- Insert system roles
INSERT INTO roles (name, display_name, description, is_system, is_active) VALUES
('admin', 'Administrador', 'Control total del sistema', 1, 1),
('manager', 'Gerente', 'Gestión de operaciones y reportes', 1, 1),
('cashier', 'Cajero', 'Operación de caja y ventas', 1, 1),
('waiter', 'Garzón/Mesero', 'Tomar pedidos y gestionar mesas', 1, 1),
('kitchen', 'Cocina', 'Ver y gestionar pedidos de cocina', 1, 1),
('inventory_manager', 'Encargado de Inventario', 'Gestión de productos y stock', 1, 1);

-- Insert granular permissions
-- Sales module
INSERT INTO permissions (name, display_name, description, module, action) VALUES
('sales.create', 'Crear Ventas', 'Crear nuevas ventas y pedidos', 'sales', 'create'),
('sales.read', 'Ver Ventas', 'Ver ventas propias', 'sales', 'read'),
('sales.read_all', 'Ver Todas las Ventas', 'Ver ventas de todos los usuarios', 'sales', 'read_all'),
('sales.update', 'Modificar Ventas', 'Editar ventas existentes', 'sales', 'update'),
('sales.delete', 'Eliminar Ventas', 'Anular o eliminar ventas', 'sales', 'delete'),
('sales.discount', 'Aplicar Descuentos', 'Aplicar descuentos en ventas', 'sales', 'discount'),
('sales.park', 'Aparcar Ventas', 'Guardar ventas para continuar después', 'sales', 'park'),

-- Cash module
('cash.open_session', 'Abrir Caja', 'Abrir sesión de caja', 'cash', 'open_session'),
('cash.close_session', 'Cerrar Caja', 'Cerrar sesión de caja', 'cash', 'close_session'),
('cash.view_balance', 'Ver Balance de Caja', 'Consultar balance actual', 'cash', 'view_balance'),
('cash.add_movement', 'Movimientos de Caja', 'Agregar ingresos/egresos', 'cash', 'add_movement'),
('cash.z_report', 'Reporte Z', 'Generar reporte de cierre', 'cash', 'z_report'),

-- Inventory module
('inventory.view', 'Ver Inventario', 'Consultar stock de productos', 'inventory', 'view'),
('inventory.update', 'Actualizar Inventario', 'Modificar cantidades de stock', 'inventory', 'update'),
('inventory.transfer', 'Traspasos', 'Realizar traspasos entre almacenes', 'inventory', 'transfer'),

-- Products module
('products.create', 'Crear Productos', 'Agregar nuevos productos', 'products', 'create'),
('products.read', 'Ver Productos', 'Consultar catálogo de productos', 'products', 'read'),
('products.update', 'Modificar Productos', 'Editar productos existentes', 'products', 'update'),
('products.delete', 'Eliminar Productos', 'Dar de baja productos', 'products', 'delete'),
('products.manage_prices', 'Gestionar Precios', 'Modificar precios de productos', 'products', 'manage_prices'),

-- Invoices module
('invoices.create', 'Generar Facturas', 'Crear facturas desde ventas', 'invoices', 'create'),
('invoices.read', 'Ver Facturas', 'Consultar facturas emitidas', 'invoices', 'read'),
('invoices.cancel', 'Anular Facturas', 'Anular facturas emitidas', 'invoices', 'cancel'),

-- Kitchen module
('kitchen.view_orders', 'Ver Pedidos Cocina', 'Ver pedidos pendientes', 'kitchen', 'view_orders'),
('kitchen.update_status', 'Actualizar Estado', 'Cambiar estado de pedidos', 'kitchen', 'update_status'),

-- Users module
('users.create', 'Crear Usuarios', 'Dar de alta nuevos usuarios', 'users', 'create'),
('users.read', 'Ver Usuarios', 'Consultar lista de usuarios', 'users', 'read'),
('users.update', 'Modificar Usuarios', 'Editar datos de usuarios', 'users', 'update'),
('users.delete', 'Eliminar Usuarios', 'Dar de baja usuarios', 'users', 'delete'),
('users.manage_roles', 'Gestionar Roles', 'Asignar y quitar roles', 'users', 'manage_roles'),

-- Reports module
('reports.sales', 'Reportes de Ventas', 'Ver reportes de ventas', 'reports', 'sales'),
('reports.cash', 'Reportes de Caja', 'Ver reportes de caja', 'reports', 'cash'),
('reports.inventory', 'Reportes de Inventario', 'Ver reportes de stock', 'reports', 'inventory'),
('reports.financial', 'Reportes Financieros', 'Ver reportes financieros completos', 'reports', 'financial'),

-- Settings module
('settings.view', 'Ver Configuración', 'Consultar ajustes del sistema', 'settings', 'view'),
('settings.update', 'Modificar Configuración', 'Cambiar configuración del sistema', 'settings', 'update');

-- Assign permissions to roles
-- ADMIN: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- MANAGER: Most permissions except critical system settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE name NOT IN ('users.delete', 'settings.update');

-- CASHIER: Sales, cash, and invoicing
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE module IN ('sales', 'cash', 'invoices', 'products')
  AND action IN ('create', 'read', 'view', 'view_balance', 'open_session', 'close_session', 'add_movement', 'z_report');

-- WAITER: Sales and tables only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions
WHERE name IN (
    'sales.create', 'sales.read', 'sales.update', 'sales.park',
    'products.read'
);

-- KITCHEN: Kitchen orders only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 5, id FROM permissions
WHERE module = 'kitchen';

-- INVENTORY_MANAGER: Inventory and products
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, id FROM permissions
WHERE module IN ('inventory', 'products', 'reports')
  AND (module != 'reports' OR name IN ('reports.inventory'));

-- Comments:
-- Permission naming convention: {module}.{action}
-- Example: 'sales.create', 'cash.close_session', 'users.manage_roles'
--
-- Permission check flow:
-- 1. Check user_permissions for explicit grant/revoke (highest priority)
-- 2. Check all user's roles → role_permissions
-- 3. If any role grants permission → allow
-- 4. Default: deny
--
-- Use cases:
-- - Restrict cashiers from giving discounts without manager approval
-- - Prevent waiters from closing cash sessions
-- - Allow temporary permissions (expires_at)
-- - Audit trail for security compliance
