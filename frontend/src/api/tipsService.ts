/**
 * Tips Service - API calls for Tips System
 * Manages tip settings, presets, and tip tracking
 */

import { api, ApiResponse } from './client';

// ============================================
// TYPES
// ============================================

export interface TipSettings {
  id: number;
  is_enabled: boolean;
  is_required: boolean;
  default_method: 'percentage' | 'fixed' | 'custom';
  min_percentage: number;
  max_percentage: number;
  suggested_percentages: number[];
  allow_custom_amount: boolean;
  apply_before_tax: boolean;
  distribution_method: 'waiters' | 'pool' | 'kitchen_split' | 'custom';
  created_at: string;
  updated_at: string;
}

export interface TipPreset {
  id: number;
  name: string;
  description?: string;
  percentage: number;
  fixed_amount: number;
  is_percentage: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaleTip {
  id: number;
  sale_id: number;
  tip_amount: number;
  tip_percentage?: number;
  tip_method: 'percentage' | 'fixed' | 'custom';
  calculation_base: number;
  preset_id?: number;
  waiter_id?: number;
  distribution_method: string;
  notes?: string;
  created_at: string;
  distribution?: TipDistribution[];
}

export interface TipDistribution {
  id: number;
  sale_tip_id: number;
  user_id: number;
  user_name?: string;
  amount: number;
  percentage: number;
  role: string;
  created_at: string;
}

export interface TipCalculationRequest {
  sale_total: number;
  percentage?: number;
  fixed_amount?: number;
  preset_id?: number;
}

export interface TipCalculationResponse {
  tip_amount: number;
  tip_percentage?: number;
  tip_method: 'percentage' | 'fixed' | 'custom';
  calculation_base: number;
}

export interface AddTipRequest {
  sale_id: number;
  tip_amount: number;
  tip_percentage?: number;
  tip_method?: 'percentage' | 'fixed' | 'custom';
  calculation_base?: number;
  preset_id?: number;
  distribution_method?: string;
  notes?: string;
}

export interface TipsReport {
  tips: SaleTip[];
  summary: {
    total_tips: number;
    count: number;
    avg_tip: number;
    avg_percentage: number;
  };
}

export interface TipsDistributionSummary {
  user_id: number;
  username: string;
  role: string;
  num_tips: number;
  total_amount: number;
  avg_amount: number;
}

// ============================================
// TIP SETTINGS SERVICE
// ============================================

export const tipSettingsService = {
  /**
   * Get current tip settings
   */
  getSettings: async (): Promise<TipSettings> => {
    const response = await api.get<ApiResponse<TipSettings>>('/tips/settings');
    return response.data.data!;
  },

  /**
   * Update tip settings
   */
  updateSettings: async (data: Partial<TipSettings>): Promise<TipSettings> => {
    const response = await api.put<ApiResponse<TipSettings>>('/tips/settings', data);
    return response.data.data!;
  }
};

// ============================================
// TIP PRESETS SERVICE
// ============================================

export const tipPresetsService = {
  /**
   * Get all tip presets
   */
  getAll: async (activeOnly: boolean = true): Promise<TipPreset[]> => {
    const params = activeOnly ? { active_only: 'true' } : {};
    const response = await api.get<ApiResponse<TipPreset[]>>('/tips/presets', { params });
    return response.data.data || [];
  },

  /**
   * Get single tip preset
   */
  getById: async (id: number): Promise<TipPreset> => {
    const response = await api.get<ApiResponse<TipPreset>>(`/tips/presets/${id}`);
    return response.data.data!;
  },

  /**
   * Create new tip preset
   */
  create: async (data: {
    name: string;
    description?: string;
    percentage?: number;
    fixed_amount?: number;
    is_percentage?: boolean;
    display_order?: number;
  }): Promise<TipPreset> => {
    const response = await api.post<ApiResponse<TipPreset>>('/tips/presets', data);
    return response.data.data!;
  },

  /**
   * Update tip preset
   */
  update: async (id: number, data: Partial<TipPreset>): Promise<TipPreset> => {
    const response = await api.put<ApiResponse<TipPreset>>(`/tips/presets/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete tip preset (soft delete)
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/tips/presets/${id}`);
  }
};

// ============================================
// SALE TIPS SERVICE
// ============================================

export const saleTipsService = {
  /**
   * Calculate tip amount
   */
  calculateTip: async (request: TipCalculationRequest): Promise<TipCalculationResponse> => {
    const response = await api.post<ApiResponse<TipCalculationResponse>>('/tips/calculate', request);
    return response.data.data!;
  },

  /**
   * Add tip to sale
   */
  addTipToSale: async (request: AddTipRequest): Promise<void> => {
    await api.post('/tips/sale', request);
  },

  /**
   * Get tip for a sale
   */
  getSaleTip: async (saleId: number): Promise<SaleTip> => {
    const response = await api.get<ApiResponse<SaleTip>>(`/tips/sale/${saleId}`);
    return response.data.data!;
  }
};

// ============================================
// TIPS REPORTS SERVICE
// ============================================

export const tipsReportsService = {
  /**
   * Get tips report by date range
   */
  getTipsReport: async (
    startDate?: string,
    endDate?: string,
    waiterId?: number
  ): Promise<TipsReport> => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (waiterId) params.waiter_id = waiterId;

    const response = await api.get<ApiResponse<TipsReport>>('/tips/report', { params });
    return response.data.data!;
  },

  /**
   * Get tips distribution summary
   */
  getDistributionSummary: async (
    startDate?: string,
    endDate?: string
  ): Promise<TipsDistributionSummary[]> => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    const response = await api.get<ApiResponse<TipsDistributionSummary[]>>('/tips/distribution', { params });
    return response.data.data || [];
  }
};

// ============================================
// COMBINED SERVICE (Main Export)
// ============================================

const tipsService = {
  settings: tipSettingsService,
  presets: tipPresetsService,
  sales: saleTipsService,
  reports: tipsReportsService
};

export default tipsService;
