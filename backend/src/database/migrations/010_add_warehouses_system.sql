-- Migration: Multiple Warehouses and Transfers
-- Date: 2025-01-17
-- Purpose: Multi-location inventory management with transfers

-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT,
    phone VARCHAR(50),
    manager_id INTEGER, -- User responsible for warehouse
    warehouse_type VARCHAR(50) DEFAULT 'main', -- 'main', 'branch', 'kitchen', 'bar'
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Product inventory by warehouse (stock levels per location)
CREATE TABLE IF NOT EXISTS warehouse_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10, 3) DEFAULT 0,
    min_stock DECIMAL(10, 3) DEFAULT 0, -- Minimum stock alert
    max_stock DECIMAL(10, 3), -- Maximum capacity
    last_restock_date DATE,
    last_counted_at DATETIME, -- Last physical inventory count
    notes TEXT,
    UNIQUE(warehouse_id, product_id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Warehouse transfers (move stock between warehouses)
CREATE TABLE IF NOT EXISTS warehouse_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_number VARCHAR(50) NOT NULL UNIQUE,
    from_warehouse_id INTEGER NOT NULL,
    to_warehouse_id INTEGER NOT NULL,
    transfer_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_transit', 'completed', 'cancelled'
    requested_by INTEGER NOT NULL, -- User who initiated transfer
    approved_by INTEGER, -- User who approved
    received_by INTEGER, -- User who received at destination
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL,
    CHECK (from_warehouse_id != to_warehouse_id)
);

-- Transfer items (products being transferred)
CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    requested_quantity DECIMAL(10, 3) NOT NULL,
    received_quantity DECIMAL(10, 3), -- May differ from requested
    unit_cost DECIMAL(10, 2), -- Cost per unit for accounting
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transfer_id) REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Inventory movements log (audit trail for all stock changes)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    movement_type VARCHAR(50) NOT NULL, -- 'transfer_out', 'transfer_in', 'sale', 'adjustment', 'restock', 'waste'
    quantity DECIMAL(10, 3) NOT NULL, -- Positive = increase, Negative = decrease
    previous_quantity DECIMAL(10, 3) NOT NULL,
    new_quantity DECIMAL(10, 3) NOT NULL,
    reference_type VARCHAR(50), -- 'transfer', 'sale', 'purchase_order', 'adjustment'
    reference_id INTEGER, -- ID of related record
    user_id INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_warehouse ON warehouse_inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_product ON warehouse_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_low_stock ON warehouse_inventory(warehouse_id, product_id) WHERE quantity <= min_stock;
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_from ON warehouse_transfers(from_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_to ON warehouse_transfers(to_warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfers_status ON warehouse_transfers(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_transfer_items_transfer ON warehouse_transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);

-- Insert default warehouses
INSERT INTO warehouses (code, name, description, warehouse_type, is_active) VALUES
('MAIN', 'Almacén Principal', 'Bodega central de productos', 'main', 1),
('KITCHEN', 'Cocina', 'Inventario de cocina', 'kitchen', 1),
('BAR', 'Bar', 'Inventario de bebidas', 'bar', 1);

-- Migrate existing inventory to main warehouse
-- This assumes products table has a 'stock' column
INSERT INTO warehouse_inventory (warehouse_id, product_id, quantity, min_stock)
SELECT 1, id, COALESCE(stock, 0), COALESCE(min_stock, 0)
FROM products
WHERE id NOT IN (SELECT product_id FROM warehouse_inventory WHERE warehouse_id = 1);

-- Comments:
-- Workflow:
-- 1. Create warehouses (MAIN, KITCHEN, BAR, branches)
-- 2. Each product has separate stock per warehouse
-- 3. When creating transfer: status = 'pending'
-- 4. When approved: deduct from source, status = 'in_transit'
-- 5. When received: add to destination, status = 'completed'
-- 6. All movements logged in inventory_movements
--
-- Use cases:
-- - Restaurant with multiple locations
-- - Separate kitchen/bar inventory
-- - Transfer between branches
-- - Track stock movements with full audit trail
