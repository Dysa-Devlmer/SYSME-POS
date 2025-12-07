-- Loyalty System Tables Migration
-- Created: 2025-12-06

-- Loyalty Programs configuration
CREATE TABLE IF NOT EXISTS loyalty_programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    points_per_currency REAL DEFAULT 1.0, -- Points earned per $1000 CLP
    currency_symbol TEXT DEFAULT 'CLP',
    min_purchase_amount REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Loyalty Tiers (Bronze, Silver, Gold, Platinum)
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    min_points INTEGER DEFAULT 0,
    max_points INTEGER,
    points_multiplier REAL DEFAULT 1.0,
    discount_percentage REAL DEFAULT 0,
    benefits TEXT, -- JSON array of benefits
    color TEXT, -- Hex color for UI
    icon TEXT, -- Icon name or emoji
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Loyalty Members
CREATE TABLE IF NOT EXISTS loyalty_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    membership_code TEXT UNIQUE NOT NULL,
    qr_code TEXT UNIQUE, -- QR code for quick lookup
    phone TEXT,
    email TEXT,
    current_tier_id INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by INTEGER, -- Member ID who referred this member
    birthday_date TEXT, -- YYYY-MM-DD format
    enrollment_date INTEGER DEFAULT (strftime('%s', 'now')),
    last_visit_date INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (current_tier_id) REFERENCES loyalty_tiers(id),
    FOREIGN KEY (referred_by) REFERENCES loyalty_members(id) ON DELETE SET NULL
);

-- Loyalty Transactions (Points earned/spent)
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earn', 'redeem', 'adjust', 'expire', 'bonus', 'referral'
    points_amount INTEGER NOT NULL,
    sale_id INTEGER,
    related_entity_type TEXT, -- 'sale', 'reward', 'manual', 'birthday', 'referral'
    related_entity_id INTEGER,
    description TEXT,
    performed_by INTEGER, -- User ID who performed the action
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (member_id) REFERENCES loyalty_members(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Loyalty Rewards Catalog
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    reward_type TEXT NOT NULL, -- 'product', 'discount', 'percentage_off', 'free_item'
    reward_value REAL, -- Discount amount or product ID
    product_id INTEGER,
    min_tier_id INTEGER DEFAULT 1, -- Minimum tier required
    max_redemptions_per_member INTEGER DEFAULT 0, -- 0 = unlimited
    total_available INTEGER DEFAULT 0, -- 0 = unlimited
    total_redeemed INTEGER DEFAULT 0,
    valid_from INTEGER,
    valid_until INTEGER,
    is_active INTEGER DEFAULT 1,
    image_url TEXT,
    terms_conditions TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (min_tier_id) REFERENCES loyalty_tiers(id)
);

-- Loyalty Redemptions
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,
    points_spent INTEGER NOT NULL,
    redemption_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'used', 'expired', 'cancelled'
    redeemed_at INTEGER DEFAULT (strftime('%s', 'now')),
    used_at INTEGER,
    used_in_sale_id INTEGER,
    expires_at INTEGER,
    performed_by INTEGER,
    notes TEXT,
    FOREIGN KEY (member_id) REFERENCES loyalty_members(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
    FOREIGN KEY (used_in_sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Loyalty Activity Log
CREATE TABLE IF NOT EXISTS loyalty_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata TEXT, -- JSON for additional data
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (member_id) REFERENCES loyalty_members(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_loyalty_members_customer ON loyalty_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_phone ON loyalty_members(phone);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_email ON loyalty_members(email);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_code ON loyalty_members(membership_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_qr ON loyalty_members(qr_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_referral ON loyalty_members(referral_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_tier ON loyalty_members(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_member ON loyalty_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_sale ON loyalty_transactions(sale_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_member ON loyalty_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_reward ON loyalty_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_code ON loyalty_redemptions(redemption_code);

-- Insert default loyalty program
INSERT OR IGNORE INTO loyalty_programs (id, name, description, points_per_currency, currency_symbol, is_active)
VALUES (1, 'SYSME Rewards', 'Programa de fidelización para clientes frecuentes', 1.0, 'CLP', 1);

-- Insert default tiers
INSERT OR IGNORE INTO loyalty_tiers (id, name, min_points, max_points, points_multiplier, discount_percentage, color, icon, sort_order, benefits)
VALUES
(1, 'Bronce', 0, 499, 1.0, 0, '#CD7F32', '🥉', 1, '["Acumula puntos en cada compra", "Acceso a recompensas básicas"]'),
(2, 'Plata', 500, 1999, 1.25, 5, '#C0C0C0', '🥈', 2, '["25% más puntos por compra", "5% descuento en todas las compras", "Recompensas especiales"]'),
(3, 'Oro', 2000, 4999, 1.5, 10, '#FFD700', '🥇', 3, '["50% más puntos por compra", "10% descuento en todas las compras", "Promociones exclusivas", "Regalo de cumpleaños"]'),
(4, 'Platino', 5000, NULL, 2.0, 15, '#E5E4E2', '💎', 4, '["Doble puntos en cada compra", "15% descuento en todas las compras", "Acceso anticipado a promociones", "Regalo de cumpleaños premium", "Eventos exclusivos"]');

-- Insert sample rewards
INSERT OR IGNORE INTO loyalty_rewards (name, description, points_required, reward_type, reward_value, min_tier_id, is_active)
VALUES
('Café Gratis', 'Un café de cualquier tamaño', 100, 'free_item', NULL, 1, 1),
('10% Descuento', 'Descuento del 10% en tu próxima compra', 200, 'percentage_off', 10, 1, 1),
('Postre Gratis', 'Un postre de tu elección', 300, 'free_item', NULL, 2, 1),
('$5.000 Descuento', 'Descuento de $5.000 CLP en compras superiores a $20.000', 500, 'discount', 5000, 2, 1),
('Comida Gratis', 'Un plato principal gratis', 1000, 'free_item', NULL, 3, 1),
('20% Descuento VIP', 'Descuento del 20% en tu próxima compra', 1500, 'percentage_off', 20, 4, 1);
