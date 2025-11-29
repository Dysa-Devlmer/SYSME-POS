-- Migration: Parked Sales System
-- Date: 2025-01-17
-- Purpose: Add ability to park/hold sales and resume them later (essential for peak hours)

-- Add parked status to sales table
-- Note: We use 'draft' status for parked sales in the existing status field

-- Create parked_sales table for quick access
CREATE TABLE IF NOT EXISTS parked_sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL UNIQUE,
    parker_user_id INTEGER NOT NULL,
    parked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (parker_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_parked_sales_sale_id ON parked_sales(sale_id);
CREATE INDEX IF NOT EXISTS idx_parked_sales_parked_at ON parked_sales(parked_at);

-- Comments:
-- Workflow:
-- 1. User starts a sale (table selection, add items)
-- 2. User parks the sale (saves as draft, creates parked_sales record)
-- 3. Sale appears in "Parked Sales" list
-- 4. User can resume sale later (delete parked_sales record, continue editing)
-- 5. When sale is completed, parked_sales record is automatically removed
--
-- Use cases:
-- - Customer needs to go to ATM
-- - Table not ready yet
-- - Waiting for more people to arrive
-- - Peak hours: multiple orders in progress
