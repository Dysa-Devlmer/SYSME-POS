-- ============================================
-- MIGRATION: 014 - Reservations System
-- Description: Complete table reservation system
-- Date: 2025-01-19
-- ============================================

-- Drop tables if they exist (for development only)
DROP TABLE IF EXISTS reservation_notifications;
DROP TABLE IF EXISTS reservation_history;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS reservation_settings;

-- ============================================
-- RESERVATION SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  is_enabled BOOLEAN DEFAULT 1,
  advance_booking_days INTEGER DEFAULT 30, -- How many days in advance can book
  min_booking_hours INTEGER DEFAULT 2, -- Minimum hours in advance
  max_party_size INTEGER DEFAULT 20, -- Maximum people per reservation
  default_duration_minutes INTEGER DEFAULT 120, -- Default reservation duration
  require_phone BOOLEAN DEFAULT 1,
  require_email BOOLEAN DEFAULT 0,
  require_deposit BOOLEAN DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  auto_confirm BOOLEAN DEFAULT 0, -- Auto-confirm or require manual approval
  cancellation_hours INTEGER DEFAULT 24, -- Hours before can cancel without penalty
  send_reminders BOOLEAN DEFAULT 1,
  reminder_hours_before INTEGER DEFAULT 24,
  business_hours_start TEXT DEFAULT '09:00',
  business_hours_end TEXT DEFAULT '23:00',
  slot_interval_minutes INTEGER DEFAULT 30, -- Time slot intervals
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RESERVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_code TEXT UNIQUE NOT NULL, -- RES-YYYYMMDD-XXXX

  -- Customer Information
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  party_size INTEGER NOT NULL,

  -- Reservation Details
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  end_time TIME, -- Calculated

  -- Table Assignment
  table_id INTEGER,
  preferred_area TEXT, -- 'indoor', 'outdoor', 'private', 'bar'

  -- Status and Tracking
  status TEXT DEFAULT 'pending', -- pending, confirmed, seated, completed, cancelled, no_show
  confirmation_code TEXT,

  -- Special Requests
  special_requests TEXT,
  occasion TEXT, -- birthday, anniversary, business, etc.

  -- Deposit & Payment
  deposit_required BOOLEAN DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT 0,
  deposit_paid_at DATETIME,

  -- Notifications
  reminder_sent BOOLEAN DEFAULT 0,
  reminder_sent_at DATETIME,
  confirmation_sent BOOLEAN DEFAULT 0,
  confirmation_sent_at DATETIME,

  -- Tracking
  created_by INTEGER, -- User ID who created
  confirmed_by INTEGER, -- User ID who confirmed
  seated_at DATETIME,
  completed_at DATETIME,
  cancelled_at DATETIME,
  cancellation_reason TEXT,

  -- Notes
  notes TEXT, -- Internal staff notes

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (table_id) REFERENCES tables(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (confirmed_by) REFERENCES users(id)
);

-- ============================================
-- RESERVATION HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- created, confirmed, modified, cancelled, seated, completed, no_show
  previous_status TEXT,
  new_status TEXT,
  changed_by INTEGER, -- User ID
  change_details TEXT, -- JSON with what changed
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- ============================================
-- RESERVATION NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reservation_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  notification_type TEXT NOT NULL, -- confirmation, reminder, cancellation, update
  channel TEXT NOT NULL, -- email, sms, whatsapp
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  sent_at DATETIME,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
CREATE INDEX IF NOT EXISTS idx_reservations_time ON reservations(reservation_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_table ON reservations(table_id);
CREATE INDEX IF NOT EXISTS idx_reservations_customer_phone ON reservations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code);
CREATE INDEX IF NOT EXISTS idx_reservation_history_reservation ON reservation_history(reservation_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp on reservations update
CREATE TRIGGER IF NOT EXISTS update_reservations_timestamp
AFTER UPDATE ON reservations
BEGIN
  UPDATE reservations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Auto-create history entry on status change
CREATE TRIGGER IF NOT EXISTS track_reservation_status_change
AFTER UPDATE OF status ON reservations
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO reservation_history (
    reservation_id,
    action,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    NEW.id,
    'status_changed',
    OLD.status,
    NEW.status,
    NEW.confirmed_by,
    'Status changed from ' || OLD.status || ' to ' || NEW.status
  );
END;

-- ============================================
-- VIEWS
-- ============================================

-- View: Upcoming Reservations
CREATE VIEW IF NOT EXISTS v_upcoming_reservations AS
SELECT
  r.id,
  r.reservation_code,
  r.customer_name,
  r.customer_phone,
  r.party_size,
  r.reservation_date,
  r.reservation_time,
  r.status,
  r.table_id,
  t.table_number,
  t.capacity,
  r.special_requests,
  r.created_at
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
WHERE r.reservation_date >= DATE('now')
  AND r.status IN ('pending', 'confirmed')
ORDER BY r.reservation_date ASC, r.reservation_time ASC;

-- View: Today's Reservations
CREATE VIEW IF NOT EXISTS v_today_reservations AS
SELECT
  r.id,
  r.reservation_code,
  r.customer_name,
  r.customer_phone,
  r.party_size,
  r.reservation_time,
  r.end_time,
  r.status,
  r.table_id,
  t.table_number,
  r.special_requests,
  r.occasion,
  r.seated_at
FROM reservations r
LEFT JOIN tables t ON r.table_id = t.id
WHERE r.reservation_date = DATE('now')
ORDER BY r.reservation_time ASC;

-- View: Reservation Statistics
CREATE VIEW IF NOT EXISTS v_reservation_stats AS
SELECT
  DATE(reservation_date) as date,
  COUNT(*) as total_reservations,
  SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
  SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
  SUM(party_size) as total_guests,
  AVG(party_size) as avg_party_size
FROM reservations
GROUP BY DATE(reservation_date)
ORDER BY date DESC;

-- View: Available Time Slots (helps find gaps)
CREATE VIEW IF NOT EXISTS v_reservation_availability AS
SELECT
  r.reservation_date,
  r.reservation_time,
  r.end_time,
  COUNT(*) as concurrent_reservations,
  SUM(r.party_size) as total_party_size,
  GROUP_CONCAT(r.table_id) as occupied_tables
FROM reservations r
WHERE r.status IN ('confirmed', 'seated')
GROUP BY r.reservation_date, r.reservation_time
ORDER BY r.reservation_date, r.reservation_time;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default settings
INSERT INTO reservation_settings (
  is_enabled,
  advance_booking_days,
  min_booking_hours,
  max_party_size,
  default_duration_minutes,
  require_phone,
  require_email,
  auto_confirm,
  cancellation_hours,
  send_reminders,
  reminder_hours_before,
  business_hours_start,
  business_hours_end,
  slot_interval_minutes
) VALUES (
  1,    -- enabled
  30,   -- 30 days advance booking
  2,    -- 2 hours minimum advance
  20,   -- max 20 people
  120,  -- 2 hours duration
  1,    -- phone required
  0,    -- email optional
  0,    -- manual confirmation
  24,   -- 24h cancellation policy
  1,    -- send reminders
  24,   -- 24h before reminder
  '09:00',
  '23:00',
  30    -- 30-minute slots
);

-- ============================================
-- SAMPLE DATA (for development/testing)
-- ============================================

-- Sample reservations (optional - comment out for production)
/*
INSERT INTO reservations (
  reservation_code,
  customer_name,
  customer_phone,
  customer_email,
  party_size,
  reservation_date,
  reservation_time,
  duration_minutes,
  status,
  special_requests,
  occasion
) VALUES
  ('RES-20250119-0001', 'Juan Pérez', '+573001234567', 'juan@example.com', 4, '2025-01-20', '19:00', 120, 'confirmed', 'Mesa cerca de la ventana', 'birthday'),
  ('RES-20250119-0002', 'María González', '+573007654321', 'maria@example.com', 2, '2025-01-20', '20:00', 90, 'confirmed', NULL, 'anniversary'),
  ('RES-20250119-0003', 'Carlos Rodríguez', '+573009876543', NULL, 6, '2025-01-21', '18:30', 120, 'pending', 'Mesa grande', 'business');
*/

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- This migration creates a complete reservation system with:
-- - Settings for configuration
-- - Main reservations table with full tracking
-- - History tracking for audit trail
-- - Notifications system
-- - Useful views for queries
-- - Triggers for automation
