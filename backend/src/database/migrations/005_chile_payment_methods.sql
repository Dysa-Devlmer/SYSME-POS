-- Migration: Add Chilean payment methods
-- Date: 2025-12-02
-- Description: Adds Red Compra (Chilean debit), Cheque, and updates settings for Chile

-- Add Chilean payment methods
INSERT OR IGNORE INTO payment_methods (name, code, requires_change, icon, sort_order) VALUES
('Red Compra', 'redcompra', 0, 'credit-card', 2),
('Cheque', 'cheque', 0, 'file-text', 5),
('Visa', 'visa', 0, 'credit-card', 3),
('Mastercard', 'mastercard', 0, 'credit-card', 4);

-- Update default settings for Chile
UPDATE settings SET value = 'CLP' WHERE key = 'currency';
UPDATE settings SET value = '19' WHERE key = 'tax_rate'; -- IVA Chile 19%
UPDATE settings SET value = 'SYSME Restaurant Chile' WHERE key = 'company_name';
UPDATE settings SET value = '+56 2 1234 5678' WHERE key = 'company_phone';

-- Add Chilean-specific settings
INSERT OR IGNORE INTO settings (key, value, category, description, data_type, is_public) VALUES
('country', 'CL', 'general', 'País del sistema', 'string', 1),
('timezone', 'America/Santiago', 'general', 'Zona horaria', 'string', 0),
('sii_environment', 'certification', 'sii', 'Ambiente SII (certification/production)', 'string', 0),
('sii_rut_empresa', '', 'sii', 'RUT de la empresa', 'string', 0),
('propina_sugerida', '10', 'pos', 'Porcentaje de propina sugerida', 'number', 1),
('formato_boleta', 'ticket', 'pos', 'Formato de boleta (ticket/carta)', 'string', 0);
