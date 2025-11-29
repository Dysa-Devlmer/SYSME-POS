-- ============================================
-- MIGRATION: 015 - Suppliers & Purchases System
-- Description: Complete supplier and purchase order management
-- Date: 2025-11-20
-- ============================================

-- Drop tables if they exist (for development only)
DROP TABLE IF EXISTS purchase_order_items;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS supplier_payments;
DROP TABLE IF EXISTS suppliers;

-- ============================================
-- SUPPLIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Basic Information
  supplier_code TEXT UNIQUE NOT NULL, -- SUP-XXXX
  business_name TEXT NOT NULL,
  trade_name TEXT,
  tax_id TEXT, -- RUT in Chile

  -- Contact Information
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  website TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Chile',

  -- Business Details
  category TEXT, -- food, beverages, supplies, equipment, services
  payment_terms INTEGER DEFAULT 30, -- Days
  credit_limit REAL DEFAULT 0,
  tax_withholding_percentage REAL DEFAULT 0, -- For Chilean tax retention

  -- Banking
  bank_name TEXT,
  bank_account TEXT,
  account_type TEXT, -- checking, savings

  -- Status & Metrics
  is_active BOOLEAN DEFAULT 1,
  preferred BOOLEAN DEFAULT 0,
  rating INTEGER DEFAULT 0, -- 1-5 stars

  -- Tracking
  total_purchases REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  current_balance REAL DEFAULT 0, -- What we owe
  last_purchase_date DATE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,

  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- PURCHASE ORDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Identification
  po_number TEXT UNIQUE NOT NULL, -- PO-YYYYMMDD-XXXX
  supplier_id INTEGER NOT NULL,
  warehouse_id INTEGER,

  -- Order Details
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,

  -- Status
  status TEXT DEFAULT 'draft', -- draft, sent, confirmed, partial, received, cancelled

  -- Amounts
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  discount_amount REAL DEFAULT 0,
  shipping_cost REAL DEFAULT 0,
  other_costs REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,

  -- Payment
  payment_status TEXT DEFAULT 'pending', -- pending, partial, paid
  paid_amount REAL DEFAULT 0,
  balance_due REAL DEFAULT 0,

  -- Additional Info
  reference_number TEXT, -- Supplier's quote/invoice number
  delivery_address TEXT,
  shipping_method TEXT,
  notes TEXT,
  terms_and_conditions TEXT,

  -- Reception
  received_by INTEGER,
  received_date DATETIME,
  reception_notes TEXT,

  -- Approval
  approved_by INTEGER,
  approved_date DATETIME,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,

  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (received_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- PURCHASE ORDER ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  purchase_order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,

  -- Order Details
  quantity_ordered REAL NOT NULL,
  unit_price REAL NOT NULL,
  tax_rate REAL DEFAULT 19, -- IVA in Chile
  discount_percentage REAL DEFAULT 0,

  -- Calculated
  subtotal REAL GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  discount_amount REAL GENERATED ALWAYS AS (quantity_ordered * unit_price * discount_percentage / 100) STORED,
  tax_amount REAL GENERATED ALWAYS AS ((quantity_ordered * unit_price - (quantity_ordered * unit_price * discount_percentage / 100)) * tax_rate / 100) STORED,
  total REAL GENERATED ALWAYS AS (
    (quantity_ordered * unit_price) -
    (quantity_ordered * unit_price * discount_percentage / 100) +
    ((quantity_ordered * unit_price - (quantity_ordered * unit_price * discount_percentage / 100)) * tax_rate / 100)
  ) STORED,

  -- Reception
  quantity_received REAL DEFAULT 0,
  quantity_pending REAL GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

  -- Quality Control
  quantity_accepted REAL DEFAULT 0,
  quantity_rejected REAL DEFAULT 0,
  rejection_reason TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================
-- SUPPLIER PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS supplier_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Identification
  payment_number TEXT UNIQUE NOT NULL, -- PAY-YYYYMMDD-XXXX
  supplier_id INTEGER NOT NULL,
  purchase_order_id INTEGER, -- Optional, can be general payment

  -- Payment Details
  payment_date DATE NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL, -- cash, transfer, check, card, credit

  -- Method-specific Details
  reference_number TEXT, -- Check number, transfer ID, etc.
  bank_name TEXT,
  account_number TEXT,

  -- Status
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled, rejected

  -- Notes
  notes TEXT,
  attachment_url TEXT, -- Receipt/proof of payment

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,

  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id ON suppliers(tax_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_payment_status ON purchase_orders(payment_status);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_supplier_payments_number ON supplier_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_po ON supplier_payments(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_date ON supplier_payments(payment_date);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update suppliers timestamp
CREATE TRIGGER IF NOT EXISTS update_suppliers_timestamp
AFTER UPDATE ON suppliers
BEGIN
  UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update purchase_orders timestamp
CREATE TRIGGER IF NOT EXISTS update_purchase_orders_timestamp
AFTER UPDATE ON purchase_orders
BEGIN
  UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update purchase_order_items timestamp
CREATE TRIGGER IF NOT EXISTS update_po_items_timestamp
AFTER UPDATE ON purchase_order_items
BEGIN
  UPDATE purchase_order_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update supplier payments timestamp
CREATE TRIGGER IF NOT EXISTS update_supplier_payments_timestamp
AFTER UPDATE ON supplier_payments
BEGIN
  UPDATE supplier_payments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update PO totals when items change
CREATE TRIGGER IF NOT EXISTS update_po_totals_on_item_insert
AFTER INSERT ON purchase_order_items
BEGIN
  UPDATE purchase_orders
  SET
    subtotal = (
      SELECT COALESCE(SUM(subtotal - discount_amount), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ),
    tax_amount = (
      SELECT COALESCE(SUM(tax_amount), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ) + COALESCE(shipping_cost, 0) + COALESCE(other_costs, 0),
    balance_due = (
      SELECT COALESCE(SUM(total), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ) + COALESCE(shipping_cost, 0) + COALESCE(other_costs, 0) - COALESCE(paid_amount, 0)
  WHERE id = NEW.purchase_order_id;
END;

CREATE TRIGGER IF NOT EXISTS update_po_totals_on_item_update
AFTER UPDATE ON purchase_order_items
BEGIN
  UPDATE purchase_orders
  SET
    subtotal = (
      SELECT COALESCE(SUM(subtotal - discount_amount), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ),
    tax_amount = (
      SELECT COALESCE(SUM(tax_amount), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ) + COALESCE(shipping_cost, 0) + COALESCE(other_costs, 0),
    balance_due = (
      SELECT COALESCE(SUM(total), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = NEW.purchase_order_id
    ) + COALESCE(shipping_cost, 0) + COALESCE(other_costs, 0) - COALESCE(paid_amount, 0)
  WHERE id = NEW.purchase_order_id;
END;

CREATE TRIGGER IF NOT EXISTS update_po_totals_on_item_delete
AFTER DELETE ON purchase_order_items
BEGIN
  UPDATE purchase_orders
  SET
    subtotal = (
      SELECT COALESCE(SUM(subtotal - discount_amount), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = OLD.purchase_order_id
    ),
    tax_amount = (
      SELECT COALESCE(SUM(tax_amount), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = OLD.purchase_order_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = OLD.purchase_order_id
    ) + COALESCE(shipping_cost, 0) + COALESCE(other_costs, 0),
    balance_due = (
      SELECT COALESCE(SUM(total), 0)
      FROM purchase_order_items
      WHERE purchase_order_id = OLD.purchase_order_id
    ) + COALESCE(shipping_cost, 0) + COALESCE(other_costs, 0) - COALESCE(paid_amount, 0)
  WHERE id = OLD.purchase_order_id;
END;

-- Update supplier metrics when payment is made
CREATE TRIGGER IF NOT EXISTS update_supplier_on_payment_insert
AFTER INSERT ON supplier_payments
WHEN NEW.status = 'completed'
BEGIN
  UPDATE suppliers
  SET
    total_paid = total_paid + NEW.amount,
    current_balance = current_balance - NEW.amount
  WHERE id = NEW.supplier_id;

  UPDATE purchase_orders
  SET
    paid_amount = paid_amount + NEW.amount,
    balance_due = balance_due - NEW.amount,
    payment_status = CASE
      WHEN (balance_due - NEW.amount) <= 0 THEN 'paid'
      WHEN (balance_due - NEW.amount) < total_amount THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = NEW.purchase_order_id AND NEW.purchase_order_id IS NOT NULL;
END;

-- ============================================
-- VIEWS
-- ============================================

-- View: Active Suppliers
CREATE VIEW IF NOT EXISTS v_active_suppliers AS
SELECT
  s.id, s.supplier_code, s.business_name, s.trade_name,
  s.contact_person, s.email, s.phone, s.category,
  s.payment_terms, s.current_balance, s.total_purchases,
  s.rating, s.preferred,
  COUNT(DISTINCT po.id) as total_orders,
  MAX(po.order_date) as last_order_date
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
WHERE s.is_active = 1
GROUP BY s.id
ORDER BY s.business_name;

-- View: Pending Purchase Orders
CREATE VIEW IF NOT EXISTS v_pending_purchase_orders AS
SELECT
  po.id, po.po_number, po.order_date, po.expected_delivery_date,
  po.status, po.total_amount, po.payment_status, po.balance_due,
  s.supplier_code, s.business_name as supplier_name,
  COUNT(poi.id) as total_items,
  SUM(poi.quantity_pending) as total_pending_qty
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
WHERE po.status IN ('sent', 'confirmed', 'partial')
GROUP BY po.id
ORDER BY po.order_date DESC;

-- View: Supplier Balances
CREATE VIEW IF NOT EXISTS v_supplier_balances AS
SELECT
  s.id, s.supplier_code, s.business_name,
  s.total_purchases, s.total_paid, s.current_balance,
  COUNT(DISTINCT po.id) as pending_orders,
  SUM(CASE WHEN po.payment_status != 'paid' THEN po.balance_due ELSE 0 END) as total_owed
FROM suppliers s
LEFT JOIN purchase_orders po ON s.id = po.supplier_id
WHERE s.is_active = 1
GROUP BY s.id
HAVING s.current_balance > 0 OR total_owed > 0
ORDER BY s.current_balance DESC;

-- View: Purchase Order Details
CREATE VIEW IF NOT EXISTS v_purchase_order_details AS
SELECT
  po.id as po_id, po.po_number, po.order_date, po.expected_delivery_date,
  po.status, po.payment_status, po.total_amount, po.balance_due,
  s.id as supplier_id, s.business_name as supplier_name,
  poi.id as item_id, p.name as product_name, p.sku,
  poi.quantity_ordered, poi.quantity_received, poi.quantity_pending,
  poi.unit_price, poi.total as item_total
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
LEFT JOIN products p ON poi.product_id = p.id
ORDER BY po.order_date DESC, poi.id;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert sample supplier (optional - comment out for production)
/*
INSERT INTO suppliers (
  supplier_code, business_name, trade_name, tax_id,
  contact_person, email, phone, category,
  payment_terms, address, city, country
) VALUES (
  'SUP-0001', 'Distribuidora Alimentos Chile S.A.', 'AlimChile',
  '76.123.456-7', 'Juan Pérez', 'contacto@alimchile.cl',
  '+56222345678', 'food', 30,
  'Av. Providencia 1234', 'Santiago', 'Chile'
);
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This migration creates a complete supplier and purchase management system with:
-- - Suppliers with full contact and business details
-- - Purchase orders with approval workflow
-- - Purchase order items with automatic total calculation
-- - Supplier payments with status tracking
-- - Automatic balance and metrics updates
-- - Comprehensive views for reporting
-- - Triggers for data consistency
