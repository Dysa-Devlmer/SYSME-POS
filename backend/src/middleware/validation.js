/**
 * Validation Middleware
 * Input validation using Joi schemas
 */

import Joi from 'joi';
import { ValidationError } from './errorHandler.js';
import { validationResult } from 'express-validator';

// Common validation schemas
export const commonSchemas = {
  id: Joi.number().integer().positive().required(),
  optionalId: Joi.number().integer().positive().optional(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(128).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  phone: Joi.string().pattern(/^[+]?[0-9\s\-\(\)]+$/).max(20).optional(),
  url: Joi.string().uri().optional(),
  date: Joi.date().iso().optional(),
  status: Joi.string().valid('active', 'inactive', 'S', 'N').optional(),
  language: Joi.string().valid('es', 'en', 'fr', 'de').default('es'),
  currency: Joi.string().length(3).uppercase().default('EUR'),
  decimal: Joi.number().precision(2).positive().optional(),
  text: Joi.string().max(1000).optional(),
  name: Joi.string().min(1).max(100).trim().required(),
  description: Joi.string().max(500).trim().optional(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name,
    phone: commonSchemas.phone,
    role: Joi.string().valid('admin', 'manager', 'cashier', 'waiter').default('cashier')
  }),
  
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),

  posLogin: Joi.object({
    employee_id: Joi.number().integer().positive().optional(),
    pin: Joi.string().length(3).pattern(/^\d{3}$/).required()
      .messages({
        'string.pattern.base': 'PIN must be exactly 3 digits',
        'string.length': 'PIN must be exactly 3 digits'
      })
  }),
  
  updateProfile: Joi.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone,
    language: commonSchemas.language
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  }),
  
  resetPassword: Joi.object({
    email: commonSchemas.email
  })
};

// Product validation schemas
export const productSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    description: commonSchemas.description,
    price: Joi.number().precision(2).positive().required(),
    cost: Joi.number().precision(2).positive().optional(),
    category_id: commonSchemas.id,
    subcategory_id: commonSchemas.optionalId,
    sku: Joi.string().max(50).optional(),
    barcode: Joi.string().max(50).optional(),
    stock_quantity: Joi.number().integer().min(0).default(0),
    min_stock: Joi.number().integer().min(0).default(0),
    tax_rate: Joi.number().min(0).max(100).default(0),
    is_active: Joi.boolean().default(true),
    allergens: Joi.array().items(Joi.string()).optional(),
    ingredients: Joi.array().items(Joi.string()).optional()
  }),
  
  update: Joi.object({
    name: commonSchemas.name.optional(),
    description: commonSchemas.description,
    price: Joi.number().precision(2).positive().optional(),
    cost: Joi.number().precision(2).positive().optional(),
    category_id: commonSchemas.optionalId,
    subcategory_id: commonSchemas.optionalId,
    sku: Joi.string().max(50).optional(),
    barcode: Joi.string().max(50).optional(),
    stock_quantity: Joi.number().integer().min(0).optional(),
    min_stock: Joi.number().integer().min(0).optional(),
    tax_rate: Joi.number().min(0).max(100).optional(),
    is_active: Joi.boolean().optional(),
    allergens: Joi.array().items(Joi.string()).optional(),
    ingredients: Joi.array().items(Joi.string()).optional()
  })
};

// Category validation schemas
export const categorySchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    description: commonSchemas.description,
    parent_id: commonSchemas.optionalId,
    sort_order: Joi.number().integer().min(0).default(0),
    is_active: Joi.boolean().default(true),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional()
  }),
  
  update: Joi.object({
    name: commonSchemas.name.optional(),
    description: commonSchemas.description,
    parent_id: commonSchemas.optionalId,
    sort_order: Joi.number().integer().min(0).optional(),
    is_active: Joi.boolean().optional(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional()
  })
};

// Sales validation schemas
export const salesSchemas = {
  create: Joi.object({
    customer_id: commonSchemas.optionalId,
    table_number: Joi.string().max(20).optional(),
    items: Joi.array().items(
      Joi.object({
        product_id: commonSchemas.id,
        quantity: Joi.number().integer().positive().required(),
        price: Joi.number().precision(2).positive().required(),
        notes: Joi.string().max(200).optional()
      })
    ).min(1).required(),
    discount_amount: Joi.number().precision(2).min(0).default(0),
    tax_amount: Joi.number().precision(2).min(0).default(0),
    payment_method: Joi.string().valid('cash', 'card', 'transfer', 'mixed').required(),
    notes: Joi.string().max(500).optional()
  }),
  
  update: Joi.object({
    status: Joi.string().valid('pending', 'completed', 'cancelled').optional(),
    notes: Joi.string().max(500).optional()
  })
};

// Settings validation schemas
export const settingsSchemas = {
  company: Joi.object({
    name: commonSchemas.name.optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone,
    address: Joi.string().max(200).optional(),
    tax_id: Joi.string().max(50).optional(),
    currency: commonSchemas.currency,
    language: commonSchemas.language,
    timezone: Joi.string().optional()
  }),
  
  pos: Joi.object({
    receipt_header: Joi.string().max(200).optional(),
    receipt_footer: Joi.string().max(200).optional(),
    auto_print: Joi.boolean().default(false),
    cash_drawer: Joi.boolean().default(false),
    barcode_scanner: Joi.boolean().default(false)
  })
};

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      throw new ValidationError('Validation failed', errors);
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Query validation middleware
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      throw new ValidationError('Query validation failed', errors);
    }
    
    req.query = value;
    next();
  };
};

// Params validation middleware
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      throw new ValidationError('Parameter validation failed', errors);
    }
    
    req.params = value;
    next();
  };
};

// File upload validation
export const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false
  } = options;
  
  return (req, res, next) => {
    if (!req.file && required) {
      throw new ValidationError('File upload is required');
    }
    
    if (!req.file) {
      return next();
    }
    
    if (req.file.size > maxSize) {
      throw new ValidationError(`File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`);
    }
    
    if (!allowedTypes.includes(req.file.mimetype)) {
      throw new ValidationError(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    next();
  };
};

/**
 * Validate request using express-validator
 * For use with express-validator's check/query/body functions
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
};

export default {
  commonSchemas,
  userSchemas,
  productSchemas,
  categorySchemas,
  salesSchemas,
  settingsSchemas,
  validate,
  validateQuery,
  validateParams,
  validateFileUpload,
  validateRequest
};