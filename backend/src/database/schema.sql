-- SYSME POS 2.0 Database Schema for SQLite
-- Restaurant Point of Sale System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'waiter', 'kitchen')),
    is_active BOOLEAN DEFAULT 1,
    phone VARCHAR(20),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    category_id INTEGER,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(100),
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT 1,
    is_trackable BOOLEAN DEFAULT 1,
    weight DECIMAL(8,2),
    preparation_time INTEGER DEFAULT 10, -- minutes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    birth_date DATE,
    preferences TEXT, -- JSON
    total_spent DECIMAL(10,2) DEFAULT 0,
    visit_count INTEGER DEFAULT 0,
    last_visit DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tables (restaurant tables)
CREATE TABLE IF NOT EXISTS restaurant_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    location VARCHAR(50), -- area of restaurant
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER,
    table_number VARCHAR(10),
    user_id INTEGER NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partial')),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled', 'refunded')),
    notes TEXT,
    receipt_printed BOOLEAN DEFAULT 0,
    kitchen_printed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Sale items table
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(150) NOT NULL, -- snapshot
    quantity DECIMAL(8,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Kitchen orders table (for kitchen display)
CREATE TABLE IF NOT EXISTS kitchen_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    sale_item_id INTEGER NOT NULL,
    table_number VARCHAR(10),
    product_name VARCHAR(150) NOT NULL,
    quantity DECIMAL(8,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    priority INTEGER DEFAULT 1, -- 1=normal, 2=high, 3=urgent
    preparation_time INTEGER DEFAULT 10,
    notes TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (sale_item_id) REFERENCES sale_items(id) ON DELETE CASCADE
);

-- Inventory movements table
CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'sale', 'waste', 'return')),
    quantity DECIMAL(8,2) NOT NULL,
    previous_stock DECIMAL(8,2) NOT NULL,
    new_stock DECIMAL(8,2) NOT NULL,
    cost DECIMAL(10,2),
    reason VARCHAR(255),
    reference_id INTEGER, -- sale_id, purchase_id, etc.
    reference_type VARCHAR(50), -- 'sale', 'purchase', 'adjustment'
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
    is_public BOOLEAN DEFAULT 0, -- can be accessed by frontend
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    requires_change BOOLEAN DEFAULT 0, -- cash requires change
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_table ON kitchen_orders(table_number);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_user ON cash_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_status ON cash_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_sessions_date ON cash_sessions(opened_at);
CREATE INDEX IF NOT EXISTS idx_cash_movements_session ON cash_movements(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_z_reports_session ON z_reports(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_z_reports_date ON z_reports(report_date);

-- Insert default data
INSERT OR IGNORE INTO users (id, username, email, password, first_name, last_name, role) VALUES
(1, 'admin', 'admin@sysme.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/jPW5.ZjjQgT3vSMKG', 'Admin', 'User', 'admin');

INSERT OR IGNORE INTO categories (name, description, color) VALUES
('Bebidas', 'Bebidas frías y calientes', '#3b82f6'),
('Platos Principales', 'Platos principales del menú', '#ef4444'),
('Postres', 'Postres y dulces', '#f59e0b'),
('Aperitivos', 'Entradas y aperitivos', '#10b981'),
('Ensaladas', 'Ensaladas frescas', '#22c55e');

INSERT OR IGNORE INTO payment_methods (name, code, requires_change, icon) VALUES
('Efectivo', 'cash', 1, 'cash'),
('Tarjeta', 'card', 0, 'credit-card'),
('Transferencia', 'transfer', 0, 'bank'),
('Mixto', 'mixed', 0, 'coins');

INSERT OR IGNORE INTO restaurant_tables (table_number, capacity, location) VALUES
('Mesa 1', 4, 'Salón Principal'),
('Mesa 2', 4, 'Salón Principal'),
('Mesa 3', 2, 'Salón Principal'),
('Mesa 4', 6, 'Salón Principal'),
('Mesa 5', 4, 'Terraza'),
('Mesa 6', 2, 'Terraza'),
('Barra 1', 1, 'Barra'),
('Barra 2', 1, 'Barra');

INSERT OR IGNORE INTO settings (key, value, category, description, data_type, is_public) VALUES
('company_name', 'SYSME Restaurant', 'general', 'Nombre de la empresa', 'string', 1),
('company_address', 'Calle Principal 123', 'general', 'Dirección de la empresa', 'string', 1),
('company_phone', '+34 900 123 456', 'general', 'Teléfono de la empresa', 'string', 1),
('tax_rate', '21', 'pos', 'Porcentaje de IVA', 'number', 1),
('currency', 'EUR', 'pos', 'Moneda del sistema', 'string', 1),
('receipt_footer', 'Gracias por su visita', 'pos', 'Pie de recibo', 'string', 1),
('low_stock_threshold', '5', 'inventory', 'Umbral de stock bajo', 'number', 0),
('kitchen_auto_print', 'true', 'kitchen', 'Imprimir automáticamente en cocina', 'boolean', 0);

-- Sample products
INSERT OR IGNORE INTO products (name, description, price, category_id, stock, sku) VALUES
('Café Americano', 'Café americano tradicional', 2.50, 1, 100, 'CAF001'),
('Café con Leche', 'Café con leche cremoso', 3.00, 1, 100, 'CAF002'),
('Agua Mineral', 'Agua mineral natural', 1.50, 1, 50, 'BEB001'),
('Hamburguesa Clásica', 'Hamburguesa con carne, lechuga, tomate', 12.90, 2, 25, 'HAM001'),
('Pizza Margarita', 'Pizza con tomate, mozzarella y albahaca', 11.50, 2, 20, 'PIZ001'),
('Ensalada César', 'Ensalada con pollo, crutones y parmesano', 8.90, 5, 30, 'ENS001'),
('Tarta de Chocolate', 'Deliciosa tarta de chocolate casera', 4.50, 3, 15, 'POS001');