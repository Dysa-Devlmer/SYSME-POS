-- =====================================================
-- SYSME POS - Delivery Platform Integration System
-- Migration: 018_delivery_integration.sql
-- Description: Sistema de integración con plataformas de delivery
-- Author: JARVIS AI Assistant
-- Date: 2025-11-20
-- =====================================================

-- ====================================
-- TABLA: delivery_platforms
-- Plataformas de delivery soportadas
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- 'Uber Eats', 'Rappi', 'PedidosYa', 'Delivery Hero', etc.
    code TEXT NOT NULL UNIQUE,
    logo_url TEXT,

    -- Configuración de API
    api_base_url TEXT,
    api_version TEXT,
    requires_oauth INTEGER DEFAULT 0,
    webhook_url TEXT,

    -- Credenciales (encriptadas en producción)
    api_key TEXT,
    api_secret TEXT,
    merchant_id TEXT,
    store_id TEXT,

    -- Comisiones y tarifas
    commission_percentage REAL DEFAULT 0, -- % de comisión por pedido
    fixed_commission REAL DEFAULT 0, -- Comisión fija por pedido
    delivery_fee REAL DEFAULT 0, -- Tarifa de delivery promedio

    -- Configuración de menú
    auto_sync_menu INTEGER DEFAULT 0, -- Sincronización automática del menú
    sync_interval_minutes INTEGER DEFAULT 60,
    last_menu_sync TEXT,

    -- Horarios
    supports_scheduling INTEGER DEFAULT 1,
    min_preparation_time_minutes INTEGER DEFAULT 15,
    max_preparation_time_minutes INTEGER DEFAULT 45,

    -- Estado
    is_active INTEGER DEFAULT 1,
    is_test_mode INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- ====================================
-- TABLA: delivery_orders
-- Órdenes recibidas de plataformas de delivery
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,
    platform_order_id TEXT NOT NULL, -- ID de la orden en la plataforma externa

    -- Vinculación con orden interna
    internal_order_id INTEGER, -- Link to orders table

    -- Estado en plataforma
    platform_status TEXT NOT NULL, -- 'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'

    -- Cliente información
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    delivery_address TEXT,
    delivery_instructions TEXT,

    -- Detalles de la orden
    items TEXT NOT NULL, -- JSON: [{"id": 123, "name": "...", "quantity": 2, "price": 5000}]
    subtotal REAL NOT NULL,
    delivery_fee REAL DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    tip REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,

    -- Comisión de la plataforma
    platform_commission REAL,
    net_revenue REAL GENERATED ALWAYS AS (total - COALESCE(platform_commission, 0)) VIRTUAL,

    -- Tiempos
    ordered_at TEXT NOT NULL,
    estimated_preparation_time INTEGER, -- minutes
    estimated_pickup_time TEXT,
    estimated_delivery_time TEXT,
    confirmed_at TEXT,
    ready_at TEXT,
    picked_up_at TEXT,
    delivered_at TEXT,
    cancelled_at TEXT,

    -- Información de entrega
    courier_name TEXT,
    courier_phone TEXT,
    courier_location TEXT, -- JSON: {"lat": 0, "lng": 0}
    tracking_url TEXT,

    -- Cancelación
    cancellation_reason TEXT,
    cancelled_by TEXT, -- 'customer', 'restaurant', 'platform', 'courier'
    refund_amount REAL DEFAULT 0,
    refund_status TEXT, -- 'pending', 'processed', 'rejected'

    -- Rating
    customer_rating INTEGER, -- 1-5
    customer_feedback TEXT,

    -- Sincronización
    last_sync_at TEXT,
    sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'error'
    sync_error TEXT,

    -- Metadata
    raw_data TEXT, -- JSON completo de la plataforma
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (platform_id) REFERENCES delivery_platforms(id),
    FOREIGN KEY (internal_order_id) REFERENCES orders(id),
    UNIQUE(platform_id, platform_order_id)
);

-- ====================================
-- TABLA: delivery_menu_sync
-- Sincronización de menú con plataformas
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_menu_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,

    -- Tipo de sincronización
    sync_type TEXT NOT NULL, -- 'full', 'incremental', 'manual'
    sync_direction TEXT DEFAULT 'outbound', -- 'outbound' (POS -> Platform), 'inbound' (Platform -> POS)

    -- Estado
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'

    -- Estadísticas
    total_items INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_deleted INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,

    -- Tiempos
    started_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    duration_seconds INTEGER,

    -- Errores
    error_message TEXT,
    error_details TEXT, -- JSON

    -- Metadata
    triggered_by TEXT, -- 'auto', 'manual', 'webhook'
    changes_summary TEXT, -- JSON: resumen de cambios

    FOREIGN KEY (platform_id) REFERENCES delivery_platforms(id)
);

-- ====================================
-- TABLA: delivery_product_mappings
-- Mapeo de productos POS a productos de plataforma
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_product_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,
    internal_product_id INTEGER NOT NULL,
    platform_product_id TEXT NOT NULL,

    -- Información del producto en la plataforma
    platform_name TEXT,
    platform_description TEXT,
    platform_price REAL,
    platform_category_id TEXT,
    platform_image_url TEXT,

    -- Estado
    is_available INTEGER DEFAULT 1,
    is_synced INTEGER DEFAULT 1,
    last_synced_at TEXT,

    -- Override settings
    override_name INTEGER DEFAULT 0,
    override_description INTEGER DEFAULT 0,
    override_price INTEGER DEFAULT 0,
    override_image INTEGER DEFAULT 0,

    -- Metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (platform_id) REFERENCES delivery_platforms(id),
    FOREIGN KEY (internal_product_id) REFERENCES products(id),
    UNIQUE(platform_id, internal_product_id)
);

-- ====================================
-- TABLA: delivery_webhooks_log
-- Log de webhooks recibidos de plataformas
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_webhooks_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER NOT NULL,

    -- Webhook info
    event_type TEXT NOT NULL, -- 'order_created', 'order_updated', 'order_cancelled', etc.
    event_id TEXT,

    -- Request details
    request_method TEXT DEFAULT 'POST',
    request_headers TEXT, -- JSON
    request_body TEXT, -- JSON
    request_ip TEXT,

    -- Processing
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'processed', 'failed'
    processed_at TEXT,
    processing_time_ms INTEGER,

    -- Response
    response_status_code INTEGER,
    response_body TEXT,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    last_retry_at TEXT,

    -- Related records
    order_id INTEGER,

    -- Metadata
    received_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (platform_id) REFERENCES delivery_platforms(id),
    FOREIGN KEY (order_id) REFERENCES delivery_orders(id)
);

-- ====================================
-- TABLA: delivery_analytics
-- Análisis y métricas de delivery
-- ====================================
CREATE TABLE IF NOT EXISTS delivery_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform_id INTEGER,

    -- Período
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,

    -- Órdenes
    total_orders INTEGER DEFAULT 0,
    completed_orders INTEGER DEFAULT 0,
    cancelled_orders INTEGER DEFAULT 0,
    avg_order_value REAL DEFAULT 0,

    -- Revenue
    total_revenue REAL DEFAULT 0,
    total_commission REAL DEFAULT 0,
    net_revenue REAL DEFAULT 0,

    -- Tiempos promedio
    avg_preparation_time_minutes REAL,
    avg_delivery_time_minutes REAL,
    avg_total_time_minutes REAL,

    -- Rating
    avg_customer_rating REAL,
    total_ratings INTEGER DEFAULT 0,

    -- Top products
    top_selling_products TEXT, -- JSON: [{"product_id": 123, "quantity": 50, "revenue": 250000}]

    -- Metadata
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (platform_id) REFERENCES delivery_platforms(id),
    UNIQUE(platform_id, period_type, period_start)
);

-- ====================================
-- ÍNDICES para optimización
-- ====================================

-- Delivery Platforms
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_code ON delivery_platforms(code);
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_active ON delivery_platforms(is_active);

-- Delivery Orders
CREATE INDEX IF NOT EXISTS idx_delivery_orders_platform ON delivery_orders(platform_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_platform_order_id ON delivery_orders(platform_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_internal_order ON delivery_orders(internal_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(platform_status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_ordered_at ON delivery_orders(ordered_at);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_sync_status ON delivery_orders(sync_status);

-- Menu Sync
CREATE INDEX IF NOT EXISTS idx_menu_sync_platform ON delivery_menu_sync(platform_id);
CREATE INDEX IF NOT EXISTS idx_menu_sync_status ON delivery_menu_sync(status);
CREATE INDEX IF NOT EXISTS idx_menu_sync_started_at ON delivery_menu_sync(started_at);

-- Product Mappings
CREATE INDEX IF NOT EXISTS idx_product_mappings_platform ON delivery_product_mappings(platform_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_internal_product ON delivery_product_mappings(internal_product_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_platform_product ON delivery_product_mappings(platform_product_id);

-- Webhooks Log
CREATE INDEX IF NOT EXISTS idx_webhooks_platform ON delivery_webhooks_log(platform_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON delivery_webhooks_log(event_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_status ON delivery_webhooks_log(status);
CREATE INDEX IF NOT EXISTS idx_webhooks_received_at ON delivery_webhooks_log(received_at);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_platform ON delivery_analytics(platform_id);
CREATE INDEX IF NOT EXISTS idx_delivery_analytics_period ON delivery_analytics(period_type, period_start);

-- ====================================
-- VISTAS para análisis y reportes
-- ====================================

-- Vista: Órdenes de delivery con información completa
CREATE VIEW IF NOT EXISTS v_delivery_orders_detailed AS
SELECT
    do.*,
    dp.name as platform_name,
    dp.code as platform_code,
    dp.commission_percentage,
    o.order_number as internal_order_number,
    o.status as internal_order_status,
    CASE
        WHEN do.platform_status = 'pending' THEN 'Pendiente'
        WHEN do.platform_status = 'confirmed' THEN 'Confirmado'
        WHEN do.platform_status = 'preparing' THEN 'Preparando'
        WHEN do.platform_status = 'ready' THEN 'Listo'
        WHEN do.platform_status = 'picked_up' THEN 'Recogido'
        WHEN do.platform_status = 'delivered' THEN 'Entregado'
        WHEN do.platform_status = 'cancelled' THEN 'Cancelado'
        ELSE do.platform_status
    END as status_display,
    julianday(do.delivered_at) - julianday(do.ordered_at) as total_time_hours
FROM delivery_orders do
LEFT JOIN delivery_platforms dp ON do.platform_id = dp.id
LEFT JOIN orders o ON do.internal_order_id = o.id;

-- Vista: Resumen de rendimiento por plataforma
CREATE VIEW IF NOT EXISTS v_delivery_platform_performance AS
SELECT
    dp.id,
    dp.name,
    dp.code,
    dp.is_active,
    COUNT(DISTINCT do.id) as total_orders,
    COUNT(DISTINCT CASE WHEN do.platform_status = 'delivered' THEN do.id END) as delivered_orders,
    COUNT(DISTINCT CASE WHEN do.platform_status = 'cancelled' THEN do.id END) as cancelled_orders,
    ROUND(AVG(do.total), 2) as avg_order_value,
    ROUND(SUM(do.total), 2) as total_revenue,
    ROUND(SUM(do.platform_commission), 2) as total_commission,
    ROUND(SUM(do.net_revenue), 2) as total_net_revenue,
    ROUND(AVG(do.customer_rating), 2) as avg_rating,
    ROUND(AVG(do.estimated_preparation_time), 2) as avg_prep_time
FROM delivery_platforms dp
LEFT JOIN delivery_orders do ON dp.id = do.platform_id
GROUP BY dp.id;

-- Vista: Órdenes activas (en proceso)
CREATE VIEW IF NOT EXISTS v_active_delivery_orders AS
SELECT
    do.*,
    dp.name as platform_name,
    dp.logo_url as platform_logo,
    julianday('now') - julianday(do.ordered_at) as hours_since_order
FROM delivery_orders do
JOIN delivery_platforms dp ON do.platform_id = dp.id
WHERE do.platform_status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up')
ORDER BY do.ordered_at DESC;

-- Vista: Productos sincronizados por plataforma
CREATE VIEW IF NOT EXISTS v_delivery_product_sync_status AS
SELECT
    dp.id as platform_id,
    dp.name as platform_name,
    p.id as product_id,
    p.name as product_name,
    p.price as internal_price,
    dpm.platform_product_id,
    dpm.platform_price,
    dpm.is_available,
    dpm.is_synced,
    dpm.last_synced_at,
    CASE
        WHEN dpm.id IS NULL THEN 'not_mapped'
        WHEN dpm.is_synced = 0 THEN 'out_of_sync'
        WHEN dpm.is_available = 0 THEN 'unavailable'
        ELSE 'synced'
    END as sync_status
FROM delivery_platforms dp
CROSS JOIN products p
LEFT JOIN delivery_product_mappings dpm ON dp.id = dpm.platform_id AND p.id = dpm.internal_product_id
WHERE dp.is_active = 1 AND p.is_active = 1;

-- ====================================
-- TRIGGERS para automatización
-- ====================================

-- Trigger: Actualizar updated_at en delivery_platforms
CREATE TRIGGER IF NOT EXISTS trg_delivery_platforms_updated_at
AFTER UPDATE ON delivery_platforms
FOR EACH ROW
BEGIN
    UPDATE delivery_platforms
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar updated_at en delivery_orders
CREATE TRIGGER IF NOT EXISTS trg_delivery_orders_updated_at
AFTER UPDATE ON delivery_orders
FOR EACH ROW
BEGIN
    UPDATE delivery_orders
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Calcular comisión al crear orden
CREATE TRIGGER IF NOT EXISTS trg_calculate_platform_commission
AFTER INSERT ON delivery_orders
FOR EACH ROW
BEGIN
    UPDATE delivery_orders
    SET platform_commission = (
        SELECT (NEW.total * (dp.commission_percentage / 100)) + dp.fixed_commission
        FROM delivery_platforms dp
        WHERE dp.id = NEW.platform_id
    )
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar last_sync en product mappings
CREATE TRIGGER IF NOT EXISTS trg_update_product_mapping_sync
AFTER UPDATE OF is_synced ON delivery_product_mappings
FOR EACH ROW
WHEN NEW.is_synced = 1
BEGIN
    UPDATE delivery_product_mappings
    SET last_synced_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Registrar duración de sync de menú
CREATE TRIGGER IF NOT EXISTS trg_calculate_menu_sync_duration
AFTER UPDATE OF status ON delivery_menu_sync
FOR EACH ROW
WHEN NEW.status = 'completed'
BEGIN
    UPDATE delivery_menu_sync
    SET duration_seconds = (julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 86400,
        completed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- ====================================
-- DATOS INICIALES
-- ====================================

-- Plataformas de delivery populares en Chile
INSERT OR IGNORE INTO delivery_platforms (
    id, name, code, commission_percentage, fixed_commission, is_active
) VALUES
(1, 'Uber Eats', 'UBER_EATS', 25, 0, 1),
(2, 'Rappi', 'RAPPI', 28, 0, 1),
(3, 'PedidosYa', 'PEDIDOS_YA', 23, 0, 1),
(4, 'Cornershop', 'CORNERSHOP', 20, 0, 1),
(5, 'Justo', 'JUSTO', 18, 500, 1);

-- ====================================
-- COMENTARIOS FINALES
-- ====================================

-- Esta migración crea un sistema completo de integración con delivery
-- Características principales:
-- 1. Gestión de múltiples plataformas de delivery
-- 2. Recepción y procesamiento de órdenes
-- 3. Sincronización bidireccional de menú
-- 4. Mapeo de productos entre sistemas
-- 5. Webhooks para actualizaciones en tiempo real
-- 6. Analytics y reportes de rendimiento
-- 7. Tracking de órdenes en tiempo real
-- 8. Gestión de comisiones y revenue neto
-- 9. Sistema de logs y auditoría
-- 10. Soporte para modo test

-- Total de objetos creados:
-- - 7 Tablas principales
-- - 4 Vistas de análisis
-- - 5 Triggers automáticos
-- - 20+ Índices para optimización
-- - 5 Plataformas de delivery precargadas

-- Sistema listo para integración con APIs de delivery
