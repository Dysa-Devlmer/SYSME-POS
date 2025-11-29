/**
 * Middleware para Configuración Chilena
 * Aplica formatos y configuraciones específicas para restaurantes en Chile
 */

import { chileConfig, formatCurrency, formatDate } from '../config/chile-config.js';

// Middleware para aplicar configuración chilena
export const applyChileConfig = (req, res, next) => {
  // Agregar configuración chilena al objeto request
  req.chileConfig = chileConfig;

  // Agregar funciones utilitarias
  req.formatCurrency = formatCurrency;
  req.formatDate = formatDate;

  // Configurar zona horaria para esta request
  process.env.TZ = chileConfig.timezone;

  next();
};

// Middleware para formatear respuestas con configuración chilena
export const formatChileResponse = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // Si la respuesta contiene datos que necesitan formateo chileno
    if (data && typeof data === 'object') {
      data = formatResponseData(data, req.chileConfig);
    }

    return originalJson.call(this, data);
  };

  next();
};

// Función para formatear datos según configuración chilena
function formatResponseData(data, config) {
  if (Array.isArray(data)) {
    return data.map(item => formatResponseData(item, config));
  }

  if (data && typeof data === 'object') {
    const formatted = { ...data };

    // Formatear campos de dinero
    ['price', 'total', 'amount', 'subtotal', 'taxes', 'discount'].forEach(field => {
      if (formatted[field] !== undefined && formatted[field] !== null) {
        formatted[`${field}_formatted`] = formatCurrency(formatted[field]);
      }
    });

    // Formatear fechas
    ['created_at', 'updated_at', 'date', 'timestamp', 'order_date'].forEach(field => {
      if (formatted[field]) {
        formatted[`${field}_formatted`] = formatDate(formatted[field]);
      }
    });

    // Agregar configuración regional
    if (formatted.id || formatted._id) {
      formatted._locale = {
        currency: config.currency.code,
        timezone: config.timezone,
        country: config.country
      };
    }

    return formatted;
  }

  return data;
}

// Middleware para validar RUT chileno en requests
export const validateChileData = (req, res, next) => {
  const { body } = req;

  // Validar RUT si está presente
  if (body.rut || body.customer_rut) {
    const rut = body.rut || body.customer_rut;

    if (!chileConfig.validations.rut.validate(rut)) {
      return res.status(400).json({
        success: false,
        error: 'RUT inválido',
        message: 'El RUT ingresado no tiene un formato válido',
        field: 'rut'
      });
    }
  }

  // Validar teléfono chileno si está presente
  if (body.phone || body.customer_phone) {
    const phone = body.phone || body.customer_phone;

    if (!chileConfig.validations.phone.pattern.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Teléfono inválido',
        message: `El teléfono debe tener formato ${chileConfig.validations.phone.format}`,
        field: 'phone'
      });
    }
  }

  next();
};

// Middleware para agregar encabezados específicos de Chile
export const chileHeaders = (req, res, next) => {
  res.set({
    'X-Country': 'Chile',
    'X-Timezone': chileConfig.timezone,
    'X-Currency': chileConfig.currency.code,
    'X-Language': chileConfig.language,
    'X-Business-Period': getBusinessPeriod()
  });

  next();
};

// Función para determinar el período de negocio actual
function getBusinessPeriod() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  if (time >= 1200 && time <= 1530) return 'almuerzo';
  if (time >= 1600 && time <= 1930) return 'once';
  if (time >= 2000 && time <= 2330) return 'cena';
  return 'cerrado';
}

// Middleware combinado para aplicar toda la configuración chilena
export const chileMiddleware = [
  applyChileConfig,
  chileHeaders,
  formatChileResponse,
  validateChileData
];

export default {
  applyChileConfig,
  formatChileResponse,
  validateChileData,
  chileHeaders,
  chileMiddleware
};