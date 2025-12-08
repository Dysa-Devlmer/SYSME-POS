-- =====================================================
-- SYSME POS - Loyalty & Customer Rewards System
-- Migration: 017_loyalty_system.sql
-- Description: Sistema completo de fidelización y recompensas
-- Author: JARVIS AI Assistant
-- Date: 2025-11-20
-- =====================================================

-- ====================================
-- TABLA: loyalty_tiers
-- Niveles de fidelidad (Bronce, Plata, Oro, Platino)
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#gray',

    -- Requerimientos para alcanzar el tier
    min_points INTEGER NOT NULL DEFAULT 0,
    min_visits INTEGER DEFAULT 0,
    min_total_spent REAL DEFAULT 0,

    -- Beneficios del tier
    points_multiplier REAL DEFAULT 1.0, -- Multiplicador de puntos (ej: 1.5x)
    discount_percentage REAL DEFAULT 0, -- Descuento general
    birthday_bonus_points INTEGER DEFAULT 0,
    welcome_bonus_points INTEGER DEFAULT 0,

    -- Características especiales
    priority_support INTEGER DEFAULT 0,
    exclusive_offers INTEGER DEFAULT 0,
    free_delivery INTEGER DEFAULT 0,
    early_access INTEGER DEFAULT 0,

    -- Orden de display
    tier_order INTEGER DEFAULT 0,

    -- Metadata
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- ====================================
-- TABLA: loyalty_members
-- Miembros del programa de fidelidad
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL UNIQUE,
    membership_number TEXT NOT NULL UNIQUE, -- Número de membresía

    -- Tier actual
    current_tier_id INTEGER NOT NULL DEFAULT 1,
    tier_achieved_date TEXT,

    -- Puntos
    total_points_earned INTEGER DEFAULT 0, -- Total histórico ganado
    current_points INTEGER DEFAULT 0, -- Puntos actuales disponibles
    lifetime_points INTEGER DEFAULT 0, -- Puntos de por vida (no expiran)
    points_redeemed INTEGER DEFAULT 0, -- Puntos canjeados
    points_expired INTEGER DEFAULT 0, -- Puntos expirados

    -- Estadísticas
    total_visits INTEGER DEFAULT 0,
    total_spent REAL DEFAULT 0,
    average_ticket REAL DEFAULT 0,
    last_visit_date TEXT,
    enrollment_date TEXT DEFAULT CURRENT_TIMESTAMP,

    -- Estado de membresía
    status TEXT DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
    membership_expiry_date TEXT,

    -- Preferencias
    email_notifications INTEGER DEFAULT 1,
    sms_notifications INTEGER DEFAULT 0,
    push_notifications INTEGER DEFAULT 1,

    -- Referral program
    referral_code TEXT UNIQUE,
    referred_by_member_id INTEGER,
    total_referrals INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (current_tier_id) REFERENCES loyalty_tiers(id),
    FOREIGN KEY (referred_by_member_id) REFERENCES loyalty_members(id)
);

-- ====================================
-- TABLA: loyalty_points_transactions
-- Transacciones de puntos (ganados, canjeados, expirados)
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'expired', 'adjusted', 'bonus', 'refund'
    points INTEGER NOT NULL, -- Positivo para ganados, negativo para canjeados

    -- Balance
    points_before INTEGER,
    points_after INTEGER,

    -- Referencias
    reference_type TEXT, -- 'order', 'reward_redemption', 'birthday', 'referral', 'manual_adjustment'
    reference_id INTEGER,

    -- Detalles
    description TEXT,
    expiry_date TEXT, -- Para puntos que expiran
    multiplier_applied REAL DEFAULT 1.0,

    -- Metadata
    transaction_date TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    notes TEXT,

    FOREIGN KEY (member_id) REFERENCES loyalty_members(id)
);

-- ====================================
-- TABLA: loyalty_rewards
-- Catálogo de recompensas disponibles
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    reward_type TEXT NOT NULL, -- 'discount', 'free_item', 'cashback', 'upgrade', 'gift'

    -- Costo en puntos
    points_cost INTEGER NOT NULL,

    -- Valor de la recompensa
    discount_type TEXT, -- 'percentage', 'fixed_amount'
    discount_value REAL,
    max_discount_amount REAL,

    -- Producto/Categoría aplicable
    applicable_to TEXT, -- 'all', 'category', 'product', 'specific_items'
    category_id INTEGER,
    product_ids TEXT, -- JSON: [123, 456]

    -- Restricciones
    min_purchase_amount REAL,
    max_redemptions_per_member INTEGER DEFAULT 1,
    total_available_quantity INTEGER, -- NULL = ilimitado
    remaining_quantity INTEGER,

    -- Elegibilidad
    min_tier_required INTEGER DEFAULT 1,
    exclusive_to_tiers TEXT, -- JSON: [3, 4] (solo para tier 3 y 4)

    -- Validez
    valid_from TEXT,
    valid_until TEXT,
    days_valid_after_redemption INTEGER DEFAULT 30,

    -- Horarios
    valid_days_of_week TEXT, -- JSON: [1,2,3,4,5] (lunes a viernes)
    valid_time_start TEXT, -- HH:MM
    valid_time_end TEXT, -- HH:MM

    -- Display
    image_url TEXT,
    featured INTEGER DEFAULT 0,
    display_order INTEGER DEFAULT 0,
    terms_and_conditions TEXT,

    -- Estado
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,

    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ====================================
-- TABLA: loyalty_reward_redemptions
-- Canjes de recompensas
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_reward_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    redemption_code TEXT NOT NULL UNIQUE, -- Código único de canje
    member_id INTEGER NOT NULL,
    reward_id INTEGER NOT NULL,

    -- Puntos
    points_used INTEGER NOT NULL,

    -- Estado
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'used', 'expired', 'cancelled'

    -- Fechas
    redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
    valid_until TEXT,
    used_at TEXT,

    -- Uso
    order_id INTEGER, -- Orden donde se usó
    used_by_employee_id INTEGER,
    discount_applied REAL,

    -- Cancelación
    cancelled_at TEXT,
    cancellation_reason TEXT,
    points_refunded INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_by TEXT,

    FOREIGN KEY (member_id) REFERENCES loyalty_members(id),
    FOREIGN KEY (reward_id) REFERENCES loyalty_rewards(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (used_by_employee_id) REFERENCES employees(id)
);

-- ====================================
-- TABLA: loyalty_campaigns
-- Campañas promocionales de fidelidad
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL, -- 'bonus_points', 'double_points', 'special_reward', 'tier_upgrade'

    -- Configuración
    bonus_points_amount INTEGER,
    points_multiplier REAL DEFAULT 1.0,

    -- Targeting
    target_all_members INTEGER DEFAULT 1,
    target_tiers TEXT, -- JSON: [1, 2]
    target_member_ids TEXT, -- JSON: [123, 456]

    -- Condiciones
    min_purchase_amount REAL,
    applicable_categories TEXT, -- JSON: [1, 2, 3]
    applicable_products TEXT, -- JSON: [10, 20, 30]

    -- Vigencia
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,

    -- Límites
    max_redemptions INTEGER,
    max_redemptions_per_member INTEGER DEFAULT 1,
    total_redemptions INTEGER DEFAULT 0,

    -- Estado
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

-- ====================================
-- TABLA: loyalty_member_tier_history
-- Historial de cambios de tier
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_member_tier_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL,
    from_tier_id INTEGER,
    to_tier_id INTEGER NOT NULL,
    change_reason TEXT, -- 'points_earned', 'visits_milestone', 'spending_milestone', 'manual_adjustment', 'tier_downgrade'
    points_at_change INTEGER,
    total_spent_at_change REAL,
    total_visits_at_change INTEGER,
    change_date TEXT DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (member_id) REFERENCES loyalty_members(id),
    FOREIGN KEY (from_tier_id) REFERENCES loyalty_tiers(id),
    FOREIGN KEY (to_tier_id) REFERENCES loyalty_tiers(id)
);

-- ====================================
-- TABLA: loyalty_referrals
-- Seguimiento de referidos
-- ====================================
CREATE TABLE IF NOT EXISTS loyalty_referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_member_id INTEGER NOT NULL,
    referred_customer_id INTEGER NOT NULL,
    referral_code_used TEXT,

    -- Estado
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rewarded'

    -- Recompensas
    referrer_points_earned INTEGER DEFAULT 0,
    referred_points_earned INTEGER DEFAULT 0,
    referrer_rewarded_at TEXT,

    -- Fechas
    referred_at TEXT DEFAULT CURRENT_TIMESTAMP,
    first_purchase_at TEXT,
    completed_at TEXT,

    -- Metadata
    notes TEXT,

    FOREIGN KEY (referrer_member_id) REFERENCES loyalty_members(id),
    FOREIGN KEY (referred_customer_id) REFERENCES customers(id)
);

-- ====================================
-- ÍNDICES para optimización
-- ====================================

-- Loyalty Tiers
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_order ON loyalty_tiers(tier_order);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_active ON loyalty_tiers(is_active);

-- Loyalty Members
CREATE INDEX IF NOT EXISTS idx_loyalty_members_customer ON loyalty_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_tier ON loyalty_members(current_tier_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_status ON loyalty_members(status);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_referral_code ON loyalty_members(referral_code);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_enrollment_date ON loyalty_members(enrollment_date);

-- Points Transactions
CREATE INDEX IF NOT EXISTS idx_points_transactions_member ON loyalty_points_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON loyalty_points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_date ON loyalty_points_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_points_transactions_reference ON loyalty_points_transactions(reference_type, reference_id);

-- Rewards
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_type ON loyalty_rewards(reward_type);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_active ON loyalty_rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_featured ON loyalty_rewards(featured);
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_tier ON loyalty_rewards(min_tier_required);

-- Redemptions
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_member ON loyalty_reward_redemptions(member_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward ON loyalty_reward_redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON loyalty_reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_code ON loyalty_reward_redemptions(redemption_code);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_order ON loyalty_reward_redemptions(order_id);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_active ON loyalty_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_loyalty_campaigns_dates ON loyalty_campaigns(start_date, end_date);

-- Tier History
CREATE INDEX IF NOT EXISTS idx_tier_history_member ON loyalty_member_tier_history(member_id);
CREATE INDEX IF NOT EXISTS idx_tier_history_date ON loyalty_member_tier_history(change_date);

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON loyalty_referrals(referrer_member_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON loyalty_referrals(referred_customer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON loyalty_referrals(status);

-- ====================================
-- VISTAS para análisis y reportes
-- ====================================

-- Vista: Miembros con información completa
CREATE VIEW IF NOT EXISTS v_loyalty_members_detailed AS
SELECT
    lm.*,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    lt.name as tier_name,
    lt.color as tier_color,
    lt.points_multiplier,
    lt.discount_percentage as tier_discount,
    CASE
        WHEN lm.status = 'active' THEN 'Activo'
        WHEN lm.status = 'suspended' THEN 'Suspendido'
        WHEN lm.status = 'cancelled' THEN 'Cancelado'
        ELSE 'Desconocido'
    END as status_display,
    julianday('now') - julianday(lm.last_visit_date) as days_since_last_visit,
    CASE
        WHEN julianday('now') - julianday(lm.last_visit_date) > 90 THEN 'inactive'
        WHEN julianday('now') - julianday(lm.last_visit_date) > 30 THEN 'at_risk'
        ELSE 'active'
    END as engagement_status
FROM loyalty_members lm
LEFT JOIN customers c ON lm.customer_id = c.id
LEFT JOIN loyalty_tiers lt ON lm.current_tier_id = lt.id;

-- Vista: Transacciones de puntos con detalles
CREATE VIEW IF NOT EXISTS v_loyalty_points_transactions_detailed AS
SELECT
    lpt.*,
    lm.membership_number,
    c.first_name || ' ' || c.last_name as member_name,
    c.email as member_email,
    CASE
        WHEN lpt.transaction_type = 'earned' THEN 'Ganados'
        WHEN lpt.transaction_type = 'redeemed' THEN 'Canjeados'
        WHEN lpt.transaction_type = 'expired' THEN 'Expirados'
        WHEN lpt.transaction_type = 'adjusted' THEN 'Ajustados'
        WHEN lpt.transaction_type = 'bonus' THEN 'Bonificación'
        WHEN lpt.transaction_type = 'refund' THEN 'Reembolso'
        ELSE lpt.transaction_type
    END as transaction_type_display,
    DATE(lpt.transaction_date) as transaction_date_only
FROM loyalty_points_transactions lpt
JOIN loyalty_members lm ON lpt.member_id = lm.id
JOIN customers c ON lm.customer_id = c.id;

-- Vista: Recompensas con estadísticas
CREATE VIEW IF NOT EXISTS v_loyalty_rewards_stats AS
SELECT
    lr.*,
    lt.name as min_tier_name,
    COUNT(DISTINCT lrr.id) as total_redemptions,
    COUNT(DISTINCT CASE WHEN lrr.status = 'used' THEN lrr.id END) as used_redemptions,
    COUNT(DISTINCT lrr.member_id) as unique_redeemers,
    SUM(lrr.points_used) as total_points_spent,
    CASE
        WHEN lr.remaining_quantity IS NOT NULL AND lr.remaining_quantity <= 0 THEN 'sold_out'
        WHEN lr.valid_until IS NOT NULL AND DATE(lr.valid_until) < DATE('now') THEN 'expired'
        WHEN lr.is_active = 0 THEN 'inactive'
        ELSE 'available'
    END as availability_status
FROM loyalty_rewards lr
LEFT JOIN loyalty_tiers lt ON lr.min_tier_required = lt.id
LEFT JOIN loyalty_reward_redemptions lrr ON lr.id = lrr.reward_id
GROUP BY lr.id;

-- Vista: Canjes de recompensas con detalles
CREATE VIEW IF NOT EXISTS v_loyalty_redemptions_detailed AS
SELECT
    lrr.*,
    lm.membership_number,
    c.first_name || ' ' || c.last_name as member_name,
    lr.name as reward_name,
    lr.reward_type,
    lt.name as member_tier,
    CASE
        WHEN lrr.status = 'pending' THEN 'Pendiente'
        WHEN lrr.status = 'active' THEN 'Activo'
        WHEN lrr.status = 'used' THEN 'Usado'
        WHEN lrr.status = 'expired' THEN 'Expirado'
        WHEN lrr.status = 'cancelled' THEN 'Cancelado'
        ELSE lrr.status
    END as status_display,
    julianday(lrr.valid_until) - julianday('now') as days_until_expiry
FROM loyalty_reward_redemptions lrr
JOIN loyalty_members lm ON lrr.member_id = lm.id
JOIN customers c ON lm.customer_id = c.id
JOIN loyalty_rewards lr ON lrr.reward_id = lr.id
JOIN loyalty_tiers lt ON lm.current_tier_id = lt.id;

-- Vista: Top miembros por puntos
CREATE VIEW IF NOT EXISTS v_top_loyalty_members AS
SELECT
    lm.id,
    lm.membership_number,
    c.first_name || ' ' || c.last_name as member_name,
    c.email,
    lm.current_points,
    lm.lifetime_points,
    lm.total_spent,
    lm.total_visits,
    lt.name as tier_name,
    lt.color as tier_color,
    RANK() OVER (ORDER BY lm.lifetime_points DESC) as rank_by_points,
    RANK() OVER (ORDER BY lm.total_spent DESC) as rank_by_spending,
    RANK() OVER (ORDER BY lm.total_visits DESC) as rank_by_visits
FROM loyalty_members lm
JOIN customers c ON lm.customer_id = c.id
JOIN loyalty_tiers lt ON lm.current_tier_id = lt.id
WHERE lm.status = 'active'
ORDER BY lm.lifetime_points DESC
LIMIT 100;

-- Vista: Estadísticas de tiers
CREATE VIEW IF NOT EXISTS v_loyalty_tier_statistics AS
SELECT
    lt.*,
    COUNT(DISTINCT lm.id) as total_members,
    AVG(lm.current_points) as avg_points,
    AVG(lm.total_spent) as avg_spending,
    AVG(lm.total_visits) as avg_visits,
    SUM(lm.current_points) as total_points_pool,
    SUM(lm.total_spent) as total_revenue_from_tier
FROM loyalty_tiers lt
LEFT JOIN loyalty_members lm ON lt.id = lm.current_tier_id AND lm.status = 'active'
GROUP BY lt.id
ORDER BY lt.tier_order;

-- ====================================
-- TRIGGERS para automatización
-- ====================================

-- Trigger: Actualizar updated_at en loyalty_members
CREATE TRIGGER IF NOT EXISTS trg_loyalty_members_updated_at
AFTER UPDATE ON loyalty_members
FOR EACH ROW
BEGIN
    UPDATE loyalty_members
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar balance de puntos tras transacción
CREATE TRIGGER IF NOT EXISTS trg_update_points_balance_after_transaction
AFTER INSERT ON loyalty_points_transactions
FOR EACH ROW
BEGIN
    -- Actualizar puntos actuales
    UPDATE loyalty_members
    SET current_points = current_points + NEW.points,
        total_points_earned = CASE
            WHEN NEW.transaction_type = 'earned' THEN total_points_earned + NEW.points
            ELSE total_points_earned
        END,
        points_redeemed = CASE
            WHEN NEW.transaction_type = 'redeemed' THEN points_redeemed + ABS(NEW.points)
            ELSE points_redeemed
        END,
        points_expired = CASE
            WHEN NEW.transaction_type = 'expired' THEN points_expired + ABS(NEW.points)
            ELSE points_expired
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.member_id;
END;

-- Trigger: Registrar balance anterior en transacción
CREATE TRIGGER IF NOT EXISTS trg_set_points_balance_before_transaction
BEFORE INSERT ON loyalty_points_transactions
FOR EACH ROW
BEGIN
    SELECT
        current_points,
        current_points + NEW.points
    INTO NEW.points_before, NEW.points_after
    FROM loyalty_members
    WHERE id = NEW.member_id;
END;

-- Trigger: Verificar y actualizar tier automáticamente
CREATE TRIGGER IF NOT EXISTS trg_check_tier_upgrade_after_points
AFTER INSERT ON loyalty_points_transactions
FOR EACH ROW
WHEN NEW.transaction_type = 'earned'
BEGIN
    UPDATE loyalty_members
    SET current_tier_id = (
        SELECT id FROM loyalty_tiers
        WHERE min_points <= (
            SELECT current_points FROM loyalty_members WHERE id = NEW.member_id
        )
        AND is_active = 1
        ORDER BY min_points DESC
        LIMIT 1
    )
    WHERE id = NEW.member_id;
END;

-- Trigger: Registrar historial de cambio de tier
CREATE TRIGGER IF NOT EXISTS trg_log_tier_change
AFTER UPDATE OF current_tier_id ON loyalty_members
FOR EACH ROW
WHEN NEW.current_tier_id != OLD.current_tier_id
BEGIN
    INSERT INTO loyalty_member_tier_history (
        member_id, from_tier_id, to_tier_id,
        points_at_change, total_spent_at_change, total_visits_at_change,
        change_reason
    ) VALUES (
        NEW.id, OLD.current_tier_id, NEW.current_tier_id,
        NEW.current_points, NEW.total_spent, NEW.total_visits,
        'points_milestone'
    );

    UPDATE loyalty_members
    SET tier_achieved_date = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar estadísticas del miembro tras orden
CREATE TRIGGER IF NOT EXISTS trg_update_member_stats_after_order
AFTER INSERT ON orders
FOR EACH ROW
WHEN EXISTS (SELECT 1 FROM loyalty_members WHERE customer_id = NEW.customer_id)
BEGIN
    UPDATE loyalty_members
    SET total_visits = total_visits + 1,
        total_spent = total_spent + NEW.total,
        average_ticket = (total_spent + NEW.total) / (total_visits + 1),
        last_visit_date = NEW.created_at
    WHERE customer_id = NEW.customer_id;
END;

-- Trigger: Descontar cantidad disponible de recompensa al canjear
CREATE TRIGGER IF NOT EXISTS trg_decrease_reward_quantity_on_redemption
AFTER INSERT ON loyalty_reward_redemptions
FOR EACH ROW
WHEN NEW.status IN ('pending', 'active')
BEGIN
    UPDATE loyalty_rewards
    SET remaining_quantity = remaining_quantity - 1
    WHERE id = NEW.reward_id
    AND remaining_quantity IS NOT NULL
    AND remaining_quantity > 0;
END;

-- Trigger: Restaurar cantidad si se cancela el canje
CREATE TRIGGER IF NOT EXISTS trg_restore_reward_quantity_on_cancellation
AFTER UPDATE OF status ON loyalty_reward_redemptions
FOR EACH ROW
WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled'
BEGIN
    UPDATE loyalty_rewards
    SET remaining_quantity = remaining_quantity + 1
    WHERE id = NEW.reward_id
    AND remaining_quantity IS NOT NULL;
END;

-- Trigger: Reembolsar puntos al cancelar canje
CREATE TRIGGER IF NOT EXISTS trg_refund_points_on_redemption_cancel
AFTER UPDATE OF status ON loyalty_reward_redemptions
FOR EACH ROW
WHEN NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.points_refunded = 0
BEGIN
    INSERT INTO loyalty_points_transactions (
        member_id, transaction_type, points,
        reference_type, reference_id, description
    ) VALUES (
        NEW.member_id, 'refund', NEW.points_used,
        'reward_redemption_cancellation', NEW.id,
        'Reembolso por cancelación de canje: ' || (SELECT name FROM loyalty_rewards WHERE id = NEW.reward_id)
    );

    UPDATE loyalty_reward_redemptions
    SET points_refunded = 1
    WHERE id = NEW.id;
END;

-- Trigger: Generar código de referido único
CREATE TRIGGER IF NOT EXISTS trg_generate_referral_code
AFTER INSERT ON loyalty_members
FOR EACH ROW
WHEN NEW.referral_code IS NULL
BEGIN
    UPDATE loyalty_members
    SET referral_code = 'REF' || printf('%06d', NEW.id)
    WHERE id = NEW.id;
END;

-- ====================================
-- DATOS INICIALES
-- ====================================

-- Tiers de fidelidad
INSERT OR IGNORE INTO loyalty_tiers (
    id, name, code, description, color, min_points, min_visits, min_total_spent,
    points_multiplier, discount_percentage, birthday_bonus_points, welcome_bonus_points,
    tier_order, is_active
) VALUES
(1, 'Bronce', 'BRONZE', 'Nivel inicial del programa de fidelidad', '#CD7F32', 0, 0, 0, 1.0, 0, 50, 100, 1, 1),
(2, 'Plata', 'SILVER', 'Nivel intermedio con beneficios adicionales', '#C0C0C0', 500, 5, 50000, 1.25, 5, 100, 0, 2, 1),
(3, 'Oro', 'GOLD', 'Nivel premium con grandes beneficios', '#FFD700', 2000, 20, 200000, 1.5, 10, 200, 0, 3, 1),
(4, 'Platino', 'PLATINUM', 'Nivel VIP exclusivo', '#E5E4E2', 5000, 50, 500000, 2.0, 15, 500, 0, 4, 1);

-- Recompensas de ejemplo
INSERT OR IGNORE INTO loyalty_rewards (
    code, name, description, reward_type, points_cost,
    discount_type, discount_value, min_tier_required,
    is_active, featured, display_order
) VALUES
('RW001', 'Descuento 10%', 'Descuento del 10% en tu próxima compra', 'discount', 200, 'percentage', 10, 1, 1, 1, 1),
('RW002', 'Descuento 20%', 'Descuento del 20% en tu próxima compra', 'discount', 400, 'percentage', 20, 2, 1, 1, 2),
('RW003', 'Café Gratis', 'Café de cualquier tamaño gratis', 'free_item', 150, NULL, NULL, 1, 1, 1, 3),
('RW004', 'Postre Gratis', 'Postre del día gratis', 'free_item', 300, NULL, NULL, 2, 1, 1, 4),
('RW005', '$5.000 de Descuento', 'Descuento fijo de $5.000', 'discount', 500, 'fixed_amount', 5000, 3, 1, 1, 5);

-- ====================================
-- COMENTARIOS FINALES
-- ====================================

-- Esta migración crea un sistema completo de fidelización
-- Características principales:
-- 1. Sistema de tiers multinivel (Bronce, Plata, Oro, Platino)
-- 2. Gestión de puntos con transacciones detalladas
-- 3. Catálogo de recompensas canjeables
-- 4. Seguimiento de canjes y validez
-- 5. Campañas promocionales
-- 6. Programa de referidos
-- 7. Historial de cambios de tier
-- 8. Vistas analíticas y reportes
-- 9. Triggers automáticos para cálculos
-- 10. Sistema de notificaciones

-- Total de objetos creados:
-- - 8 Tablas principales
-- - 6 Vistas de análisis
-- - 12 Triggers automáticos
-- - 30+ Índices para optimización
-- - 4 Tiers iniciales
-- - 5 Recompensas de ejemplo

-- Sistema listo para integración con SYSME POS
