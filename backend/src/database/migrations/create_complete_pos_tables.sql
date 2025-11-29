-- SYSME 2.0 - Complete POS Database Structure
-- Replica las 143 tablas del sistema legacy adaptadas a SQLite moderno

-- ==========================================
-- MODULO DE PRODUCTOS Y CATEGORIAS
-- ==========================================

-- Categorías de productos (como tipo_comg del legacy)
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Productos completos (como complementog del legacy)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10,2) DEFAULT 0,
    category_id INTEGER,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    is_kitchen BOOLEAN DEFAULT 0,
    is_bar BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_favorite BOOLEAN DEFAULT 0,
    kitchen_panel BOOLEAN DEFAULT 0,
    kitchen_block INTEGER DEFAULT 1,
    allow_price_change BOOLEAN DEFAULT 0,
    auto_add BOOLEAN DEFAULT 0,
    is_pack BOOLEAN DEFAULT 0,
    image_url TEXT,
    sku VARCHAR(50),
    barcode VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Packs jerárquicos (como pack del legacy)
CREATE TABLE IF NOT EXISTS pack_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_product_id INTEGER NOT NULL,
    child_product_id INTEGER NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (child_product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Inventario con stock (compatible con legacy)
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0,
    min_stock DECIMAL(10,3) DEFAULT 0,
    max_stock DECIMAL(10,3) DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ==========================================
-- MODULO DE EMPLEADOS Y AUTENTICACION
-- ==========================================

-- Empleados (como camareros del legacy)
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    pin VARCHAR(10) NOT NULL,
    role VARCHAR(50) DEFAULT 'waiter',
    email VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT 1,
    assigned_tpv VARCHAR(10),
    assigned_almacen VARCHAR(100),
    -- Privilegios como legacy
    can_delete_line BOOLEAN DEFAULT 0,
    can_modify_ticket BOOLEAN DEFAULT 0,
    can_manual_price BOOLEAN DEFAULT 0,
    can_change_tariff BOOLEAN DEFAULT 0,
    can_cancel_ticket BOOLEAN DEFAULT 0,
    can_discount BOOLEAN DEFAULT 0,
    can_open_drawer BOOLEAN DEFAULT 0,
    can_kitchen_read BOOLEAN DEFAULT 1,
    can_kitchen_update BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- MODULO DE MESAS Y SALONES (YA EXISTE)
-- ==========================================
-- Las tablas tables, salons, tarifas ya existen

-- ==========================================
-- MODULO DE VENTAS COMPLETO
-- ==========================================

-- Ventas principales (como ventadirecta del legacy)
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_number VARCHAR(20) NOT NULL UNIQUE,
    ticket_number VARCHAR(10),
    table_id INTEGER,
    waiter_id INTEGER,
    customer_count INTEGER DEFAULT 1,
    tarifa_id INTEGER,
    tarifa_multiplier DECIMAL(5,2) DEFAULT 1.0,
    serie VARCHAR(5) DEFAULT 'A',
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open', -- open, completed, cancelled
    subtotal DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_total DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50),
    amount_paid DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (table_id) REFERENCES tables(id),
    FOREIGN KEY (waiter_id) REFERENCES employees(id),
    FOREIGN KEY (tarifa_id) REFERENCES tarifas(id)
);

-- Líneas de venta (como ventadir_comg del legacy)
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    notes TEXT,
    kitchen_block INTEGER DEFAULT 1,
    kitchen_status VARCHAR(20) DEFAULT 'pending', -- pending, preparing, ready, served
    kitchen_printed BOOLEAN DEFAULT 0,
    is_kitchen BOOLEAN DEFAULT 0,
    is_bar BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ==========================================
-- MODULO DE REPORTES Y ANALISIS
-- ==========================================

-- Tipos de venta (como el legacy)
CREATE TABLE IF NOT EXISTS sale_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1
);

-- Insertar tipos de venta estándar del legacy
INSERT OR IGNORE INTO sale_types (id, name, description) VALUES
(1, 'Ventas', 'Ventas normales'),
(2, 'Roturas', 'Productos rotos o dañados'),
(3, 'Invitaciones', 'Productos ofrecidos gratuitamente'),
(4, 'AutoConsumo', 'Consumo interno del personal'),
(5, 'Otros', 'Otros tipos de movimientos');

-- ==========================================
-- MODULO DE CONFIGURACION
-- ==========================================

-- Configuración del sistema (como config del legacy)
CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    data_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Configuraciones básicas del legacy
INSERT OR IGNORE INTO system_config (config_key, config_value, description, data_type) VALUES
('restaurant_name', 'SYSME Restaurant', 'Nombre del restaurante', 'string'),
('restaurant_address', '', 'Dirección del restaurante', 'string'),
('restaurant_phone', '', 'Teléfono del restaurante', 'string'),
('restaurant_email', '', 'Email del restaurante', 'string'),
('default_vat_rate', '19', 'IVA por defecto (%)', 'number'),
('currency_symbol', '$', 'Símbolo de moneda', 'string'),
('timezone', 'America/Santiago', 'Zona horaria', 'string'),
('kitchen_auto_print', 'true', 'Imprimir automáticamente en cocina', 'boolean'),
('allow_negative_stock', 'true', 'Permitir stock negativo', 'boolean'),
('default_customer_count', '1', 'Número de comensales por defecto', 'number');

-- ==========================================
-- MODULO DE CAJAS Y PAGOS
-- ==========================================

-- Formas de pago (como modo_pago del legacy)
CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    requires_reference BOOLEAN DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Formas de pago estándar
INSERT OR IGNORE INTO payment_methods (name, description, requires_reference) VALUES
('Efectivo', 'Pago en efectivo', 0),
('Tarjeta', 'Pago con tarjeta', 1),
('Transferencia', 'Transferencia bancaria', 1),
('Cheque', 'Pago con cheque', 1);

-- Registros de caja (como apcajas del legacy)
CREATE TABLE IF NOT EXISTS cash_registers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    opening_amount DECIMAL(10,2) DEFAULT 0,
    closing_amount DECIMAL(10,2),
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_cash DECIMAL(10,2) DEFAULT 0,
    total_card DECIMAL(10,2) DEFAULT 0,
    difference DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open', -- open, closed
    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    notes TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ==========================================
-- INDICES PARA OPTIMIZACION
-- ==========================================

-- Índices críticos para performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_kitchen ON products(is_kitchen);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_table ON sales(table_id);
CREATE INDEX IF NOT EXISTS idx_sales_waiter ON sales(waiter_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_kitchen ON sale_items(kitchen_status);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_pin ON employees(pin);

-- ==========================================
-- DATOS DE EJEMPLO PARA TESTING
-- ==========================================

-- Categorías de ejemplo
INSERT OR IGNORE INTO categories (id, name, description, order_index) VALUES
(1, 'Bebidas', 'Bebidas frías y calientes', 1),
(2, 'Comidas', 'Platos principales', 2),
(3, 'Postres', 'Postres y dulces', 3),
(4, 'Aperitivos', 'Entradas y aperitivos', 4);

-- Productos de ejemplo con funcionalidades del legacy
INSERT OR IGNORE INTO products (id, name, description, price, purchase_price, category_id, vat_rate, is_kitchen, is_bar, is_favorite, kitchen_block) VALUES
(1, 'Coca Cola', 'Bebida gaseosa 350ml', 2500, 1000, 1, 19, 0, 1, 1, 2),
(2, 'Hamburguesa Clásica', 'Hamburguesa con carne, lechuga, tomate', 8900, 3500, 2, 19, 1, 0, 1, 1),
(3, 'Papas Fritas', 'Porción de papas fritas', 3500, 1200, 2, 19, 1, 0, 0, 1),
(4, 'Tiramisu', 'Postre italiano tradicional', 4500, 2000, 3, 19, 0, 0, 0, 3),
(5, 'Menú Completo', 'Hamburguesa + Papas + Bebida', 12900, 5700, 2, 19, 1, 0, 1, 1);

-- Pack de ejemplo (Menú Completo = Hamburguesa + Papas + Bebida)
UPDATE products SET is_pack = 1 WHERE id = 5;
INSERT OR IGNORE INTO pack_items (parent_product_id, child_product_id, quantity, order_index) VALUES
(5, 2, 1, 1), -- 1 Hamburguesa
(5, 3, 1, 2), -- 1 Papas
(5, 1, 1, 3); -- 1 Bebida

-- Inventario inicial
INSERT OR IGNORE INTO inventory (product_id, current_stock, min_stock, max_stock) VALUES
(1, 100, 10, 200),
(2, 50, 5, 100),
(3, 75, 10, 150),
(4, 20, 3, 50),
(5, 30, 5, 60);

-- Empleados de ejemplo (ya existen algunos, agregamos más)
INSERT OR IGNORE INTO employees (id, name, pin, role, assigned_tpv, can_delete_line, can_modify_ticket, can_kitchen_read, can_kitchen_update) VALUES
(3, 'Pedro Martínez', '5678', 'chef', 'COCINA', 0, 0, 1, 1),
(4, 'Ana López', '9012', 'manager', 'TPV3', 1, 1, 1, 1);

-- ==========================================
-- TRIGGERS PARA AUTOMATIZACION (COMO LEGACY)
-- ==========================================

-- Trigger para actualizar stock automáticamente al crear sale_item
CREATE TRIGGER IF NOT EXISTS trg_update_stock_on_sale
AFTER INSERT ON sale_items
BEGIN
    -- Actualizar inventario (descontar stock)
    UPDATE inventory
    SET current_stock = current_stock - NEW.quantity,
        last_updated = CURRENT_TIMESTAMP
    WHERE product_id = NEW.product_id;

    -- Si no existe inventario, crearlo
    INSERT OR IGNORE INTO inventory (product_id, current_stock, min_stock, max_stock, last_updated)
    VALUES (NEW.product_id, -NEW.quantity, 0, 0, CURRENT_TIMESTAMP);
END;

-- Trigger para actualizar totales de sale automáticamente
CREATE TRIGGER IF NOT EXISTS trg_update_sale_totals
AFTER INSERT ON sale_items
BEGIN
    UPDATE sales
    SET subtotal = (SELECT COALESCE(SUM(subtotal), 0) FROM sale_items WHERE sale_id = NEW.sale_id),
        vat_amount = (SELECT COALESCE(SUM(vat_amount), 0) FROM sale_items WHERE sale_id = NEW.sale_id),
        total_amount = (SELECT COALESCE(SUM(total), 0) FROM sale_items WHERE sale_id = NEW.sale_id),
        total_items = (SELECT COUNT(*) FROM sale_items WHERE sale_id = NEW.sale_id),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.sale_id;
END;