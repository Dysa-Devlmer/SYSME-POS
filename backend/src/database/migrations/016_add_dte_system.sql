-- ============================================
-- SYSME POS - Sistema de Documentos Tributarios Electrónicos (DTE)
-- Integración con SII Chile
-- ============================================

-- Tabla principal de Documentos Tributarios Electrónicos
CREATE TABLE IF NOT EXISTS documentos_tributarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Relación con venta
    sale_id INTEGER,

    -- Identificación del documento
    tipo_dte INTEGER NOT NULL,  -- 33=Factura, 39=Boleta, 61=NC, 56=ND
    folio INTEGER NOT NULL,
    fecha_emision DATE NOT NULL,

    -- Datos del receptor
    receptor_rut VARCHAR(12),
    receptor_razon_social VARCHAR(200),
    receptor_giro VARCHAR(200),
    receptor_direccion VARCHAR(300),
    receptor_comuna VARCHAR(100),
    receptor_ciudad VARCHAR(100),
    receptor_email VARCHAR(100),

    -- Montos
    monto_exento DECIMAL(12,2) DEFAULT 0,
    monto_neto DECIMAL(12,2) DEFAULT 0,
    monto_iva DECIMAL(12,2) DEFAULT 0,
    monto_total DECIMAL(12,2) NOT NULL,

    -- Estado del documento
    estado VARCHAR(50) DEFAULT 'GENERADO',
    -- Estados: GENERADO, FIRMADO, ENVIADO, ACEPTADO, RECHAZADO, ANULADO

    -- Datos técnicos SII
    track_id VARCHAR(50),           -- ID de seguimiento del SII
    fecha_envio DATETIME,
    fecha_respuesta DATETIME,
    glosa_respuesta TEXT,

    -- XML del documento
    xml_content TEXT,
    xml_firmado TEXT,

    -- Referencias (para NC/ND)
    referencia_dte_id INTEGER,
    motivo_anulacion TEXT,

    -- Metadata
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
    FOREIGN KEY (referencia_dte_id) REFERENCES documentos_tributarios(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_dte_tipo ON documentos_tributarios(tipo_dte);
CREATE INDEX IF NOT EXISTS idx_dte_folio ON documentos_tributarios(folio);
CREATE INDEX IF NOT EXISTS idx_dte_fecha ON documentos_tributarios(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_dte_estado ON documentos_tributarios(estado);
CREATE INDEX IF NOT EXISTS idx_dte_rut ON documentos_tributarios(receptor_rut);
CREATE INDEX IF NOT EXISTS idx_dte_sale ON documentos_tributarios(sale_id);

-- Tabla de Folios CAF (Código de Autorización de Folios)
CREATE TABLE IF NOT EXISTS caf_folios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_dte INTEGER NOT NULL,
    rango_desde INTEGER NOT NULL,
    rango_hasta INTEGER NOT NULL,
    folio_actual INTEGER NOT NULL,
    fecha_autorizacion DATE NOT NULL,
    fecha_vencimiento DATE,
    caf_xml TEXT NOT NULL,           -- XML del CAF firmado por SII
    estado VARCHAR(20) DEFAULT 'ACTIVO',  -- ACTIVO, AGOTADO, VENCIDO
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tipo_dte, rango_desde)
);

CREATE INDEX IF NOT EXISTS idx_caf_tipo ON caf_folios(tipo_dte);
CREATE INDEX IF NOT EXISTS idx_caf_estado ON caf_folios(estado);

-- Tabla de configuración del emisor
CREATE TABLE IF NOT EXISTS sii_emisor_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rut_emisor VARCHAR(12) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    giro VARCHAR(200),
    acteco VARCHAR(10),              -- Código de actividad económica
    direccion VARCHAR(300),
    comuna VARCHAR(100),
    ciudad VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),

    -- Configuración del certificado
    certificado_path VARCHAR(500),
    certificado_password VARCHAR(200),  -- Encriptado
    certificado_vencimiento DATE,

    -- Configuración ambiente
    ambiente VARCHAR(10) DEFAULT 'CERT',  -- CERT o PROD

    -- Logo para PDFs
    logo_base64 TEXT,

    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de log de comunicaciones con SII
CREATE TABLE IF NOT EXISTS sii_communication_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dte_id INTEGER,
    tipo_operacion VARCHAR(50) NOT NULL,  -- ENVIO, CONSULTA, ANULACION
    request_url VARCHAR(500),
    request_body TEXT,
    response_code INTEGER,
    response_body TEXT,
    estado_resultado VARCHAR(50),
    mensaje_resultado TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (dte_id) REFERENCES documentos_tributarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sii_log_dte ON sii_communication_log(dte_id);
CREATE INDEX IF NOT EXISTS idx_sii_log_fecha ON sii_communication_log(created_at);

-- Agregar columnas a la tabla sales para vincular con DTE
-- (Verificar si existen antes de agregar)
-- ALTER TABLE sales ADD COLUMN dte_id INTEGER REFERENCES documentos_tributarios(id);
-- ALTER TABLE sales ADD COLUMN dte_tipo INTEGER;
-- ALTER TABLE sales ADD COLUMN dte_folio INTEGER;

-- Vista para resumen de documentos por período
CREATE VIEW IF NOT EXISTS v_resumen_dte AS
SELECT
    strftime('%Y-%m', fecha_emision) as periodo,
    tipo_dte,
    CASE tipo_dte
        WHEN 33 THEN 'Factura Electrónica'
        WHEN 34 THEN 'Factura Exenta'
        WHEN 39 THEN 'Boleta Electrónica'
        WHEN 41 THEN 'Boleta Exenta'
        WHEN 61 THEN 'Nota de Crédito'
        WHEN 56 THEN 'Nota de Débito'
        ELSE 'Otro'
    END as tipo_nombre,
    COUNT(*) as cantidad,
    SUM(monto_neto) as total_neto,
    SUM(monto_iva) as total_iva,
    SUM(monto_total) as total_bruto,
    SUM(CASE WHEN estado = 'ACEPTADO' THEN 1 ELSE 0 END) as aceptados,
    SUM(CASE WHEN estado = 'RECHAZADO' THEN 1 ELSE 0 END) as rechazados
FROM documentos_tributarios
GROUP BY periodo, tipo_dte;

-- Vista para documentos pendientes de envío
CREATE VIEW IF NOT EXISTS v_dte_pendientes AS
SELECT
    dt.*,
    s.sale_number,
    u.username as created_by_name
FROM documentos_tributarios dt
LEFT JOIN sales s ON dt.sale_id = s.id
LEFT JOIN users u ON dt.created_by = u.id
WHERE dt.estado IN ('GENERADO', 'FIRMADO')
ORDER BY dt.created_at DESC;

-- Insertar tipos de DTE en settings para referencia
INSERT OR IGNORE INTO settings (key, value, category, description, data_type)
VALUES
    ('sii_tipo_dte_33', 'Factura Electrónica', 'sii', 'Factura Afecta', 'string'),
    ('sii_tipo_dte_34', 'Factura Exenta Electrónica', 'sii', 'Factura Exenta', 'string'),
    ('sii_tipo_dte_39', 'Boleta Electrónica', 'sii', 'Boleta Afecta', 'string'),
    ('sii_tipo_dte_41', 'Boleta Exenta Electrónica', 'sii', 'Boleta Exenta', 'string'),
    ('sii_tipo_dte_61', 'Nota de Crédito Electrónica', 'sii', 'Nota de Crédito', 'string'),
    ('sii_tipo_dte_56', 'Nota de Débito Electrónica', 'sii', 'Nota de Débito', 'string'),
    ('sii_ambiente', 'CERT', 'sii', 'Ambiente SII (CERT o PROD)', 'string'),
    ('sii_iva_rate', '19', 'sii', 'Tasa de IVA en Chile', 'number');

-- ============================================
-- FIN DE MIGRACIÓN DTE
-- ============================================
