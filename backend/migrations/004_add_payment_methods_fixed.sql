-- Migration: Add Additional Payment Methods (Fixed)
-- Version: 004
-- Description: Add payment_methods table and Red Compra, Cheque support
-- Date: 2025-12-02

-- =====================================================
-- 1. Create payment_methods master table
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    requires_reference BOOLEAN DEFAULT 0,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert standard payment methods
INSERT INTO payment_methods (code, name, enabled, requires_reference, icon, sort_order) VALUES
('cash', 'Efectivo', 1, 0, 'dollar-sign', 1),
('card', 'Tarjeta Débito', 1, 1, 'credit-card', 2),
('credit', 'Tarjeta Crédito', 1, 1, 'credit-card', 3),
('red_compra', 'Red Compra', 1, 1, 'building', 4),
('transfer', 'Transferencia', 1, 1, 'arrow-right', 5),
('cheque', 'Cheque', 1, 1, 'file-text', 6),
('vale', 'Vale/Ticket Alimentación', 1, 1, 'ticket', 7)
ON CONFLICT(code) DO NOTHING;

-- =====================================================
-- 2. Create sale_payments table for split payments
-- =====================================================
CREATE TABLE IF NOT EXISTS sale_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    payment_method_code VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_method_code) REFERENCES payment_methods(code)
);

CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_method ON sale_payments(payment_method_code);

-- =====================================================
-- 3. Payment details table already exists, add indexes if missing
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_payment_details_payment_id ON payment_details(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_details_type ON payment_details(detail_type);
CREATE INDEX IF NOT EXISTS idx_payment_details_cheque_number ON payment_details(cheque_number);
CREATE INDEX IF NOT EXISTS idx_payment_details_transaction_code ON payment_details(transaction_code);

-- =====================================================
-- 4. Insert default configurations for new payment methods
-- =====================================================
INSERT INTO payment_method_config (payment_method_code, terminal_id, settings) VALUES
('red_compra', NULL, '{"require_pin": true, "print_voucher": true}'),
('cheque', NULL, '{"require_bank": true, "max_days_future": 30}'),
('transfer', NULL, '{"require_reference": true}'),
('vale', NULL, '{"max_amount": 50000}')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. Create trigger if not exists
-- =====================================================
DROP TRIGGER IF EXISTS update_payment_method_config_timestamp;
CREATE TRIGGER update_payment_method_config_timestamp
AFTER UPDATE ON payment_method_config
BEGIN
    UPDATE payment_method_config
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Migration completed successfully
