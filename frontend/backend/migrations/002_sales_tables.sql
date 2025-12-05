-- =====================================================
-- SYSME POS - Sales & Orders Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- TABLES (Mesas) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    table_number TEXT NOT NULL,
    section TEXT, -- patio, interior, bar, etc.
    capacity INTEGER DEFAULT 4,
    shape TEXT DEFAULT 'square' CHECK(shape IN ('square', 'round', 'rectangle', 'bar')),
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'reserved', 'maintenance', 'inactive')),
    current_order_id INTEGER,
    qr_code TEXT, -- QR code for digital menu
    position_x INTEGER, -- for visual layout
    position_y INTEGER,
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- =====================================================
-- ORDERS (Órdenes/Comandas) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    order_number TEXT UNIQUE NOT NULL,

    -- Order Type
    type TEXT NOT NULL CHECK(type IN ('dine_in', 'takeout', 'delivery', 'drive_thru', 'online')),
    source TEXT DEFAULT 'pos' CHECK(source IN ('pos', 'online', 'app', 'phone', 'uber_eats', 'rappi', 'didi_food')),

    -- Table Info (for dine-in)
    table_id INTEGER,
    guests_count INTEGER,

    -- Customer Info
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,

    -- Delivery Info
    delivery_address TEXT,
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    delivery_instructions TEXT,
    delivery_platform TEXT,
    delivery_platform_order_id TEXT,

    -- Staff
    waiter_id INTEGER,
    cashier_id INTEGER,
    chef_id INTEGER,

    -- Financials
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    service_charge DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,

    -- Discounts
    discount_type TEXT CHECK(discount_type IN (NULL, 'percentage', 'fixed', 'coupon', 'loyalty')),
    discount_reason TEXT,
    coupon_code TEXT,

    -- Payment
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid', 'refunded', 'cancelled')),
    paid_amount DECIMAL(10,2) DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed', 'cancelled')),
    kitchen_status TEXT DEFAULT 'pending' CHECK(kitchen_status IN ('pending', 'preparing', 'ready', 'served')),

    -- Times
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    kitchen_started_at DATETIME,
    ready_at DATETIME,
    delivered_at DATETIME,
    completed_at DATETIME,
    cancelled_at DATETIME,

    -- Notes
    notes TEXT,
    cancellation_reason TEXT,
    special_instructions TEXT,

    -- Metadata
    metadata TEXT, -- JSON

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (waiter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (chef_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- ORDER ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,

    -- Item Details
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,

    -- Pricing
    base_price DECIMAL(10,2) NOT NULL,
    modifiers_total DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,

    -- Kitchen
    kitchen_status TEXT DEFAULT 'pending' CHECK(kitchen_status IN ('pending', 'preparing', 'ready', 'served', 'cancelled')),
    preparation_time INTEGER, -- minutes
    kitchen_notes TEXT,

    -- Modifiers (as JSON)
    modifiers TEXT, -- JSON array of applied modifiers

    -- Special requests
    special_instructions TEXT,

    -- Status
    is_cancelled BOOLEAN DEFAULT 0,
    cancelled_reason TEXT,

    -- Metadata
    metadata TEXT, -- JSON

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    transaction_id TEXT UNIQUE,

    -- Payment Details
    amount DECIMAL(10,2) NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('cash', 'card', 'debit', 'credit', 'transfer', 'mobile', 'check', 'voucher', 'loyalty_points', 'other')),

    -- Card Details
    card_type TEXT, -- visa, mastercard, amex
    card_last4 TEXT,
    card_brand TEXT,

    -- Digital Payment
    gateway TEXT, -- stripe, paypal, mercadopago, etc.
    gateway_transaction_id TEXT,
    gateway_response TEXT, -- JSON

    -- Status
    status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),

    -- Processing
    processed_by INTEGER,
    processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Refund
    refunded_amount DECIMAL(10,2) DEFAULT 0,
    refunded_at DATETIME,
    refund_reason TEXT,

    -- Notes
    notes TEXT,

    -- Metadata
    metadata TEXT, -- JSON

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- CASH SESSIONS (Turnos de Caja) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    register_number TEXT,

    -- User
    user_id INTEGER NOT NULL,

    -- Session Details
    opening_amount DECIMAL(10,2) NOT NULL,
    closing_amount DECIMAL(10,2),
    expected_amount DECIMAL(10,2),
    difference DECIMAL(10,2),

    -- Counts by Payment Method
    cash_sales DECIMAL(10,2) DEFAULT 0,
    card_sales DECIMAL(10,2) DEFAULT 0,
    other_sales DECIMAL(10,2) DEFAULT 0,

    -- Transactions
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_refunds DECIMAL(10,2) DEFAULT 0,
    total_discounts DECIMAL(10,2) DEFAULT 0,
    transactions_count INTEGER DEFAULT 0,

    -- Cash Movements
    cash_in DECIMAL(10,2) DEFAULT 0,
    cash_out DECIMAL(10,2) DEFAULT 0,

    -- Status
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'reconciled')),

    -- Times
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,

    -- Notes
    opening_notes TEXT,
    closing_notes TEXT,

    -- Metadata
    metadata TEXT, -- JSON with denomination counts, etc.

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- INVOICES (Facturas) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    order_id INTEGER,

    -- Invoice Details
    invoice_number TEXT UNIQUE NOT NULL,
    series TEXT,
    folio TEXT,

    -- Customer
    customer_id INTEGER,
    customer_name TEXT NOT NULL,
    customer_tax_id TEXT NOT NULL,
    customer_address TEXT,
    customer_email TEXT,

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,

    -- Tax Details
    tax_breakdown TEXT, -- JSON with tax details

    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'issued', 'sent', 'paid', 'cancelled')),

    -- SAT/CFDI (Mexico)
    uuid TEXT UNIQUE, -- UUID del CFDI
    cfdi_xml TEXT, -- XML completo
    cfdi_pdf_url TEXT,
    sat_certified_at DATETIME,

    -- Cancellation
    is_cancelled BOOLEAN DEFAULT 0,
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    cancellation_uuid TEXT,

    -- Dates
    issue_date DATE NOT NULL,
    due_date DATE,
    paid_date DATE,

    -- Notes
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_tables_location ON tables(location_id);
CREATE INDEX IF NOT EXISTS idx_tables_status ON tables(status);

CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_location ON orders(location_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_status ON order_items(kitchen_status);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_location ON cash_sessions(location_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_uuid ON invoices(uuid);
