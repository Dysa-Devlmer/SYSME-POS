/**
 * Suppliers Service
 * Handles all API calls related to suppliers, purchase orders, and payments
 */

import api from '../api/client';

// ============================================
// INTERFACES
// ============================================

export interface Supplier {
  id: number;
  supplier_code: string;
  business_name: string;
  trade_name?: string;
  tax_id?: string;

  // Contact
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  website?: string;

  // Address
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Business
  category?: 'food' | 'beverages' | 'supplies' | 'equipment' | 'services';
  payment_terms?: number;
  credit_limit?: number;
  tax_withholding_percentage?: number;

  // Banking
  bank_name?: string;
  bank_account?: string;
  account_type?: string;

  // Status & Metrics
  is_active: boolean;
  preferred: boolean;
  rating?: number;
  total_purchases?: number;
  total_paid?: number;
  current_balance?: number;
  last_purchase_date?: string;

  // Notes
  notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  created_by?: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  warehouse_id?: number;

  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;

  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';

  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_cost: number;
  other_costs: number;
  total_amount: number;

  payment_status: 'pending' | 'partial' | 'paid';
  paid_amount: number;
  balance_due: number;

  reference_number?: string;
  delivery_address?: string;
  shipping_method?: string;
  notes?: string;
  terms_and_conditions?: string;

  received_by?: number;
  received_date?: string;
  reception_notes?: string;

  approved_by?: number;
  approved_date?: string;

  created_at: string;
  updated_at: string;
  created_by?: number;

  // Populated fields
  supplier_name?: string;
  supplier_code?: string;
  supplier_email?: string;
  supplier_phone?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  purchase_order_id?: number;
  product_id: number;

  quantity_ordered: number;
  unit_price: number;
  tax_rate?: number;
  discount_percentage?: number;

  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  total?: number;

  quantity_received?: number;
  quantity_pending?: number;
  quantity_accepted?: number;
  quantity_rejected?: number;
  rejection_reason?: string;

  notes?: string;

  // Populated fields
  product_name?: string;
  sku?: string;
  product_unit?: string;
}

export interface SupplierPayment {
  id?: number;
  payment_number: string;
  supplier_id: number;
  purchase_order_id?: number;

  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'transfer' | 'check' | 'card' | 'credit';

  reference_number?: string;
  bank_name?: string;
  account_number?: string;

  status: 'pending' | 'completed' | 'cancelled' | 'rejected';

  notes?: string;
  attachment_url?: string;

  created_at?: string;
  updated_at?: string;
  created_by?: number;

  // Populated fields
  supplier_name?: string;
  po_number?: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  items: PurchaseOrderItem[];
}

export interface SupplierWithDetails extends Supplier {
  recent_orders: PurchaseOrder[];
  recent_payments: SupplierPayment[];
}

export interface CreateSupplierData {
  business_name: string;
  trade_name?: string;
  tax_id?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  category?: string;
  payment_terms?: number;
  credit_limit?: number;
  notes?: string;
}

export interface CreatePurchaseOrderData {
  supplier_id: number;
  warehouse_id?: number;
  order_date: string;
  expected_delivery_date?: string;
  items: PurchaseOrderItem[];
  shipping_cost?: number;
  other_costs?: number;
  notes?: string;
}

export interface ReceivePurchaseOrderData {
  items: {
    id: number;
    product_id: number;
    quantity_received: number;
    quantity_accepted?: number;
    quantity_rejected?: number;
    rejection_reason?: string;
  }[];
  reception_notes?: string;
}

export interface SupplierStats {
  summary: {
    total_suppliers: number;
    active_suppliers: number;
    total_purchases: number;
    total_paid: number;
    total_owed: number;
  };
  top_suppliers: {
    business_name: string;
    total_purchases: number;
    current_balance: number;
  }[];
}

// ============================================
// API SERVICE
// ============================================

const suppliersService = {
  // Suppliers
  suppliers: {
    getAll: async (params?: {
      category?: string;
      is_active?: boolean;
      search?: string;
    }): Promise<Supplier[]> => {
      const response = await api.get('/suppliers/suppliers', { params });
      return response.data.data;
    },

    getById: async (id: number): Promise<SupplierWithDetails> => {
      const response = await api.get(`/suppliers/suppliers/${id}`);
      return response.data.data;
    },

    create: async (data: CreateSupplierData): Promise<Supplier> => {
      const response = await api.post('/suppliers/suppliers', data);
      return response.data.data;
    },

    update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
      const response = await api.put(`/suppliers/suppliers/${id}`, data);
      return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
      await api.delete(`/suppliers/suppliers/${id}`);
    }
  },

  // Purchase Orders
  purchaseOrders: {
    getAll: async (params?: {
      status?: string;
      payment_status?: string;
      supplier_id?: number;
      start_date?: string;
      end_date?: string;
    }): Promise<PurchaseOrder[]> => {
      const response = await api.get('/suppliers/purchase-orders', { params });
      return response.data.data;
    },

    getById: async (id: number): Promise<PurchaseOrderWithItems> => {
      const response = await api.get(`/suppliers/purchase-orders/${id}`);
      return response.data.data;
    },

    create: async (data: CreatePurchaseOrderData): Promise<PurchaseOrderWithItems> => {
      const response = await api.post('/suppliers/purchase-orders', data);
      return response.data.data;
    },

    update: async (id: number, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
      const response = await api.put(`/suppliers/purchase-orders/${id}`, data);
      return response.data.data;
    },

    approve: async (id: number): Promise<PurchaseOrder> => {
      const response = await api.post(`/suppliers/purchase-orders/${id}/approve`);
      return response.data.data;
    },

    receive: async (id: number, data: ReceivePurchaseOrderData): Promise<PurchaseOrder> => {
      const response = await api.post(`/suppliers/purchase-orders/${id}/receive`, data);
      return response.data.data;
    }
  },

  // Payments
  payments: {
    getAll: async (params?: {
      supplier_id?: number;
      start_date?: string;
      end_date?: string;
      status?: string;
    }): Promise<SupplierPayment[]> => {
      const response = await api.get('/suppliers/payments', { params });
      return response.data.data;
    },

    create: async (data: Omit<SupplierPayment, 'id' | 'payment_number' | 'created_at' | 'updated_at'>): Promise<SupplierPayment> => {
      const response = await api.post('/suppliers/payments', data);
      return response.data.data;
    }
  },

  // Reports
  stats: {
    get: async (): Promise<SupplierStats> => {
      const response = await api.get('/suppliers/stats');
      return response.data.data;
    }
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const supplierUtils = {
  /**
   * Get status badge color for PO
   */
  getPOStatusColor: (status: PurchaseOrder['status']): string => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      received: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get status text for PO
   */
  getPOStatusText: (status: PurchaseOrder['status']): string => {
    const texts = {
      draft: 'Borrador',
      sent: 'Enviado',
      confirmed: 'Confirmado',
      partial: 'Parcial',
      received: 'Recibido',
      cancelled: 'Cancelado'
    };
    return texts[status] || status;
  },

  /**
   * Get payment status color
   */
  getPaymentStatusColor: (status: PurchaseOrder['payment_status']): string => {
    const colors = {
      pending: 'bg-red-100 text-red-800',
      partial: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get payment status text
   */
  getPaymentStatusText: (status: PurchaseOrder['payment_status']): string => {
    const texts = {
      pending: 'Pendiente',
      partial: 'Parcial',
      paid: 'Pagado'
    };
    return texts[status] || status;
  },

  /**
   * Format currency (Chilean Peso)
   */
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  },

  /**
   * Format date
   */
  formatDate: (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Get category icon
   */
  getCategoryIcon: (category?: string): string => {
    const icons: Record<string, string> = {
      food: '🍕',
      beverages: '🥤',
      supplies: '📦',
      equipment: '🔧',
      services: '🛠️'
    };
    return icons[category || ''] || '📦';
  },

  /**
   * Calculate PO completion percentage
   */
  calculateCompletionPercentage: (items: PurchaseOrderItem[]): number => {
    if (!items || items.length === 0) return 0;

    const totalOrdered = items.reduce((sum, item) => sum + item.quantity_ordered, 0);
    const totalReceived = items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);

    return totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;
  },

  /**
   * Validate Chilean RUT
   */
  validateRUT: (rut: string): boolean => {
    if (!rut) return true; // Optional field
    const cleanRUT = rut.replace(/[^0-9kK]/g, '');
    if (cleanRUT.length < 2) return false;

    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1).toUpperCase();

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const actualDV = expectedDV === 11 ? '0' : expectedDV === 10 ? 'K' : expectedDV.toString();

    return dv === actualDV;
  },

  /**
   * Format RUT
   */
  formatRUT: (rut: string): string => {
    if (!rut) return '';
    const cleanRUT = rut.replace(/[^0-9kK]/g, '');
    if (cleanRUT.length < 2) return cleanRUT;

    const body = cleanRUT.slice(0, -1);
    const dv = cleanRUT.slice(-1);

    // Format: XX.XXX.XXX-X
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedBody}-${dv}`;
  }
};

export default suppliersService;
