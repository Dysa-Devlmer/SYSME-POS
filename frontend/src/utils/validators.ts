/**
 * Common validation utilities
 */

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate Chilean RUT
 */
export const isValidRUT = (rut: string): boolean => {
  const cleaned = rut.replace(/[^0-9kK]/g, '');
  if (cleaned.length < 2) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDV = 11 - (sum % 11);
  const calculatedDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();

  return dv === calculatedDV;
};

/**
 * Validate Chilean phone number
 */
export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 9 && cleaned.startsWith('9');
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value: any): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
};

/**
 * Validate non-negative number
 */
export const isNonNegativeNumber = (value: any): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= 0;
};

/**
 * Validate required field
 */
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate min length
 */
export const minLength = (value: string, min: number): boolean => {
  return value.length >= min;
};

/**
 * Validate max length
 */
export const maxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

/**
 * Validate number range
 */
export const inRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Validate URL format
 */
export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate date is not in the past
 */
export const isNotPastDate = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now;
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password: string): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Debe tener al menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una mayúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Debe incluir al menos un número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Debe incluir al menos un carácter especial');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Sanitize string (remove HTML tags)
 */
export const sanitizeString = (str: string): string => {
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Validate credit card number (Luhn algorithm)
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validate stock quantity
 */
export const isValidStockQuantity = (quantity: number, allowNegative: boolean = false): boolean => {
  if (!Number.isInteger(quantity)) return false;
  return allowNegative ? true : quantity >= 0;
};
