-- =====================================================
-- SYSME POS - Inventory Management Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- INVENTORY LOCATIONS (Almacenes/Bodegas)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT DEFAULT 'warehouse' CHECK(type IN ('warehouse', 'kitchen', 'bar', 'storage', 'display', 'vehicle')),
    is_primary BOOLEAN DEFAULT 0,
    address TEXT,
    capacity DECIMAL(10,2), -- cubic meters or other unit
    temperature_controlled BOOLEAN DEFAULT 0,
    temperature_min DECIMAL(5,2),
    temperature_max DECIMAL(5,2),
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- INVENTORY (Stock by Location)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    inventory_location_id INTEGER NOT NULL,

    -- Quantities
    quantity_on_hand DECIMAL(10,3) NOT NULL DEFAULT 0,
    quantity_allocated DECIMAL(10,3) DEFAULT 0, -- reserved for pending orders
    quantity_available DECIMAL(10,3) GENERATED ALWAYS AS (quantity_on_hand - quantity_allocated) STORED,

    -- Reorder
    reorder_point DECIMAL(10,3),
    reorder_quantity DECIMAL(10,3),
    min_quantity DECIMAL(10,3),
    max_quantity DECIMAL(10,3),

    -- Costing
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,

    -- Tracking
    last_count_date DATE,
    last_received_date DATE,

    -- Metadata
    bin_location TEXT, -- physical location in warehouse
    lot_number TEXT,
    expiration_date DATE,

    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, inventory_location_id, variant_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_location_id) REFERENCES inventory_locations(id) ON DELETE CASCADE
);

-- =====================================================
-- INVENTORY TRANSACTIONS (Movimientos de Inventario)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,
    inventory_location_id INTEGER NOT NULL,

    -- Transaction Details
    type TEXT NOT NULL CHECK(type IN (
        'purchase', 'sale', 'return', 'adjustment',
        'transfer_in', 'transfer_out', 'waste', 'loss',
        'production', 'consumption', 'count'
    )),

    -- Quantities
    quantity DECIMAL(10,3) NOT NULL,
    quantity_before DECIMAL(10,3),
    quantity_after DECIMAL(10,3),

    -- Costing
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),

    -- References
    reference_type TEXT, -- order, purchase_order, transfer, adjustment, etc.
    reference_id INTEGER,
    reference_number TEXT,

    -- User
    created_by INTEGER NOT NULL,

    -- Notes
    reason TEXT,
    notes TEXT,

    -- Batch/Lot Tracking
    batch_number TEXT,
    lot_number TEXT,
    expiration_date DATE,

    transaction_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_location_id) REFERENCES inventory_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- INVENTORY TRANSFERS (Transferencias entre almacenes)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    transfer_number TEXT UNIQUE NOT NULL,

    -- Locations
    from_location_id INTEGER NOT NULL,
    to_location_id INTEGER NOT NULL,

    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_transit', 'completed', 'cancelled')),

    -- Dates
    requested_date DATE NOT NULL,
    shipped_date DATE,
    received_date DATE,

    -- Users
    requested_by INTEGER NOT NULL,
    shipped_by INTEGER,
    received_by INTEGER,

    -- Notes
    notes TEXT,
    cancellation_reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (from_location_id) REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (to_location_id) REFERENCES inventory_locations(id) ON DELETE RESTRICT,
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (shipped_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INVENTORY TRANSFER ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_transfer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,

    quantity_requested DECIMAL(10,3) NOT NULL,
    quantity_shipped DECIMAL(10,3) DEFAULT 0,
    quantity_received DECIMAL(10,3) DEFAULT 0,

    unit_cost DECIMAL(10,2),
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (transfer_id) REFERENCES inventory_transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

-- =====================================================
-- STOCK COUNTS (Conteos Físicos)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_counts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    inventory_location_id INTEGER NOT NULL,
    count_number TEXT UNIQUE NOT NULL,

    -- Count Details
    type TEXT DEFAULT 'full' CHECK(type IN ('full', 'partial', 'cycle', 'blind')),
    status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'completed', 'cancelled')),

    -- Dates
    scheduled_date DATE NOT NULL,
    started_at DATETIME,
    completed_at DATETIME,

    -- Users
    assigned_to INTEGER,
    completed_by INTEGER,

    -- Results
    total_items_counted INTEGER DEFAULT 0,
    total_variances INTEGER DEFAULT 0,
    total_variance_value DECIMAL(10,2) DEFAULT 0,

    -- Notes
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_location_id) REFERENCES inventory_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- STOCK COUNT ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_count_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    count_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,

    -- Expected vs Actual
    expected_quantity DECIMAL(10,3),
    counted_quantity DECIMAL(10,3),
    variance DECIMAL(10,3) GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,

    -- Costing
    unit_cost DECIMAL(10,2),
    variance_value DECIMAL(10,2) GENERATED ALWAYS AS ((counted_quantity - expected_quantity) * unit_cost) STORED,

    -- Batch Tracking
    batch_number TEXT,
    lot_number TEXT,
    expiration_date DATE,

    -- Status
    is_counted BOOLEAN DEFAULT 0,
    counted_at DATETIME,
    counted_by INTEGER,

    -- Notes
    notes TEXT,
    variance_reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (count_id) REFERENCES stock_counts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    FOREIGN KEY (counted_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INVENTORY ADJUSTMENTS (Ajustes de Inventario)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    inventory_location_id INTEGER NOT NULL,
    adjustment_number TEXT UNIQUE NOT NULL,

    -- Adjustment Details
    type TEXT NOT NULL CHECK(type IN ('increase', 'decrease', 'write_off', 'revaluation')),
    reason TEXT NOT NULL,

    -- Status
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'applied', 'rejected')),

    -- Approval
    requires_approval BOOLEAN DEFAULT 1,
    approved_by INTEGER,
    approved_at DATETIME,

    -- Financial Impact
    total_value_change DECIMAL(10,2) DEFAULT 0,

    -- Notes
    notes TEXT,

    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_location_id) REFERENCES inventory_locations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INVENTORY ADJUSTMENT ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    adjustment_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,

    quantity_before DECIMAL(10,3) NOT NULL,
    quantity_change DECIMAL(10,3) NOT NULL,
    quantity_after DECIMAL(10,3) GENERATED ALWAYS AS (quantity_before + quantity_change) STORED,

    unit_cost DECIMAL(10,2),
    total_value_change DECIMAL(10,2) GENERATED ALWAYS AS (quantity_change * unit_cost) STORED,

    reason TEXT,
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (adjustment_id) REFERENCES inventory_adjustments(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inventory_locations_company ON inventory_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_location ON inventory_locations(location_id);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(inventory_location_id);
CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory(variant_id);

CREATE INDEX IF NOT EXISTS idx_inv_trans_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_trans_location ON inventory_transactions(inventory_location_id);
CREATE INDEX IF NOT EXISTS idx_inv_trans_type ON inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inv_trans_date ON inventory_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_inv_trans_reference ON inventory_transactions(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON inventory_transfers(from_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON inventory_transfers(to_location_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON inventory_transfers(status);

CREATE INDEX IF NOT EXISTS idx_stock_counts_location ON stock_counts(inventory_location_id);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);

CREATE INDEX IF NOT EXISTS idx_adjustments_location ON inventory_adjustments(inventory_location_id);
CREATE INDEX IF NOT EXISTS idx_adjustments_status ON inventory_adjustments(status);
