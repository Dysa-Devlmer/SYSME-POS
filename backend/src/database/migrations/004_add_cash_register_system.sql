-- Migration: Cash Register System (Sistema de Cajas)
-- Date: 2025-01-16
-- Purpose: Implement complete cash register control (obligatorio por ley)

-- Table: cash_registers (cajas/TPVs)
CREATE TABLE IF NOT EXISTS cash_registers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    location VARCHAR(100),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table: cash_sessions (aperturas y cierres de caja)
CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_id INTEGER NOT NULL,
    session_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    opening_date DATETIME NOT NULL,
    closing_date DATETIME,
    initial_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
    expected_cash DECIMAL(10,2) DEFAULT 0,
    actual_cash DECIMAL(10,2) DEFAULT 0,
    difference DECIMAL(10,2) DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_cash_sales DECIMAL(10,2) DEFAULT 0,
    total_card_sales DECIMAL(10,2) DEFAULT 0,
    total_other_sales DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Table: cash_movements (registro de movimientos de cajón)
CREATE TABLE IF NOT EXISTS cash_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_session_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('open_drawer', 'cash_in', 'cash_out', 'sale', 'refund')),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    reason VARCHAR(255),
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Table: z_reports (reportes Z - cierre fiscal diario)
CREATE TABLE IF NOT EXISTS z_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_id INTEGER NOT NULL,
    report_number VARCHAR(50) UNIQUE NOT NULL,
    report_date DATE NOT NULL,
    from_session_id INTEGER,
    to_session_id INTEGER,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_card DECIMAL(10,2) DEFAULT 0,
    total_other DECIMAL(10,2) DEFAULT 0,
    total_refunds DECIMAL(10,2) DEFAULT 0,
    total_discounts DECIMAL(10,2) DEFAULT 0,
    total_tax DECIMAL(10,2) DEFAULT 0,
    number_of_transactions INTEGER DEFAULT 0,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cash_register_id) REFERENCES cash_registers(id) ON DELETE RESTRICT,
    FOREIGN KEY (from_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (to_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Add cash_session_id to sales table
ALTER TABLE sales ADD COLUMN cash_session_id INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_sessions_register ON cash_sessions(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_z_reports_date ON z_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_sales_cash_session ON sales(cash_session_id);

-- Insert default cash register
INSERT INTO cash_registers (name, code, location, is_active)
VALUES ('Caja Principal', 'TPV-001', 'Mostrador Principal', 1);

-- Comments about the system:
--
-- WORKFLOW:
-- 1. User opens cash session (apertura de caja) with initial cash
-- 2. All sales are associated with the cash session
-- 3. Cash movements are recorded (cash in/out, drawer openings)
-- 4. User closes cash session (cierre de caja) with actual cash count
-- 5. System calculates difference (expected vs actual)
-- 6. At end of day, generate Z report (reporte Z) summarizing all sessions
--
-- LEGAL REQUIREMENTS:
-- - Cash sessions must be sequential and auditable
-- - Z reports provide daily fiscal summary
-- - All cash movements must be logged
-- - Cannot process sales without open cash session
