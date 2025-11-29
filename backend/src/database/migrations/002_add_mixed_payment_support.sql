-- Migration: Add Mixed Payment Support
-- Date: 2025-01-16
-- Purpose: Add payment_details JSON column to support multiple payment methods

-- Add payment_details column to sales table
ALTER TABLE sales ADD COLUMN payment_details TEXT;

-- SQLite doesn't support JSON type natively, but we'll store JSON as TEXT
-- payment_details structure:
-- {
--   "payments": [
--     { "method": "cash", "amount": 15000 },
--     { "method": "card", "amount": 10000 },
--     { "method": "transfer", "amount": 5000 }
--   ],
--   "change": 0,
--   "total_paid": 30000
-- }

-- Note: payment_method column will remain for backward compatibility
-- For mixed payments, payment_method will be set to 'mixed'
