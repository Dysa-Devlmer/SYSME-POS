-- =====================================================
-- SYSME POS - Customers & Suppliers Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- CUSTOMERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    -- Basic Info
    customer_number TEXT UNIQUE,
    type TEXT DEFAULT 'individual' CHECK(type IN ('individual', 'business')),
    first_name TEXT,
    last_name TEXT,
    business_name TEXT,
    tax_id TEXT, -- RFC, Tax ID, etc.

    -- Contact
    email TEXT,
    phone TEXT,
    mobile TEXT,
    website TEXT,

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'MX',

    -- Billing Address (if different)
    billing_address_line1 TEXT,
    billing_address_line2 TEXT,
    billing_city TEXT,
    billing_state TEXT,
    billing_postal_code TEXT,
    billing_country TEXT,

    -- Demographics
    date_of_birth DATE,
    gender TEXT CHECK(gender IN (NULL, 'male', 'female', 'other', 'prefer_not_to_say')),
    language TEXT DEFAULT 'es',

    -- Loyalty
    loyalty_tier TEXT DEFAULT 'bronze' CHECK(loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
    loyalty_points INTEGER DEFAULT 0,
    loyalty_joined_date DATE,

    -- Marketing
    email_verified BOOLEAN DEFAULT 0,
    phone_verified BOOLEAN DEFAULT 0,
    accepts_marketing BOOLEAN DEFAULT 1,
    accepts_sms BOOLEAN DEFAULT 0,

    -- Statistics
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    last_order_date DATE,
    first_order_date DATE,

    -- Credit
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,

    -- Preferences
    favorite_location_id INTEGER,
    dietary_preferences TEXT, -- JSON array
    allergies TEXT, -- JSON array
    preferred_payment_method TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blocked', 'vip')),
    blocked_reason TEXT,

    -- Tags
    tags TEXT, -- JSON array

    -- Notes
    notes TEXT,

    -- Metadata
    metadata TEXT, -- JSON

    -- Avatar
    avatar_url TEXT,

    -- Registration Source
    source TEXT DEFAULT 'pos' CHECK(source IN ('pos', 'online', 'app', 'import', 'referral', 'walk_in')),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (favorite_location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- =====================================================
-- CUSTOMER ADDRESSES (Multiple addresses per customer)
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    label TEXT, -- home, work, etc.
    is_default BOOLEAN DEFAULT 0,
    is_billing BOOLEAN DEFAULT 0,

    recipient_name TEXT,
    phone TEXT,

    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'MX',

    -- Geolocation
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),

    -- Delivery notes
    delivery_instructions TEXT,

    -- Verification
    is_verified BOOLEAN DEFAULT 0,
    verified_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- =====================================================
-- CUSTOMER PAYMENT METHODS
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    type TEXT NOT NULL CHECK(type IN ('card', 'bank_account', 'digital_wallet')),
    is_default BOOLEAN DEFAULT 0,

    -- Card Details
    card_brand TEXT, -- visa, mastercard, amex
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    card_holder_name TEXT,

    -- Bank Account
    bank_name TEXT,
    account_last4 TEXT,
    account_holder_name TEXT,

    -- Digital Wallet
    wallet_provider TEXT, -- paypal, mercadopago, etc.
    wallet_email TEXT,

    -- Gateway Token (encrypted)
    gateway_customer_id TEXT,
    gateway_payment_method_id TEXT,

    -- Status
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- =====================================================
-- SUPPLIERS (Proveedores) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    -- Basic Info
    supplier_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT,

    -- Contact
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    website TEXT,

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'MX',

    -- Business Details
    business_type TEXT, -- distributor, manufacturer, wholesaler, etc.
    industry TEXT,
    products_supplied TEXT, -- JSON array

    -- Payment Terms
    payment_terms TEXT DEFAULT 'net_30' CHECK(payment_terms IN ('immediate', 'net_7', 'net_15', 'net_30', 'net_60', 'net_90', 'custom')),
    payment_terms_days INTEGER,
    currency TEXT DEFAULT 'MXN',

    -- Credit
    credit_limit DECIMAL(10,2) DEFAULT 0,
    current_balance DECIMAL(10,2) DEFAULT 0,

    -- Bank Details
    bank_name TEXT,
    bank_account_number TEXT,
    bank_routing_number TEXT,
    swift_code TEXT,

    -- Statistics
    total_orders INTEGER DEFAULT 0,
    total_purchased DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,
    last_order_date DATE,
    first_order_date DATE,

    -- Rating
    rating DECIMAL(3,2), -- 0.00 to 5.00
    on_time_delivery_rate DECIMAL(5,2), -- percentage

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'blocked', 'preferred')),
    blocked_reason TEXT,

    -- Documents
    documents TEXT, -- JSON array of document URLs

    -- Tags
    tags TEXT, -- JSON array

    -- Notes
    notes TEXT,

    -- Metadata
    metadata TEXT, -- JSON

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- =====================================================
-- SUPPLIER CONTACTS
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    position TEXT,
    department TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    is_primary BOOLEAN DEFAULT 0,
    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

-- =====================================================
-- PURCHASE ORDERS (Órdenes de Compra)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    supplier_id INTEGER NOT NULL,

    -- PO Details
    po_number TEXT UNIQUE NOT NULL,
    reference_number TEXT, -- supplier's quote/reference

    -- Amounts
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,

    -- Status
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'cancelled')),

    -- Dates
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    delivery_date DATE,

    -- Shipping
    shipping_address TEXT,
    shipping_method TEXT,
    tracking_number TEXT,

    -- Users
    created_by INTEGER NOT NULL,
    approved_by INTEGER,

    -- Payment
    payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'paid')),
    paid_amount DECIMAL(10,2) DEFAULT 0,

    -- Notes
    notes TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- PURCHASE ORDER ITEMS
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    variant_id INTEGER,

    quantity_ordered DECIMAL(10,3) NOT NULL,
    quantity_received DECIMAL(10,3) DEFAULT 0,
    quantity_pending DECIMAL(10,3) GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

    unit_cost DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost + tax_amount) STORED,

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_loyalty ON customers(loyalty_tier);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_payment_methods_customer ON customer_payment_methods(customer_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_number ON suppliers(supplier_number);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON purchase_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product ON purchase_order_items(product_id);
