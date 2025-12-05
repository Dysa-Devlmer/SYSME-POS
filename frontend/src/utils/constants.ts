/**
 * Application-wide constants
 */

// Status constants
export const SALE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export const PARKED_SALE_STATUS = {
  PARKED: 'parked',
  RESUMED: 'resumed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
} as const;

export const TRANSFER_STATUS = {
  PENDING: 'pending',
  IN_TRANSIT: 'in_transit',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
} as const;

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

export const INVOICE_TYPES = {
  BOLETA: 'boleta',
  FACTURA: 'factura',
  NOTA_CREDITO: 'nota_credito',
  NOTA_DEBITO: 'nota_debito'
} as const;

export const COMBO_TYPES = {
  PACK: 'pack',
  MENU: 'menu',
  PROMOTION: 'promotion',
  COMBO: 'combo'
} as const;

export const WAREHOUSE_TYPES = {
  MAIN: 'main',
  KITCHEN: 'kitchen',
  BAR: 'bar',
  SECONDARY: 'secondary',
  EXTERNAL: 'external'
} as const;

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  MIXED: 'mixed',
  OTHER: 'other'
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  WAITER: 'waiter',
  KITCHEN: 'kitchen',
  INVENTORY_MANAGER: 'inventory_manager'
} as const;

export const ALERT_TYPES = {
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  REORDER_NEEDED: 'reorder_needed'
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

// Date formats
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
export const TIME_FORMAT = 'HH:mm';

// Validation
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PRODUCT_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Currency
export const DEFAULT_CURRENCY = 'CLP';
export const CURRENCY_SYMBOL = '$';

// Tax
export const DEFAULT_TAX_RATE = 19; // 19% IVA Chile

// Status colors
export const STATUS_COLORS = {
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-500'
  },
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-500'
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-500'
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-500'
  },
  neutral: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-500'
  }
} as const;

// API endpoints base
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'sysme_auth_token',
  USER_DATA: 'sysme_user_data',
  THEME: 'sysme_theme',
  LANGUAGE: 'sysme_language',
  LAST_ROUTE: 'sysme_last_route'
} as const;

// Toast durations (milliseconds)
export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 4000,
  LONG: 6000
} as const;

// Table limits
export const MIN_TABLE_NUMBER = 1;
export const MAX_TABLE_NUMBER = 999;

// Stock limits
export const MIN_STOCK = 0;
export const MAX_STOCK = 999999;

// Price limits
export const MIN_PRICE = 0;
export const MAX_PRICE = 99999999;

// Discount limits
export const MIN_DISCOUNT_PERCENTAGE = 0;
export const MAX_DISCOUNT_PERCENTAGE = 100;

// File upload
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_CL: /^(\+?56)?(\s?)(0?9)(\s?)[98765]\d{7}$/,
  RUT_CL: /^(\d{1,2}\.)?\d{3}\.\d{3}-[\dkK]$/,
  ONLY_NUMBERS: /^\d+$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  PRODUCT_CODE: /^[A-Z0-9-]+$/
} as const;

// System messages
export const MESSAGES = {
  SUCCESS: {
    CREATED: 'Creado exitosamente',
    UPDATED: 'Actualizado exitosamente',
    DELETED: 'Eliminado exitosamente',
    SAVED: 'Guardado exitosamente'
  },
  ERROR: {
    GENERIC: 'Ha ocurrido un error. Intenta nuevamente',
    NETWORK: 'Error de conexión. Verifica tu internet',
    NOT_FOUND: 'No se encontró el recurso',
    UNAUTHORIZED: 'No tienes permisos para esta acción',
    VALIDATION: 'Por favor verifica los datos ingresados'
  },
  CONFIRM: {
    DELETE: '¿Estás seguro de eliminar este elemento?',
    CANCEL: '¿Estás seguro de cancelar esta acción?',
    LOGOUT: '¿Estás seguro de cerrar sesión?'
  }
} as const;

// Permission codes
export const PERMISSIONS = {
  // Sales
  SALES_VIEW: 'sales.view',
  SALES_CREATE: 'sales.create',
  SALES_UPDATE: 'sales.update',
  SALES_DELETE: 'sales.delete',
  SALES_REFUND: 'sales.refund',
  SALES_PARK: 'sales.park',

  // Products
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_UPDATE: 'inventory.update',
  INVENTORY_ADJUST: 'inventory.adjust',

  // Warehouses
  WAREHOUSES_VIEW: 'warehouses.view',
  WAREHOUSES_MANAGE: 'warehouses.manage',
  WAREHOUSES_TRANSFER: 'warehouses.transfer',

  // Cash
  CASH_OPEN: 'cash.open',
  CASH_CLOSE: 'cash.close',
  CASH_VIEW: 'cash.view',

  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_UPDATE: 'settings.update',

  // Users
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',

  // Permissions
  PERMISSIONS_VIEW: 'permissions.view',
  PERMISSIONS_MANAGE: 'permissions.manage'
} as const;

export default {
  SALE_STATUS,
  PARKED_SALE_STATUS,
  TRANSFER_STATUS,
  INVOICE_STATUS,
  INVOICE_TYPES,
  COMBO_TYPES,
  WAREHOUSE_TYPES,
  PAYMENT_METHODS,
  USER_ROLES,
  ALERT_TYPES,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  DATE_FORMAT,
  DATETIME_FORMAT,
  TIME_FORMAT,
  DEFAULT_CURRENCY,
  CURRENCY_SYMBOL,
  DEFAULT_TAX_RATE,
  STATUS_COLORS,
  API_BASE_URL,
  STORAGE_KEYS,
  TOAST_DURATION,
  MESSAGES,
  PERMISSIONS
};
