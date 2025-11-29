/**
 * Warehouses Service - API calls for Warehouse Management System
 * Manages warehouses, stock, transfers, and inventory movements
 */

import { api, ApiResponse, PaginatedResponse } from './client';

// Types
export interface Warehouse {
  id: number;
  code: string;
  name: string;
  type: 'main' | 'kitchen' | 'bar' | 'secondary' | 'external';
  location?: string;
  is_active: boolean;
  allow_negative_stock: boolean;
  manager_user_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WarehouseStock {
  id: number;
  warehouse_id: number;
  product_id: number;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  min_stock?: number;
  max_stock?: number;
  reorder_point?: number;
  last_movement_at?: string;
  updated_at: string;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  from_warehouse_id: number;
  to_warehouse_id: number;
  status: 'pending' | 'in_transit' | 'completed' | 'cancelled' | 'rejected';
  requested_by_user_id: number;
  approved_by_user_id?: number;
  completed_by_user_id?: number;
  requested_at: string;
  approved_at?: string;
  shipped_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  notes?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TransferItem {
  id: number;
  transfer_id: number;
  product_id: number;
  product_name?: string;
  quantity_requested: number;
  quantity_shipped?: number;
  quantity_received?: number;
  notes?: string;
}

export interface StockTransferWithItems extends StockTransfer {
  items: TransferItem[];
  from_warehouse?: Warehouse;
  to_warehouse?: Warehouse;
}

export interface InventoryMovement {
  id: number;
  warehouse_id: number;
  product_id: number;
  movement_type: 'in' | 'out' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'sale' | 'purchase' | 'return';
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id?: number;
  reference_type?: string;
  reason?: string;
  user_id: number;
  created_at: string;
}

export interface StockAlert {
  warehouse_id: number;
  warehouse_name: string;
  product_id: number;
  product_name: string;
  current_stock: number;
  min_stock: number;
  reorder_point?: number;
  alert_type: 'low_stock' | 'out_of_stock' | 'reorder_needed';
}

export interface CreateTransferRequest {
  from_warehouse_id: number;
  to_warehouse_id: number;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity_requested: number;
    notes?: string;
  }>;
}

export interface WarehouseFilters {
  type?: string;
  is_active?: boolean;
  search?: string;
}

export interface TransferFilters {
  status?: string;
  from_warehouse_id?: number;
  to_warehouse_id?: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface MovementFilters {
  warehouse_id?: number;
  product_id?: number;
  movement_type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

// Warehouses Service API
export const warehousesService = {
  // Warehouse Management
  /**
   * Get all warehouses
   */
  getAllWarehouses: async (filters?: WarehouseFilters): Promise<Warehouse[]> => {
    const response = await api.get<ApiResponse<Warehouse[]>>('/warehouses', {
      params: filters
    });
    return response.data.data || [];
  },

  /**
   * Get active warehouses
   */
  getActiveWarehouses: async (): Promise<Warehouse[]> => {
    const response = await api.get<ApiResponse<Warehouse[]>>('/warehouses/active');
    return response.data.data || [];
  },

  /**
   * Get warehouse by ID
   */
  getWarehouseById: async (id: number): Promise<Warehouse> => {
    const response = await api.get<ApiResponse<Warehouse>>(`/warehouses/${id}`);
    return response.data.data!;
  },

  /**
   * Create a new warehouse
   */
  createWarehouse: async (data: Omit<Warehouse, 'id' | 'created_at' | 'updated_at'>): Promise<Warehouse> => {
    const response = await api.post<ApiResponse<Warehouse>>('/warehouses', data);
    return response.data.data!;
  },

  /**
   * Update a warehouse
   */
  updateWarehouse: async (id: number, data: Partial<Warehouse>): Promise<Warehouse> => {
    const response = await api.put<ApiResponse<Warehouse>>(`/warehouses/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete a warehouse
   */
  deleteWarehouse: async (id: number): Promise<void> => {
    await api.delete(`/warehouses/${id}`);
  },

  // Stock Management
  /**
   * Get stock levels for a warehouse
   */
  getWarehouseStock: async (warehouse_id: number, search?: string): Promise<WarehouseStock[]> => {
    const response = await api.get<ApiResponse<WarehouseStock[]>>(`/warehouses/${warehouse_id}/stock`, {
      params: { search }
    });
    return response.data.data || [];
  },

  /**
   * Get stock level for a specific product in a warehouse
   */
  getProductStock: async (warehouse_id: number, product_id: number): Promise<WarehouseStock> => {
    const response = await api.get<ApiResponse<WarehouseStock>>(`/warehouses/${warehouse_id}/stock/${product_id}`);
    return response.data.data!;
  },

  /**
   * Get stock across all warehouses for a product
   */
  getProductStockAll: async (product_id: number): Promise<WarehouseStock[]> => {
    const response = await api.get<ApiResponse<WarehouseStock[]>>(`/warehouses/stock/product/${product_id}`);
    return response.data.data || [];
  },

  /**
   * Update stock levels (manual adjustment)
   */
  adjustStock: async (
    warehouse_id: number,
    product_id: number,
    quantity: number,
    reason: string
  ): Promise<WarehouseStock> => {
    const response = await api.post<ApiResponse<WarehouseStock>>(`/warehouses/${warehouse_id}/stock/adjust`, {
      product_id,
      quantity,
      reason
    });
    return response.data.data!;
  },

  /**
   * Set stock alert levels
   */
  setStockLevels: async (
    warehouse_id: number,
    product_id: number,
    levels: {
      min_stock?: number;
      max_stock?: number;
      reorder_point?: number;
    }
  ): Promise<WarehouseStock> => {
    const response = await api.put<ApiResponse<WarehouseStock>>(
      `/warehouses/${warehouse_id}/stock/${product_id}/levels`,
      levels
    );
    return response.data.data!;
  },

  /**
   * Get stock alerts (low stock, out of stock)
   */
  getStockAlerts: async (warehouse_id?: number): Promise<StockAlert[]> => {
    const response = await api.get<ApiResponse<StockAlert[]>>('/warehouses/stock/alerts', {
      params: { warehouse_id }
    });
    return response.data.data || [];
  },

  // Transfer Management
  /**
   * Get transfers with filters
   */
  getTransfers: async (filters?: TransferFilters): Promise<PaginatedResponse<StockTransfer>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<StockTransfer>>>('/warehouses/transfers', {
      params: filters
    });
    return response.data.data || { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  },

  /**
   * Get transfer by ID with items
   */
  getTransferById: async (id: number): Promise<StockTransferWithItems> => {
    const response = await api.get<ApiResponse<StockTransferWithItems>>(`/warehouses/transfers/${id}`);
    return response.data.data!;
  },

  /**
   * Create a new transfer
   */
  createTransfer: async (data: CreateTransferRequest): Promise<StockTransferWithItems> => {
    const response = await api.post<ApiResponse<StockTransferWithItems>>('/warehouses/transfers', data);
    return response.data.data!;
  },

  /**
   * Approve a transfer
   */
  approveTransfer: async (id: number): Promise<StockTransfer> => {
    const response = await api.post<ApiResponse<StockTransfer>>(`/warehouses/transfers/${id}/approve`);
    return response.data.data!;
  },

  /**
   * Ship a transfer (mark as in transit)
   */
  shipTransfer: async (id: number, items?: Array<{ id: number; quantity_shipped: number }>): Promise<StockTransfer> => {
    const response = await api.post<ApiResponse<StockTransfer>>(`/warehouses/transfers/${id}/ship`, { items });
    return response.data.data!;
  },

  /**
   * Complete a transfer (receive items)
   */
  completeTransfer: async (id: number, items?: Array<{ id: number; quantity_received: number }>): Promise<StockTransfer> => {
    const response = await api.post<ApiResponse<StockTransfer>>(`/warehouses/transfers/${id}/complete`, { items });
    return response.data.data!;
  },

  /**
   * Cancel a transfer
   */
  cancelTransfer: async (id: number, reason: string): Promise<StockTransfer> => {
    const response = await api.post<ApiResponse<StockTransfer>>(`/warehouses/transfers/${id}/cancel`, { reason });
    return response.data.data!;
  },

  /**
   * Reject a transfer
   */
  rejectTransfer: async (id: number, reason: string): Promise<StockTransfer> => {
    const response = await api.post<ApiResponse<StockTransfer>>(`/warehouses/transfers/${id}/reject`, { reason });
    return response.data.data!;
  },

  // Inventory Movements
  /**
   * Get inventory movements history
   */
  getMovements: async (filters?: MovementFilters): Promise<PaginatedResponse<InventoryMovement>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<InventoryMovement>>>('/warehouses/movements', {
      params: filters
    });
    return response.data.data || { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  },

  /**
   * Get movements for a specific product
   */
  getProductMovements: async (product_id: number, warehouse_id?: number): Promise<InventoryMovement[]> => {
    const response = await api.get<ApiResponse<InventoryMovement[]>>(`/warehouses/movements/product/${product_id}`, {
      params: { warehouse_id }
    });
    return response.data.data || [];
  },

  // Reports
  /**
   * Get warehouse stock report
   */
  getStockReport: async (warehouse_id?: number): Promise<any> => {
    const response = await api.get<ApiResponse>('/warehouses/reports/stock', {
      params: { warehouse_id }
    });
    return response.data.data;
  },

  /**
   * Get transfers report
   */
  getTransfersReport: async (start_date?: string, end_date?: string): Promise<any> => {
    const response = await api.get<ApiResponse>('/warehouses/reports/transfers', {
      params: { start_date, end_date }
    });
    return response.data.data;
  },

  /**
   * Download stock report (Excel/PDF)
   */
  downloadStockReport: async (warehouse_id?: number, format: 'excel' | 'pdf' = 'excel'): Promise<void> => {
    const response = await api.get(`/warehouses/reports/stock/download`, {
      params: { warehouse_id, format },
      responseType: 'blob'
    });

    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-report-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default warehousesService;
