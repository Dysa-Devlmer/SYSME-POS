-- Migration: Update Cash Sessions Schema
-- Date: 2025-01-16
-- Purpose: Align schema with controller expectations

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new table with correct schema
CREATE TABLE cash_sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_id INTEGER NOT NULL DEFAULT 1,
    session_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10,2) DEFAULT 0,
    expected_balance DECIMAL(10,2) DEFAULT 0,
    difference DECIMAL(10,2) DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_card DECIMAL(10,2) DEFAULT 0,
    total_other DECIMAL(10,2) DEFAULT 0,
    total_in DECIMAL(10,2) DEFAULT 0,
    total_out DECIMAL(10,2) DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Step 2: Copy data from old table (if any exists)
INSERT INTO cash_sessions_new (
    id, cash_register_id, session_number, user_id, status,
    opening_balance, closing_balance, expected_balance, difference,
    total_sales, total_cash, total_card, total_other,
    opened_at, closed_at, notes, created_at, updated_at
)
SELECT
    id,
    COALESCE(cash_register_id, 1) as cash_register_id,
    session_number,
    user_id,
    status,
    COALESCE(initial_cash, 0) as opening_balance,
    COALESCE(actual_cash, 0) as closing_balance,
    COALESCE(expected_cash, 0) as expected_balance,
    COALESCE(difference, 0) as difference,
    COALESCE(total_sales, 0) as total_sales,
    COALESCE(total_cash_sales, 0) as total_cash,
    COALESCE(total_card_sales, 0) as total_card,
    COALESCE(total_other_sales, 0) as total_other,
    COALESCE(opening_date, created_at) as opened_at,
    closing_date as closed_at,
    notes,
    created_at,
    updated_at
FROM cash_sessions;

-- Step 3: Drop old table
DROP TABLE cash_sessions;

-- Step 4: Rename new table
ALTER TABLE cash_sessions_new RENAME TO cash_sessions;

-- Step 5: Recreate indexes
CREATE INDEX idx_cash_sessions_register ON cash_sessions(cash_register_id);
CREATE INDEX idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX idx_cash_sessions_opened_at ON cash_sessions(opened_at);

-- Step 6: Update cash_movements table to add missing fields
-- Add payment_method column if it doesn't exist
ALTER TABLE cash_movements ADD COLUMN payment_method VARCHAR(20) DEFAULT 'cash';

-- Add reference fields for tracking sales
ALTER TABLE cash_movements ADD COLUMN reference_id INTEGER;
ALTER TABLE cash_movements ADD COLUMN reference_type VARCHAR(20);
ALTER TABLE cash_movements ADD COLUMN notes TEXT;

-- Update type constraints to match controller
-- Note: SQLite doesn't support modifying CHECK constraints easily
-- The controller expects: 'opening', 'closing', 'in', 'out', 'sale', 'refund'

-- Step 7: Update z_reports table to add missing fields
ALTER TABLE z_reports ADD COLUMN cash_session_id INTEGER REFERENCES cash_sessions(id);
ALTER TABLE z_reports ADD COLUMN cancelled_count INTEGER DEFAULT 0;
ALTER TABLE z_reports ADD COLUMN refunded_count INTEGER DEFAULT 0;
ALTER TABLE z_reports ADD COLUMN opening_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE z_reports ADD COLUMN closing_balance DECIMAL(10,2) DEFAULT 0;
ALTER TABLE z_reports ADD COLUMN difference DECIMAL(10,2) DEFAULT 0;
ALTER TABLE z_reports ADD COLUMN report_data TEXT; -- JSON data for detailed report
ALTER TABLE z_reports ADD COLUMN printed BOOLEAN DEFAULT 0;
ALTER TABLE z_reports ADD COLUMN printed_at DATETIME;

-- Create index on cash_session_id
CREATE INDEX idx_z_reports_session ON z_reports(cash_session_id);
