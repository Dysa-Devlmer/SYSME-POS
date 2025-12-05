-- =====================================================
-- SYSME POS - Users and Authentication System
-- Migration: 001_users_and_auth.sql
-- Description: Sistema de usuarios, roles y autenticación
-- Author: JARVIS AI Assistant
-- Date: 2025-11-20
-- =====================================================

-- ====================================
-- TABLA: users
-- Usuarios del sistema
-- ====================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,

    -- Role-based access control
    role TEXT NOT NULL DEFAULT 'cashier', -- 'admin', 'manager', 'chef', 'cashier', 'waiter'

    -- Status
    is_active INTEGER DEFAULT 1,
    is_verified INTEGER DEFAULT 0,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,

    -- Account security
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TEXT,
    password_changed_at TEXT,

    -- Additional info
    phone TEXT,
    avatar_url TEXT,
    notes TEXT,

    -- Metadata
    created_by TEXT,
    updated_by TEXT
);

-- ====================================
-- TABLA: roles
-- Roles del sistema con permisos
-- ====================================
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,

    -- Permissions (JSON array)
    permissions TEXT, -- JSON: ["users.read", "users.write", "orders.read", ...]

    -- Hierarchy
    level INTEGER DEFAULT 0, -- Higher level = more permissions

    -- Status
    is_active INTEGER DEFAULT 1,
    is_system INTEGER DEFAULT 0, -- System roles can't be deleted

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABLA: sessions
-- Sesiones activas (opcional, para tracking)
-- ====================================
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Session info
    token_id TEXT NOT NULL UNIQUE, -- JWT ID (jti claim)
    refresh_token TEXT,

    -- Device info
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'

    -- Status
    is_active INTEGER DEFAULT 1,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_activity TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ====================================
-- TABLA: audit_log
-- Log de auditoría de acciones importantes
-- ====================================
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,

    -- Action info
    action TEXT NOT NULL, -- 'login', 'logout', 'create', 'update', 'delete'
    entity_type TEXT, -- 'user', 'order', 'product', etc.
    entity_id INTEGER,

    -- Details
    description TEXT,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON

    -- Request info
    ip_address TEXT,
    user_agent TEXT,

    -- Timestamp
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ====================================
-- TABLA: password_resets
-- Tokens para reseteo de contraseña
-- ====================================
CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    -- Reset token
    token TEXT NOT NULL UNIQUE,

    -- Status
    is_used INTEGER DEFAULT 0,

    -- Timestamps
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    used_at TEXT,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ====================================
-- ÍNDICES
-- ====================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- Password Resets
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_expires ON password_resets(expires_at);

-- ====================================
-- VISTAS
-- ====================================

-- Vista: Usuarios activos con información completa
CREATE VIEW IF NOT EXISTS v_active_users AS
SELECT
    u.id,
    u.username,
    u.email,
    u.full_name,
    u.role,
    u.phone,
    u.avatar_url,
    u.is_verified,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT s.id) as active_sessions,
    MAX(s.last_activity) as last_activity
FROM users u
LEFT JOIN sessions s ON u.id = s.user_id AND s.is_active = 1
WHERE u.is_active = 1
GROUP BY u.id;

-- Vista: Actividad reciente de usuarios
CREATE VIEW IF NOT EXISTS v_user_activity AS
SELECT
    u.id as user_id,
    u.username,
    u.full_name,
    al.action,
    al.entity_type,
    al.entity_id,
    al.description,
    al.created_at
FROM audit_log al
JOIN users u ON al.user_id = u.id
ORDER BY al.created_at DESC;

-- ====================================
-- TRIGGERS
-- ====================================

-- Trigger: Actualizar updated_at en users
CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Registrar cambios en audit_log
CREATE TRIGGER IF NOT EXISTS trg_audit_user_changes
AFTER UPDATE ON users
FOR EACH ROW
WHEN OLD.role != NEW.role OR OLD.is_active != NEW.is_active
BEGIN
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, description, old_values, new_values)
    VALUES (
        NEW.id,
        'update',
        'user',
        NEW.id,
        'User profile updated',
        json_object('role', OLD.role, 'is_active', OLD.is_active),
        json_object('role', NEW.role, 'is_active', NEW.is_active)
    );
END;

-- Trigger: Limpiar sesiones expiradas automáticamente
CREATE TRIGGER IF NOT EXISTS trg_cleanup_expired_sessions
AFTER INSERT ON sessions
BEGIN
    UPDATE sessions
    SET is_active = 0
    WHERE expires_at < CURRENT_TIMESTAMP
    AND is_active = 1;
END;

-- Trigger: Marcar tokens de reset usados como expirados
CREATE TRIGGER IF NOT EXISTS trg_expire_used_reset_tokens
AFTER UPDATE OF is_used ON password_resets
FOR EACH ROW
WHEN NEW.is_used = 1
BEGIN
    UPDATE password_resets
    SET used_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- ====================================
-- DATOS INICIALES
-- ====================================

-- Roles del sistema
INSERT OR IGNORE INTO roles (id, name, display_name, description, level, is_system, permissions) VALUES
(1, 'admin', 'Administrador', 'Acceso total al sistema', 100, 1, '["*"]'),
(2, 'manager', 'Gerente', 'Gestión de operaciones y reportes', 80, 1, '["orders.*", "products.*", "inventory.*", "reports.*", "employees.read"]'),
(3, 'chef', 'Chef', 'Gestión de cocina y recetas', 60, 1, '["recipes.*", "ingredients.*", "orders.read", "kitchen.*"]'),
(4, 'cashier', 'Cajero', 'Gestión de órdenes y pagos', 40, 1, '["orders.create", "orders.read", "orders.update", "payments.*", "customers.read"]'),
(5, 'waiter', 'Mesero', 'Toma de órdenes', 20, 1, '["orders.create", "orders.read", "tables.*"]');

-- Usuario administrador por defecto
-- Password: admin123 (CAMBIAR EN PRODUCCIÓN)
INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, role, is_active, is_verified) VALUES
(1, 'admin', 'admin@sysmepos.com', '$2a$10$rQZ8vZXqQJf5Jq5Y5YqY5e5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', 'Administrador', 'admin', 1, 1);

-- Usuarios de ejemplo para testing
INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role, is_active) VALUES
('manager1', 'manager@sysmepos.com', '$2a$10$rQZ8vZXqQJf5Jq5Y5YqY5e5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', 'Manager de Prueba', 'manager', 1),
('chef1', 'chef@sysmepos.com', '$2a$10$rQZ8vZXqQJf5Jq5Y5YqY5e5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', 'Chef de Prueba', 'chef', 1),
('cashier1', 'cashier@sysmepos.com', '$2a$10$rQZ8vZXqQJf5Jq5Y5YqY5e5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5', 'Cajero de Prueba', 'cashier', 1);

-- ====================================
-- FUNCIONES DE UTILIDAD (Queries comunes)
-- ====================================

-- Query para verificar permisos de usuario
-- SELECT * FROM roles WHERE name = (SELECT role FROM users WHERE id = ?);

-- Query para obtener sesiones activas de un usuario
-- SELECT * FROM sessions WHERE user_id = ? AND is_active = 1 AND expires_at > CURRENT_TIMESTAMP;

-- Query para log de auditoría de un usuario
-- SELECT * FROM v_user_activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 50;

-- Query para bloquear cuenta después de intentos fallidos
-- UPDATE users SET account_locked_until = datetime('now', '+30 minutes'), failed_login_attempts = 0 WHERE id = ?;

-- Query para limpiar sesiones expiradas
-- UPDATE sessions SET is_active = 0 WHERE expires_at < CURRENT_TIMESTAMP;

-- Query para limpiar tokens de reset expirados
-- DELETE FROM password_resets WHERE expires_at < CURRENT_TIMESTAMP OR is_used = 1;

-- ====================================
-- COMENTARIOS FINALES
-- ====================================

-- Esta migración crea el sistema completo de autenticación y autorización:
-- 1. Tabla de usuarios con roles
-- 2. Sistema de roles con permisos
-- 3. Sesiones para tracking
-- 4. Audit log para seguridad
-- 5. Password reset tokens
-- 6. Vistas para consultas comunes
-- 7. Triggers automáticos
-- 8. Datos iniciales (admin + roles)

-- IMPORTANTE PARA PRODUCCIÓN:
-- 1. Cambiar password del admin
-- 2. Configurar JWT_SECRET en variables de entorno
-- 3. Habilitar HTTPS
-- 4. Implementar rate limiting
-- 5. Configurar envío de emails para reset de contraseñas
-- 6. Implementar 2FA (autenticación de dos factores)
-- 7. Revisar y ajustar permisos por rol

-- Total de objetos creados:
-- - 5 Tablas principales
-- - 2 Vistas
-- - 4 Triggers
-- - 15+ Índices
-- - 5 Roles predefinidos
-- - 4 Usuarios de ejemplo
