-- Migration: Add Cash Register System Tables
-- Date: 2025-10-25
-- Description: Adds cash_sessions, cash_movements, and z_reports tables for the cash register system

-- Cash sessions table (sistema de caja)
CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'suspended')),
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10,2),
    expected_balance DECIMAL(10,2),
    difference DECIMAL(10,2),
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_card DECIMAL(10,2) DEFAULT 0,
    total_other DECIMAL(10,2) DEFAULT 0,
    total_in DECIMAL(10,2) DEFAULT 0,  -- ingresos adicionales
    total_out DECIMAL(10,2) DEFAULT 0, -- retiros/gastos
    sales_count INTEGER DEFAULT 0,
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Cash movements table (movimientos de caja)
CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_session_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'sale', 'opening', 'closing')),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    reference_id INTEGER, -- sale_id if related to sale
    reference_type VARCHAR(50), -- 'sale', 'expense', 'withdrawal', etc.
    reason VARCHAR(255),
    notes TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Z Reports table (reportes fiscales de cierre)
CREATE TABLE IF NOT EXISTS z_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_number VARCHAR(50) UNIQUE NOT NULL,
    cash_session_id INTEGER NOT NULL,
    report_date DATE NOT NULL,
    user_id INTEGER NOT NULL,
    total_sales DECIMAL(10,2) NOT NULL,
    total_tax DECIMAL(10,2) NOT NULL,
    total_discount DECIMAL(10,2) DEFAULT 0,
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_card DECIMAL(10,2) DEFAULT 0,
    total_other DECIMAL(10,2) DEFAULT 0,
    sales_count INTEGER NOT NULL,
    cancelled_count INTEGER DEFAULT 0,
    refunded_count INTEGER DEFAULT 0,
    opening_balance DECIMAL(10,2) NOT NULL,
    closing_balance DECIMAL(10,2) NOT NULL,
    difference DECIMAL(10,2) DEFAULT 0,
    report_data TEXT, -- JSON with detailed data
    printed BOOLEAN DEFAULT 0,
    printed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_date ON cash_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_z_reports_session ON z_reports(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_z_reports_date ON z_reports(report_date);
