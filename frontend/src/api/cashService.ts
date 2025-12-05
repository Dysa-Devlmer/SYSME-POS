/**
 * Cash Service - API calls for Cash Register System
 * Manages cash sessions, movements, and Z reports
 */

import { api, ApiResponse } from './client';

// Types
export interface CashSession {
  id: number;
  session_number: string;
  user_id: number;
  status: 'open' | 'closed';
  opening_balance: number;
  closing_balance?: number;
  expected_balance?: number;
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_other: number;
  total_in: number;
  total_out: number;
  sales_count: number;
  notes?: string;
  opened_at: string;
  closed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CashMovement {
  id: number;
  cash_session_id: number;
  type: 'opening' | 'sale' | 'in' | 'out' | 'closing';
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'other';
  reason?: string;
  reference_id?: number;
  reference_type?: string;
  user_id: number;
  created_at: string;
}

export interface ZReport {
  id: number;
  cash_session_id: number;
  report_number: string;
  generated_at: string;
  total_sales: number;
  total_cash: number;
  total_card: number;
  total_other: number;
  sales_count: number;
  opening_balance: number;
  expected_balance: number;
  closing_balance?: number;
  difference?: number;
  is_printed: boolean;
  printed_at?: string;
  created_at: string;
}

export interface CurrentSessionResponse {
  session: CashSession | null;
  movements: CashMovement[];
}

// Cash Service API
export const cashService = {
  /**
   * Get current active cash session
   */
  getCurrentSession: async (): Promise<CurrentSessionResponse> => {
    const response = await api.get<ApiResponse<CurrentSessionResponse>>('/cash/current');
    return response.data.data || { session: null, movements: [] };
  },

  /**
   * Open a new cash session
   */
  openSession: async (opening_balance: number, notes?: string): Promise<CashSession> => {
    const response = await api.post<ApiResponse<CashSession>>('/cash/open', {
      opening_balance,
      notes
    });
    return response.data.data!;
  },

  /**
   * Close current cash session
   */
  closeSession: async (closing_balance: number, notes?: string): Promise<CashSession> => {
    const response = await api.post<ApiResponse<CashSession>>('/cash/close', {
      closing_balance,
      notes
    });
    return response.data.data!;
  },

  /**
   * Add a cash movement (in/out)
   */
  addMovement: async (
    type: 'in' | 'out',
    amount: number,
    reason: string,
    payment_method: 'cash' | 'card' | 'transfer' | 'other' = 'cash'
  ): Promise<CashMovement> => {
    const response = await api.post<ApiResponse<CashMovement>>('/cash/movement', {
      type,
      amount,
      reason,
      payment_method
    });
    return response.data.data!;
  },

  /**
   * Record a sale in the current session
   * This is called automatically from the sales module
   */
  recordSale: async (
    sale_id: number,
    amount: number,
    payment_method: 'cash' | 'card' | 'transfer' | 'other'
  ): Promise<CashMovement> => {
    const response = await api.post<ApiResponse<CashMovement>>('/cash/record-sale', {
      sale_id,
      amount,
      payment_method
    });
    return response.data.data!;
  },

  /**
   * Generate Z Report for a session
   */
  generateZReport: async (session_id: number): Promise<ZReport> => {
    const response = await api.post<ApiResponse<ZReport>>(`/cash/z-report/${session_id}`);
    return response.data.data!;
  },

  /**
   * Get sessions history
   */
  getSessionsHistory: async (
    page: number = 1,
    limit: number = 20
  ): Promise<{ sessions: CashSession[], total: number }> => {
    const response = await api.get<ApiResponse>('/cash/history', {
      params: { page, limit }
    });
    return response.data.data || { sessions: [], total: 0 };
  },

  /**
   * Get Z reports history
   */
  getZReportsHistory: async (
    page: number = 1,
    limit: number = 20
  ): Promise<{ reports: ZReport[], total: number }> => {
    const response = await api.get<ApiResponse>('/cash/z-reports', {
      params: { page, limit }
    });
    return response.data.data || { reports: [], total: 0 };
  },

  /**
   * Mark Z report as printed
   */
  markZReportPrinted: async (report_id: number): Promise<ZReport> => {
    const response = await api.patch<ApiResponse<ZReport>>(`/cash/z-report/${report_id}/printed`);
    return response.data.data!;
  }
};

export default cashService;
