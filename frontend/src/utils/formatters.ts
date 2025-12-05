/**
 * Common formatting utilities for the application
 */

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency: string = 'CLP'): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format number with thousands separator
 */
export const formatNumber = (num: number, decimals: number = 0): string => {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Format date to local string
 */
export const formatDate = (date: string | Date, format: 'short' | 'long' | 'datetime' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (format === 'short') {
    return d.toLocaleDateString('es-CL');
  } else if (format === 'long') {
    return d.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else {
    return d.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * Format time only
 */
export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string, length: number = 50): string => {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
};

/**
 * Capitalize first letter
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Format phone number (Chilean format)
 */
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `+56 9 ${cleaned.substring(1, 5)} ${cleaned.substring(5)}`;
  }
  return phone;
};

/**
 * Format RUT/Tax ID (Chilean format)
 */
export const formatRUT = (rut: string): string => {
  const cleaned = rut.replace(/[^0-9kK]/g, '');
  if (cleaned.length < 2) return rut;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
};

/**
 * Parse formatted currency to number
 */
export const parseCurrency = (formatted: string): number => {
  const cleaned = formatted.replace(/[^\d,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

/**
 * Get relative time (e.g., "hace 5 minutos")
 */
export const getRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  return formatDate(d);
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
