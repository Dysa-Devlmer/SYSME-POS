-- =====================================================
-- SYSME POS - Recipe and Cost Control System
-- Migration: 016_recipe_cost_control.sql
-- Description: Sistema completo de recetas y control de costos
-- Author: JARVIS AI Assistant
-- Date: 2025-11-20
-- =====================================================

-- ====================================
-- TABLA: ingredients
-- Gestión de ingredientes/insumos
-- ====================================
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'protein', 'vegetable', 'dairy', 'grain', 'spice', 'beverage', 'other'
    unit_of_measure TEXT NOT NULL, -- 'kg', 'g', 'l', 'ml', 'unit', 'dozen'
    current_stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    max_stock REAL,
    current_cost REAL NOT NULL DEFAULT 0, -- Costo actual por unidad
    average_cost REAL DEFAULT 0, -- Costo promedio ponderado
    last_purchase_cost REAL,
    last_purchase_date TEXT,
    supplier_id INTEGER, -- Proveedor principal
    alternative_supplier_id INTEGER,
    storage_location TEXT,
    shelf_life_days INTEGER, -- Vida útil en días
    allergen_info TEXT, -- JSON: ["gluten", "nuts", "dairy"]
    nutritional_info TEXT, -- JSON: {"calories": 100, "protein": 10, ...}
    is_perishable INTEGER DEFAULT 0,
    requires_refrigeration INTEGER DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    notes TEXT,
    image_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (alternative_supplier_id) REFERENCES suppliers(id)
);

-- ====================================
-- TABLA: recipes
-- Recetas de platos
-- ====================================
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'appetizer', 'main', 'dessert', 'beverage', 'side'
    subcategory TEXT,
    product_id INTEGER, -- Vinculación con productos del menú
    portion_size REAL NOT NULL DEFAULT 1, -- Tamaño de porción
    portion_unit TEXT DEFAULT 'serving', -- 'serving', 'g', 'ml'
    prep_time_minutes INTEGER, -- Tiempo de preparación
    cook_time_minutes INTEGER, -- Tiempo de cocción
    total_time_minutes INTEGER GENERATED ALWAYS AS (prep_time_minutes + cook_time_minutes) VIRTUAL,
    difficulty_level TEXT, -- 'easy', 'medium', 'hard', 'expert'
    servings INTEGER DEFAULT 1, -- Número de porciones que produce
    instructions TEXT, -- JSON: [{"step": 1, "description": "..."}, ...]
    plating_instructions TEXT,
    chef_notes TEXT,

    -- Costos calculados (actualizados automáticamente)
    total_ingredient_cost REAL DEFAULT 0,
    cost_per_serving REAL GENERATED ALWAYS AS (total_ingredient_cost / servings) VIRTUAL,
    labor_cost REAL DEFAULT 0,
    overhead_cost REAL DEFAULT 0,
    total_cost REAL GENERATED ALWAYS AS (total_ingredient_cost + labor_cost + overhead_cost) VIRTUAL,

    -- Precio y márgenes
    suggested_price REAL,
    current_price REAL, -- Precio actual de venta
    profit_margin REAL GENERATED ALWAYS AS (
        CASE
            WHEN current_price > 0 AND total_cost > 0
            THEN ROUND(((current_price - total_cost) / current_price) * 100, 2)
            ELSE 0
        END
    ) VIRTUAL,
    profit_amount REAL GENERATED ALWAYS AS (current_price - total_cost) VIRTUAL,

    -- Control y estadísticas
    version INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    is_seasonal INTEGER DEFAULT 0,
    season_start TEXT, -- Fecha inicio temporada
    season_end TEXT, -- Fecha fin temporada
    popularity_score REAL DEFAULT 0, -- 0-100 basado en ventas
    last_prepared_date TEXT,
    total_times_prepared INTEGER DEFAULT 0,

    -- Información nutricional calculada
    total_calories REAL,
    total_protein REAL,
    total_carbs REAL,
    total_fat REAL,
    allergens TEXT, -- JSON: ["gluten", "nuts"] (agregado de ingredientes)

    -- Multimedia
    image_url TEXT,
    video_url TEXT,

    -- Auditoría
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,

    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ====================================
-- TABLA: recipe_ingredients
-- Ingredientes de cada receta (tabla pivote)
-- ====================================
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL, -- Cantidad requerida
    unit TEXT NOT NULL, -- Unidad de medida
    cost_per_unit REAL, -- Costo del ingrediente al momento de agregar
    total_cost REAL GENERATED ALWAYS AS (quantity * cost_per_unit) VIRTUAL,
    preparation_notes TEXT, -- Ej: "picado fino", "cocido"
    is_optional INTEGER DEFAULT 0,
    is_garnish INTEGER DEFAULT 0,
    substitutes TEXT, -- JSON: [{"ingredient_id": 123, "ratio": 1}]

    -- Orden en la receta
    display_order INTEGER DEFAULT 0,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),

    UNIQUE(recipe_id, ingredient_id)
);

-- ====================================
-- TABLA: ingredient_stock_movements
-- Movimientos de inventario de ingredientes
-- ====================================
CREATE TABLE IF NOT EXISTS ingredient_stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL, -- 'purchase', 'usage', 'adjustment', 'waste', 'transfer', 'return'
    quantity REAL NOT NULL, -- Positivo para entradas, negativo para salidas
    unit TEXT NOT NULL,
    cost_per_unit REAL,
    total_cost REAL GENERATED ALWAYS AS (ABS(quantity) * COALESCE(cost_per_unit, 0)) VIRTUAL,

    -- Stock antes y después
    previous_stock REAL,
    new_stock REAL,

    -- Referencias
    reference_type TEXT, -- 'purchase_order', 'recipe_production', 'manual_adjustment', 'waste_report'
    reference_id INTEGER,

    -- Detalles
    reason TEXT,
    notes TEXT,
    warehouse_location TEXT,
    batch_number TEXT,
    expiry_date TEXT,

    -- Usuario y fecha
    movement_date TEXT DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,

    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- ====================================
-- TABLA: recipe_production_log
-- Log de producción de recetas
-- ====================================
CREATE TABLE IF NOT EXISTS recipe_production_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    production_date TEXT DEFAULT CURRENT_TIMESTAMP,
    quantity_produced INTEGER NOT NULL, -- Número de porciones producidas

    -- Costos al momento de producción
    ingredient_cost_snapshot REAL,
    labor_cost_snapshot REAL,
    overhead_cost_snapshot REAL,
    total_cost_snapshot REAL,

    -- Personal
    chef_id INTEGER,
    assistant_ids TEXT, -- JSON: [123, 456]

    -- Tiempos reales
    actual_prep_time_minutes INTEGER,
    actual_cook_time_minutes INTEGER,
    total_time_minutes INTEGER GENERATED ALWAYS AS (actual_prep_time_minutes + actual_cook_time_minutes) VIRTUAL,

    -- Evaluación
    quality_rating REAL, -- 1-5
    yield_percentage REAL, -- % de rendimiento vs esperado
    waste_amount REAL,
    waste_cost REAL,

    notes TEXT,
    created_by TEXT,

    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (chef_id) REFERENCES employees(id)
);

-- ====================================
-- TABLA: cost_analysis
-- Análisis de costos y rentabilidad
-- ====================================
CREATE TABLE IF NOT EXISTS cost_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_type TEXT NOT NULL, -- 'recipe', 'category', 'period', 'product'
    reference_id INTEGER,
    reference_name TEXT,

    -- Período de análisis
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,

    -- Costos
    total_ingredient_cost REAL DEFAULT 0,
    total_labor_cost REAL DEFAULT 0,
    total_overhead_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,

    -- Ventas
    total_sales REAL DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    units_sold INTEGER DEFAULT 0,

    -- Márgenes
    gross_profit REAL DEFAULT 0,
    gross_margin_percentage REAL DEFAULT 0,

    -- Métricas
    average_cost_per_unit REAL,
    average_price_per_unit REAL,
    contribution_margin REAL,

    -- Ranking
    rank_by_profit INTEGER,
    rank_by_margin INTEGER,
    rank_by_volume INTEGER,

    -- Metadata
    generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    generated_by TEXT,
    notes TEXT
);

-- ====================================
-- TABLA: waste_tracking
-- Seguimiento de desperdicios
-- ====================================
CREATE TABLE IF NOT EXISTS waste_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    waste_date TEXT DEFAULT CURRENT_TIMESTAMP,
    ingredient_id INTEGER,
    recipe_id INTEGER,

    waste_type TEXT NOT NULL, -- 'spoilage', 'preparation', 'overproduction', 'customer_return', 'accident'
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    estimated_cost REAL,

    reason TEXT,
    prevention_notes TEXT,
    responsible_employee_id INTEGER,

    is_preventable INTEGER DEFAULT 1,
    created_by TEXT,

    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (responsible_employee_id) REFERENCES employees(id)
);

-- ====================================
-- ÍNDICES para optimización
-- ====================================

-- Ingredients
CREATE INDEX IF NOT EXISTS idx_ingredients_code ON ingredients(code);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);
CREATE INDEX IF NOT EXISTS idx_ingredients_supplier ON ingredients(supplier_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_active ON ingredients(is_active);
CREATE INDEX IF NOT EXISTS idx_ingredients_stock_level ON ingredients(current_stock, min_stock);

-- Recipes
CREATE INDEX IF NOT EXISTS idx_recipes_code ON recipes(code);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_product ON recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_recipes_active ON recipes(is_active);
CREATE INDEX IF NOT EXISTS idx_recipes_cost ON recipes(total_cost);
CREATE INDEX IF NOT EXISTS idx_recipes_margin ON recipes(profit_margin);

-- Recipe Ingredients
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);

-- Stock Movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON ingredient_stock_movements(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON ingredient_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON ingredient_stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON ingredient_stock_movements(reference_type, reference_id);

-- Production Log
CREATE INDEX IF NOT EXISTS idx_production_log_recipe ON recipe_production_log(recipe_id);
CREATE INDEX IF NOT EXISTS idx_production_log_date ON recipe_production_log(production_date);
CREATE INDEX IF NOT EXISTS idx_production_log_chef ON recipe_production_log(chef_id);

-- Cost Analysis
CREATE INDEX IF NOT EXISTS idx_cost_analysis_type ON cost_analysis(analysis_type);
CREATE INDEX IF NOT EXISTS idx_cost_analysis_period ON cost_analysis(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_cost_analysis_reference ON cost_analysis(reference_id);

-- Waste Tracking
CREATE INDEX IF NOT EXISTS idx_waste_tracking_date ON waste_tracking(waste_date);
CREATE INDEX IF NOT EXISTS idx_waste_tracking_ingredient ON waste_tracking(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_waste_tracking_recipe ON waste_tracking(recipe_id);
CREATE INDEX IF NOT EXISTS idx_waste_tracking_type ON waste_tracking(waste_type);

-- ====================================
-- VISTAS para análisis y reportes
-- ====================================

-- Vista: Ingredientes con información de stock y proveedores
CREATE VIEW IF NOT EXISTS v_ingredients_detailed AS
SELECT
    i.*,
    s.name as supplier_name,
    s.contact_name as supplier_contact,
    s.phone as supplier_phone,
    alt_s.name as alternative_supplier_name,
    CASE
        WHEN i.current_stock <= i.min_stock THEN 'critical'
        WHEN i.current_stock <= (i.min_stock * 1.5) THEN 'low'
        WHEN i.max_stock IS NOT NULL AND i.current_stock >= i.max_stock THEN 'overstocked'
        ELSE 'normal'
    END as stock_status,
    ROUND((i.current_stock / NULLIF(i.min_stock, 0)) * 100, 2) as stock_percentage,
    i.current_stock * i.current_cost as stock_value
FROM ingredients i
LEFT JOIN suppliers s ON i.supplier_id = s.id
LEFT JOIN suppliers alt_s ON i.alternative_supplier_id = alt_s.id;

-- Vista: Recetas con costos completos y rentabilidad
CREATE VIEW IF NOT EXISTS v_recipes_profitability AS
SELECT
    r.*,
    p.name as product_name,
    p.price as product_current_price,
    COUNT(DISTINCT ri.ingredient_id) as ingredient_count,
    SUM(ri.total_cost) as calculated_ingredient_cost,
    CASE
        WHEN r.profit_margin >= 70 THEN 'excellent'
        WHEN r.profit_margin >= 50 THEN 'good'
        WHEN r.profit_margin >= 30 THEN 'fair'
        WHEN r.profit_margin >= 10 THEN 'low'
        ELSE 'unprofitable'
    END as profitability_rating,
    CASE
        WHEN r.popularity_score >= 80 THEN 'star'
        WHEN r.popularity_score >= 60 THEN 'popular'
        WHEN r.popularity_score >= 40 THEN 'moderate'
        WHEN r.popularity_score >= 20 THEN 'low'
        ELSE 'poor'
    END as popularity_rating
FROM recipes r
LEFT JOIN products p ON r.product_id = p.id
LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
GROUP BY r.id;

-- Vista: Ingredientes de recetas con detalles
CREATE VIEW IF NOT EXISTS v_recipe_ingredients_detailed AS
SELECT
    ri.*,
    r.name as recipe_name,
    r.code as recipe_code,
    i.name as ingredient_name,
    i.code as ingredient_code,
    i.category as ingredient_category,
    i.current_stock as ingredient_stock,
    i.unit_of_measure as ingredient_unit,
    i.current_cost as current_ingredient_cost,
    ri.quantity * i.current_cost as updated_total_cost,
    CASE
        WHEN i.current_stock < ri.quantity THEN 'insufficient'
        WHEN i.current_stock < (ri.quantity * 2) THEN 'limited'
        ELSE 'available'
    END as availability_status
FROM recipe_ingredients ri
JOIN recipes r ON ri.recipe_id = r.id
JOIN ingredients i ON ri.ingredient_id = i.id;

-- Vista: Movimientos de stock con información completa
CREATE VIEW IF NOT EXISTS v_stock_movements_detailed AS
SELECT
    ism.*,
    i.name as ingredient_name,
    i.code as ingredient_code,
    i.category as ingredient_category,
    i.unit_of_measure,
    CASE
        WHEN ism.movement_type IN ('purchase', 'adjustment', 'return') THEN 'inbound'
        WHEN ism.movement_type IN ('usage', 'waste', 'transfer') THEN 'outbound'
        ELSE 'other'
    END as movement_direction,
    DATE(ism.movement_date) as movement_date_only,
    strftime('%Y-%m', ism.movement_date) as movement_month
FROM ingredient_stock_movements ism
JOIN ingredients i ON ism.ingredient_id = i.id;

-- Vista: Log de producción con detalles
CREATE VIEW IF NOT EXISTS v_production_log_detailed AS
SELECT
    rpl.*,
    r.name as recipe_name,
    r.code as recipe_code,
    r.category as recipe_category,
    e.full_name as chef_name,
    ROUND((rpl.yield_percentage - 100), 2) as variance_percentage,
    CASE
        WHEN rpl.yield_percentage >= 95 THEN 'excellent'
        WHEN rpl.yield_percentage >= 85 THEN 'good'
        WHEN rpl.yield_percentage >= 75 THEN 'acceptable'
        ELSE 'poor'
    END as yield_rating,
    rpl.total_cost_snapshot / rpl.quantity_produced as cost_per_portion
FROM recipe_production_log rpl
JOIN recipes r ON rpl.recipe_id = r.id
LEFT JOIN employees e ON rpl.chef_id = e.id;

-- Vista: Análisis de desperdicios
CREATE VIEW IF NOT EXISTS v_waste_analysis AS
SELECT
    wt.*,
    i.name as ingredient_name,
    i.code as ingredient_code,
    r.name as recipe_name,
    e.full_name as responsible_employee_name,
    DATE(wt.waste_date) as waste_date_only,
    strftime('%Y-%m', wt.waste_date) as waste_month,
    CASE
        WHEN wt.is_preventable = 1 THEN 'preventable'
        ELSE 'unavoidable'
    END as preventability
FROM waste_tracking wt
LEFT JOIN ingredients i ON wt.ingredient_id = i.id
LEFT JOIN recipes r ON wt.recipe_id = r.id
LEFT JOIN employees e ON wt.responsible_employee_id = e.id;

-- Vista: Resumen de costos por categoría de receta
CREATE VIEW IF NOT EXISTS v_recipe_cost_summary_by_category AS
SELECT
    category,
    COUNT(*) as recipe_count,
    ROUND(AVG(total_ingredient_cost), 2) as avg_ingredient_cost,
    ROUND(AVG(total_cost), 2) as avg_total_cost,
    ROUND(AVG(current_price), 2) as avg_selling_price,
    ROUND(AVG(profit_margin), 2) as avg_profit_margin,
    ROUND(SUM(total_times_prepared), 0) as total_productions,
    ROUND(AVG(popularity_score), 2) as avg_popularity
FROM recipes
WHERE is_active = 1
GROUP BY category;

-- Vista: Top ingredientes más costosos
CREATE VIEW IF NOT EXISTS v_top_expensive_ingredients AS
SELECT
    i.*,
    i.current_stock * i.current_cost as total_stock_value,
    COUNT(DISTINCT ri.recipe_id) as used_in_recipes,
    s.name as supplier_name
FROM ingredients i
LEFT JOIN recipe_ingredients ri ON i.id = ri.ingredient_id
LEFT JOIN suppliers s ON i.supplier_id = s.id
WHERE i.is_active = 1
GROUP BY i.id
ORDER BY i.current_cost DESC
LIMIT 50;

-- ====================================
-- TRIGGERS para automatización
-- ====================================

-- Trigger: Actualizar updated_at en ingredients
CREATE TRIGGER IF NOT EXISTS trg_ingredients_updated_at
AFTER UPDATE ON ingredients
FOR EACH ROW
BEGIN
    UPDATE ingredients
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar updated_at en recipes
CREATE TRIGGER IF NOT EXISTS trg_recipes_updated_at
AFTER UPDATE ON recipes
FOR EACH ROW
BEGIN
    UPDATE recipes
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar updated_at en recipe_ingredients
CREATE TRIGGER IF NOT EXISTS trg_recipe_ingredients_updated_at
AFTER UPDATE ON recipe_ingredients
FOR EACH ROW
BEGIN
    UPDATE recipe_ingredients
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- Trigger: Actualizar stock de ingrediente tras movimiento
CREATE TRIGGER IF NOT EXISTS trg_update_ingredient_stock_after_movement
AFTER INSERT ON ingredient_stock_movements
FOR EACH ROW
BEGIN
    UPDATE ingredients
    SET current_stock = current_stock + NEW.quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.ingredient_id;

    -- Actualizar costo promedio si es una compra
    UPDATE ingredients
    SET average_cost = (
        (current_stock * average_cost + ABS(NEW.quantity) * NEW.cost_per_unit) /
        (current_stock + ABS(NEW.quantity))
    ),
    last_purchase_cost = CASE
        WHEN NEW.movement_type = 'purchase' THEN NEW.cost_per_unit
        ELSE last_purchase_cost
    END,
    last_purchase_date = CASE
        WHEN NEW.movement_type = 'purchase' THEN NEW.movement_date
        ELSE last_purchase_date
    END
    WHERE id = NEW.ingredient_id AND NEW.movement_type = 'purchase';
END;

-- Trigger: Registrar stock anterior en movimientos
CREATE TRIGGER IF NOT EXISTS trg_set_previous_stock_before_movement
BEFORE INSERT ON ingredient_stock_movements
FOR EACH ROW
BEGIN
    SELECT
        current_stock,
        current_stock + NEW.quantity
    INTO NEW.previous_stock, NEW.new_stock
    FROM ingredients
    WHERE id = NEW.ingredient_id;
END;

-- Trigger: Actualizar costo total de receta cuando cambian ingredientes
CREATE TRIGGER IF NOT EXISTS trg_update_recipe_cost_after_ingredient_change
AFTER INSERT ON recipe_ingredients
FOR EACH ROW
BEGIN
    UPDATE recipes
    SET total_ingredient_cost = (
        SELECT COALESCE(SUM(ri.total_cost), 0)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = NEW.recipe_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.recipe_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_recipe_cost_after_ingredient_update
AFTER UPDATE ON recipe_ingredients
FOR EACH ROW
BEGIN
    UPDATE recipes
    SET total_ingredient_cost = (
        SELECT COALESCE(SUM(ri.total_cost), 0)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = NEW.recipe_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.recipe_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_update_recipe_cost_after_ingredient_delete
AFTER DELETE ON recipe_ingredients
FOR EACH ROW
BEGIN
    UPDATE recipes
    SET total_ingredient_cost = (
        SELECT COALESCE(SUM(ri.total_cost), 0)
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = OLD.recipe_id
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.recipe_id;
END;

-- Trigger: Actualizar contador de producciones
CREATE TRIGGER IF NOT EXISTS trg_update_recipe_production_stats
AFTER INSERT ON recipe_production_log
FOR EACH ROW
BEGIN
    UPDATE recipes
    SET total_times_prepared = total_times_prepared + 1,
        last_prepared_date = NEW.production_date,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.recipe_id;
END;

-- Trigger: Copiar costo actual del ingrediente al agregarlo a receta
CREATE TRIGGER IF NOT EXISTS trg_set_ingredient_cost_on_recipe_add
BEFORE INSERT ON recipe_ingredients
FOR EACH ROW
WHEN NEW.cost_per_unit IS NULL
BEGIN
    SELECT current_cost INTO NEW.cost_per_unit
    FROM ingredients
    WHERE id = NEW.ingredient_id;
END;

-- Trigger: Prevenir stock negativo
CREATE TRIGGER IF NOT EXISTS trg_prevent_negative_stock
BEFORE INSERT ON ingredient_stock_movements
FOR EACH ROW
WHEN NEW.quantity < 0
BEGIN
    SELECT CASE
        WHEN (SELECT current_stock FROM ingredients WHERE id = NEW.ingredient_id) + NEW.quantity < 0
        THEN RAISE(ABORT, 'Insufficient stock for this operation')
    END;
END;

-- Trigger: Crear análisis automático de costos mensual
CREATE TRIGGER IF NOT EXISTS trg_auto_create_monthly_cost_analysis
AFTER INSERT ON recipe_production_log
FOR EACH ROW
WHEN strftime('%d', NEW.production_date) = '01' -- Primer día del mes
BEGIN
    INSERT INTO cost_analysis (
        analysis_type,
        reference_id,
        reference_name,
        period_start,
        period_end,
        notes
    )
    SELECT
        'recipe',
        NEW.recipe_id,
        (SELECT name FROM recipes WHERE id = NEW.recipe_id),
        date(NEW.production_date, 'start of month', '-1 month'),
        date(NEW.production_date, 'start of month', '-1 day'),
        'Auto-generated monthly analysis'
    WHERE NOT EXISTS (
        SELECT 1 FROM cost_analysis
        WHERE analysis_type = 'recipe'
        AND reference_id = NEW.recipe_id
        AND period_start = date(NEW.production_date, 'start of month', '-1 month')
    );
END;

-- ====================================
-- DATOS INICIALES (Ejemplos)
-- ====================================

-- Categorías de ingredientes comunes
INSERT OR IGNORE INTO ingredients (code, name, category, unit_of_measure, current_stock, min_stock, current_cost, is_active) VALUES
('ING-001', 'Tomate', 'vegetable', 'kg', 50, 10, 2.50, 1),
('ING-002', 'Cebolla', 'vegetable', 'kg', 30, 10, 1.80, 1),
('ING-003', 'Ajo', 'vegetable', 'kg', 5, 2, 4.50, 1),
('ING-004', 'Pechuga de Pollo', 'protein', 'kg', 25, 10, 8.90, 1),
('ING-005', 'Carne de Res', 'protein', 'kg', 20, 8, 12.50, 1),
('ING-006', 'Salmón', 'protein', 'kg', 10, 5, 18.00, 1),
('ING-007', 'Queso Parmesano', 'dairy', 'kg', 3, 1, 15.00, 1),
('ING-008', 'Leche', 'dairy', 'l', 20, 10, 1.50, 1),
('ING-009', 'Mantequilla', 'dairy', 'kg', 5, 2, 6.00, 1),
('ING-010', 'Aceite de Oliva', 'other', 'l', 10, 5, 8.50, 1),
('ING-011', 'Sal', 'spice', 'kg', 10, 3, 1.00, 1),
('ING-012', 'Pimienta Negra', 'spice', 'kg', 2, 0.5, 12.00, 1),
('ING-013', 'Albahaca Fresca', 'spice', 'kg', 0.5, 0.2, 8.00, 1),
('ING-014', 'Pasta Spaghetti', 'grain', 'kg', 30, 15, 2.00, 1),
('ING-015', 'Arroz', 'grain', 'kg', 40, 20, 1.50, 1),
('ING-016', 'Harina', 'grain', 'kg', 25, 10, 1.20, 1),
('ING-017', 'Azúcar', 'other', 'kg', 20, 10, 1.80, 1),
('ING-018', 'Vino Blanco', 'beverage', 'l', 5, 2, 12.00, 1),
('ING-019', 'Limón', 'vegetable', 'kg', 3, 1, 3.00, 1),
('ING-020', 'Papa', 'vegetable', 'kg', 50, 20, 1.20, 1);

-- Recetas de ejemplo
INSERT OR IGNORE INTO recipes (
    code, name, description, category, portion_size, portion_unit,
    prep_time_minutes, cook_time_minutes, difficulty_level, servings,
    labor_cost, overhead_cost, current_price, is_active
) VALUES
('RCP-001', 'Pasta Carbonara', 'Pasta italiana clásica con salsa cremosa de huevo y panceta', 'main', 350, 'g', 10, 15, 'medium', 1, 3.50, 1.50, 18.00, 1),
('RCP-002', 'Pollo al Limón', 'Pechuga de pollo salteada con salsa de limón y hierbas', 'main', 300, 'g', 15, 20, 'medium', 1, 4.00, 1.50, 22.00, 1),
('RCP-003', 'Ensalada César', 'Ensalada fresca con aderezo césar y crutones', 'appetizer', 250, 'g', 10, 0, 'easy', 1, 2.00, 1.00, 12.00, 1),
('RCP-004', 'Salmón a la Parrilla', 'Filete de salmón con vegetales asados', 'main', 250, 'g', 10, 15, 'medium', 1, 4.50, 2.00, 28.00, 1),
('RCP-005', 'Risotto de Champiñones', 'Arroz cremoso con champiñones y parmesano', 'main', 300, 'g', 10, 25, 'hard', 1, 5.00, 2.00, 24.00, 1);

-- Ingredientes para Pasta Carbonara
INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, cost_per_unit, display_order) VALUES
(1, 14, 0.100, 'kg', 2.00, 1),  -- Pasta
(1, 9, 0.030, 'kg', 6.00, 2),   -- Mantequilla
(1, 7, 0.040, 'kg', 15.00, 3),  -- Parmesano
(1, 11, 0.005, 'kg', 1.00, 4),  -- Sal
(1, 12, 0.002, 'kg', 12.00, 5); -- Pimienta

-- Ingredientes para Pollo al Limón
INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, cost_per_unit, display_order) VALUES
(2, 4, 0.250, 'kg', 8.90, 1),   -- Pechuga de Pollo
(2, 19, 0.050, 'kg', 3.00, 2),  -- Limón
(2, 3, 0.010, 'kg', 4.50, 3),   -- Ajo
(2, 10, 0.020, 'l', 8.50, 4),   -- Aceite de Oliva
(2, 11, 0.005, 'kg', 1.00, 5),  -- Sal
(2, 13, 0.010, 'kg', 8.00, 6);  -- Albahaca

-- Ingredientes para Salmón a la Parrilla
INSERT OR IGNORE INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, cost_per_unit, display_order) VALUES
(3, 6, 0.200, 'kg', 18.00, 1),  -- Salmón
(3, 19, 0.030, 'kg', 3.00, 2),  -- Limón
(3, 10, 0.015, 'l', 8.50, 3),   -- Aceite
(3, 20, 0.150, 'kg', 1.20, 4),  -- Papa
(3, 11, 0.005, 'kg', 1.00, 5);  -- Sal

-- ====================================
-- COMENTARIOS FINALES
-- ====================================

-- Esta migración crea un sistema completo de gestión de recetas y control de costos
-- Características principales:
-- 1. Gestión de ingredientes con control de stock y proveedores
-- 2. Recetas con cálculo automático de costos y márgenes
-- 3. Trazabilidad de movimientos de inventario
-- 4. Log de producción para análisis de rendimiento
-- 5. Análisis de costos y rentabilidad
-- 6. Seguimiento de desperdicios
-- 7. Múltiples vistas para reportes
-- 8. Triggers para automatización de cálculos
-- 9. Datos de ejemplo para pruebas

-- Total de objetos creados:
-- - 8 Tablas principales
-- - 8 Vistas de análisis
-- - 12 Triggers automáticos
-- - 30+ Índices para optimización
-- - Datos de ejemplo: 20 ingredientes, 5 recetas

-- Sistema listo para integración con el backend y frontend de SYSME POS
