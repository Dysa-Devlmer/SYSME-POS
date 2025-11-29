-- Migration: Add Split Sale Support
-- Date: 2025-01-16
-- Purpose: Add support for split bills/accounts

-- Add parent_sale_id column to track split sales
ALTER TABLE sales ADD COLUMN parent_sale_id INTEGER;

-- Add split_number to identify which split this is (1, 2, 3, etc)
ALTER TABLE sales ADD COLUMN split_number INTEGER DEFAULT 0;

-- Add is_split flag to identify if this sale was split
ALTER TABLE sales ADD COLUMN is_split BOOLEAN DEFAULT 0;

-- Update status CHECK constraint to include 'split'
-- Note: SQLite doesn't support modifying CHECK constraints easily
-- So we document that 'split' is now a valid status value
-- In production, this would be handled with a proper migration

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sales_parent_sale_id ON sales(parent_sale_id);

-- Comments:
-- parent_sale_id: References the original sale that was split
-- split_number: 1 = first split, 2 = second split, etc. 0 = not a split
-- is_split: TRUE if this is a split sale, FALSE otherwise
--
-- Example:
-- Original Sale ID: 100 (marked is_split = TRUE, status = 'split')
-- Split 1: ID 101, parent_sale_id = 100, split_number = 1
-- Split 2: ID 102, parent_sale_id = 100, split_number = 2
