-- =====================================================
-- SYSME POS - Analytics & Reports Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- SALES ANALYTICS (Aggregated Daily Data)
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    date DATE NOT NULL,

    -- Sales Totals
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,
    total_tax DECIMAL(10,2) DEFAULT 0,
    total_discounts DECIMAL(10,2) DEFAULT 0,
    total_tips DECIMAL(10,2) DEFAULT 0,
    net_revenue DECIMAL(10,2) DEFAULT 0,

    -- Order Types
    dine_in_orders INTEGER DEFAULT 0,
    dine_in_revenue DECIMAL(10,2) DEFAULT 0,
    takeout_orders INTEGER DEFAULT 0,
    takeout_revenue DECIMAL(10,2) DEFAULT 0,
    delivery_orders INTEGER DEFAULT 0,
    delivery_revenue DECIMAL(10,2) DEFAULT 0,

    -- Payment Methods
    cash_payments_count INTEGER DEFAULT 0,
    cash_payments_total DECIMAL(10,2) DEFAULT 0,
    card_payments_count INTEGER DEFAULT 0,
    card_payments_total DECIMAL(10,2) DEFAULT 0,
    other_payments_count INTEGER DEFAULT 0,
    other_payments_total DECIMAL(10,2) DEFAULT 0,

    -- Customer Metrics
    unique_customers INTEGER DEFAULT 0,
    new_customers INTEGER DEFAULT 0,
    returning_customers INTEGER DEFAULT 0,

    -- Averages
    average_order_value DECIMAL(10,2) DEFAULT 0,
    average_items_per_order DECIMAL(10,2) DEFAULT 0,
    average_table_turn_time INTEGER, -- minutes

    -- Time Distribution
    breakfast_revenue DECIMAL(10,2) DEFAULT 0,
    lunch_revenue DECIMAL(10,2) DEFAULT 0,
    dinner_revenue DECIMAL(10,2) DEFAULT 0,
    late_night_revenue DECIMAL(10,2) DEFAULT 0,

    -- Labor
    labor_hours DECIMAL(5,2) DEFAULT 0,
    labor_cost DECIMAL(10,2) DEFAULT 0,
    labor_cost_percentage DECIMAL(5,2) DEFAULT 0,

    -- COGS
    cost_of_goods_sold DECIMAL(10,2) DEFAULT 0,
    food_cost_percentage DECIMAL(5,2) DEFAULT 0,

    -- Performance
    sales_per_labor_hour DECIMAL(10,2) DEFAULT 0,
    transactions_per_hour DECIMAL(5,2) DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(location_id, date),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- PRODUCT ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS product_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    date DATE NOT NULL,

    -- Sales
    quantity_sold DECIMAL(10,3) DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,
    profit_margin DECIMAL(5,2) DEFAULT 0,

    -- Orders
    orders_count INTEGER DEFAULT 0,

    -- Time Distribution
    morning_sales INTEGER DEFAULT 0,
    afternoon_sales INTEGER DEFAULT 0,
    evening_sales INTEGER DEFAULT 0,
    night_sales INTEGER DEFAULT 0,

    -- Performance Indicators
    sales_rank INTEGER,
    profit_rank INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, location_id, date),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- CATEGORY ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS category_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    date DATE NOT NULL,

    -- Sales
    quantity_sold DECIMAL(10,3) DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    cost DECIMAL(10,2) DEFAULT 0,
    profit DECIMAL(10,2) DEFAULT 0,

    -- Orders
    orders_count INTEGER DEFAULT 0,

    -- Share
    revenue_share_percentage DECIMAL(5,2) DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(category_id, location_id, date),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- EMPLOYEE PERFORMANCE ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,
    date DATE NOT NULL,

    -- Sales (for waiters/cashiers)
    orders_taken INTEGER DEFAULT 0,
    total_sales DECIMAL(10,2) DEFAULT 0,
    total_tips DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,

    -- Hours
    hours_worked DECIMAL(5,2) DEFAULT 0,
    sales_per_hour DECIMAL(10,2) DEFAULT 0,

    -- Quality Metrics
    order_accuracy_rate DECIMAL(5,2) DEFAULT 100.00,
    customer_satisfaction_score DECIMAL(3,2),
    total_ratings INTEGER DEFAULT 0,

    -- Issues
    order_errors INTEGER DEFAULT 0,
    refunds_processed INTEGER DEFAULT 0,
    complaints INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, location_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- CUSTOMER ANALYTICS
-- =====================================================
CREATE TABLE IF NOT EXISTS customer_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,

    -- Lifetime Value
    lifetime_orders INTEGER DEFAULT 0,
    lifetime_revenue DECIMAL(10,2) DEFAULT 0,
    lifetime_profit DECIMAL(10,2) DEFAULT 0,

    -- Averages
    average_order_value DECIMAL(10,2) DEFAULT 0,
    average_items_per_order DECIMAL(10,2) DEFAULT 0,
    average_days_between_orders DECIMAL(5,2),

    -- Frequency
    orders_last_30_days INTEGER DEFAULT 0,
    orders_last_90_days INTEGER DEFAULT 0,
    orders_last_365_days INTEGER DEFAULT 0,

    -- Recency
    days_since_last_order INTEGER,
    last_order_date DATE,
    first_order_date DATE,

    -- Segmentation
    rfm_score INTEGER, -- Recency, Frequency, Monetary combined score
    recency_score INTEGER CHECK(recency_score BETWEEN 1 AND 5),
    frequency_score INTEGER CHECK(frequency_score BETWEEN 1 AND 5),
    monetary_score INTEGER CHECK(monetary_score BETWEEN 1 AND 5),

    customer_segment TEXT CHECK(customer_segment IN (
        'champions', 'loyal', 'potential_loyalist',
        'recent_customers', 'promising', 'needs_attention',
        'about_to_sleep', 'at_risk', 'cant_lose', 'lost'
    )),

    -- Predictions
    churn_risk_score DECIMAL(5,2), -- 0-100
    predicted_next_order_days INTEGER,
    predicted_ltv DECIMAL(10,2),

    -- Preferences
    favorite_category_id INTEGER,
    favorite_product_id INTEGER,
    preferred_order_type TEXT,
    preferred_payment_method TEXT,

    calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (favorite_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (favorite_product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- =====================================================
-- HOURLY ANALYTICS (For peak hour analysis)
-- =====================================================
CREATE TABLE IF NOT EXISTS hourly_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK(hour BETWEEN 0 AND 23),

    -- Sales
    orders_count INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    average_order_value DECIMAL(10,2) DEFAULT 0,

    -- Tables (for dine-in)
    tables_occupied INTEGER DEFAULT 0,
    table_turns INTEGER DEFAULT 0,

    -- Staff
    staff_on_duty INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(location_id, date, hour),
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- SAVED REPORTS
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN (
        'sales', 'products', 'categories', 'employees',
        'customers', 'inventory', 'financial', 'custom'
    )),

    -- Report Configuration
    config TEXT NOT NULL, -- JSON with filters, groupings, metrics

    -- Schedule
    is_scheduled BOOLEAN DEFAULT 0,
    schedule_frequency TEXT CHECK(schedule_frequency IN (NULL, 'daily', 'weekly', 'monthly')),
    schedule_time TIME,
    schedule_day INTEGER, -- day of week (1-7) or day of month (1-31)
    last_generated_at DATETIME,
    next_generation_at DATETIME,

    -- Distribution
    email_recipients TEXT, -- JSON array of emails
    auto_send BOOLEAN DEFAULT 0,

    -- Format
    output_format TEXT DEFAULT 'pdf' CHECK(output_format IN ('pdf', 'excel', 'csv', 'json')),

    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- REPORT HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS report_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    saved_report_id INTEGER,

    report_name TEXT NOT NULL,
    report_type TEXT NOT NULL,

    -- Period
    period_start DATE,
    period_end DATE,

    -- File
    file_url TEXT,
    file_size INTEGER,
    file_format TEXT,

    -- Generation
    generated_by INTEGER,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Status
    status TEXT DEFAULT 'completed' CHECK(status IN ('generating', 'completed', 'failed')),
    error_message TEXT,

    FOREIGN KEY (saved_report_id) REFERENCES saved_reports(id) ON DELETE SET NULL,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- DASHBOARD WIDGETS (User-customizable dashboards)
-- =====================================================
CREATE TABLE IF NOT EXISTS dashboard_widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    widget_type TEXT NOT NULL CHECK(widget_type IN (
        'sales_summary', 'revenue_chart', 'top_products',
        'recent_orders', 'low_stock', 'employee_performance',
        'customer_stats', 'hourly_sales', 'category_breakdown',
        'payment_methods', 'order_status', 'kpi_card'
    )),

    -- Position
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    width INTEGER DEFAULT 4,
    height INTEGER DEFAULT 3,

    -- Configuration
    config TEXT, -- JSON with widget-specific settings

    is_visible BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sales_analytics_location ON sales_analytics(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_analytics_date ON sales_analytics(date);

CREATE INDEX IF NOT EXISTS idx_product_analytics_product ON product_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_location ON product_analytics(location_id);
CREATE INDEX IF NOT EXISTS idx_product_analytics_date ON product_analytics(date);

CREATE INDEX IF NOT EXISTS idx_category_analytics_category ON category_analytics(category_id);
CREATE INDEX IF NOT EXISTS idx_category_analytics_location ON category_analytics(location_id);
CREATE INDEX IF NOT EXISTS idx_category_analytics_date ON category_analytics(date);

CREATE INDEX IF NOT EXISTS idx_employee_performance_user ON employee_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_performance_date ON employee_performance(date);

CREATE INDEX IF NOT EXISTS idx_customer_analytics_customer ON customer_analytics(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_segment ON customer_analytics(customer_segment);

CREATE INDEX IF NOT EXISTS idx_hourly_analytics_location ON hourly_analytics(location_id);
CREATE INDEX IF NOT EXISTS idx_hourly_analytics_date ON hourly_analytics(date);

CREATE INDEX IF NOT EXISTS idx_saved_reports_company ON saved_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_report_history_saved_report ON report_history(saved_report_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_user ON dashboard_widgets(user_id);
