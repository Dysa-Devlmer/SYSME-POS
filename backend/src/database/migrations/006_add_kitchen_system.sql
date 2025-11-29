-- Migration: Kitchen System
-- Date: 2025-01-17
-- Purpose: Add kitchen display system with real-time order tracking

-- Add kitchen-related fields to sale_items (only if they don't exist)
-- Note: SQLite doesn't have IF NOT EXISTS for ALTER COLUMN, so we check manually
-- These fields may already exist from previous migrations

-- Try to add columns (will fail silently if they exist)
ALTER TABLE sale_items ADD COLUMN kitchen_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE sale_items ADD COLUMN kitchen_block INTEGER DEFAULT 1;
ALTER TABLE sale_items ADD COLUMN kitchen_started_at DATETIME;
ALTER TABLE sale_items ADD COLUMN kitchen_completed_at DATETIME;
ALTER TABLE sale_items ADD COLUMN kitchen_served_at DATETIME;

-- Create kitchen_blocks table (4 bloques de cocina)
CREATE TABLE IF NOT EXISTS kitchen_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 1,
    color VARCHAR(20) DEFAULT 'blue',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default kitchen blocks
INSERT INTO kitchen_blocks (name, description, position, color) VALUES
('Bloque 1', 'Entradas y Ensaladas', 1, 'green'),
('Bloque 2', 'Platos Principales', 2, 'blue'),
('Bloque 3', 'Postres', 3, 'purple'),
('Bloque 4', 'Bebidas y Otros', 4, 'orange');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sale_items_kitchen_status ON sale_items(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_sale_items_kitchen_block ON sale_items(kitchen_block);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);

-- Comments:
-- kitchen_status workflow:
-- 'pending' -> Item recién creado, esperando preparación
-- 'preparing' -> Cocinero empezó a preparar
-- 'ready' -> Plato listo para servir
-- 'served' -> Plato servido al cliente
--
-- kitchen_block: Asigna items a bloques de cocina (1-4)
-- Cada bloque puede tener su propia pantalla o sección
