// =====================================================
// Analytics Service
// =====================================================
import { api } from './client';

export interface DashboardData {
  date: string;
  summary: {
    order_count: number;
    total_sales: number;
    subtotal: number;
    tax: number;
    tips: number;
    avg_order_value: number;
  };
  orders_by_status: Array<{
    status: string;
    count: number;
  }>;
  orders_by_type: Array<{
    order_type: string;
    count: number;
    total: number;
  }>;
  top_products: Array<{
    name: string;
    quantity_sold: number;
    revenue: number;
  }>;
  hourly_sales: Array<{
    hour: number;
    order_count: number;
    total_sales: number;
  }>;
}

export const analyticsService = {
  /**
   * Get dashboard overview
   */
  getDashboard: async (params?: {
    location_id?: number;
    date?: string;
  }) => {
    const response = await api.get<{ data: DashboardData }>('/analytics/dashboard', { params });
    return response.data;
  },

  /**
   * Get sales summary
   */
  getSalesSummary: async (params: {
    start_date: string;
    end_date: string;
    location_id?: number;
    group_by?: 'hour' | 'day' | 'week' | 'month';
  }) => {
    const response = await api.get('/analytics/sales-summary', { params });
    return response.data;
  },

  /**
   * Get product performance
   */
  getProductPerformance: async (params: {
    start_date: string;
    end_date: string;
    location_id?: number;
    category_id?: number;
    limit?: number;
  }) => {
    const response = await api.get('/analytics/products', { params });
    return response.data;
  },

  /**
   * Get category performance
   */
  getCategoryPerformance: async (params: {
    start_date: string;
    end_date: string;
    location_id?: number;
  }) => {
    const response = await api.get('/analytics/categories', { params });
    return response.data;
  },

  /**
   * Get employee performance
   */
  getEmployeePerformance: async (params: {
    start_date: string;
    end_date: string;
    location_id?: number;
  }) => {
    const response = await api.get('/analytics/employees', { params });
    return response.data;
  },

  /**
   * Get hourly analytics
   */
  getHourlyAnalytics: async (params: {
    start_date: string;
    end_date: string;
    location_id?: number;
  }) => {
    const response = await api.get('/analytics/hourly', { params });
    return response.data;
  },

  /**
   * Get customer analytics
   */
  getCustomerAnalytics: async (params?: {
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.get('/analytics/customers', { params });
    return response.data;
  },

  /**
   * Get payment methods analytics
   */
  getPaymentAnalytics: async (params: {
    start_date: string;
    end_date: string;
    location_id?: number;
  }) => {
    const response = await api.get('/analytics/payment-methods', { params });
    return response.data;
  },

  /**
   * Get inventory analytics
   */
  getInventoryAnalytics: async (params?: {
    location_id?: number;
  }) => {
    const response = await api.get('/analytics/inventory', { params });
    return response.data;
  },

  /**
   * Export report
   */
  exportReport: async (data: {
    report_type: 'sales' | 'products' | 'employees';
    start_date: string;
    end_date: string;
    location_id?: number;
    format?: 'json' | 'csv' | 'excel';
  }) => {
    const response = await api.post('/analytics/export', data);
    return response.data;
  },
};

export default analyticsService;
