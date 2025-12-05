-- =====================================================
-- SYSME POS - Delivery Platforms Integration
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- DELIVERY PLATFORMS
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL, -- Uber Eats, Rappi, DiDi Food, etc.
    code TEXT UNIQUE NOT NULL,
    logo_url TEXT,

    -- API Configuration
    api_endpoint TEXT,
    api_key TEXT, -- encrypted
    api_secret TEXT, -- encrypted
    webhook_url TEXT,
    webhook_secret TEXT,

    -- Commission
    commission_type TEXT DEFAULT 'percentage' CHECK(commission_type IN ('percentage', 'fixed', 'tiered')),
    commission_rate DECIMAL(5,2), -- percentage
    commission_fixed DECIMAL(10,2),

    -- Integration Status
    is_active BOOLEAN DEFAULT 1,
    is_connected BOOLEAN DEFAULT 0,
    last_sync_at DATETIME,

    -- Settings
    auto_accept_orders BOOLEAN DEFAULT 0,
    auto_sync_menu BOOLEAN DEFAULT 1,
    sync_frequency_minutes INTEGER DEFAULT 15,

    -- Marketplace Settings
    marketplace_store_id TEXT,
    marketplace_status TEXT CHECK(marketplace_status IN (NULL, 'active', 'paused', 'closed')),

    -- Statistics
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(10,2) DEFAULT 0,

    metadata TEXT, -- JSON platform-specific settings

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- =====================================================
-- DELIVERY ZONES
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    description TEXT,

    -- Geographic Definition
    type TEXT DEFAULT 'radius' CHECK(type IN ('radius', 'polygon', 'postal_codes')),

    -- Radius-based
    center_lat DECIMAL(10,8),
    center_lng DECIMAL(11,8),
    radius_km DECIMAL(5,2),

    -- Polygon-based (GeoJSON)
    polygon_coordinates TEXT, -- JSON array of [lat, lng] pairs

    -- Postal Code-based
    postal_codes TEXT, -- JSON array of postal codes

    -- Delivery Fees
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    min_order_amount DECIMAL(10,2) DEFAULT 0,
    free_delivery_threshold DECIMAL(10,2),

    -- Estimated Delivery Time
    estimated_time_minutes INTEGER DEFAULT 45,

    -- Availability
    is_active BOOLEAN DEFAULT 1,
    available_hours TEXT, -- JSON with schedule

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- DELIVERY DRIVERS (Internal/Third-party)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    -- Driver Info
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,

    -- Employment
    type TEXT DEFAULT 'employee' CHECK(type IN ('employee', 'contractor', 'third_party')),
    employee_id TEXT,

    -- Vehicle
    vehicle_type TEXT CHECK(vehicle_type IN ('bicycle', 'motorcycle', 'car', 'scooter', 'other')),
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_plate TEXT,
    vehicle_color TEXT,

    -- Documents
    license_number TEXT,
    license_expiry DATE,
    insurance_number TEXT,
    insurance_expiry DATE,

    -- Performance
    total_deliveries INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_ratings INTEGER DEFAULT 0,

    -- Current Status
    status TEXT DEFAULT 'offline' CHECK(status IN ('offline', 'available', 'busy', 'on_break')),
    current_location_lat DECIMAL(10,8),
    current_location_lng DECIMAL(11,8),
    last_location_update DATETIME,

    -- Settings
    max_concurrent_deliveries INTEGER DEFAULT 1,
    accepts_cash BOOLEAN DEFAULT 1,

    -- Status
    is_active BOOLEAN DEFAULT 1,
    hired_date DATE,
    terminated_date DATE,

    notes TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- =====================================================
-- DELIVERIES
-- =====================================================
CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    delivery_platform_id INTEGER,
    driver_id INTEGER,

    -- Delivery Details
    tracking_number TEXT UNIQUE,
    status TEXT DEFAULT 'pending' CHECK(status IN (
        'pending', 'assigned', 'picked_up', 'in_transit',
        'arrived', 'delivered', 'failed', 'cancelled'
    )),

    -- Platform Integration
    platform_order_id TEXT,
    platform_delivery_id TEXT,
    is_platform_delivery BOOLEAN DEFAULT 0,

    -- Address
    delivery_address TEXT NOT NULL,
    delivery_lat DECIMAL(10,8),
    delivery_lng DECIMAL(11,8),
    delivery_instructions TEXT,

    -- Contact
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,

    -- Timing
    estimated_pickup_time DATETIME,
    estimated_delivery_time DATETIME,
    actual_pickup_time DATETIME,
    actual_delivery_time DATETIME,

    -- Distance & Duration
    distance_km DECIMAL(5,2),
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,

    -- Fees
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    driver_tip DECIMAL(10,2) DEFAULT 0,
    driver_payout DECIMAL(10,2),

    -- Proof of Delivery
    signature_url TEXT,
    photo_url TEXT,
    delivered_to TEXT,
    delivery_notes TEXT,

    -- Rating
    customer_rating INTEGER CHECK(customer_rating BETWEEN 1 AND 5),
    customer_feedback TEXT,

    -- Issues
    had_issue BOOLEAN DEFAULT 0,
    issue_type TEXT,
    issue_description TEXT,

    -- Tracking Updates
    tracking_updates TEXT, -- JSON array of status updates with timestamps

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_platform_id) REFERENCES delivery_platforms(id) ON DELETE SET NULL,
    FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id) ON DELETE SET NULL
);

-- =====================================================
-- DELIVERY ROUTES (Route Optimization)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER NOT NULL,
    location_id INTEGER NOT NULL,

    route_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'planned' CHECK(status IN ('planned', 'in_progress', 'completed', 'cancelled')),

    -- Route Details
    total_deliveries INTEGER NOT NULL,
    completed_deliveries INTEGER DEFAULT 0,
    total_distance_km DECIMAL(5,2),
    estimated_duration_minutes INTEGER,

    -- Optimization
    optimized_waypoints TEXT, -- JSON array of delivery IDs in optimized order

    -- Times
    started_at DATETIME,
    completed_at DATETIME,

    -- Performance
    on_time_deliveries INTEGER DEFAULT 0,
    late_deliveries INTEGER DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- =====================================================
-- DELIVERY ROUTE STOPS
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    delivery_id INTEGER NOT NULL,

    stop_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'arrived', 'completed', 'failed')),

    estimated_arrival_time DATETIME,
    actual_arrival_time DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (route_id) REFERENCES delivery_routes(id) ON DELETE CASCADE,
    FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);

-- =====================================================
-- MARKETPLACE MENU SYNC (Platform-specific menu configs)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    platform_id INTEGER NOT NULL,

    -- Platform-specific details
    platform_item_id TEXT,
    platform_sku TEXT,

    -- Pricing (can differ from POS)
    platform_price DECIMAL(10,2),
    platform_commission DECIMAL(10,2),

    -- Availability
    is_available BOOLEAN DEFAULT 1,
    available_from TIME,
    available_until TIME,
    available_days TEXT, -- JSON array: ['monday', 'tuesday', ...]

    -- Platform-specific settings
    platform_name TEXT, -- can override product name
    platform_description TEXT,
    platform_image_url TEXT,

    -- Sync
    last_synced_at DATETIME,
    sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
    sync_error TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(product_id, platform_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES delivery_platforms(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_company ON delivery_platforms(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_code ON delivery_platforms(code);

CREATE INDEX IF NOT EXISTS idx_delivery_zones_location ON delivery_zones(location_id);

CREATE INDEX IF NOT EXISTS idx_delivery_drivers_company ON delivery_drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_status ON delivery_drivers(status);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_platform ON deliveries(delivery_platform_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking ON deliveries(tracking_number);

CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_status ON delivery_routes(status);

CREATE INDEX IF NOT EXISTS idx_marketplace_menu_product ON marketplace_menu_items(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_menu_platform ON marketplace_menu_items(platform_id);
