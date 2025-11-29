/**
 * Configuración Específica para Restaurantes en Chile
 * Adaptado para el mercado chileno con formatos locales
 */

export const chileConfig = {
  // === CONFIGURACIÓN REGIONAL ===
  locale: 'es-CL',
  timezone: 'America/Santiago',
  country: 'Chile',
  language: 'español',

  // === CONFIGURACIÓN MONETARIA ===
  currency: {
    code: 'CLP',
    symbol: '$',
    name: 'Peso Chileno',
    decimals: 0, // Los pesos chilenos no usan decimales
    format: (amount) => {
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    }
  },

  // === CONFIGURACIÓN DE IMPUESTOS ===
  taxes: {
    iva: {
      rate: 19, // IVA Chile 19%
      name: 'IVA',
      description: 'Impuesto al Valor Agregado',
      includeInPrice: true // En Chile los precios incluyen IVA
    }
  },

  // === FORMATOS DE FECHA Y HORA ===
  dateTime: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY HH:mm',
    longDateFormat: 'dddd, D [de] MMMM [de] YYYY',
    shortDateFormat: 'DD/MM/YY'
  },

  // === HORARIOS TÍPICOS DE RESTAURANTES CHILENOS ===
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
  },

  // === TERMINOLOGÍA LOCAL DE RESTAURANTE ===
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

    // Tipos de mesa
    tableTypes: {
      mesa2: 'Mesa para 2',
      mesa4: 'Mesa para 4',
      mesa6: 'Mesa para 6',
      mesa8: 'Mesa para 8',
      barra: 'Barra',
      terraza: 'Terraza',
      salon: 'Salón Principal',
      privado: 'Salón Privado'
    },

    // Estados de mesa
    tableStatus: {
      disponible: 'Disponible',
      ocupada: 'Ocupada',
      reservada: 'Reservada',
      limpieza: 'En Limpieza',
      fuera_servicio: 'Fuera de Servicio'
    },

    // Estados de orden
    orderStatus: {
      pendiente: 'Pendiente',
      en_preparacion: 'En Preparación',
      lista: 'Lista para Servir',
      servida: 'Servida',
      pagada: 'Pagada',
      cancelada: 'Cancelada'
    },

    // Métodos de pago chilenos
    paymentMethods: {
      efectivo: 'Efectivo',
      debito: 'Tarjeta de Débito',
      credito: 'Tarjeta de Crédito',
      transferencia: 'Transferencia',
      webpay: 'Webpay',
      transbank: 'Transbank',
      mercadopago: 'MercadoPago',
      app_banco: 'App Banco'
    },

    // Categorías de productos típicas
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

  // === CONFIGURACIÓN DE NOTIFICACIONES ===
  notifications: {
    sounds: {
      nueva_orden: 'campana_cocina.mp3',
      orden_lista: 'timbre_servicio.mp3',
      pago_recibido: 'caja_registradora.mp3',
      alerta: 'alerta_urgente.mp3'
    },
    messages: {
      nueva_orden: 'Nueva orden para la mesa {mesa}',
      orden_lista: 'Orden lista para servir en mesa {mesa}',
      stock_bajo: 'Stock bajo: {producto} - Solo quedan {cantidad} unidades',
      turno_inicio: 'Turno iniciado - ¡Buen día de trabajo!',
      turno_fin: 'Turno finalizado - Gracias por tu trabajo'
    }
  },

  // === CONFIGURACIÓN DE DOCUMENTOS FISCALES ===
  documents: {
    boleta: {
      header: 'BOLETA ELECTRÓNICA',
      footer: 'Gracias por su preferencia',
      showRut: false
    },
    factura: {
      header: 'FACTURA ELECTRÓNICA',
      footer: 'Documento Tributario Electrónico',
      showRut: true,
      requireRut: true
    }
  },

  // === CONFIGURACIÓN DE PROPINAS ===
  tips: {
    enabled: true,
    defaultPercentage: 10, // 10% típico en Chile
    suggestions: [5, 10, 15, 20], // Porcentajes sugeridos
    voluntary: true, // Las propinas son voluntarias en Chile
    includeInTotal: false
  },

  // === VALIDACIONES CHILENAS ===
  validations: {
    rut: {
      enabled: true,
      required: false,
      format: 'XX.XXX.XXX-X',
      validate: (rut) => {
        // Validación básica de RUT chileno
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
      }
    },
    phone: {
      pattern: /^(\+56)?[2-9]\d{8}$/,
      format: '+56 X XXXX XXXX'
    }
  },

  // === CONFIGURACIÓN DE REPORTES ===
  reports: {
    periods: {
      diario: 'Reporte Diario',
      semanal: 'Reporte Semanal',
      mensual: 'Reporte Mensual',
      anual: 'Reporte Anual'
    },
    metrics: {
      ventas_totales: 'Ventas Totales',
      ordenes_promedio: 'Promedio de Órdenes',
      producto_mas_vendido: 'Producto Más Vendido',
      hora_peak: 'Hora Peak',
      mesa_mas_ocupada: 'Mesa Más Ocupada',
      garzon_destacado: 'Garzón Destacado'
    }
  },

  // === CONFIGURACIÓN DE INVENTARIO ===
  inventory: {
    units: {
      kg: 'Kilogramos',
      g: 'Gramos',
      l: 'Litros',
      ml: 'Mililitros',
      u: 'Unidades',
      paquete: 'Paquetes',
      caja: 'Cajas',
      bolsa: 'Bolsas'
    },
    alertLevels: {
      critico: 5,  // 5 unidades
      bajo: 20,    // 20 unidades
      normal: 50   // 50+ unidades
    }
  }
};

// === FUNCIONES UTILITARIAS ===
export const formatCurrency = (amount) => {
  return chileConfig.currency.format(amount);
};

export const formatDate = (date, format = 'dateTime') => {
  const dateObj = new Date(date);
  const formatter = new Intl.DateTimeFormat('es-CL', {
    timeZone: chileConfig.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: format.includes('time') ? '2-digit' : undefined,
    minute: format.includes('time') ? '2-digit' : undefined
  });

  return formatter.format(dateObj);
};

export const validateRut = (rut) => {
  return chileConfig.validations.rut.validate(rut);
};

export const formatRut = (rut) => {
  const cleanRut = rut.replace(/[^0-9kK]/g, '');
  if (cleanRut.length < 8) return cleanRut;

  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);

  // Formatear como XX.XXX.XXX-X
  const formatted = body.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  return `${formatted}-${dv}`;
};

export const getBusinessPeriod = () => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const time = hour * 100 + minute;

  if (time >= 1200 && time <= 1530) return 'almuerzo';
  if (time >= 1600 && time <= 1930) return 'once';
  if (time >= 2000 && time <= 2330) return 'cena';
  return 'cerrado';
};

export default chileConfig;