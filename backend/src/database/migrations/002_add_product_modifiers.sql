-- Migration 002: Product Modifiers System
-- Adds support for product customization (modifiers and extras)
-- Date: 2025-01-16

-- ============================================
-- TABLE: modifier_groups
-- Groups of modifiers that can be applied to products
-- Example: "Ingredients to Remove", "Extra Toppings", "Cooking Level"
-- ============================================
CREATE TABLE IF NOT EXISTS modifier_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                    -- "Ingredientes", "Extras", "Cocción"
  description TEXT,                      -- Description for staff
  type TEXT NOT NULL DEFAULT 'optional', -- 'required', 'optional'
  min_selections INTEGER DEFAULT 0,      -- Minimum selections required
  max_selections INTEGER DEFAULT 1,      -- Maximum selections allowed (0 = unlimited)
  display_order INTEGER DEFAULT 0,       -- Order to display in UI
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CHECK (type IN ('required', 'optional')),
  CHECK (min_selections >= 0),
  CHECK (max_selections >= 0),
  CHECK (max_selections = 0 OR max_selections >= min_selections)
);

-- ============================================
-- TABLE: modifiers
-- Individual modifiers that belong to groups
-- Example: "Sin cebolla", "Extra queso", "Término medio"
-- ============================================
CREATE TABLE IF NOT EXISTS modifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,             -- Foreign key to modifier_groups
  name TEXT NOT NULL,                    -- "Sin cebolla", "Extra queso"
  code TEXT,                             -- Optional code for kitchen (e.g., "NC" = No Cebolla)
  price REAL DEFAULT 0.0,                -- Additional price (0 for removals, positive for extras)
  is_default BOOLEAN DEFAULT 0,          -- If true, automatically selected
  is_active BOOLEAN DEFAULT 1,
  display_order INTEGER DEFAULT 0,       -- Order within the group
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
  -- Note: Price can be negative for discounts (e.g., smaller portions)
);

-- ============================================
-- TABLE: product_modifier_groups
-- Association between products and modifier groups
-- Defines which modifier groups are available for each product
-- ============================================
CREATE TABLE IF NOT EXISTS product_modifier_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,           -- Foreign key to products
  modifier_group_id INTEGER NOT NULL,    -- Foreign key to modifier_groups
  is_required BOOLEAN DEFAULT 0,         -- Override group's requirement
  display_order INTEGER DEFAULT 0,       -- Order to show for this product
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (modifier_group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE,

  -- Ensure no duplicate group assignments per product
  UNIQUE(product_id, modifier_group_id)
);

-- ============================================
-- TABLE: order_item_modifiers
-- Stores which modifiers were selected for each order item
-- Links to order_items (from sales/orders module)
-- ============================================
CREATE TABLE IF NOT EXISTS order_item_modifiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_item_id INTEGER NOT NULL,        -- Foreign key to order_items or sale_items
  modifier_id INTEGER NOT NULL,          -- Foreign key to modifiers
  quantity INTEGER DEFAULT 1,            -- How many times this modifier was applied
  unit_price REAL DEFAULT 0.0,           -- Price at time of order (for history)
  total_price REAL DEFAULT 0.0,          -- quantity * unit_price
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (modifier_id) REFERENCES modifiers(id),
  CHECK (quantity > 0)
  -- Note: Prices can be negative for discounts
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_modifiers_group_id ON modifiers(group_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_active ON modifiers(is_active);
CREATE INDEX IF NOT EXISTS idx_product_modifier_groups_product ON product_modifier_groups(product_id);
CREATE INDEX IF NOT EXISTS idx_product_modifier_groups_group ON product_modifier_groups(modifier_group_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_item ON order_item_modifiers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_modifiers_modifier ON order_item_modifiers(modifier_id);

-- ============================================
-- SAMPLE DATA for testing
-- ============================================

-- Modifier Group: Ingredientes a Remover (no extra cost)
INSERT INTO modifier_groups (name, description, type, min_selections, max_selections, display_order)
VALUES ('Ingredientes a Remover', 'Ingredientes que el cliente NO quiere', 'optional', 0, 0, 1);

-- Modifier Group: Extras (with cost)
INSERT INTO modifier_groups (name, description, type, min_selections, max_selections, display_order)
VALUES ('Extras', 'Ingredientes adicionales', 'optional', 0, 0, 2);

-- Modifier Group: Nivel de Cocción (for meats)
INSERT INTO modifier_groups (name, description, type, min_selections, max_selections, display_order)
VALUES ('Nivel de Cocción', 'Punto de la carne', 'required', 1, 1, 3);

-- Modifier Group: Tamaño de Porción
INSERT INTO modifier_groups (name, description, type, min_selections, max_selections, display_order)
VALUES ('Tamaño', 'Tamaño de la porción', 'optional', 0, 1, 4);

-- Modifiers for "Ingredientes a Remover" (group_id = 1)
INSERT INTO modifiers (group_id, name, code, price, display_order) VALUES
(1, 'Sin cebolla', 'NC', 0, 1),
(1, 'Sin tomate', 'NT', 0, 2),
(1, 'Sin lechuga', 'NL', 0, 3),
(1, 'Sin queso', 'NQ', 0, 4),
(1, 'Sin sal', 'NS', 0, 5),
(1, 'Sin picante', 'NP', 0, 6);

-- Modifiers for "Extras" (group_id = 2)
INSERT INTO modifiers (group_id, name, code, price, display_order) VALUES
(2, 'Extra queso', 'EQ', 1.50, 1),
(2, 'Extra carne', 'EC', 2.50, 2),
(2, 'Extra bacon', 'EB', 2.00, 3),
(2, 'Extra aguacate', 'EA', 1.80, 4),
(2, 'Extra salsa', 'ES', 0.50, 5),
(2, 'Doble porción', 'DP', 3.00, 6);

-- Modifiers for "Nivel de Cocción" (group_id = 3)
INSERT INTO modifiers (group_id, name, code, price, display_order) VALUES
(3, 'Poco hecho', 'PH', 0, 1),
(3, 'Término medio', 'TM', 0, 2),
(3, 'Bien hecho', 'BH', 0, 3);

-- Modifiers for "Tamaño" (group_id = 4)
INSERT INTO modifiers (group_id, name, code, price, display_order) VALUES
(4, 'Pequeño', 'P', -1.00, 1),
(4, 'Normal', 'N', 0, 2),
(4, 'Grande', 'G', 1.50, 3),
(4, 'Extra Grande', 'XG', 3.00, 4);

-- ============================================
-- TRIGGERS for automatic timestamp updates
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_modifier_groups_timestamp
AFTER UPDATE ON modifier_groups
BEGIN
  UPDATE modifier_groups SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_modifiers_timestamp
AFTER UPDATE ON modifiers
BEGIN
  UPDATE modifiers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- NOTES:
-- 1. To assign modifiers to a product, insert into product_modifier_groups
-- 2. When an order is created, selected modifiers go into order_item_modifiers
-- 3. The total price of an order item should include modifier prices
-- 4. Use is_active to soft-delete modifiers instead of deleting records
-- ============================================
