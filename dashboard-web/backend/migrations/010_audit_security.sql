-- =====================================================
-- SYSME POS - Audit & Security Tables
-- =====================================================
-- @author JARVIS AI Assistant
-- @date 2025-11-20
-- @version 2.1.0
-- =====================================================

-- =====================================================
-- AUDIT LOG (Comprehensive Activity Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Who
    user_id INTEGER,
    username TEXT,
    user_role TEXT,

    -- What
    action TEXT NOT NULL, -- create, read, update, delete, login, logout, etc.
    entity_type TEXT NOT NULL, -- order, product, user, etc.
    entity_id INTEGER,

    -- Changes
    old_values TEXT, -- JSON snapshot before
    new_values TEXT, -- JSON snapshot after
    changes TEXT, -- JSON diff

    -- Where
    ip_address TEXT,
    user_agent TEXT,
    location_id INTEGER,

    -- When
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Context
    request_id TEXT, -- correlate related actions
    session_id TEXT,

    -- Result
    status TEXT DEFAULT 'success' CHECK(status IN ('success', 'failure', 'error')),
    error_message TEXT,

    -- Metadata
    metadata TEXT, -- JSON for additional context

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- =====================================================
-- LOGIN HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,

    -- Login Details
    username TEXT NOT NULL,
    login_type TEXT DEFAULT 'password' CHECK(login_type IN ('password', 'pin', 'sso', 'api_key', 'biometric')),

    -- Result
    success BOOLEAN NOT NULL,
    failure_reason TEXT,

    -- Device & Location
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT, -- desktop, mobile, tablet, pos_terminal
    device_fingerprint TEXT,

    -- Geolocation
    geo_city TEXT,
    geo_country TEXT,
    geo_lat DECIMAL(10,8),
    geo_lng DECIMAL(11,8),

    -- Session
    session_id TEXT,
    session_expires_at DATETIME,

    -- Timestamp
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    logged_out_at DATETIME,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- API KEYS (For integrations & third-party access)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    -- Key Details
    key_name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL, -- hashed
    api_secret TEXT, -- encrypted

    -- Permissions
    permissions TEXT NOT NULL, -- JSON array of allowed actions
    allowed_endpoints TEXT, -- JSON array of allowed API endpoints
    rate_limit INTEGER DEFAULT 1000, -- requests per hour

    -- Scope
    location_ids TEXT, -- JSON array, NULL = all locations

    -- Owner
    created_by INTEGER NOT NULL,
    owner_email TEXT,

    -- Status
    is_active BOOLEAN DEFAULT 1,
    expires_at DATETIME,

    -- Usage Stats
    total_requests INTEGER DEFAULT 0,
    last_used_at DATETIME,
    last_used_ip TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- API REQUEST LOG
-- =====================================================
CREATE TABLE IF NOT EXISTS api_request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id INTEGER,

    -- Request
    method TEXT NOT NULL, -- GET, POST, PUT, DELETE
    endpoint TEXT NOT NULL,
    query_params TEXT,
    request_body TEXT,

    -- Response
    status_code INTEGER NOT NULL,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Client
    ip_address TEXT,
    user_agent TEXT,

    -- Rate Limiting
    rate_limit_remaining INTEGER,

    -- Timestamp
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE SET NULL
);

-- =====================================================
-- SECURITY EVENTS (Suspicious activity)
-- =====================================================
CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    event_type TEXT NOT NULL CHECK(event_type IN (
        'failed_login_attempt', 'account_locked', 'password_reset',
        'unauthorized_access', 'data_breach_attempt', 'suspicious_activity',
        'rate_limit_exceeded', 'invalid_token', 'privilege_escalation_attempt'
    )),

    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),

    -- Who
    user_id INTEGER,
    username TEXT,
    ip_address TEXT NOT NULL,

    -- What
    description TEXT NOT NULL,
    details TEXT, -- JSON with event-specific details

    -- Response
    action_taken TEXT, -- account_locked, ip_blocked, alert_sent, etc.
    resolved BOOLEAN DEFAULT 0,
    resolved_by INTEGER,
    resolved_at DATETIME,
    resolution_notes TEXT,

    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- BLOCKED IPS
-- =====================================================
CREATE TABLE IF NOT EXISTS blocked_ips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    ip_address TEXT UNIQUE NOT NULL,
    reason TEXT NOT NULL,

    -- Blocking Details
    blocked_by INTEGER NOT NULL,
    blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Expiration
    expires_at DATETIME,
    is_permanent BOOLEAN DEFAULT 0,

    -- Unblock
    is_active BOOLEAN DEFAULT 1,
    unblocked_by INTEGER,
    unblocked_at DATETIME,

    -- Notes
    notes TEXT,

    FOREIGN KEY (blocked_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (unblocked_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- DATA EXPORTS (GDPR Compliance)
-- =====================================================
CREATE TABLE IF NOT EXISTS data_exports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Request
    customer_id INTEGER,
    request_type TEXT NOT NULL CHECK(request_type IN ('data_export', 'data_deletion')),

    -- Requester
    requested_by_email TEXT NOT NULL,
    requested_by_name TEXT,

    -- Status
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- Processing
    started_at DATETIME,
    completed_at DATETIME,

    -- Export File
    file_url TEXT,
    file_size INTEGER,
    file_expires_at DATETIME,

    -- Deletion
    data_deleted BOOLEAN DEFAULT 0,
    deletion_completed_at DATETIME,
    anonymized BOOLEAN DEFAULT 0,

    -- Compliance
    processed_by INTEGER,
    compliance_notes TEXT,

    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- WEBHOOKS (Outgoing notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    url TEXT NOT NULL,

    -- Events to trigger on
    events TEXT NOT NULL, -- JSON array: ['order.created', 'payment.completed', ...]

    -- Security
    secret TEXT, -- for signature verification

    -- HTTP Settings
    method TEXT DEFAULT 'POST' CHECK(method IN ('POST', 'PUT')),
    headers TEXT, -- JSON object with custom headers

    -- Retry Settings
    retry_on_failure BOOLEAN DEFAULT 1,
    max_retries INTEGER DEFAULT 3,

    -- Status
    is_active BOOLEAN DEFAULT 1,

    -- Stats
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    last_triggered_at DATETIME,

    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- =====================================================
-- WEBHOOK DELIVERIES (Log of webhook calls)
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL,

    event_type TEXT NOT NULL,
    event_data TEXT NOT NULL, -- JSON payload sent

    -- Request
    request_url TEXT NOT NULL,
    request_headers TEXT,
    request_body TEXT,

    -- Response
    response_status_code INTEGER,
    response_headers TEXT,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Result
    success BOOLEAN NOT NULL,
    error_message TEXT,

    -- Retry
    attempt_number INTEGER DEFAULT 1,
    next_retry_at DATETIME,

    delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- =====================================================
-- NOTIFICATIONS (Internal system notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,

    type TEXT NOT NULL CHECK(type IN (
        'info', 'warning', 'error', 'success',
        'order', 'inventory', 'user', 'system'
    )),

    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Action
    action_url TEXT,
    action_text TEXT,

    -- Related Entity
    entity_type TEXT,
    entity_id INTEGER,

    -- Status
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME,

    -- Priority
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),

    -- Delivery
    send_email BOOLEAN DEFAULT 0,
    email_sent BOOLEAN DEFAULT 0,
    send_sms BOOLEAN DEFAULT 0,
    sms_sent BOOLEAN DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_timestamp ON login_history(attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON login_history(ip_address);

CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);

CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON api_request_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_log_timestamp ON api_request_log(requested_at);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(is_active);

CREATE INDEX IF NOT EXISTS idx_data_exports_customer ON data_exports(customer_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(status);

CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
