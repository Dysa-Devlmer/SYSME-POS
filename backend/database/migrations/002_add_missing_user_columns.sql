-- Migration: Add missing columns to users table
-- Date: 2025-10-27
-- Description: Adds language and security-related columns to users table for SYSME 2.0

-- Add language column
ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'es';

-- Add two-factor authentication column
ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;

-- Add last login tracking columns
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(45);

-- Add account locking columns
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until DATETIME;
