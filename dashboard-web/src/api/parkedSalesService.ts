/**
 * Parked Sales Service - API calls for Parked Sales Management
 * Manages sales that are temporarily parked and can be resumed later
 */

import { api, ApiResponse, PaginatedResponse } from './client';

// Types
export interface ParkedSale {
  id: number;
  park_number: string;
  original_sale_id?: number;
  table_id?: number;
  table_number?: string;
  status: 'parked' | 'resumed' | 'cancelled' | 'expired';

  // Customer info
  customer_name?: string;
  customer_notes?: string;

  // Sale data (snapshot)
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  items_count: number;

  // Parking metadata
  parked_by_user_id: number;
  parked_by_username?: string;
  resumed_by_user_id?: number;
  resumed_by_username?: string;
  cancelled_by_user_id?: number;
  reason?: string;

  // Timestamps
  parked_at: string;
  resumed_at?: string;
  cancelled_at?: string;
  expires_at?: string;

  created_at: string;
  updated_at: string;
}

export interface ParkedSaleItem {
  id: number;
  parked_sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_rate: number;
  discount_amount: number;
  total: number;
  modifiers?: string; // JSON string
  notes?: string;
}

export interface ParkedSaleWithItems extends ParkedSale {
  items: ParkedSaleItem[];
}

export interface CreateParkedSaleRequest {
  table_id?: number;
  customer_name?: string;
  customer_notes?: string;
  reason?: string;
  expires_at?: string;
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount_amount?: number;
    modifiers?: any;
    notes?: string;
  }>;
}

export interface ParkedSaleFilters {
  status?: string;
  table_id?: number;
  parked_by_user_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string; // Search by park_number, customer_name
  page?: number;
  limit?: number;
}

export interface ParkedSaleStats {
  total_parked: number;
  total_resumed: number;
  total_cancelled: number;
  total_expired: number;
  currently_parked: number;
  total_amount_parked: number;
  by_user: Array<{
    user_id: number;
    username: string;
    parked_count: number;
    resumed_count: number;
  }>;
  by_table: Array<{
    table_id: number;
    table_number: string;
    parked_count: number;
  }>;
}

export interface ResumeSaleResponse {
  sale_id: number;
  message: string;
}

// Parked Sales Service API
export const parkedSalesService = {
  // Parked Sales Management
  /**
   * Get parked sales with filters
   */
  getParkedSales: async (filters?: ParkedSaleFilters): Promise<PaginatedResponse<ParkedSale>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<ParkedSale>>>('/sales/parked', {
      params: filters
    });
    return response.data.data || {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false }
    };
  },

  /**
   * Get currently active parked sales
   */
  getActiveParkedSales: async (): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>('/sales/parked/active');
    return response.data.data || [];
  },

  /**
   * Get parked sale by ID with items
   */
  getParkedSaleById: async (id: number): Promise<ParkedSaleWithItems> => {
    const response = await api.get<ApiResponse<ParkedSaleWithItems>>(`/sales/parked/${id}`);
    return response.data.data!;
  },

  /**
   * Get parked sale by park number
   */
  getParkedSaleByNumber: async (park_number: string): Promise<ParkedSaleWithItems> => {
    const response = await api.get<ApiResponse<ParkedSaleWithItems>>(`/sales/parked/number/${park_number}`);
    return response.data.data!;
  },

  /**
   * Get parked sales for a specific table
   */
  getParkedSalesByTable: async (table_id: number): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>(`/sales/parked/table/${table_id}`);
    return response.data.data || [];
  },

  /**
   * Get parked sales by current user
   */
  getMyParkedSales: async (): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>('/sales/parked/my');
    return response.data.data || [];
  },

  /**
   * Park a new sale
   */
  parkSale: async (data: CreateParkedSaleRequest): Promise<ParkedSaleWithItems> => {
    const response = await api.post<ApiResponse<ParkedSaleWithItems>>('/sales/parked', data);
    return response.data.data!;
  },

  /**
   * Park an existing active sale
   */
  parkExistingSale: async (
    sale_id: number,
    reason?: string,
    expires_at?: string
  ): Promise<ParkedSaleWithItems> => {
    const response = await api.post<ApiResponse<ParkedSaleWithItems>>(`/sales/${sale_id}/park`, {
      reason,
      expires_at
    });
    return response.data.data!;
  },

  /**
   * Resume a parked sale
   */
  resumeSale: async (parked_sale_id: number): Promise<ResumeSaleResponse> => {
    const response = await api.post<ApiResponse<ResumeSaleResponse>>(
      `/sales/parked/${parked_sale_id}/resume`
    );
    return response.data.data!;
  },

  /**
   * Resume parked sale by park number
   */
  resumeSaleByNumber: async (park_number: string): Promise<ResumeSaleResponse> => {
    const response = await api.post<ApiResponse<ResumeSaleResponse>>(
      `/sales/parked/resume/${park_number}`
    );
    return response.data.data!;
  },

  /**
   * Cancel a parked sale
   */
  cancelParkedSale: async (parked_sale_id: number, reason: string): Promise<ParkedSale> => {
    const response = await api.post<ApiResponse<ParkedSale>>(
      `/sales/parked/${parked_sale_id}/cancel`,
      { reason }
    );
    return response.data.data!;
  },

  /**
   * Update parked sale details
   */
  updateParkedSale: async (
    parked_sale_id: number,
    data: {
      customer_name?: string;
      customer_notes?: string;
      expires_at?: string;
    }
  ): Promise<ParkedSale> => {
    const response = await api.put<ApiResponse<ParkedSale>>(
      `/sales/parked/${parked_sale_id}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Add item to parked sale
   */
  addItem: async (
    parked_sale_id: number,
    item: {
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      tax_rate?: number;
      discount_amount?: number;
      modifiers?: any;
      notes?: string;
    }
  ): Promise<ParkedSaleItem> => {
    const response = await api.post<ApiResponse<ParkedSaleItem>>(
      `/sales/parked/${parked_sale_id}/items`,
      item
    );
    return response.data.data!;
  },

  /**
   * Update item in parked sale
   */
  updateItem: async (
    parked_sale_id: number,
    item_id: number,
    data: Partial<ParkedSaleItem>
  ): Promise<ParkedSaleItem> => {
    const response = await api.put<ApiResponse<ParkedSaleItem>>(
      `/sales/parked/${parked_sale_id}/items/${item_id}`,
      data
    );
    return response.data.data!;
  },

  /**
   * Remove item from parked sale
   */
  removeItem: async (parked_sale_id: number, item_id: number): Promise<void> => {
    await api.delete(`/sales/parked/${parked_sale_id}/items/${item_id}`);
  },

  /**
   * Update item quantity
   */
  updateItemQuantity: async (
    parked_sale_id: number,
    item_id: number,
    quantity: number
  ): Promise<ParkedSaleItem> => {
    const response = await api.patch<ApiResponse<ParkedSaleItem>>(
      `/sales/parked/${parked_sale_id}/items/${item_id}/quantity`,
      { quantity }
    );
    return response.data.data!;
  },

  // Bulk Operations
  /**
   * Cancel multiple parked sales
   */
  bulkCancel: async (parked_sale_ids: number[], reason: string): Promise<{ cancelled_count: number }> => {
    const response = await api.post<ApiResponse<{ cancelled_count: number }>>(
      '/sales/parked/bulk/cancel',
      { parked_sale_ids, reason }
    );
    return response.data.data!;
  },

  /**
   * Clean expired parked sales
   */
  cleanExpired: async (): Promise<{ expired_count: number }> => {
    const response = await api.post<ApiResponse<{ expired_count: number }>>(
      '/sales/parked/cleanup/expired'
    );
    return response.data.data!;
  },

  /**
   * Auto-expire old parked sales
   */
  autoExpire: async (hours: number = 24): Promise<{ expired_count: number }> => {
    const response = await api.post<ApiResponse<{ expired_count: number }>>(
      '/sales/parked/auto-expire',
      { hours }
    );
    return response.data.data!;
  },

  // Statistics and Reports
  /**
   * Get parked sales statistics
   */
  getStats: async (start_date?: string, end_date?: string): Promise<ParkedSaleStats> => {
    const response = await api.get<ApiResponse<ParkedSaleStats>>('/sales/parked/stats', {
      params: { start_date, end_date }
    });
    return response.data.data!;
  },

  /**
   * Get parked sales summary by user
   */
  getStatsByUser: async (user_id?: number): Promise<{
    total_parked: number;
    total_resumed: number;
    total_cancelled: number;
    average_park_duration: number; // in minutes
  }> => {
    const response = await api.get<ApiResponse>('/sales/parked/stats/user', {
      params: { user_id }
    });
    return response.data.data!;
  },

  /**
   * Get oldest parked sales
   */
  getOldestParked: async (limit: number = 10): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>('/sales/parked/oldest', {
      params: { limit }
    });
    return response.data.data || [];
  },

  /**
   * Get soon-to-expire parked sales
   */
  getSoonToExpire: async (hours: number = 2): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>('/sales/parked/expiring-soon', {
      params: { hours }
    });
    return response.data.data || [];
  },

  // Search and Filter Helpers
  /**
   * Search parked sales
   */
  search: async (query: string, status?: string): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>('/sales/parked/search', {
      params: { query, status }
    });
    return response.data.data || [];
  },

  /**
   * Quick search by park number or customer
   */
  quickSearch: async (query: string): Promise<ParkedSale[]> => {
    const response = await api.get<ApiResponse<ParkedSale[]>>('/sales/parked/quick-search', {
      params: { q: query }
    });
    return response.data.data || [];
  },

  // Print and Export
  /**
   * Print parked sale receipt
   */
  printReceipt: async (parked_sale_id: number): Promise<void> => {
    const response = await api.get(`/sales/parked/${parked_sale_id}/print`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        window.URL.revokeObjectURL(url);
      };
    }
  },

  /**
   * Download parked sales report
   */
  downloadReport: async (
    filters?: ParkedSaleFilters,
    format: 'excel' | 'pdf' | 'csv' = 'excel'
  ): Promise<void> => {
    const response = await api.get('/sales/parked/report/download', {
      params: { ...filters, format },
      responseType: 'blob'
    });

    const extensions = { excel: 'xlsx', pdf: 'pdf', csv: 'csv' };
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `parked-sales-report-${Date.now()}.${extensions[format]}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};

export default parkedSalesService;
