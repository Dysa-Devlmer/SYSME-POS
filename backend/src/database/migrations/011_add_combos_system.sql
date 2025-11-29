-- Migration: Combos/Packs/Menus System
-- Date: 2025-01-17
-- Purpose: Product bundles with combo pricing (breakfast combos, lunch menus, drink + food packs)

-- Combos table (bundle definitions)
CREATE TABLE IF NOT EXISTS combos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    combo_type VARCHAR(50) DEFAULT 'pack', -- 'pack', 'menu', 'promotion', 'combo'

    -- Pricing
    price DECIMAL(10, 2) NOT NULL, -- Fixed combo price
    original_price DECIMAL(10, 2), -- Sum of individual prices (for discount display)
    discount_percent DECIMAL(5, 2), -- Percentage saved

    -- Availability
    is_active BOOLEAN DEFAULT 1,
    available_days VARCHAR(100), -- JSON array: ["Monday", "Tuesday"] or null for all days
    available_from_time TIME, -- e.g., '08:00:00' for breakfast
    available_to_time TIME, -- e.g., '11:00:00'
    start_date DATE, -- Promotion start
    end_date DATE, -- Promotion end

    -- Display
    image_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    category_id INTEGER, -- Optional category

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Combo items (products included in combo)
CREATE TABLE IF NOT EXISTS combo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    combo_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10, 3) DEFAULT 1, -- How many of this product in combo
    is_required BOOLEAN DEFAULT 1, -- Required or optional item
    is_customizable BOOLEAN DEFAULT 0, -- Can customer choose variant?
    group_name VARCHAR(100), -- Group items: "Choose drink", "Choose side"
    max_selections INTEGER, -- For customizable groups: max items to select
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Combo variants (alternative choices for customizable items)
-- Example: "Choose your drink: Coke OR Sprite OR Juice"
CREATE TABLE IF NOT EXISTS combo_item_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    combo_id INTEGER NOT NULL,
    group_name VARCHAR(100) NOT NULL, -- Must match combo_items.group_name
    product_id INTEGER NOT NULL,
    additional_price DECIMAL(10, 2) DEFAULT 0, -- Extra charge for premium choice
    is_default BOOLEAN DEFAULT 0, -- Default selection
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Combo sales tracking (when combo is sold as part of sale)
CREATE TABLE IF NOT EXISTS sale_combo_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    combo_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL, -- Price of combo at time of sale
    total_price DECIMAL(10, 2) NOT NULL,
    selected_variants TEXT, -- JSON: {"drink": 15, "side": 22} (product IDs)
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (combo_id) REFERENCES combos(id) ON DELETE RESTRICT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_combos_is_active ON combos(is_active);
CREATE INDEX IF NOT EXISTS idx_combos_combo_type ON combos(combo_type);
CREATE INDEX IF NOT EXISTS idx_combos_category ON combos(category_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_combo ON combo_items(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_items_product ON combo_items(product_id);
CREATE INDEX IF NOT EXISTS idx_combo_item_variants_combo ON combo_item_variants(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_item_variants_group ON combo_item_variants(combo_id, group_name);
CREATE INDEX IF NOT EXISTS idx_sale_combo_items_sale ON sale_combo_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_combo_items_combo ON sale_combo_items(combo_id);

-- Insert sample combos
INSERT INTO combos (code, name, description, combo_type, price, original_price, discount_percent, is_active, available_from_time, available_to_time) VALUES
('BREAKFAST-1', 'Desayuno Completo', 'Café + 2 tostadas + jugo de naranja', 'menu', 3500, 4200, 16.67, 1, '07:00:00', '11:00:00'),
('LUNCH-EXEC', 'Menú Ejecutivo', 'Entrada + plato principal + postre + bebida', 'menu', 6500, 8500, 23.53, 1, '12:00:00', '15:00:00'),
('PROMO-2X1', 'Promo 2x1 Hamburguesas', '2 hamburguesas + 2 papas fritas', 'promotion', 8900, 12000, 25.83, 1, NULL, NULL);

-- Comments:
-- Workflow:
-- 1. Create combo with base products
-- 2. Add combo_items (required items)
-- 3. Add combo_item_variants (optional/customizable choices)
-- 4. When selling: customer selects combo → chooses variants → sale_combo_items created
-- 5. Inventory deducted for each component product
--
-- Use cases:
-- - Breakfast combo: coffee + toast (fixed)
-- - Executive lunch: choose starter, main, dessert, drink (customizable)
-- - 2x1 promotions: 2 burgers at discount price
-- - Time-limited offers: happy hour 5-7pm
-- - Day-specific menus: Sunday brunch
--
-- Pricing logic:
-- - Fixed price = combo.price
-- - If customer picks premium variant → add additional_price
-- - Final price = combo.price + SUM(selected_variants.additional_price)
