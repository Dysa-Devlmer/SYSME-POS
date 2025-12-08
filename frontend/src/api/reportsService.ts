/**
 * Reports Service - API calls for Reports System
 * Handles sales reports, inventory reports, performance analytics, and exports
 */

import { api, ApiResponse } from './client';

// ============================================
// TYPES
// ============================================

// Sales Report Types
export interface SalesSummary {
  total_sales: number;
  total_revenue: number;
  total_subtotal: number;
  total_discounts: number;
  average_sale: number;
  min_sale: number;
  max_sale: number;
}

export interface SalesByPeriod {
  period: string;
  sales_count: number;
  revenue: number;
  average_sale: number;
}

export interface SalesReportData {
  summary: SalesSummary;
  by_period: SalesByPeriod[];
}

// Inventory Report Types
export interface InventorySummary {
  total_products: number;
  total_stock: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

export interface InventoryByCategory {
  category_name: string;
  product_count: number;
  total_stock: number;
  total_value: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
  category_name: string;
}

export interface InventoryReportData {
  summary: InventorySummary;
  by_category: InventoryByCategory[];
  low_stock_items: LowStockItem[];
}

// Product Performance Types
export interface ProductPerformance {
  id: number;
  name: string;
  sku: string;
  units_sold: number;
  total_revenue: number;
  average_price: number;
  number_of_sales: number;
}

// Category Performance Types
export interface CategoryPerformance {
  id: number;
  name: string;
  products_count: number;
  units_sold: number;
  total_revenue: number;
  average_price: number;
}

// Payment Methods Report Types
export interface PaymentMethodReport {
  payment_method: string;
  transaction_count: number;
  total_amount: number;
  average_transaction: number;
  min_transaction: number;
  max_transaction: number;
}

// Hourly Sales Types
export interface HourlySales {
  hour: string;
  sales_count: number;
  revenue: number;
  average_sale: number;
}

// Cash Session Report Types
export interface CashSession {
  id: number;
  user_id: number;
  username: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number;
  actual_amount: number | null;
  difference: number;
  notes: string | null;
  status: 'open' | 'closed';
  total_sales: number;
  sales_total: number;
}

export interface CashSessionsSummary {
  total_sessions: number;
  open_sessions: number;
  closed_sessions: number;
  total_opening_amount: number;
  total_closing_amount: number;
  total_sales: number;
  total_difference: number;
}

export interface CashSessionsReportData {
  summary: CashSessionsSummary;
  sessions: CashSession[];
}

// Waiter Performance Types
export interface WaiterPerformance {
  id: number;
  username: string;
  full_name: string;
  total_sales: number;
  total_revenue: number;
  average_sale: number;
  total_tips: number;
  average_tip: number;
}

// Request Params Types
export interface SalesReportParams {
  start_date: string;
  end_date: string;
  group_by?: 'hour' | 'day' | 'month';
}

export interface ProductPerformanceParams {
  start_date: string;
  end_date: string;
  limit?: number;
}

export interface HourlySalesParams {
  date: string;
}

export interface CustomReportParams {
  query: string;
  params?: any[];
}

// ============================================
// SALES REPORTS SERVICE
// ============================================

export const salesReportsService = {
  /**
   * Get sales report with summary and period breakdown
   */
  getSalesReport: async (params: SalesReportParams): Promise<SalesReportData> => {
    const response = await api.get<ApiResponse<SalesReportData>>('/reports/sales', { params });
    return response.data.data!;
  },

  /**
   * Get hourly sales report for a specific date
   */
  getHourlySales: async (params: HourlySalesParams): Promise<HourlySales[]> => {
    const response = await api.get<ApiResponse<HourlySales[]>>('/reports/hourly-sales', { params });
    return response.data.data!;
  },

  /**
   * Get payment methods breakdown
   */
  getPaymentMethods: async (params: Omit<SalesReportParams, 'group_by'>): Promise<PaymentMethodReport[]> => {
    const response = await api.get<ApiResponse<PaymentMethodReport[]>>('/reports/payment-methods', { params });
    return response.data.data!;
  }
};

// ============================================
// INVENTORY REPORTS SERVICE
// ============================================

export const inventoryReportsService = {
  /**
   * Get inventory report with summary and breakdowns
   */
  getInventoryReport: async (): Promise<InventoryReportData> => {
    const response = await api.get<ApiResponse<InventoryReportData>>('/reports/inventory');
    return response.data.data!;
  }
};

// ============================================
// PERFORMANCE REPORTS SERVICE
// ============================================

export const performanceReportsService = {
  /**
   * Get product performance report
   */
  getProductPerformance: async (params: ProductPerformanceParams): Promise<ProductPerformance[]> => {
    const response = await api.get<ApiResponse<ProductPerformance[]>>('/reports/product-performance', { params });
    return response.data.data!;
  },

  /**
   * Get category performance report
   */
  getCategoryPerformance: async (params: Omit<ProductPerformanceParams, 'limit'>): Promise<CategoryPerformance[]> => {
    const response = await api.get<ApiResponse<CategoryPerformance[]>>('/reports/category-performance', { params });
    return response.data.data!;
  }
};

// ============================================
// CASH SESSIONS REPORTS SERVICE
// ============================================

export const cashSessionsReportsService = {
  /**
   * Get cash sessions report with summary
   */
  getCashSessionsReport: async (params?: Omit<SalesReportParams, 'group_by'>): Promise<CashSessionsReportData> => {
    const response = await api.get<ApiResponse<CashSessionsReportData>>('/reports/cash-sessions', { params });
    return response.data.data!;
  }
};

// ============================================
// STAFF PERFORMANCE REPORTS SERVICE
// ============================================

export const staffPerformanceReportsService = {
  /**
   * Get waiter/staff performance report
   */
  getWaiterPerformance: async (params: Omit<ProductPerformanceParams, 'limit'>): Promise<WaiterPerformance[]> => {
    const response = await api.get<ApiResponse<WaiterPerformance[]>>('/reports/waiter-performance', { params });
    return response.data.data!;
  }
};

// ============================================
// CUSTOM REPORTS SERVICE
// ============================================

export const customReportsService = {
  /**
   * Execute custom SQL report (SELECT only)
   */
  executeCustomReport: async (params: CustomReportParams): Promise<any[]> => {
    const response = await api.post<ApiResponse<any[]>>('/reports/custom', params);
    return response.data.data!;
  }
};

// ============================================
// EXPORT UTILITIES
// ============================================

export const exportUtilities = {
  /**
   * Export data to CSV format
   */
  exportToCSV: (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      headers.join(','), // Header row
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Export data to JSON format
   */
  exportToJSON: (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Print report (triggers browser print dialog)
   */
  printReport: () => {
    window.print();
  }
};

// ============================================
// DATE UTILITIES
// ============================================

export const dateUtilities = {
  /**
   * Get today's date range
   */
  getToday: (): { start_date: string; end_date: string } => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    return { start_date: dateStr, end_date: dateStr };
  },

  /**
   * Get yesterday's date range
   */
  getYesterday: (): { start_date: string; end_date: string } => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    return { start_date: dateStr, end_date: dateStr };
  },

  /**
   * Get this week's date range
   */
  getThisWeek: (): { start_date: string; end_date: string } => {
    const today = new Date();
    const firstDay = new Date(today);
    firstDay.setDate(today.getDate() - today.getDay());

    return {
      start_date: firstDay.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };
  },

  /**
   * Get this month's date range
   */
  getThisMonth: (): { start_date: string; end_date: string } => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    return {
      start_date: firstDay.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };
  },

  /**
   * Get last 7 days date range
   */
  getLast7Days: (): { start_date: string; end_date: string } => {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    return {
      start_date: sevenDaysAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };
  },

  /**
   * Get last 30 days date range
   */
  getLast30Days: (): { start_date: string; end_date: string } => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      start_date: thirtyDaysAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0]
    };
  }
};

// ============================================
// COMBINED SERVICE (Main Export)
// ============================================

const reportsService = {
  sales: salesReportsService,
  inventory: inventoryReportsService,
  performance: performanceReportsService,
  cash: cashSessionsReportsService,
  staff: staffPerformanceReportsService,
  custom: customReportsService,
  export: exportUtilities,
  dates: dateUtilities
};

export default reportsService;
