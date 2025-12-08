/**
 * Configuración Específica para Restaurantes en Chile - Frontend
 * Adaptado para el mercado chileno con formatos locales
 */

export interface ChileConfig {
  locale: string;
  timezone: string;
  country: string;
  language: string;
  currency: {
    code: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  dateTime: {
    dateFormat: string;
    timeFormat: string;
    dateTimeFormat: string;
  };
  terminology: {
    roles: Record<string, string>;
    tableStatus: Record<string, string>;
    orderStatus: Record<string, string>;
    paymentMethods: Record<string, string>;
    productCategories: Record<string, string>;
  };
  businessHours: {
    almuerzo: { start: string; end: string; name: string };
    once: { start: string; end: string; name: string };
    cena: { start: string; end: string; name: string };
  };
}

export const chileConfig: ChileConfig = {
  locale: 'es-CL',
  timezone: 'America/Santiago',
  country: 'Chile',
  language: 'español',

  currency: {
    code: 'CLP',
    symbol: '$',
    name: 'Peso Chileno',
    decimals: 0
  },

  dateTime: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm'
  },

  terminology: {
    // Roles del personal
    roles: {
      admin: 'Administrador',
      manager: 'Encargado',
      cashier: 'Cajero',
      waiter: 'Garzón',
      waitress: 'Garzona',
      kitchen: 'Cocinero',
      chef: 'Chef',
      barista: 'Barista',
      host: 'Anfitrión'
    },

    // Estados de mesa
    tableStatus: {
      available: 'Disponible',
      occupied: 'Ocupada',
      reserved: 'Reservada',
      cleaning: 'En Limpieza',
      out_of_service: 'Fuera de Servicio'
    },

    // Estados de orden
    orderStatus: {
      pending: 'Pendiente',
      preparing: 'En Preparación',
      ready: 'Lista para Servir',
      served: 'Servida',
      paid: 'Pagada',
      cancelled: 'Cancelada'
    },

    // Métodos de pago chilenos
    paymentMethods: {
      cash: 'Efectivo',
      redcompra: 'Red Compra',
      visa: 'Visa',
      mastercard: 'Mastercard',
      debit: 'Tarjeta de Débito',
      credit: 'Tarjeta de Crédito',
      cheque: 'Cheque',
      transfer: 'Transferencia',
      webpay: 'Webpay',
      transbank: 'Transbank',
      mercadopago: 'MercadoPago',
      bank_app: 'App Banco',
      mixed: 'Mixto'
    },

    // Categorías de productos típicas chilenas
    productCategories: {
      entradas: 'Entradas',
      platos_principales: 'Platos Principales',
      sopas: 'Sopas y Cremas',
      ensaladas: 'Ensaladas',
      sandwiches: 'Sándwiches',
      empanadas: 'Empanadas',
      parrilla: 'Parrilla',
      mariscos: 'Mariscos',
      pescados: 'Pescados',
      postres: 'Postres',
      helados: 'Helados',
      bebidas: 'Bebidas',
      jugos: 'Jugos Naturales',
      cafe: 'Café',
      te: 'Té e Infusiones',
      alcoholicas: 'Bebidas Alcohólicas',
      vinos: 'Vinos',
      cervezas: 'Cervezas',
      pisco: 'Pisco y Cócteles',
      once: 'Para la Once'
    }
  },

  businessHours: {
    almuerzo: {
      start: '12:00',
      end: '15:30',
      name: 'Almuerzo'
    },
    once: {
      start: '16:00',
      end: '19:30',
      name: 'Once'
    },
    cena: {
      start: '20:00',
      end: '23:30',
      name: 'Cena'
    }
  }
};

// === FUNCIONES UTILITARIAS ===

/**
 * Formatea un monto en pesos chilenos
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Formatea una fecha según el formato chileno
 */
export const formatDate = (date: Date | string, includeTime = false): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: chileConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return new Intl.DateTimeFormat('es-CL', options).format(dateObj);
};

/**
 * Valida un RUT chileno
 */
export const validateRut = (rut: string): boolean => {
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  if (cleanRut.length < 8 || cleanRut.length > 9) return false;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const calculatedDv = remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder.toString();

  return dv === calculatedDv;
};

/**
 * Formatea un RUT chileno
 */
export const formatRut = (rut: string): string => {
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  if (cleanRut.length < 8) return cleanRut;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Formatear como XX.XXX.XXX-X
  const formatted = body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return `${formatted}-${dv}`;
};

/**
 * Obtiene el período de negocio actual
 */
export const getBusinessPeriod = (): string => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  if (time >= 1200 && time <= 1530) return 'almuerzo';
  if (time >= 1600 && time <= 1930) return 'once';
  if (time >= 2000 && time <= 2330) return 'cena';
  return 'cerrado';
};

/**
 * Traduce un término usando la terminología chilena
 */
export const translate = (category: keyof ChileConfig['terminology'], key: string): string => {
  return chileConfig.terminology[category][key] || key;
};

/**
 * Obtiene la zona horaria configurada
 */
export const getTimezone = (): string => {
  return chileConfig.timezone;
};

/**
 * Verifica si es horario de atención
 */
export const isBusinessHours = (): boolean => {
  const period = getBusinessPeriod();
  return period !== 'cerrado';
};

/**
 * Obtiene el saludo apropiado según la hora
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

/**
 * Formatea un número de teléfono chileno
 */
export const formatPhone = (phone: string): string => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  if (cleanPhone.length === 9) {
    return `+56 ${cleanPhone.substring(0, 1)} ${cleanPhone.substring(1, 5)} ${cleanPhone.substring(5)}`;
  }

  if (cleanPhone.length === 11 && cleanPhone.startsWith('56')) {
    const nationalNumber = cleanPhone.substring(2);
    return `+56 ${nationalNumber.substring(0, 1)} ${nationalNumber.substring(1, 5)} ${nationalNumber.substring(5)}`;
  }

  return phone;
};

export default chileConfig;