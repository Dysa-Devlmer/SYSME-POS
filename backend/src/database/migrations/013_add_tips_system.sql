-- Migration 013: Tips System (Sistema de Propinas)
-- Adds support for configurable tips with multiple calculation methods
-- Date: 2025-01-19

-- ============================================
-- TABLE: tip_settings
-- Global configuration for tips system
-- ============================================
CREATE TABLE IF NOT EXISTS tip_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_enabled BOOLEAN DEFAULT 1,                     -- Enable/disable tips globally
  is_required BOOLEAN DEFAULT 0,                    -- Force tip selection
  default_method TEXT DEFAULT 'percentage',         -- 'percentage', 'fixed', 'custom'
  min_percentage REAL DEFAULT 0,                    -- Minimum tip percentage (e.g., 0%)
  max_percentage REAL DEFAULT 30,                   -- Maximum tip percentage (e.g., 30%)
  suggested_percentages TEXT DEFAULT '[10,15,20]',  -- JSON array of suggested percentages
  allow_custom_amount BOOLEAN DEFAULT 1,            -- Allow custom tip amounts
  apply_before_tax BOOLEAN DEFAULT 0,               -- Calculate tip on subtotal (true) or total (false)
  distribution_method TEXT DEFAULT 'waiters',       -- 'waiters', 'pool', 'kitchen_split', 'custom'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CHECK (default_method IN ('percentage', 'fixed', 'custom')),
  CHECK (min_percentage >= 0 AND min_percentage <= 100),
  CHECK (max_percentage >= 0 AND max_percentage <= 100),
  CHECK (distribution_method IN ('waiters', 'pool', 'kitchen_split', 'custom'))
);

-- ============================================
-- TABLE: tip_presets
-- Predefined tip options for quick selection
-- ============================================
CREATE TABLE IF NOT EXISTS tip_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                               -- "Buen Servicio", "Excelente", etc.
  description TEXT,
  percentage REAL DEFAULT 0,                        -- Percentage value (e.g., 15.0 for 15%)
  fixed_amount REAL DEFAULT 0,                      -- Fixed amount (if not percentage-based)
  is_percentage BOOLEAN DEFAULT 1,                  -- True for percentage, False for fixed amount
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  CHECK ((is_percentage = 1 AND percentage >= 0) OR (is_percentage = 0 AND fixed_amount >= 0))
);

-- ============================================
-- TABLE: sale_tips
-- Tracks tips applied to each sale
-- ============================================
CREATE TABLE IF NOT EXISTS sale_tips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,                         -- Foreign key to sales table
  tip_amount REAL NOT NULL DEFAULT 0,               -- Calculated tip amount
  tip_percentage REAL DEFAULT NULL,                 -- Percentage used (if applicable)
  tip_method TEXT DEFAULT 'percentage',             -- 'percentage', 'fixed', 'custom'
  calculation_base REAL DEFAULT 0,                  -- Base amount used for calculation
  preset_id INTEGER DEFAULT NULL,                   -- If a preset was used
  waiter_id INTEGER DEFAULT NULL,                   -- Waiter who served
  distribution_method TEXT DEFAULT 'waiters',       -- How tip should be distributed
  notes TEXT,                                       -- Additional notes
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (preset_id) REFERENCES tip_presets(id) ON DELETE SET NULL,
  CHECK (tip_amount >= 0),
  CHECK (tip_method IN ('percentage', 'fixed', 'custom'))
);

-- ============================================
-- TABLE: tip_distribution
-- Tracks how tips are distributed among staff
-- ============================================
CREATE TABLE IF NOT EXISTS tip_distribution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_tip_id INTEGER NOT NULL,                    -- Foreign key to sale_tips
  user_id INTEGER NOT NULL,                        -- Staff member receiving tip portion
  amount REAL NOT NULL DEFAULT 0,                  -- Amount assigned to this staff member
  percentage REAL DEFAULT 0,                       -- Percentage of total tip
  role TEXT DEFAULT 'waiter',                      -- 'waiter', 'kitchen', 'bar', etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (sale_tip_id) REFERENCES sale_tips(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (amount >= 0),
  CHECK (percentage >= 0 AND percentage <= 100)
);

-- ============================================
-- Add tip columns to sales table
-- ============================================
ALTER TABLE sales ADD COLUMN tip_amount REAL DEFAULT 0;
ALTER TABLE sales ADD COLUMN tip_included BOOLEAN DEFAULT 0;

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sale_tips_sale_id ON sale_tips(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_tips_waiter_id ON sale_tips(waiter_id);
CREATE INDEX IF NOT EXISTS idx_sale_tips_created_at ON sale_tips(created_at);
CREATE INDEX IF NOT EXISTS idx_tip_distribution_sale_tip_id ON tip_distribution(sale_tip_id);
CREATE INDEX IF NOT EXISTS idx_tip_distribution_user_id ON tip_distribution(user_id);
CREATE INDEX IF NOT EXISTS idx_tip_presets_active ON tip_presets(is_active);

-- ============================================
-- INITIAL DATA
-- ============================================

-- Default tip settings
INSERT INTO tip_settings (
  is_enabled,
  is_required,
  default_method,
  min_percentage,
  max_percentage,
  suggested_percentages,
  allow_custom_amount,
  apply_before_tax,
  distribution_method
) VALUES (
  1,                          -- Enabled
  0,                          -- Not required
  'percentage',               -- Default to percentage
  0,                          -- Min 0%
  30,                         -- Max 30%
  '[10, 15, 20]',            -- Suggested: 10%, 15%, 20%
  1,                          -- Allow custom
  0,                          -- Calculate on total (after tax)
  'waiters'                   -- Distribute to waiters
);

-- Default tip presets
INSERT INTO tip_presets (name, description, percentage, is_percentage, display_order, is_active) VALUES
('Sin Propina', 'No agregar propina', 0, 1, 1, 1),
('Básica', 'Servicio estándar (10%)', 10, 1, 2, 1),
('Buena', 'Buen servicio (15%)', 15, 1, 3, 1),
('Excelente', 'Servicio excepcional (20%)', 20, 1, 4, 1),
('Generosa', 'Excelente atención (25%)', 25, 1, 5, 1);

-- Fixed amount presets (optional)
INSERT INTO tip_presets (name, description, fixed_amount, is_percentage, display_order, is_active) VALUES
('Redondeo', 'Redondear a la decena superior', 0, 0, 6, 1);

-- ============================================
-- TRIGGERS for automatic timestamp updates
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_tip_settings_timestamp
AFTER UPDATE ON tip_settings
BEGIN
  UPDATE tip_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_tip_presets_timestamp
AFTER UPDATE ON tip_presets
BEGIN
  UPDATE tip_presets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- VIEWS for reporting
-- ============================================

-- Daily tips summary
CREATE VIEW IF NOT EXISTS v_daily_tips AS
SELECT
  DATE(st.created_at) as date,
  COUNT(DISTINCT st.sale_id) as sales_with_tips,
  SUM(st.tip_amount) as total_tips,
  AVG(st.tip_amount) as avg_tip,
  AVG(CASE WHEN st.tip_percentage IS NOT NULL THEN st.tip_percentage ELSE 0 END) as avg_tip_percentage
FROM sale_tips st
GROUP BY DATE(st.created_at);

-- Tips by waiter
CREATE VIEW IF NOT EXISTS v_waiter_tips AS
SELECT
  st.waiter_id,
  u.username as waiter_name,
  DATE(st.created_at) as date,
  COUNT(*) as num_sales,
  SUM(st.tip_amount) as total_tips,
  AVG(st.tip_amount) as avg_tip
FROM sale_tips st
LEFT JOIN users u ON st.waiter_id = u.id
GROUP BY st.waiter_id, DATE(st.created_at);

-- Tips distribution summary
CREATE VIEW IF NOT EXISTS v_tips_distribution_summary AS
SELECT
  td.user_id,
  u.username,
  u.role,
  DATE(st.created_at) as date,
  COUNT(DISTINCT td.sale_tip_id) as num_tips_received,
  SUM(td.amount) as total_amount,
  AVG(td.amount) as avg_amount
FROM tip_distribution td
JOIN sale_tips st ON td.sale_tip_id = st.id
JOIN users u ON td.user_id = u.id
GROUP BY td.user_id, DATE(st.created_at);

-- ============================================
-- NOTES:
-- 1. Tips can be calculated before or after tax based on settings
-- 2. Suggested percentages are stored as JSON array for flexibility
-- 3. Distribution supports multiple methods: all to waiter, pool split, kitchen share
-- 4. Presets allow for quick selection in POS
-- 5. Custom amounts are always allowed unless disabled in settings
-- 6. All amounts are in the local currency
-- 7. Tips are tracked per sale for accurate reporting
-- 8. Distribution table allows splitting tips among multiple staff
-- ============================================
