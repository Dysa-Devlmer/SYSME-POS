// =====================================================
// Inventory Service
// =====================================================
import { api } from './client';

export interface InventoryItem {
  id: number;
  product_id: number;
  location_id: number;
  quantity_on_hand: number;
  available_quantity: number;
  reserved_quantity: number;
  product_name: string;
  location_name: string;
  stock_status: 'low' | 'normal' | 'overstocked';
}

export interface Transfer {
  id: number;
  from_location_id: number;
  to_location_id: number;
  product_id: number;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  product_name?: string;
  from_location_name?: string;
  to_location_name?: string;
}

export interface PurchaseOrder {
  id: number;
  supplier_id: number;
  location_id: number;
  po_number: string;
  status: 'draft' | 'approved' | 'partial' | 'completed';
  total_amount: number;
  supplier_name?: string;
  location_name?: string;
  item_count?: number;
}

export const inventoryService = {
  /**
   * Get inventory list
   */
  getInventory: async (params?: {
    location_id?: number;
    product_id?: number;
    low_stock?: boolean;
  }) => {
    const response = await api.get('/inventory/inventory', { params });
    return response.data;
  },

  /**
   * Get product inventory
   */
  getProductInventory: async (productId: number) => {
    const response = await api.get(`/inventory/inventory/${productId}`);
    return response.data;
  },

  /**
   * Update inventory
   */
  updateInventory: async (id: number, data: {
    quantity_change: number;
    reason: string;
    notes?: string;
  }) => {
    const response = await api.put(`/inventory/inventory/${id}`, data);
    return response.data;
  },

  /**
   * Get transfers
   */
  getTransfers: async (params?: {
    status?: string;
    location_id?: number;
  }) => {
    const response = await api.get('/inventory/transfers', { params });
    return response.data;
  },

  /**
   * Create transfer
   */
  createTransfer: async (data: {
    from_location_id: number;
    to_location_id: number;
    product_id: number;
    quantity: number;
    notes?: string;
  }) => {
    const response = await api.post('/inventory/transfers', data);
    return response.data;
  },

  /**
   * Receive transfer
   */
  receiveTransfer: async (id: number, data: {
    received_quantity?: number;
    notes?: string;
  }) => {
    const response = await api.post(`/inventory/transfers/${id}/receive`, data);
    return response.data;
  },

  /**
   * Get purchase orders
   */
  getPurchaseOrders: async (params?: {
    status?: string;
    supplier_id?: number;
  }) => {
    const response = await api.get('/inventory/purchase-orders', { params });
    return response.data;
  },

  /**
   * Create purchase order
   */
  createPurchaseOrder: async (data: {
    supplier_id: number;
    location_id: number;
    items: Array<{
      product_id: number;
      quantity: number;
      unit_price: number;
    }>;
    notes?: string;
    expected_delivery_date?: string;
  }) => {
    const response = await api.post('/inventory/purchase-orders', data);
    return response.data;
  },

  /**
   * Receive purchase order
   */
  receivePurchaseOrder: async (id: number, data: {
    items: Array<{
      product_id: number;
      received_quantity: number;
    }>;
    notes?: string;
  }) => {
    const response = await api.post(`/inventory/purchase-orders/${id}/receive`, data);
    return response.data;
  },

  /**
   * Start stock count
   */
  startStockCount: async (data: {
    location_id: number;
    notes?: string;
  }) => {
    const response = await api.post('/inventory/stock-counts', data);
    return response.data;
  },
};

export default inventoryService;
