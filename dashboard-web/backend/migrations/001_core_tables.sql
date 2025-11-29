-- =====================================================
-- SYSME POS - Core Tables Migration
-- =====================================================
-- Creates fundamental tables for the POS system
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- COMPANIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'MX',
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    timezone TEXT DEFAULT 'America/Mexico_City',
    currency TEXT DEFAULT 'MXN',
    locale TEXT DEFAULT 'es-MX',
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    settings TEXT, -- JSON with company-specific settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- LOCATIONS (BRANCHES/STORES) TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'MX',
    phone TEXT,
    email TEXT,
    manager_id INTEGER,
    type TEXT DEFAULT 'restaurant' CHECK(type IN ('restaurant', 'bar', 'cafe', 'food_truck', 'ghost_kitchen')),
    capacity INTEGER, -- max dining capacity
    tables_count INTEGER DEFAULT 0,
    kitchen_count INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
    opening_hours TEXT, -- JSON with schedule
    settings TEXT, -- JSON with location-specific settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- USERS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    location_id INTEGER,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'manager', 'cashier', 'waiter', 'chef', 'bartender', 'delivery', 'viewer')),
    pin TEXT, -- 4-6 digit PIN for quick login
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended', 'terminated')),
    hourly_rate DECIMAL(10,2),
    commission_rate DECIMAL(5,2), -- percentage
    employee_id TEXT UNIQUE,
    hire_date DATE,
    termination_date DATE,
    last_login DATETIME,
    login_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    refresh_token TEXT,
    refresh_token_expires DATETIME,
    preferences TEXT, -- JSON with user preferences
    permissions TEXT, -- JSON with custom permissions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- =====================================================
-- CATEGORIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    parent_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    sort_order INTEGER DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =====================================================
-- PRODUCTS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    category_id INTEGER,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'simple' CHECK(type IN ('simple', 'variable', 'combo', 'service')),
    unit_of_measure TEXT DEFAULT 'unit',
    base_price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    tax_rate DECIMAL(5,2) DEFAULT 0,
    is_taxable BOOLEAN DEFAULT 1,

    -- Inventory
    track_inventory BOOLEAN DEFAULT 1,
    stock_quantity DECIMAL(10,3) DEFAULT 0,
    min_stock_level DECIMAL(10,3) DEFAULT 0,
    max_stock_level DECIMAL(10,3),
    reorder_point DECIMAL(10,3),
    reorder_quantity DECIMAL(10,3),

    -- Sales
    is_available BOOLEAN DEFAULT 1,
    is_featured BOOLEAN DEFAULT 0,
    available_for_delivery BOOLEAN DEFAULT 1,
    available_for_pickup BOOLEAN DEFAULT 1,
    available_for_dine_in BOOLEAN DEFAULT 1,
    preparation_time INTEGER DEFAULT 15, -- minutes

    -- Media
    image_url TEXT,
    images TEXT, -- JSON array of image URLs

    -- Attributes
    tags TEXT, -- JSON array
    allergens TEXT, -- JSON array
    dietary_info TEXT, -- JSON: vegan, gluten-free, etc.

    -- Modifiers
    has_variants BOOLEAN DEFAULT 0,
    has_modifiers BOOLEAN DEFAULT 0,

    -- Kitchen
    kitchen_station TEXT, -- grill, fryer, salad, etc.
    recipe_id INTEGER,

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'discontinued', 'out_of_stock')),

    -- Metadata
    metadata TEXT, -- JSON for additional data
    sort_order INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
);

-- =====================================================
-- PRODUCT VARIANTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS product_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    barcode TEXT UNIQUE,
    name TEXT NOT NULL,
    attributes TEXT NOT NULL, -- JSON: {"size": "Large", "color": "Red"}
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    cost_adjustment DECIMAL(10,2) DEFAULT 0,
    stock_quantity DECIMAL(10,3) DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================
-- MODIFIERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'single' CHECK(type IN ('single', 'multiple')),
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- =====================================================
-- MODIFIER OPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS modifier_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modifier_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (modifier_id) REFERENCES modifiers(id) ON DELETE CASCADE
);

-- =====================================================
-- PRODUCT MODIFIERS (Link Table)
-- =====================================================
CREATE TABLE IF NOT EXISTS product_modifiers (
    product_id INTEGER NOT NULL,
    modifier_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, modifier_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (modifier_id) REFERENCES modifiers(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_locations_company ON locations(company_id);
CREATE INDEX IF NOT EXISTS idx_locations_status ON locations(status);

CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_modifiers_company ON modifiers(company_id);
CREATE INDEX IF NOT EXISTS idx_modifier_options_modifier ON modifier_options(modifier_id);

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Default Company
INSERT OR IGNORE INTO companies (id, name, legal_name, tax_id, currency, status)
VALUES (1, 'SYSME Demo Restaurant', 'SYSME Demo Restaurant S.A. de C.V.', 'DEMO123456XXX', 'MXN', 'active');

-- Default Location
INSERT OR IGNORE INTO locations (id, company_id, name, code, type, status)
VALUES (1, 1, 'Main Branch', 'MAIN', 'restaurant', 'active');

-- Default Admin User (password: admin123)
INSERT OR IGNORE INTO users (id, company_id, location_id, username, email, password_hash, first_name, last_name, role, status)
VALUES (1, 1, 1, 'admin', 'admin@sysme.com', '$2b$10$rJZeEQbQXqZKZqVQXqZKZeEQbQXqZKZqVQXqZKZeEQbQXqZKZqVQX', 'System', 'Administrator', 'super_admin', 'active');

-- Default Categories
INSERT OR IGNORE INTO categories (company_id, name, description, icon, color, sort_order)
VALUES
    (1, 'Bebidas', 'Bebidas y refrescos', '🥤', '#3B82F6', 1),
    (1, 'Comida', 'Platillos principales', '🍽️', '#EF4444', 2),
    (1, 'Postres', 'Postres y dulces', '🍰', '#F59E0B', 3),
    (1, 'Entradas', 'Entradas y aperitivos', '🍟', '#10B981', 4);
