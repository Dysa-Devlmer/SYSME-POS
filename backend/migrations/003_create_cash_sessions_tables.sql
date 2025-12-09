-- Migration: Create Cash Sessions Tables
-- Version: 003
-- Description: Tables for advanced cash session management with JARVIS integration
-- Date: 2025-12-01

-- =====================================================
-- 1. Cash Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    terminal_id VARCHAR(50) DEFAULT 'POS-01',

    -- Basic session info
    status VARCHAR(20) DEFAULT 'open' CHECK(status IN ('open', 'closed', 'suspended')),
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,

    -- Financial data
    opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_amount DECIMAL(10,2),
    current_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(10,2),
    actual_cash DECIMAL(10,2),
    difference DECIMAL(10,2) DEFAULT 0,

    -- Transaction counters
    sales_count INTEGER DEFAULT 0,
    refunds_count INTEGER DEFAULT 0,
    void_count INTEGER DEFAULT 0,

    -- Totals by payment method
    cash_total DECIMAL(10,2) DEFAULT 0,
    card_total DECIMAL(10,2) DEFAULT 0,
    transfer_total DECIMAL(10,2) DEFAULT 0,
    other_total DECIMAL(10,2) DEFAULT 0,

    -- Analytics metrics
    average_ticket DECIMAL(10,2) DEFAULT 0,
    max_sale DECIMAL(10,2) DEFAULT 0,
    min_sale DECIMAL(10,2),

    -- Cash denomination breakdown (Chilean Pesos)
    bills_100000 INTEGER DEFAULT 0,
    bills_50000 INTEGER DEFAULT 0,
    bills_20000 INTEGER DEFAULT 0,
    bills_10000 INTEGER DEFAULT 0,
    bills_5000 INTEGER DEFAULT 0,
    bills_2000 INTEGER DEFAULT 0,
    bills_1000 INTEGER DEFAULT 0,
    coins_500 INTEGER DEFAULT 0,
    coins_100 INTEGER DEFAULT 0,
    coins_50 INTEGER DEFAULT 0,
    coins_10 INTEGER DEFAULT 0,

    -- Notes and metadata
    opening_notes TEXT,
    closing_notes TEXT,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- 2. Cash Session Logs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_session_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- OPEN, CLOSE, MOVEMENT, ADJUSTMENT, etc.
    amount DECIMAL(10,2),
    notes TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- 3. Cash Movements Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK(type IN ('entry', 'withdrawal', 'adjustment', 'deposit', 'expense')),
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    reference_number VARCHAR(50),
    authorized_by VARCHAR(100),
    receipt_url VARCHAR(500),

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,

    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 4. Cash Session Reports Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_session_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    report_type VARCHAR(20) NOT NULL CHECK(report_type IN ('X', 'Z', 'closing', 'audit', 'daily', 'weekly', 'monthly')),
    report_data JSON NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER,
    sent_to_email VARCHAR(255),
    printed_at DATETIME,

    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 5. Cash Reconciliation Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_reconciliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,

    -- System calculated totals
    system_cash DECIMAL(10,2) NOT NULL,
    system_card DECIMAL(10,2) NOT NULL,
    system_transfer DECIMAL(10,2) NOT NULL,
    system_other DECIMAL(10,2) NOT NULL,
    system_total DECIMAL(10,2) NOT NULL,

    -- Manually counted totals
    counted_cash DECIMAL(10,2) NOT NULL,
    counted_card DECIMAL(10,2) NOT NULL,
    counted_transfer DECIMAL(10,2) NOT NULL,
    counted_other DECIMAL(10,2) NOT NULL,
    counted_total DECIMAL(10,2) NOT NULL,

    -- Differences
    cash_difference DECIMAL(10,2) GENERATED ALWAYS AS (counted_cash - system_cash) STORED,
    card_difference DECIMAL(10,2) GENERATED ALWAYS AS (counted_card - system_card) STORED,
    transfer_difference DECIMAL(10,2) GENERATED ALWAYS AS (counted_transfer - system_transfer) STORED,
    other_difference DECIMAL(10,2) GENERATED ALWAYS AS (counted_other - system_other) STORED,
    total_difference DECIMAL(10,2) GENERATED ALWAYS AS (counted_total - system_total) STORED,

    -- Resolution
    resolution_status VARCHAR(20) DEFAULT 'pending' CHECK(resolution_status IN ('pending', 'resolved', 'escalated', 'approved')),
    resolution_notes TEXT,
    resolved_by INTEGER,
    resolved_at DATETIME,

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- 6. Cash Float Management Table
-- =====================================================
CREATE TABLE IF NOT EXISTS cash_floats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    terminal_id VARCHAR(50) NOT NULL,
    standard_amount DECIMAL(10,2) NOT NULL DEFAULT 50000, -- Standard float amount
    current_amount DECIMAL(10,2) NOT NULL DEFAULT 50000,
    min_amount DECIMAL(10,2) NOT NULL DEFAULT 30000,
    max_amount DECIMAL(10,2) NOT NULL DEFAULT 100000,

    -- Alert thresholds
    low_alert_threshold DECIMAL(10,2) DEFAULT 20000,
    high_alert_threshold DECIMAL(10,2) DEFAULT 150000,

    -- Last reconciliation
    last_reconciled_at DATETIME,
    last_reconciled_by INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),

    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (last_reconciled_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(terminal_id)
);

-- =====================================================
-- 7. Session Analytics Table (For JARVIS Integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS session_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,

    -- Performance metrics
    transactions_per_hour DECIMAL(10,2),
    average_transaction_time INTEGER, -- in seconds
    peak_hour INTEGER,
    idle_time_percentage DECIMAL(5,2),

    -- Sales patterns
    top_selling_hour JSON,
    sales_by_hour JSON,
    sales_by_category JSON,
    sales_by_payment_method JSON,

    -- Customer metrics
    unique_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,
    average_items_per_sale DECIMAL(10,2),

    -- Predictive analytics (JARVIS generated)
    predicted_daily_total DECIMAL(10,2),
    confidence_score DECIMAL(5,2),
    anomaly_detected BOOLEAN DEFAULT 0,
    anomaly_details JSON,

    -- AI insights
    ai_recommendations JSON,
    performance_score DECIMAL(5,2),

    -- Timestamps
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE
);

-- =====================================================
-- 8. Indexes for Performance
-- =====================================================
CREATE INDEX idx_cash_sessions_user_id ON cash_sessions(user_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX idx_cash_sessions_terminal_id ON cash_sessions(terminal_id);
CREATE INDEX idx_cash_sessions_opened_at ON cash_sessions(opened_at);
CREATE INDEX idx_cash_sessions_closed_at ON cash_sessions(closed_at);

CREATE INDEX idx_cash_movements_session_id ON cash_movements(session_id);
CREATE INDEX idx_cash_movements_type ON cash_movements(type);
CREATE INDEX idx_cash_movements_created_at ON cash_movements(created_at);

CREATE INDEX idx_cash_session_logs_session_id ON cash_session_logs(session_id);
CREATE INDEX idx_cash_session_logs_action ON cash_session_logs(action);
CREATE INDEX idx_cash_session_logs_created_at ON cash_session_logs(created_at);

CREATE INDEX idx_cash_reconciliations_session_id ON cash_reconciliations(session_id);
CREATE INDEX idx_cash_reconciliations_status ON cash_reconciliations(resolution_status);

CREATE INDEX idx_session_analytics_session_id ON session_analytics(session_id);

-- =====================================================
-- 9. Triggers for Updated Timestamps
-- =====================================================
CREATE TRIGGER update_cash_sessions_timestamp
AFTER UPDATE ON cash_sessions
BEGIN
    UPDATE cash_sessions
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

CREATE TRIGGER update_cash_floats_timestamp
AFTER UPDATE ON cash_floats
BEGIN
    UPDATE cash_floats
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- =====================================================
-- 10. Initial Data
-- =====================================================
-- Insert default cash floats for terminals
INSERT INTO cash_floats (terminal_id, standard_amount, current_amount)
VALUES
    ('POS-01', 50000, 50000),
    ('POS-02', 50000, 50000),
    ('BAR-01', 100000, 100000),
    ('DELIVERY-01', 30000, 30000)
ON CONFLICT(terminal_id) DO NOTHING;

-- =====================================================
-- 11. Views for Reporting
-- =====================================================
-- Active sessions view
CREATE VIEW IF NOT EXISTS v_active_sessions AS
SELECT
    cs.id,
    cs.user_id,
    u.name as user_name,
    cs.terminal_id,
    cs.opened_at,
    cs.opening_amount,
    cs.current_amount,
    cs.sales_count,
    cs.cash_total + cs.card_total + cs.transfer_total + cs.other_total as total_sales,
    datetime('now') as current_time,
    CAST((julianday('now') - julianday(cs.opened_at)) * 24 AS INTEGER) as hours_open
FROM cash_sessions cs
JOIN users u ON cs.user_id = u.id
WHERE cs.status = 'open';

-- Daily summary view
CREATE VIEW IF NOT EXISTS v_daily_cash_summary AS
SELECT
    DATE(cs.opened_at) as session_date,
    COUNT(DISTINCT cs.id) as total_sessions,
    SUM(cs.sales_count) as total_transactions,
    SUM(cs.cash_total) as total_cash,
    SUM(cs.card_total) as total_card,
    SUM(cs.transfer_total) as total_transfer,
    SUM(cs.cash_total + cs.card_total + cs.transfer_total + cs.other_total) as total_sales,
    AVG(cs.average_ticket) as avg_ticket,
    SUM(cs.difference) as total_difference
FROM cash_sessions cs
WHERE cs.status = 'closed'
GROUP BY DATE(cs.opened_at);

-- =====================================================
-- Migration completed successfully
-- =====================================================