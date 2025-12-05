/**
 * Invoices Service - API calls for Invoice System
 * Manages invoice series, invoice generation, and invoice tracking
 */

import { api, ApiResponse, PaginatedResponse } from './client';

// Types
export interface InvoiceSeries {
  id: number;
  code: string;
  name: string;
  type: 'boleta' | 'factura' | 'nota_credito' | 'nota_debito';
  prefix: string;
  current_number: number;
  start_number: number;
  end_number: number;
  is_active: boolean;
  requires_customer: boolean;
  requires_tax_id: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  series_id: number;
  series_code: string;
  sale_id?: number;
  type: 'boleta' | 'factura' | 'nota_credito' | 'nota_debito';
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'refunded';
  issue_date: string;
  due_date?: string;

  // Customer data (immutable snapshot)
  customer_name?: string;
  customer_tax_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;

  // Amounts
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;

  // Additional info
  notes?: string;
  payment_method?: 'cash' | 'card' | 'transfer' | 'mixed' | 'other';
  reference_invoice_id?: number; // For credit/debit notes

  // Metadata
  user_id: number;
  issued_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount_amount: number;
  subtotal: number;
  total: number;
  notes?: string;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

export interface CreateInvoiceRequest {
  series_id: number;
  sale_id?: number;
  customer_name?: string;
  customer_tax_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  notes?: string;
  payment_method?: string;
  items: Array<{
    product_id?: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    tax_rate?: number;
    discount_amount?: number;
    notes?: string;
  }>;
}

export interface InvoiceFilters {
  type?: string;
  status?: string;
  series_id?: number;
  start_date?: string;
  end_date?: string;
  customer_name?: string;
  min_amount?: number;
  max_amount?: number;
  page?: number;
  limit?: number;
}

export interface InvoiceStats {
  total_invoices: number;
  total_amount: number;
  by_type: Record<string, { count: number; amount: number }>;
  by_status: Record<string, { count: number; amount: number }>;
  by_series: Record<string, { count: number; amount: number }>;
}

// Invoices Service API
export const invoicesService = {
  // Series Management
  /**
   * Get all invoice series
   */
  getAllSeries: async (): Promise<InvoiceSeries[]> => {
    const response = await api.get<ApiResponse<InvoiceSeries[]>>('/invoices/series');
    return response.data.data || [];
  },

  /**
   * Get active invoice series
   */
  getActiveSeries: async (type?: string): Promise<InvoiceSeries[]> => {
    const response = await api.get<ApiResponse<InvoiceSeries[]>>('/invoices/series/active', {
      params: { type }
    });
    return response.data.data || [];
  },

  /**
   * Create a new invoice series
   */
  createSeries: async (data: Omit<InvoiceSeries, 'id' | 'created_at' | 'updated_at'>): Promise<InvoiceSeries> => {
    const response = await api.post<ApiResponse<InvoiceSeries>>('/invoices/series', data);
    return response.data.data!;
  },

  /**
   * Update an invoice series
   */
  updateSeries: async (id: number, data: Partial<InvoiceSeries>): Promise<InvoiceSeries> => {
    const response = await api.put<ApiResponse<InvoiceSeries>>(`/invoices/series/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete an invoice series
   */
  deleteSeries: async (id: number): Promise<void> => {
    await api.delete(`/invoices/series/${id}`);
  },

  // Invoice Management
  /**
   * Get invoices with filters
   */
  getInvoices: async (filters?: InvoiceFilters): Promise<PaginatedResponse<Invoice>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Invoice>>>('/invoices', {
      params: filters
    });
    return response.data.data || { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  },

  /**
   * Get invoice by ID with items
   */
  getInvoiceById: async (id: number): Promise<InvoiceWithItems> => {
    const response = await api.get<ApiResponse<InvoiceWithItems>>(`/invoices/${id}`);
    return response.data.data!;
  },

  /**
   * Get invoice by number
   */
  getInvoiceByNumber: async (invoice_number: string): Promise<InvoiceWithItems> => {
    const response = await api.get<ApiResponse<InvoiceWithItems>>(`/invoices/number/${invoice_number}`);
    return response.data.data!;
  },

  /**
   * Create a new invoice
   */
  createInvoice: async (data: CreateInvoiceRequest): Promise<InvoiceWithItems> => {
    const response = await api.post<ApiResponse<InvoiceWithItems>>('/invoices', data);
    return response.data.data!;
  },

  /**
   * Issue a draft invoice
   */
  issueInvoice: async (id: number): Promise<Invoice> => {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/issue`);
    return response.data.data!;
  },

  /**
   * Cancel an invoice
   */
  cancelInvoice: async (id: number, reason: string): Promise<Invoice> => {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/cancel`, { reason });
    return response.data.data!;
  },

  /**
   * Mark invoice as paid
   */
  markAsPaid: async (id: number, payment_method: string): Promise<Invoice> => {
    const response = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/paid`, { payment_method });
    return response.data.data!;
  },

  /**
   * Create credit note from invoice
   */
  createCreditNote: async (invoice_id: number, items: number[], reason: string): Promise<InvoiceWithItems> => {
    const response = await api.post<ApiResponse<InvoiceWithItems>>(`/invoices/${invoice_id}/credit-note`, {
      items,
      reason
    });
    return response.data.data!;
  },

  /**
   * Create debit note from invoice
   */
  createDebitNote: async (invoice_id: number, items: number[], reason: string): Promise<InvoiceWithItems> => {
    const response = await api.post<ApiResponse<InvoiceWithItems>>(`/invoices/${invoice_id}/debit-note`, {
      items,
      reason
    });
    return response.data.data!;
  },

  /**
   * Get invoice statistics
   */
  getStats: async (start_date?: string, end_date?: string): Promise<InvoiceStats> => {
    const response = await api.get<ApiResponse<InvoiceStats>>('/invoices/stats', {
      params: { start_date, end_date }
    });
    return response.data.data!;
  },

  /**
   * Download invoice PDF
   */
  downloadPDF: async (id: number): Promise<void> => {
    const response = await api.get(`/invoices/${id}/pdf`, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Print invoice
   */
  printInvoice: async (id: number): Promise<void> => {
    const response = await api.get(`/invoices/${id}/print`, {
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
   * Send invoice by email
   */
  sendByEmail: async (id: number, email: string): Promise<void> => {
    await api.post(`/invoices/${id}/email`, { email });
  }
};

export default invoicesService;
