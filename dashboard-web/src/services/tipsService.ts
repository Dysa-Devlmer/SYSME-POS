/**
 * Tips Service
 * API service for tips/propinas management
 */

import { api, ApiResponse } from '../api/client';

// Interfaces
export interface TipSettings {
  id?: number;
  tip_enabled: boolean;
  default_percentage: number;
  allow_custom_amount: boolean;
  show_suggested_tips: boolean;
  suggested_percentages: number[];
  tip_distribution_enabled: boolean;
  auto_distribute: boolean;
  include_tax_in_calculation: boolean;
  updated_at?: string;
}

export interface TipPreset {
  id: number;
  name: string;
  percentage: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TipDistributionRule {
  id: number;
  name: string;
  role: string;
  percentage: number;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTipPreset {
  name: string;
  percentage: number;
  is_default?: boolean;
  sort_order?: number;
}

export interface CreateDistributionRule {
  name: string;
  role: string;
  percentage: number;
  priority?: number;
}

// Tips Service
export const tipsService = {
  // Settings
  settings: {
    getSettings: async (): Promise<TipSettings> => {
      const response = await api.get<ApiResponse<TipSettings>>('/tips/settings');
      return response.data.data || {
        tip_enabled: true,
        default_percentage: 10,
        allow_custom_amount: true,
        show_suggested_tips: true,
        suggested_percentages: [10, 15, 20],
        tip_distribution_enabled: false,
        auto_distribute: false,
        include_tax_in_calculation: false
      };
    },

    updateSettings: async (data: Partial<TipSettings>): Promise<TipSettings> => {
      const response = await api.put<ApiResponse<TipSettings>>('/tips/settings', data);
      return response.data.data!;
    }
  },

  // Presets
  presets: {
    getAll: async (): Promise<TipPreset[]> => {
      const response = await api.get<ApiResponse<{ presets: TipPreset[] }>>('/tips/presets');
      return response.data.data?.presets || [];
    },

    create: async (data: CreateTipPreset): Promise<TipPreset> => {
      const response = await api.post<ApiResponse<{ preset: TipPreset }>>('/tips/presets', data);
      return response.data.data!.preset;
    },

    update: async (id: number, data: Partial<CreateTipPreset>): Promise<TipPreset> => {
      const response = await api.put<ApiResponse<{ preset: TipPreset }>>(`/tips/presets/${id}`, data);
      return response.data.data!.preset;
    },

    delete: async (id: number): Promise<void> => {
      await api.delete(`/tips/presets/${id}`);
    },

    setDefault: async (id: number): Promise<void> => {
      await api.post(`/tips/presets/${id}/default`);
    }
  },

  // Distribution Rules
  distribution: {
    getRules: async (): Promise<TipDistributionRule[]> => {
      const response = await api.get<ApiResponse<{ rules: TipDistributionRule[] }>>('/tips/distribution');
      return response.data.data?.rules || [];
    },

    createRule: async (data: CreateDistributionRule): Promise<TipDistributionRule> => {
      const response = await api.post<ApiResponse<{ rule: TipDistributionRule }>>('/tips/distribution', data);
      return response.data.data!.rule;
    },

    updateRule: async (id: number, data: Partial<CreateDistributionRule>): Promise<TipDistributionRule> => {
      const response = await api.put<ApiResponse<{ rule: TipDistributionRule }>>(`/tips/distribution/${id}`, data);
      return response.data.data!.rule;
    },

    deleteRule: async (id: number): Promise<void> => {
      await api.delete(`/tips/distribution/${id}`);
    }
  },

  // Calculate tip for a sale
  calculateTip: async (saleId: number, percentage: number): Promise<number> => {
    const response = await api.post<ApiResponse<{ amount: number }>>(`/tips/calculate`, {
      sale_id: saleId,
      percentage
    });
    return response.data.data?.amount || 0;
  },

  // Add tip to sale
  addTipToSale: async (saleId: number, amount: number, method: string = 'percentage'): Promise<void> => {
    await api.post(`/tips/sales/${saleId}`, { amount, method });
  }
};

export default tipsService;
