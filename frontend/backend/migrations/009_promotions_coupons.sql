-- =====================================================
-- SYSME POS - Promotions & Coupons Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- PROMOTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN (
        'percentage_discount', 'fixed_discount', 'buy_x_get_y',
        'bundle', 'happy_hour', 'combo', 'free_item'
    )),

    -- Discount Details
    discount_type TEXT CHECK(discount_type IN (NULL, 'percentage', 'fixed')),
    discount_value DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),

    -- Buy X Get Y
    buy_quantity INTEGER,
    get_quantity INTEGER,
    get_discount_percentage DECIMAL(5,2) DEFAULT 100.00, -- 100% = free

    -- Conditions
    min_purchase_amount DECIMAL(10,2),
    min_items_quantity INTEGER,

    -- Applicable Products
    applicable_to TEXT NOT NULL CHECK(applicable_to IN ('all', 'categories', 'products', 'bundles')),
    category_ids TEXT, -- JSON array
    product_ids TEXT, -- JSON array

    -- Excluded Products
    excluded_category_ids TEXT, -- JSON array
    excluded_product_ids TEXT, -- JSON array

    -- Bundled Items (for bundle promotions)
    bundle_items TEXT, -- JSON: [{"product_id": 1, "quantity": 2, "price": 50}]

    -- Time Restrictions
    valid_from DATETIME,
    valid_until DATETIME,

    -- Day/Time Restrictions
    valid_days TEXT, -- JSON: ['monday', 'tuesday', ...]
    valid_hours_start TIME,
    valid_hours_end TIME,

    -- Location Restrictions
    location_ids TEXT, -- JSON array, NULL = all locations

    -- Order Type Restrictions
    valid_for_dine_in BOOLEAN DEFAULT 1,
    valid_for_takeout BOOLEAN DEFAULT 1,
    valid_for_delivery BOOLEAN DEFAULT 1,

    -- Usage Limits
    max_uses INTEGER, -- total uses across all customers
    max_uses_per_customer INTEGER,
    current_uses INTEGER DEFAULT 0,

    -- Combination Rules
    can_combine_with_other_promos BOOLEAN DEFAULT 0,
    can_combine_with_coupons BOOLEAN DEFAULT 1,
    can_combine_with_loyalty BOOLEAN DEFAULT 1,

    -- Priority
    priority INTEGER DEFAULT 0, -- higher = applied first

    -- Status
    is_active BOOLEAN DEFAULT 1,
    is_automatic BOOLEAN DEFAULT 1, -- auto-apply if conditions met

    -- Display
    display_name TEXT,
    banner_image_url TEXT,
    terms_and_conditions TEXT,

    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- COUPONS
-- =====================================================
CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    type TEXT NOT NULL CHECK(type IN ('percentage_discount', 'fixed_discount', 'free_shipping', 'free_item')),

    -- Discount
    discount_type TEXT CHECK(discount_type IN (NULL, 'percentage', 'fixed')),
    discount_value DECIMAL(10,2),
    max_discount_amount DECIMAL(10,2),

    -- Free Item
    free_product_id INTEGER,

    -- Conditions
    min_purchase_amount DECIMAL(10,2),

    -- Applicable Products
    applicable_to TEXT DEFAULT 'all' CHECK(applicable_to IN ('all', 'categories', 'products')),
    category_ids TEXT, -- JSON array
    product_ids TEXT, -- JSON array

    -- Time Validity
    valid_from DATETIME,
    valid_until DATETIME,

    -- Usage Limits
    max_uses INTEGER,
    max_uses_per_customer INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,

    -- Customer Restrictions
    customer_tier_restriction TEXT, -- JSON: ['gold', 'platinum']
    specific_customer_ids TEXT, -- JSON array (for targeted coupons)
    first_order_only BOOLEAN DEFAULT 0,
    new_customers_only BOOLEAN DEFAULT 0,

    -- Order Type Restrictions
    valid_for_dine_in BOOLEAN DEFAULT 1,
    valid_for_takeout BOOLEAN DEFAULT 1,
    valid_for_delivery BOOLEAN DEFAULT 1,

    -- Location Restrictions
    location_ids TEXT, -- JSON array

    -- Combination Rules
    can_combine_with_promotions BOOLEAN DEFAULT 0,
    can_combine_with_other_coupons BOOLEAN DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT 1,
    is_public BOOLEAN DEFAULT 1, -- false = targeted/private coupon

    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (free_product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- COUPON USAGE (Track who used what)
-- =====================================================
CREATE TABLE IF NOT EXISTS coupon_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL,
    customer_id INTEGER,
    order_id INTEGER NOT NULL,

    discount_amount DECIMAL(10,2) NOT NULL,

    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- =====================================================
-- PROMOTION USAGE
-- =====================================================
CREATE TABLE IF NOT EXISTS promotion_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promotion_id INTEGER NOT NULL,
    customer_id INTEGER,
    order_id INTEGER NOT NULL,

    discount_amount DECIMAL(10,2) NOT NULL,
    items_affected TEXT, -- JSON array of order_item_ids

    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- =====================================================
-- GIFT CARDS
-- =====================================================
CREATE TABLE IF NOT EXISTS gift_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    card_number TEXT UNIQUE NOT NULL,
    pin TEXT, -- optional PIN for security

    -- Value
    initial_value DECIMAL(10,2) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL,

    -- Customer
    purchased_by_customer_id INTEGER,
    recipient_customer_id INTEGER,
    recipient_email TEXT,
    recipient_name TEXT,

    -- Purchase
    purchased_order_id INTEGER,
    purchased_at DATETIME,

    -- Validity
    expires_at DATE,

    -- Status
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'depleted', 'expired', 'cancelled', 'suspended')),

    -- Message
    message TEXT,

    -- Physical Card
    is_physical BOOLEAN DEFAULT 0,
    is_delivered BOOLEAN DEFAULT 0,
    delivered_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (purchased_by_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (recipient_customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (purchased_order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- =====================================================
-- GIFT CARD TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS gift_card_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gift_card_id INTEGER NOT NULL,
    order_id INTEGER,

    type TEXT NOT NULL CHECK(type IN ('purchase', 'redemption', 'refund', 'adjustment', 'expiration')),

    amount DECIMAL(10,2) NOT NULL, -- positive for credits, negative for debits
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) GENERATED ALWAYS AS (balance_before + amount) STORED,

    notes TEXT,
    processed_by INTEGER,

    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_promotions_company ON promotions(company_id);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_coupons_company ON coupons(company_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_customer ON coupon_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_order ON coupon_usage(order_id);

CREATE INDEX IF NOT EXISTS idx_promotion_usage_promotion ON promotion_usage(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_customer ON promotion_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_promotion_usage_order ON promotion_usage(order_id);

CREATE INDEX IF NOT EXISTS idx_gift_cards_company ON gift_cards(company_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_number ON gift_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);

CREATE INDEX IF NOT EXISTS idx_gift_card_trans_card ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_trans_order ON gift_card_transactions(order_id);
