/**
 * QR Ordering Service
 * Servicio frontend para el sistema de pedidos por código QR
 */

import { apiClient as api } from '@/api/client';

// ============================================
// INTERFACES
// ============================================

export interface QRCode {
  id: number;
  table_id: number;
  code: string;
  short_url: string;
  is_active: boolean;
  scan_count: number;
  last_scanned_at: string | null;
  created_at: string;
  table_number?: number;
  table_name?: string;
  active_sessions?: number;
}

export interface QRSession {
  id: number;
  qr_code_id: number;
  table_id: number;
  session_token: string;
  status: 'active' | 'closed';
  guest_count: number;
  started_at: string;
  ended_at: string | null;
  total_amount: number;
  tip_amount: number;
  tip_percentage: number | null;
  language: string;
  table_number?: number;
  table_name?: string;
  order_count?: number;
  cart_items?: number;
}

export interface SessionGuest {
  id: number;
  session_id: number;
  guest_name: string;
  guest_token: string;
  is_host: boolean;
  subtotal: number;
  joined_at: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  products: MenuProduct[];
}

export interface MenuProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  allergens: string[];
  dietary_info: string[];
  calories: number | null;
  preparation_time: number | null;
}

export interface ProductDetails extends MenuProduct {
  category_name: string;
  images: ProductImage[];
  modifiers: ModifierGroup[];
}

export interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  display_order: number;
}

export interface ModifierGroup {
  id: number;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: number;
  name: string;
  price: number;
  is_default: boolean;
}

export interface CartItem {
  id: number;
  session_id: number;
  guest_id: number | null;
  product_id: number;
  quantity: number;
  unit_price: number;
  modifiers: SelectedModifier[];
  special_instructions: string | null;
  product_name: string;
  product_description: string;
  product_image: string | null;
  guest_name: string | null;
  line_total: number;
}

export interface SelectedModifier {
  groupId: number;
  optionId: number;
  optionName: string;
  price: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  total: number;
  item_count: number;
}

export interface QROrder {
  id: number;
  session_id: number;
  guest_id: number | null;
  sale_id: number | null;
  order_number: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  items?: QROrderItem[];
}

export interface QROrderItem {
  id: number;
  qr_order_id: number;
  product_id: number;
  guest_id: number | null;
  quantity: number;
  unit_price: number;
  modifiers: string | null;
  special_instructions: string | null;
  status: string;
  product_name?: string;
}

export interface WaiterCall {
  id: number;
  session_id: number;
  table_id: number;
  call_type: 'assistance' | 'order' | 'bill' | 'other';
  message: string | null;
  status: 'pending' | 'responded';
  created_at: string;
  responded_at: string | null;
  table_number?: number;
  table_name?: string;
}

export interface BillRequest {
  id: number;
  session_id: number;
  table_id: number;
  request_type: 'full' | 'split';
  split_method: string | null;
  tip_percentage: number | null;
  tip_amount: number | null;
  status: 'pending' | 'processed';
  created_at: string;
  total_amount?: number;
  grand_total?: number;
  table_number?: number;
}

export interface MenuConfig {
  id: number;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  welcome_message: string;
  footer_message: string | null;
  show_prices: boolean;
  show_descriptions: boolean;
  show_images: boolean;
  show_allergens: boolean;
  show_calories: boolean;
  allow_ordering: boolean;
  allow_waiter_call: boolean;
  allow_bill_request: boolean;
  allow_tips: boolean;
  default_tip_percentages: number[];
  min_order_amount: number;
  languages: string[];
}

export interface QRDashboard {
  active_sessions: QRSession[];
  today_stats: {
    total_sessions: number;
    total_orders: number;
    total_revenue: number;
    qr_scans: number;
    waiter_calls: number;
    bill_requests: number;
  };
  pending_waiter_calls: WaiterCall[];
  pending_bill_requests: BillRequest[];
  top_products: {
    name: string;
    total_quantity: number;
    total_revenue: number;
  }[];
}

export interface QRAnalytics {
  period: { start: string; end: string };
  daily_trends: {
    date: string;
    sessions: number;
    orders: number;
    revenue: number;
  }[];
  avg_session_minutes: number;
  conversion_rate: string;
  avg_tip: {
    avg_tip_percentage: number | null;
    avg_tip_amount: number | null;
  };
  peak_hours: {
    hour: string;
    session_count: number;
  }[];
  event_breakdown: {
    event_type: string;
    count: number;
  }[];
}

export interface SplitBillSummary {
  session_total: number;
  guest_count: number;
  equal_split_amount: number;
  guests: (SessionGuest & { tax_amount: number; total: number })[];
  unassigned_items: QROrderItem[];
}

// ============================================
// SERVICIO DE QR CODES (Dashboard)
// ============================================

export const qrCodeService = {
  // Crear QR para una mesa
  createForTable: async (tableId: number): Promise<QRCode> => {
    const response = await api.post(`/qr-ordering/codes/table/${tableId}`);
    return response.data.qrCode;
  },

  // Obtener QR de una mesa
  getForTable: async (tableId: number): Promise<QRCode | null> => {
    try {
      const response = await api.get(`/qr-ordering/codes/table/${tableId}`);
      return response.data.qrCode;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  // Obtener todos los QRs activos
  getAllActive: async (): Promise<QRCode[]> => {
    const response = await api.get('/qr-ordering/codes');
    return response.data.qrCodes;
  },

  // Regenerar todos los QRs
  regenerateAll: async (): Promise<QRCode[]> => {
    const response = await api.post('/qr-ordering/codes/regenerate-all');
    return response.data.qrCodes;
  },

  // Generar URL de imagen QR
  getQRImageUrl: (code: string, size: number = 300): string => {
    const baseUrl = import.meta.env.VITE_QR_BASE_URL || 'https://menu.sysme.cl';
    const url = encodeURIComponent(`${baseUrl}/m/${code}`);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${url}`;
  }
};

// ============================================
// SERVICIO DE SESIONES (Público/Dashboard)
// ============================================

export const sessionService = {
  // Escanear QR (público)
  scan: async (code: string, options?: {
    guestCount?: number;
    language?: string;
    deviceInfo?: object;
  }): Promise<{
    session: {
      id: number;
      token: string;
      guest_token: string;
      is_new: boolean;
      table_number: number;
      table_name: string;
    };
    config: MenuConfig;
  }> => {
    const response = await api.post(`/qr-ordering/scan/${code}`, options);
    return response.data;
  },

  // Obtener sesión actual
  get: async (sessionToken: string): Promise<{
    session: QRSession;
    guests: SessionGuest[];
    orders: QROrder[];
  }> => {
    const response = await api.get(`/qr-ordering/session/${sessionToken}`);
    return response.data;
  },

  // Cerrar sesión (dashboard)
  close: async (sessionId: number): Promise<void> => {
    await api.post(`/qr-ordering/session/${sessionId}/close`);
  },

  // Obtener sesiones activas (dashboard)
  getActive: async (): Promise<QRSession[]> => {
    const response = await api.get('/qr-ordering/sessions/active');
    return response.data.sessions;
  }
};

// ============================================
// SERVICIO DE MENÚ DIGITAL (Público)
// ============================================

export const menuService = {
  // Obtener menú digital
  get: async (sessionToken: string, language?: string): Promise<{
    config: Partial<MenuConfig>;
    menu: MenuCategory[];
  }> => {
    const params = language ? { language } : {};
    const response = await api.get(`/qr-ordering/menu/${sessionToken}`, { params });
    return response.data;
  },

  // Obtener detalles de producto
  getProduct: async (productId: number): Promise<ProductDetails> => {
    const response = await api.get(`/qr-ordering/product/${productId}`);
    return response.data.product;
  }
};

// ============================================
// SERVICIO DE CARRITO (Público)
// ============================================

export const cartService = {
  // Obtener carrito
  get: async (sessionToken: string): Promise<Cart> => {
    const response = await api.get(`/qr-ordering/cart/${sessionToken}`);
    return response.data.cart;
  },

  // Agregar al carrito
  add: async (data: {
    sessionToken: string;
    guestToken: string;
    productId: number;
    quantity?: number;
    modifiers?: SelectedModifier[];
    specialInstructions?: string;
  }): Promise<Cart> => {
    const response = await api.post('/qr-ordering/cart/add', data);
    return response.data.cart;
  },

  // Actualizar cantidad
  updateItem: async (cartItemId: number, quantity: number, sessionToken: string): Promise<Cart> => {
    const response = await api.put(`/qr-ordering/cart/item/${cartItemId}`, {
      quantity,
      sessionToken
    });
    return response.data.cart;
  },

  // Eliminar del carrito
  removeItem: async (cartItemId: number, sessionToken: string): Promise<Cart> => {
    const response = await api.delete(`/qr-ordering/cart/item/${cartItemId}`, {
      data: { sessionToken }
    });
    return response.data.cart;
  },

  // Calcular totales
  calculateTotals: (items: CartItem[]): { subtotal: number; tax: number; total: number } => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const tax = Math.round(subtotal * 0.19);
    return { subtotal, tax, total: subtotal + tax };
  }
};

// ============================================
// SERVICIO DE PEDIDOS (Público/Dashboard)
// ============================================

export const orderService = {
  // Confirmar pedido (enviar a cocina)
  confirm: async (data: {
    sessionToken: string;
    guestToken?: string;
    notes?: string;
  }): Promise<{
    order: QROrder & { message: string };
  }> => {
    const response = await api.post('/qr-ordering/orders/confirm', data);
    return response.data;
  },

  // Obtener estado del pedido
  getStatus: async (orderId: number): Promise<QROrder> => {
    const response = await api.get(`/qr-ordering/orders/${orderId}/status`);
    return response.data.order;
  },

  // Obtener pedidos de la sesión
  getSessionOrders: async (sessionToken: string): Promise<QROrder[]> => {
    const response = await api.get(`/qr-ordering/orders/session/${sessionToken}`);
    return response.data.orders;
  }
};

// ============================================
// SERVICIO DE MESERO (Público/Dashboard)
// ============================================

export const waiterService = {
  // Llamar mesero (público)
  call: async (data: {
    sessionToken: string;
    callType?: 'assistance' | 'order' | 'bill' | 'other';
    message?: string;
  }): Promise<WaiterCall> => {
    const response = await api.post('/qr-ordering/waiter/call', data);
    return response.data.call;
  },

  // Obtener llamadas pendientes (dashboard)
  getPending: async (): Promise<WaiterCall[]> => {
    const response = await api.get('/qr-ordering/waiter/calls/pending');
    return response.data.calls;
  },

  // Responder llamada (dashboard)
  respond: async (callId: number): Promise<WaiterCall> => {
    const response = await api.post(`/qr-ordering/waiter/calls/${callId}/respond`);
    return response.data.call;
  }
};

// ============================================
// SERVICIO DE CUENTA (Público/Dashboard)
// ============================================

export const billService = {
  // Solicitar cuenta (público)
  request: async (data: {
    sessionToken: string;
    requestType?: 'full' | 'split';
    splitMethod?: string;
    tipPercentage?: number;
  }): Promise<BillRequest & { total_amount: number; grand_total: number }> => {
    const response = await api.post('/qr-ordering/bill/request', data);
    return response.data.billRequest;
  },

  // Obtener solicitudes pendientes (dashboard)
  getPending: async (): Promise<BillRequest[]> => {
    const response = await api.get('/qr-ordering/bill/requests/pending');
    return response.data.requests;
  },

  // Procesar solicitud (dashboard)
  process: async (requestId: number): Promise<void> => {
    await api.post(`/qr-ordering/bill/requests/${requestId}/process`);
  },

  // Calcular propina sugerida
  calculateTip: (amount: number, percentage: number): number => {
    return Math.round(amount * (percentage / 100));
  }
};

// ============================================
// SERVICIO DE SPLIT BILL (Público)
// ============================================

export const splitBillService = {
  // Obtener resumen
  getSummary: async (sessionToken: string): Promise<SplitBillSummary> => {
    const response = await api.get(`/qr-ordering/split/${sessionToken}`);
    return response.data;
  },

  // Asignar item a comensal
  assignItem: async (data: {
    orderItemId: number;
    guestId: number;
    sessionToken: string;
  }): Promise<void> => {
    await api.post('/qr-ordering/split/assign', data);
  }
};

// ============================================
// SERVICIO DE CONFIGURACIÓN (Dashboard)
// ============================================

export const configService = {
  // Obtener configuración
  get: async (): Promise<MenuConfig> => {
    const response = await api.get('/qr-ordering/config');
    return response.data.config;
  },

  // Actualizar configuración
  update: async (config: Partial<MenuConfig>): Promise<MenuConfig> => {
    const response = await api.put('/qr-ordering/config', config);
    return response.data.config;
  }
};

// ============================================
// SERVICIO DE DASHBOARD Y ANALYTICS
// ============================================

export const dashboardService = {
  // Obtener dashboard
  get: async (): Promise<QRDashboard> => {
    const response = await api.get('/qr-ordering/dashboard');
    return response.data;
  },

  // Obtener analytics
  getAnalytics: async (startDate?: string, endDate?: string): Promise<QRAnalytics> => {
    const params: Record<string, string> = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await api.get('/qr-ordering/analytics', { params });
    return response.data;
  }
};

// ============================================
// UTILIDADES
// ============================================

export const qrUtils = {
  // Formatear precio en CLP
  formatPrice: (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  },

  // Obtener estado en español
  getStatusLabel: (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      completed: 'Completado',
      cancelled: 'Cancelado',
      active: 'Activa',
      closed: 'Cerrada',
      responded: 'Atendido',
      processed: 'Procesado'
    };
    return labels[status] || status;
  },

  // Obtener color de estado
  getStatusColor: (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      confirmed: 'blue',
      preparing: 'orange',
      ready: 'green',
      completed: 'gray',
      cancelled: 'red',
      active: 'green',
      closed: 'gray'
    };
    return colors[status] || 'gray';
  },

  // Calcular tiempo transcurrido
  getElapsedTime: (startTime: string): string => {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h ${diffMins % 60}m`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  },

  // Validar carrito no vacío
  isCartEmpty: (cart: Cart): boolean => {
    return cart.items.length === 0;
  },

  // Obtener tip percentages por defecto
  getDefaultTipPercentages: (): number[] => {
    return [10, 15, 20];
  }
};

// ============================================
// WEBSOCKET EVENTS
// ============================================

export const qrSocketEvents = {
  // Eventos del cliente
  NEW_SESSION: 'qr:new_session',
  ORDER_CONFIRMED: 'qr:order_confirmed',
  WAITER_CALL: 'qr:waiter_call',
  BILL_REQUEST: 'qr:bill_request',
  SESSION_CLOSED: 'qr:session_closed',

  // Eventos dentro de sesión
  CART_UPDATED: 'cart:updated',
  ORDER_STATUS: 'order:status',
  WAITER_RESPONDING: 'waiter:responding',
  BILL_READY: 'bill:ready',
  SPLIT_UPDATED: 'split:updated'
};

// Export default con todos los servicios
export default {
  qrCode: qrCodeService,
  session: sessionService,
  menu: menuService,
  cart: cartService,
  order: orderService,
  waiter: waiterService,
  bill: billService,
  splitBill: splitBillService,
  config: configService,
  dashboard: dashboardService,
  utils: qrUtils,
  events: qrSocketEvents
};
