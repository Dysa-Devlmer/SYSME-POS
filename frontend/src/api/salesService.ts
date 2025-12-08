/**
 * Sales Service - API calls for Sales Management
 * Handles all sales operations including transfer, split, and payments
 */

import { api, ApiResponse } from './client';

export interface PaymentDetail {
  method: 'cash' | 'card' | 'transfer' | 'check' | 'other';
  amount: number;
}

export interface PaymentDetails {
  payments: PaymentDetail[];
  change?: number;
  total_paid?: number;
}

export interface Sale {
  id: number;
  sale_number: string;
  customer_id?: number;
  table_id?: number;
  table_number?: string;
  salon_id?: number;
  tarifa_id?: number;
  user_id: number;
  waiter_id?: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  payment_method: string;
  payment_details?: PaymentDetails;
  payment_status: 'pending' | 'paid' | 'refunded' | 'partial';
  status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  receipt_printed: boolean;
  kitchen_printed: boolean;
  created_at: string;
  updated_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
  modifiers?: Array<{
    modifier_id: number;
    modifier_name: string;
    unit_price: number;
    quantity: number;
  }>;
}

export const salesService = {
  /**
   * Get all sales
   */
  getAll: async (): Promise<Sale[]> => {
    const response = await api.get<ApiResponse<Sale[]>>('/sales');
    return response.data.data || [];
  },

  /**
   * Get a single sale by ID
   */
  getById: async (id: number): Promise<Sale> => {
    const response = await api.get<ApiResponse<Sale>>(`/sales/${id}`);
    return response.data.data!;
  },

  /**
   * Process a new sale (main POS function)
   */
  process: async (saleData: {
    table_id?: number;
    items: Array<{
      product_id: number;
      product_name: string;
      quantity: number;
      unit_price: number;
      total: number;
      modifiers?: any[];
      notes?: string;
    }>;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    payment_method: string;
    payment_details?: PaymentDetails;
    notes?: string;
  }): Promise<Sale> => {
    const response = await api.post<ApiResponse<Sale>>('/sales/process', saleData);
    return response.data.data!;
  },

  /**
   * Transfer sale to different table
   */
  transferTable: async (saleId: number, newTableId: number): Promise<Sale> => {
    const response = await api.post<ApiResponse<Sale>>('/sales/transfer-table', {
      sale_id: saleId,
      new_table_id: newTableId
    });
    return response.data.data!;
  },

  /**
   * Update a sale
   */
  update: async (id: number, data: Partial<Sale>): Promise<Sale> => {
    const response = await api.put<ApiResponse<Sale>>(`/sales/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete a sale
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/sales/${id}`);
  },

  /**
   * Get sales by date
   */
  getByDate: async (date: string): Promise<Sale[]> => {
    const response = await api.get<ApiResponse<Sale[]>>(`/sales/by-date/${date}`);
    return response.data.data || [];
  },

  /**
   * Get daily sales report
   */
  getDailyReport: async (): Promise<{
    total_sales: number;
    total_revenue: number;
    total_discounts: number;
    average_sale: number;
  }> => {
    const response = await api.get<ApiResponse<any>>('/sales/daily-report');
    return response.data.data!;
  },

  /**
   * Split sale (divide bill)
   */
  splitSale: async (saleId: number, splits: Array<{
    items?: number[];
    amount?: number;
    percentage?: number;
    payment_method: string;
    payment_details?: PaymentDetails;
  }>, splitMethod: 'items' | 'equal' | 'custom'): Promise<{
    original_sale_id: number;
    splits: Sale[];
  }> => {
    const response = await api.post<ApiResponse<any>>('/sales/split', {
      sale_id: saleId,
      splits,
      split_method: splitMethod
    });
    return response.data.data!;
  }
};

export default salesService;
