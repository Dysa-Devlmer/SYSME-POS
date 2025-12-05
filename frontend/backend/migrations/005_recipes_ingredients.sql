-- =====================================================
-- SYSME POS - Recipes & Ingredients Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- INGREDIENTS (Raw Materials)
-- =====================================================
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    category TEXT, -- dairy, meat, vegetables, spices, etc.
    unit_of_measure TEXT NOT NULL, -- kg, g, l, ml, units, etc.

    -- Costing
    unit_cost DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'MXN',

    -- Suppliers
    preferred_supplier_id INTEGER,
    supplier_sku TEXT,

    -- Storage
    storage_location TEXT,
    storage_temperature_min DECIMAL(5,2),
    storage_temperature_max DECIMAL(5,2),
    shelf_life_days INTEGER,

    -- Allergens & Dietary
    is_allergen BOOLEAN DEFAULT 0,
    allergen_type TEXT, -- dairy, nuts, gluten, etc.
    dietary_info TEXT, -- JSON: vegan, organic, etc.

    -- Status
    is_active BOOLEAN DEFAULT 1,

    notes TEXT,
    metadata TEXT, -- JSON

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- =====================================================
-- RECIPES
-- =====================================================
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    product_id INTEGER, -- Link to final product

    name TEXT NOT NULL,
    description TEXT,
    category TEXT,

    -- Yield
    yield_quantity DECIMAL(10,3) NOT NULL, -- how many portions/units this recipe makes
    yield_unit TEXT NOT NULL, -- portions, kg, liters, etc.

    -- Time
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    total_time INTEGER GENERATED ALWAYS AS (prep_time + cook_time) STORED,

    -- Difficulty
    difficulty TEXT DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),

    -- Kitchen
    kitchen_station TEXT, -- grill, oven, fryer, etc.

    -- Instructions
    instructions TEXT, -- Step-by-step instructions

    -- Costing
    cost_per_yield DECIMAL(10,2), -- calculated from ingredients
    cost_per_portion DECIMAL(10,2),

    -- Pricing
    suggested_price DECIMAL(10,2),
    target_food_cost_percentage DECIMAL(5,2) DEFAULT 30.00,

    -- Media
    image_url TEXT,
    video_url TEXT,

    -- Dietary Info
    calories_per_portion INTEGER,
    dietary_info TEXT, -- JSON

    -- Status
    is_active BOOLEAN DEFAULT 1,
    version INTEGER DEFAULT 1,

    notes TEXT,
    metadata TEXT, -- JSON

    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- RECIPE INGREDIENTS (Bill of Materials)
-- =====================================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,

    quantity DECIMAL(10,3) NOT NULL,
    unit TEXT NOT NULL,

    -- Costing
    unit_cost DECIMAL(10,2), -- cost at time of recipe creation
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

    -- Preparation notes
    preparation_notes TEXT, -- diced, chopped, etc.

    -- Optional/Substitutable
    is_optional BOOLEAN DEFAULT 0,
    substitutes TEXT, -- JSON array of ingredient IDs

    sort_order INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
);

-- =====================================================
-- RECIPE VERSIONS (Version History)
-- =====================================================
CREATE TABLE IF NOT EXISTS recipe_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    version INTEGER NOT NULL,

    -- Snapshot of recipe at this version
    recipe_data TEXT NOT NULL, -- JSON snapshot
    ingredients_data TEXT NOT NULL, -- JSON snapshot of ingredients

    -- Version info
    change_description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- PRODUCTION BATCHES (Recipe Production Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS production_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,

    batch_number TEXT UNIQUE NOT NULL,

    -- Production Details
    quantity_produced DECIMAL(10,3) NOT NULL,
    unit TEXT NOT NULL,

    -- Costing
    ingredient_cost DECIMAL(10,2),
    labor_cost DECIMAL(10,2),
    overhead_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (ingredient_cost + labor_cost + overhead_cost) STORED,
    cost_per_unit DECIMAL(10,2),

    -- Production
    produced_by INTEGER,
    production_date DATETIME NOT NULL,
    expiration_date DATE,

    -- Quality Control
    quality_status TEXT DEFAULT 'pending' CHECK(quality_status IN ('pending', 'approved', 'rejected')),
    quality_checked_by INTEGER,
    quality_notes TEXT,

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired', 'wasted')),

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE RESTRICT,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (produced_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (quality_checked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- WASTE TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS waste_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,

    -- Item Details
    item_type TEXT NOT NULL CHECK(item_type IN ('ingredient', 'product', 'prepared_food')),
    item_id INTEGER NOT NULL, -- ingredient_id or product_id
    item_name TEXT NOT NULL,

    -- Waste Details
    quantity DECIMAL(10,3) NOT NULL,
    unit TEXT NOT NULL,

    -- Costing
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

    -- Reason
    reason TEXT NOT NULL CHECK(reason IN ('spoilage', 'expiration', 'preparation_error', 'customer_complaint', 'overproduction', 'contamination', 'other')),
    detailed_reason TEXT,

    -- Tracking
    waste_date DATE NOT NULL,
    reported_by INTEGER NOT NULL,

    -- Prevention
    preventable BOOLEAN DEFAULT 1,
    corrective_action TEXT,

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- MENU ENGINEERING (Profitability Analysis)
-- =====================================================
CREATE TABLE IF NOT EXISTS menu_engineering (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,

    -- Analysis Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Sales Data
    quantity_sold INTEGER NOT NULL,
    total_revenue DECIMAL(10,2) NOT NULL,

    -- Costs
    food_cost DECIMAL(10,2) NOT NULL,
    food_cost_percentage DECIMAL(5,2) GENERATED ALWAYS AS ((food_cost / total_revenue) * 100) STORED,

    -- Contribution Margin
    contribution_margin DECIMAL(10,2) GENERATED ALWAYS AS (total_revenue - food_cost) STORED,

    -- Menu Mix
    menu_mix_percentage DECIMAL(5,2), -- % of total items sold

    -- Classification
    classification TEXT CHECK(classification IN ('star', 'plow_horse', 'puzzle', 'dog')),
    -- Star: High profit, High popularity
    -- Plow Horse: Low profit, High popularity
    -- Puzzle: High profit, Low popularity
    -- Dog: Low profit, Low popularity

    -- Recommendations
    recommendation TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_ingredients_company ON ingredients(company_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier ON ingredients(preferred_supplier_id);

CREATE INDEX IF NOT EXISTS idx_recipes_company ON recipes(company_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe ON recipe_versions(recipe_id);

CREATE INDEX IF NOT EXISTS idx_production_batches_recipe ON production_batches(recipe_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_location ON production_batches(location_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_date ON production_batches(production_date);

CREATE INDEX IF NOT EXISTS idx_waste_location ON waste_tracking(location_id);
CREATE INDEX IF NOT EXISTS idx_waste_date ON waste_tracking(waste_date);
CREATE INDEX IF NOT EXISTS idx_waste_reason ON waste_tracking(reason);

CREATE INDEX IF NOT EXISTS idx_menu_eng_product ON menu_engineering(product_id);
CREATE INDEX IF NOT EXISTS idx_menu_eng_location ON menu_engineering(location_id);
CREATE INDEX IF NOT EXISTS idx_menu_eng_period ON menu_engineering(period_start, period_end);
