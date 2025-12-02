-- Migration: Add Additional Payment Methods
-- Version: 004
-- Description: Add Red Compra, Cheque and other payment methods
-- Date: 2025-12-02

-- =====================================================
-- 1. Update payment_methods enum if using CHECK constraint
-- =====================================================

-- Add new payment methods to the system
INSERT INTO payment_methods (code, name, enabled, requires_reference, icon, sort_order) VALUES
('red_compra', 'Red Compra', 1, 1, 'credit-card', 4),
('cheque', 'Cheque', 1, 1, 'file-text', 5),
('vale', 'Vale/Ticket Alimentación', 1, 1, 'ticket', 6),
('crypto', 'Criptomonedas', 0, 1, 'bitcoin', 7)
ON CONFLICT(code) DO NOTHING;

-- =====================================================
-- 2. Add payment_details table for extra info
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    detail_type VARCHAR(50) NOT NULL, -- 'cheque', 'card', 'crypto'

    -- Cheque details
    cheque_number VARCHAR(50),
    bank_name VARCHAR(100),
    cheque_date DATE,

    -- Card details
    card_last4 VARCHAR(4),
    card_type VARCHAR(20), -- 'visa', 'mastercard', 'amex'
    authorization_code VARCHAR(50),

    -- Red Compra / Debit details
    transaction_code VARCHAR(100),
    terminal_id VARCHAR(50),

    -- Crypto details
    wallet_address VARCHAR(255),
    transaction_hash VARCHAR(255),
    crypto_currency VARCHAR(10), -- 'BTC', 'ETH'

    -- Common
    reference_number VARCHAR(100),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (payment_id) REFERENCES sale_payments(id) ON DELETE CASCADE
);

-- =====================================================
-- 3. Create indexes
-- =====================================================
CREATE INDEX idx_payment_details_payment_id ON payment_details(payment_id);
CREATE INDEX idx_payment_details_type ON payment_details(detail_type);
CREATE INDEX idx_payment_details_cheque_number ON payment_details(cheque_number);
CREATE INDEX idx_payment_details_transaction_code ON payment_details(transaction_code);

-- =====================================================
-- 4. Add configuration for payment methods
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_method_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_method_code VARCHAR(50) NOT NULL,
    terminal_id VARCHAR(50),

    -- Configuration options
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2),
    commission_percentage DECIMAL(5,2) DEFAULT 0,
    commission_fixed DECIMAL(10,2) DEFAULT 0,

    -- Integration settings
    api_endpoint VARCHAR(255),
    api_key VARCHAR(255),
    merchant_id VARCHAR(100),

    -- Settings JSON
    settings JSON,

    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(payment_method_code, terminal_id)
);

-- =====================================================
-- 5. Insert default configurations
-- =====================================================
INSERT INTO payment_method_config (payment_method_code, terminal_id, settings) VALUES
('red_compra', 'POS-01', '{"require_pin": true, "print_voucher": true}'),
('cheque', 'POS-01', '{"require_bank": true, "max_days_future": 30}'),
('card', 'POS-01', '{"accept_visa": true, "accept_mastercard": true}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. Update trigger for payment_method_config
-- =====================================================
CREATE TRIGGER update_payment_method_config_timestamp
AFTER UPDATE ON payment_method_config
BEGIN
    UPDATE payment_method_config
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Migration completed successfully