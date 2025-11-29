-- Migration 012: Sistema de Tarifas Múltiples
-- Permite diferentes precios según ubicación, horario, etc.

-- Tabla de tarifas
CREATE TABLE IF NOT EXISTS pricing_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,

    -- Aplicabilidad temporal
    valid_days TEXT, -- JSON: ["monday", "tuesday", ...] o null para todos
    valid_start_time TEXT, -- HH:MM o null
    valid_end_time TEXT, -- HH:MM o null

    -- Prioridad (mayor número = mayor prioridad)
    priority INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Precios de productos por tarifa
CREATE TABLE IF NOT EXISTS product_pricing_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    pricing_tier_id INTEGER NOT NULL,
    price REAL NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (pricing_tier_id) REFERENCES pricing_tiers(id) ON DELETE CASCADE,
    UNIQUE(product_id, pricing_tier_id)
);

-- Asignación de tarifa a mesas
ALTER TABLE tables ADD COLUMN pricing_tier_id INTEGER REFERENCES pricing_tiers(id);

-- Agregar tarifa a las ventas
ALTER TABLE sales ADD COLUMN pricing_tier_id INTEGER REFERENCES pricing_tiers(id);
ALTER TABLE sales ADD COLUMN pricing_tier_name TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_product_pricing_product ON product_pricing_tiers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_tier ON product_pricing_tiers(pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_tables_pricing_tier ON tables(pricing_tier_id);
CREATE INDEX IF NOT EXISTS idx_sales_pricing_tier ON sales(pricing_tier_id);

-- Tarifa por defecto
INSERT INTO pricing_tiers (code, name, description, is_default, is_active, priority)
VALUES ('DEFAULT', 'Tarifa Normal', 'Tarifa estándar para todos los productos', 1, 1, 0);

-- Ejemplos de tarifas adicionales
INSERT INTO pricing_tiers (code, name, description, is_default, is_active, valid_days, valid_start_time, valid_end_time, priority)
VALUES
    ('HAPPY_HOUR', 'Happy Hour', 'Precios especiales de 18:00 a 20:00', 0, 1, '["monday","tuesday","wednesday","thursday","friday"]', '18:00', '20:00', 10),
    ('TERRAZA', 'Terraza', 'Precios para mesas de terraza', 0, 1, NULL, NULL, NULL, 5),
    ('VIP', 'Zona VIP', 'Precios premium para zona VIP', 0, 1, NULL, NULL, NULL, 8);

-- Trigger para actualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_pricing_tiers_timestamp
AFTER UPDATE ON pricing_tiers
BEGIN
    UPDATE pricing_tiers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_product_pricing_tiers_timestamp
AFTER UPDATE ON product_pricing_tiers
BEGIN
    UPDATE product_pricing_tiers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
