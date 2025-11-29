-- Migration: Invoice System with Series
-- Date: 2025-01-17
-- Purpose: Complete invoice system with series, folio control, and legal requirements

-- Invoice Series (different series for different document types)
CREATE TABLE IF NOT EXISTS invoice_series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series_code VARCHAR(10) NOT NULL UNIQUE, -- e.g., 'A', 'B', 'F001', 'BOLETA'
    series_name VARCHAR(100) NOT NULL, -- e.g., 'Facturas Tipo A', 'Boletas'
    document_type VARCHAR(50) NOT NULL, -- 'factura', 'boleta', 'nota_credito', 'nota_debito'
    prefix VARCHAR(20), -- Optional prefix for invoice number (e.g., 'FAC-', 'BOL-')
    current_number INTEGER DEFAULT 0, -- Auto-increment counter
    start_number INTEGER DEFAULT 1, -- Starting number
    end_number INTEGER, -- Optional ending number (for legal limits)
    is_active BOOLEAN DEFAULT 1,
    requires_tax_id BOOLEAN DEFAULT 1, -- Requires customer tax ID/RUT
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Invoices (generated from sales)
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number VARCHAR(50) NOT NULL UNIQUE, -- Full invoice number (e.g., 'FAC-A-00001')
    series_id INTEGER NOT NULL,
    sale_id INTEGER NOT NULL,
    cash_session_id INTEGER,

    -- Document info
    document_type VARCHAR(50) NOT NULL, -- 'factura', 'boleta', 'nota_credito', 'nota_debito'
    invoice_date DATE NOT NULL,
    due_date DATE,

    -- Customer info (required for invoices)
    customer_name VARCHAR(255) NOT NULL,
    customer_tax_id VARCHAR(50), -- RUT/NIT/DNI
    customer_address TEXT,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),

    -- Amounts (copied from sale for immutability)
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,

    -- Payment info
    payment_method VARCHAR(50), -- 'cash', 'card', 'transfer', 'mixed'
    payment_status VARCHAR(20) DEFAULT 'paid', -- 'paid', 'pending', 'partial', 'cancelled'

    -- Legal & Control
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'credited'
    folio_number INTEGER, -- Official folio (for tax authorities)
    electronic_invoice_id VARCHAR(255), -- For electronic invoicing
    xml_data TEXT, -- Store XML for electronic invoices
    pdf_path VARCHAR(500), -- Path to generated PDF

    -- Cancellation (if applicable)
    cancelled_at DATETIME,
    cancelled_by INTEGER,
    cancellation_reason TEXT,
    credit_note_id INTEGER, -- Reference to credit note if cancelled

    -- Metadata
    issued_by INTEGER NOT NULL, -- User who generated invoice
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (series_id) REFERENCES invoice_series(id) ON DELETE RESTRICT,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE RESTRICT,
    FOREIGN KEY (cash_session_id) REFERENCES cash_sessions(id) ON DELETE SET NULL,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (credit_note_id) REFERENCES invoices(id) ON DELETE SET NULL
);

-- Invoice Items (denormalized copy of sale items for immutability)
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,

    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),

    quantity DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    discount_percent DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tax_percent DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,

    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_series_id ON invoices(series_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale_id ON invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_tax_id ON invoices(customer_tax_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Insert default invoice series for Chile/LATAM
INSERT INTO invoice_series (series_code, series_name, document_type, prefix, start_number, requires_tax_id) VALUES
('BOLETA', 'Boletas Electrónicas', 'boleta', 'BOL-', 1, 0),
('FACTURA', 'Facturas Electrónicas', 'factura', 'FAC-', 1, 1),
('NC', 'Notas de Crédito', 'nota_credito', 'NC-', 1, 1),
('ND', 'Notas de Débito', 'nota_debito', 'ND-', 1, 1);

-- Add invoice_id to sales table (optional, for reverse lookup)
ALTER TABLE sales ADD COLUMN invoice_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_sales_invoice_id ON sales(invoice_id);

-- Comments:
-- Workflow:
-- 1. Sale is completed (payment received)
-- 2. User generates invoice from sale (selects series, enters customer data)
-- 3. System auto-increments series number, creates invoice + invoice_items
-- 4. Invoice is immutable (cannot be edited, only cancelled with credit note)
-- 5. PDF is generated and stored
-- 6. Sale.invoice_id is updated with reference
--
-- Use cases:
-- - Restaurant bill → Boleta (no tax ID required)
-- - Corporate customer → Factura (tax ID required)
-- - Return/refund → Nota de Crédito
-- - Price adjustment → Nota de Débito
--
-- Legal compliance:
-- - Each series has independent folio numbering
-- - Invoices are immutable once generated
-- - Cancellation requires credit note
-- - All customer data is stored for audit trail
