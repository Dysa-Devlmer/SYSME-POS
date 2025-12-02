-- Migration: Complete All Features
-- Version: 005
-- Description: All remaining tables and features
-- Date: 2025-12-02

-- =====================================================
-- 1. USER FAVORITES
-- =====================================================
CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    position INTEGER DEFAULT 1,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT 1,
    auto_added BOOLEAN DEFAULT 0,
    last_used_at DATETIME,
    use_count INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(user_id, product_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_active ON user_favorites(active);

-- =====================================================
-- 2. PRICE OVERRIDES (Cambio de precio con auditoría)
-- =====================================================
CREATE TABLE IF NOT EXISTS price_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_item_id INTEGER NOT NULL,
    original_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    authorized_by INTEGER NOT NULL,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE,
    FOREIGN KEY (authorized_by) REFERENCES users(id)
);

CREATE INDEX idx_price_overrides_sale_item ON price_overrides(sale_item_id);
CREATE INDEX idx_price_overrides_authorized ON price_overrides(authorized_by);
CREATE INDEX idx_price_overrides_date ON price_overrides(created_at);

-- =====================================================
-- 3. TERMINALS (TPV)
-- =====================================================
CREATE TABLE IF NOT EXISTS terminals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    terminal_type VARCHAR(20) DEFAULT 'pos', -- pos, kitchen, bar, delivery

    -- Printer configuration
    main_printer VARCHAR(100),
    kitchen_printer VARCHAR(100),
    bar_printer VARCHAR(100),
    receipt_printer VARCHAR(100),

    -- Hardware
    cash_drawer_enabled BOOLEAN DEFAULT 1,
    barcode_scanner_enabled BOOLEAN DEFAULT 0,
    card_reader_enabled BOOLEAN DEFAULT 0,

    -- Display settings
    display_mode VARCHAR(20) DEFAULT 'standard', -- standard, compact, large
    theme VARCHAR(20) DEFAULT 'light',

    -- Configuration JSON
    settings JSON,

    -- Status
    active BOOLEAN DEFAULT 1,
    last_activity DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default terminals
INSERT INTO terminals (code, name, location, main_printer, kitchen_printer) VALUES
('POS-01', 'Caja Principal', 'Salón 1', 'printer1', 'kitchen1'),
('POS-02', 'Caja 2', 'Salón 2', 'printer2', 'kitchen1'),
('BAR-01', 'Terminal Bar', 'Bar', 'bar_printer', 'kitchen1'),
('KITCHEN-01', 'Terminal Cocina', 'Cocina', 'kitchen1', 'kitchen1')
ON CONFLICT DO NOTHING;

CREATE INDEX idx_terminals_code ON terminals(code);
CREATE INDEX idx_terminals_active ON terminals(active);

-- =====================================================
-- 4. ALBARANES (Delivery Notes)
-- =====================================================
CREATE TABLE IF NOT EXISTS albaranes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    albaran_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER,
    customer_name VARCHAR(200),
    customer_address TEXT,
    customer_tax_id VARCHAR(50),

    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,

    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,

    notes TEXT,
    internal_notes TEXT,

    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, cancelled

    converted_to_invoice BOOLEAN DEFAULT 0,
    invoice_id INTEGER,
    invoice_number VARCHAR(50),

    delivery_date DATE,
    delivery_address TEXT,
    delivered_by VARCHAR(100),

    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS albaran_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    albaran_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(100),

    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    tax_percentage DECIMAL(5,2) DEFAULT 19,
    subtotal DECIMAL(10,2) NOT NULL,

    notes TEXT,

    FOREIGN KEY (albaran_id) REFERENCES albaranes(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX idx_albaranes_number ON albaranes(albaran_number);
CREATE INDEX idx_albaranes_customer ON albaranes(customer_id);
CREATE INDEX idx_albaranes_status ON albaranes(status);
CREATE INDEX idx_albaranes_date ON albaranes(date);

CREATE TRIGGER update_albaranes_timestamp
AFTER UPDATE ON albaranes
BEGIN
    UPDATE albaranes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =====================================================
-- 5. PRE-TICKETS (Pre-boleta)
-- =====================================================
CREATE TABLE IF NOT EXISTS pre_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    terminal_id VARCHAR(50),

    printed_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_pre_tickets_sale ON pre_tickets(sale_id);

-- =====================================================
-- 6. PRINT LOG (Log de impresiones)
-- =====================================================
CREATE TABLE IF NOT EXISTS print_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_type VARCHAR(50) NOT NULL, -- ticket, invoice, kitchen_order, albaran
    document_id INTEGER NOT NULL,
    print_type VARCHAR(20) NOT NULL, -- original, reprint, copy
    printer VARCHAR(100),

    printed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    printed_by INTEGER NOT NULL,
    terminal_id VARCHAR(50),

    success BOOLEAN DEFAULT 1,
    error_message TEXT,

    FOREIGN KEY (printed_by) REFERENCES users(id)
);

CREATE INDEX idx_print_log_document ON print_log(document_type, document_id);
CREATE INDEX idx_print_log_date ON print_log(printed_at);
CREATE INDEX idx_print_log_user ON print_log(printed_by);

-- =====================================================
-- 7. KITCHEN STATIONS (Multi-cocina)
-- =====================================================
CREATE TABLE IF NOT EXISTS kitchen_stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    printer VARCHAR(100),
    display_order INTEGER DEFAULT 1,
    color VARCHAR(7) DEFAULT '#3B82F6',
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO kitchen_stations (code, name, description, display_order, color) VALUES
('COCINA-1', 'Cocina Principal', 'Platos calientes', 1, '#EF4444'),
('COCINA-2', 'Cocina Fría', 'Ensaladas y entradas', 2, '#10B981'),
('BAR', 'Bar', 'Bebidas y cócteles', 3, '#3B82F6'),
('POSTRES', 'Repostería', 'Postres y dulces', 4, '#F59E0B')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS product_kitchen_stations (
    product_id INTEGER NOT NULL,
    kitchen_station_id INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT 1,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (kitchen_station_id) REFERENCES kitchen_stations(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, kitchen_station_id)
);

-- =====================================================
-- 8. HOTEL INTEGRATION (Cargo a habitación)
-- =====================================================
CREATE TABLE IF NOT EXISTS hotel_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    room_type VARCHAR(50),
    floor INTEGER,
    status VARCHAR(20) DEFAULT 'available', -- available, occupied, cleaning, maintenance
    guest_name VARCHAR(200),
    check_in_date DATE,
    check_out_date DATE,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_charges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    sale_id INTEGER,
    charge_type VARCHAR(50) DEFAULT 'restaurant', -- restaurant, bar, minibar, service
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    posted_to_pms BOOLEAN DEFAULT 0,
    pms_transaction_id VARCHAR(100),
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES hotel_rooms(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX idx_room_charges_room ON room_charges(room_id);
CREATE INDEX idx_room_charges_date ON room_charges(date);

-- =====================================================
-- 9. BARCODE SCANNER LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS barcode_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode VARCHAR(255) NOT NULL,
    product_id INTEGER,
    scan_type VARCHAR(20) DEFAULT 'sale', -- sale, inventory, search
    terminal_id VARCHAR(50),
    user_id INTEGER,
    result VARCHAR(20), -- found, not_found, error
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_barcode_scans_barcode ON barcode_scans(barcode);
CREATE INDEX idx_barcode_scans_date ON barcode_scans(scanned_at);

-- =====================================================
-- 10. MULTI-CURRENCY SUPPORT
-- =====================================================
CREATE TABLE IF NOT EXISTS currencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(3) UNIQUE NOT NULL, -- USD, EUR, CLP, etc.
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL DEFAULT 1.0000,
    is_default BOOLEAN DEFAULT 0,
    active BOOLEAN DEFAULT 1,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO currencies (code, name, symbol, exchange_rate, is_default, active) VALUES
('CLP', 'Peso Chileno', '$', 1.0000, 1, 1),
('USD', 'Dólar Estadounidense', 'US$', 900.0000, 0, 1),
('EUR', 'Euro', '€', 980.0000, 0, 1)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sale_currency_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    currency_code VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    amount_in_currency DECIMAL(10,2) NOT NULL,
    amount_in_default DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- =====================================================
-- 11. EXPORT LOGS (PDF, Excel, CSV)
-- =====================================================
CREATE TABLE IF NOT EXISTS export_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    export_type VARCHAR(50) NOT NULL, -- pdf, excel, csv, xml
    document_type VARCHAR(50) NOT NULL, -- sales_report, inventory, customers
    file_name VARCHAR(255),
    file_path VARCHAR(500),
    file_size INTEGER,

    filters JSON,
    record_count INTEGER,

    exported_by INTEGER NOT NULL,
    exported_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    success BOOLEAN DEFAULT 1,
    error_message TEXT,

    FOREIGN KEY (exported_by) REFERENCES users(id)
);

CREATE INDEX idx_export_log_type ON export_log(export_type);
CREATE INDEX idx_export_log_date ON export_log(exported_at);

-- =====================================================
-- 12. SYSTEM NOTIFICATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS system_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, error, success

    user_id INTEGER,
    read BOOLEAN DEFAULT 0,
    read_at DATETIME,

    action_url VARCHAR(500),
    action_label VARCHAR(50),

    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON system_notifications(user_id);
CREATE INDEX idx_notifications_read ON system_notifications(read);
CREATE INDEX idx_notifications_created ON system_notifications(created_at);

-- =====================================================
-- Migration completed successfully
-- All 18 features are now supported in database
-- =====================================================