-- =====================================================
-- SYSME POS - Loyalty & Reservations Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- LOYALTY PROGRAMS
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'points' CHECK(type IN ('points', 'visits', 'spend', 'tier')),

    -- Point Rules
    points_per_currency DECIMAL(10,2) DEFAULT 1.00, -- points earned per $1 spent
    currency_per_point DECIMAL(10,2) DEFAULT 0.01, -- $value of 1 point

    -- Tier System
    bronze_threshold DECIMAL(10,2) DEFAULT 0,
    silver_threshold DECIMAL(10,2) DEFAULT 1000,
    gold_threshold DECIMAL(10,2) DEFAULT 5000,
    platinum_threshold DECIMAL(10,2) DEFAULT 10000,

    -- Multipliers by tier
    bronze_multiplier DECIMAL(3,2) DEFAULT 1.00,
    silver_multiplier DECIMAL(3,2) DEFAULT 1.25,
    gold_multiplier DECIMAL(3,2) DEFAULT 1.50,
    platinum_multiplier DECIMAL(3,2) DEFAULT 2.00,

    -- Rules
    points_expiry_days INTEGER, -- NULL = never expire
    min_purchase_for_points DECIMAL(10,2) DEFAULT 0,
    allow_point_redemption BOOLEAN DEFAULT 1,
    min_points_redemption INTEGER DEFAULT 100,

    -- Birthday Rewards
    birthday_points INTEGER DEFAULT 0,
    birthday_discount_percentage DECIMAL(5,2) DEFAULT 0,

    -- Referral Program
    referrer_points INTEGER DEFAULT 0,
    referee_points INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT 1,
    starts_at DATETIME,
    ends_at DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- =====================================================
-- LOYALTY TRANSACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    order_id INTEGER,

    type TEXT NOT NULL CHECK(type IN ('earned', 'redeemed', 'expired', 'adjusted', 'bonus', 'referral', 'birthday')),

    points INTEGER NOT NULL, -- positive for earned, negative for redeemed
    balance_before INTEGER NOT NULL,
    balance_after INTEGER GENERATED ALWAYS AS (balance_before + points) STORED,

    -- Monetary Value
    order_amount DECIMAL(10,2),

    -- Expiration
    expires_at DATE,

    -- Redemption
    redeemed_for TEXT, -- description of what points were used for
    discount_amount DECIMAL(10,2),

    -- Notes
    description TEXT,
    notes TEXT,

    -- User who processed
    processed_by INTEGER,

    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- LOYALTY REWARDS
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('discount', 'free_item', 'points_multiplier', 'free_delivery', 'custom')),

    -- Cost
    points_cost INTEGER NOT NULL,

    -- Discount Details
    discount_type TEXT CHECK(discount_type IN (NULL, 'percentage', 'fixed')),
    discount_value DECIMAL(10,2),

    -- Free Item
    free_product_id INTEGER,

    -- Multiplier
    points_multiplier DECIMAL(3,2),
    multiplier_duration_days INTEGER,

    -- Restrictions
    min_purchase_amount DECIMAL(10,2),
    applicable_categories TEXT, -- JSON array of category IDs
    excluded_products TEXT, -- JSON array of product IDs
    max_redemptions_per_customer INTEGER,

    -- Availability
    available_for_tiers TEXT, -- JSON array: ['silver', 'gold', 'platinum']
    valid_from DATE,
    valid_until DATE,

    -- Usage Stats
    times_redeemed INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT 1,

    image_url TEXT,
    terms_and_conditions TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (free_product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =====================================================
-- CUSTOMER REWARD REDEMPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_reward_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    order_id INTEGER,

    points_spent INTEGER NOT NULL,

    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired', 'cancelled')),

    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    expires_at DATETIME,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- =====================================================
-- RESERVATIONS (Reservaciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    customer_id INTEGER,

    -- Reservation Details
    reservation_number TEXT UNIQUE NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 120,

    -- Party Details
    party_size INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,

    -- Table Assignment
    table_id INTEGER,
    section_preference TEXT,

    -- Special Requests
    occasion TEXT, -- birthday, anniversary, business, etc.
    special_requests TEXT,
    dietary_requirements TEXT,

    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),

    -- Confirmation
    confirmed_at DATETIME,
    confirmed_by INTEGER,

    -- Deposit/Prepayment
    requires_deposit BOOLEAN DEFAULT 0,
    deposit_amount DECIMAL(10,2),
    deposit_paid BOOLEAN DEFAULT 0,
    deposit_payment_id INTEGER,

    -- Arrival
    arrived_at DATETIME,
    seated_at DATETIME,
    completed_at DATETIME,

    -- Cancellation
    cancelled_at DATETIME,
    cancellation_reason TEXT,
    cancelled_by INTEGER,

    -- Reminders
    reminder_sent BOOLEAN DEFAULT 0,
    reminder_sent_at DATETIME,

    -- Source
    source TEXT DEFAULT 'phone' CHECK(source IN ('phone', 'online', 'walk_in', 'app', 'opentable', 'google')),

    -- Notes
    notes TEXT,
    internal_notes TEXT,

    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- WAITLIST (Lista de Espera)
-- =====================================================
CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,

    -- Party Details
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    party_size INTEGER NOT NULL,

    -- Queue
    position INTEGER,
    estimated_wait_minutes INTEGER,

    -- Status
    status TEXT DEFAULT 'waiting' CHECK(status IN ('waiting', 'notified', 'seated', 'cancelled', 'no_show')),

    -- Notifications
    notification_method TEXT DEFAULT 'sms' CHECK(notification_method IN ('sms', 'call', 'none')),
    notified_at DATETIME,

    -- Seating
    table_id INTEGER,
    seated_at DATETIME,

    -- Cancellation
    cancelled_at DATETIME,

    -- Preferences
    section_preference TEXT,
    special_requests TEXT,

    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_loyalty_programs_company ON loyalty_programs(company_id);

CREATE INDEX IF NOT EXISTS idx_loyalty_trans_customer ON loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_trans_order ON loyalty_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_trans_date ON loyalty_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_loyalty_trans_type ON loyalty_transactions(type);

CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_company ON loyalty_rewards(company_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON loyalty_rewards(is_active);

CREATE INDEX IF NOT EXISTS idx_customer_redemptions_customer ON customer_reward_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_redemptions_reward ON customer_reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_customer_redemptions_status ON customer_reward_redemptions(status);

CREATE INDEX IF NOT EXISTS idx_reservations_location ON reservations(location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer ON reservations(customer_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_number ON reservations(reservation_number);

CREATE INDEX IF NOT EXISTS idx_waitlist_location ON waitlist(location_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status);
