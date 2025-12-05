/**
 * Combos Service - API calls for Combo/Pack/Menu Management System
 * Manages combo products, variants, and dynamic pricing
 */

import { api, ApiResponse, PaginatedResponse } from './client';

// Types
export interface Combo {
  id: number;
  code: string;
  name: string;
  description?: string;
  type: 'pack' | 'menu' | 'promotion' | 'combo';
  base_price: number;
  discount_percentage?: number;
  final_price: number;
  is_active: boolean;
  image_url?: string;
  category_id?: number;

  // Availability
  available_days?: string; // JSON: ["monday", "tuesday", ...]
  available_start_time?: string; // HH:MM
  available_end_time?: string; // HH:MM
  valid_from?: string;
  valid_until?: string;

  // Limits
  max_quantity_per_order?: number;
  stock_quantity?: number;
  track_stock: boolean;

  // Display
  display_order?: number;
  featured: boolean;

  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ComboItem {
  id: number;
  combo_id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  is_required: boolean;
  is_variant_group: boolean; // If true, this is a variant group
  variant_group_name?: string; // e.g., "Elige tu bebida"
  variant_group_min_selection?: number;
  variant_group_max_selection?: number;
  additional_price?: number; // Extra charge for this item
  display_order?: number;
  notes?: string;
}

export interface ComboWithItems extends Combo {
  items: ComboItem[];
  variant_groups?: ComboVariantGroup[];
}

export interface ComboVariantGroup {
  name: string;
  min_selection: number;
  max_selection: number;
  items: ComboItem[];
}

export interface CreateComboRequest {
  code: string;
  name: string;
  description?: string;
  type: 'pack' | 'menu' | 'promotion' | 'combo';
  base_price: number;
  discount_percentage?: number;
  is_active?: boolean;
  image_url?: string;
  category_id?: number;
  available_days?: string[];
  available_start_time?: string;
  available_end_time?: string;
  valid_from?: string;
  valid_until?: string;
  max_quantity_per_order?: number;
  stock_quantity?: number;
  track_stock?: boolean;
  featured?: boolean;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    is_required?: boolean;
    is_variant_group?: boolean;
    variant_group_name?: string;
    variant_group_min_selection?: number;
    variant_group_max_selection?: number;
    additional_price?: number;
    display_order?: number;
    notes?: string;
  }>;
}

export interface ComboFilters {
  type?: string;
  is_active?: boolean;
  category_id?: number;
  featured?: boolean;
  search?: string;
  available_now?: boolean; // Filter by current day/time
  page?: number;
  limit?: number;
}

export interface ComboAvailability {
  is_available: boolean;
  reason?: string;
  next_available?: string;
}

export interface ComboStats {
  total_combos: number;
  active_combos: number;
  by_type: Record<string, number>;
  most_popular: Array<{
    combo_id: number;
    combo_name: string;
    sales_count: number;
    total_revenue: number;
  }>;
}

export interface CalculatePriceRequest {
  combo_id: number;
  selected_items: Array<{
    item_id: number;
    quantity?: number;
  }>;
  quantity?: number;
}

export interface CalculatePriceResponse {
  base_price: number;
  additional_charges: number;
  discount_amount: number;
  final_price: number;
  total_price: number; // final_price * quantity
  breakdown: Array<{
    item_name: string;
    quantity: number;
    price: number;
  }>;
}

// Combos Service API
export const combosService = {
  // Combo Management
  /**
   * Get all combos with filters
   */
  getCombos: async (filters?: ComboFilters): Promise<PaginatedResponse<Combo>> => {
    const response = await api.get<ApiResponse<PaginatedResponse<Combo>>>('/combos', {
      params: filters
    });
    return response.data.data || { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  },

  /**
   * Get active combos
   */
  getActiveCombos: async (type?: string): Promise<Combo[]> => {
    const response = await api.get<ApiResponse<Combo[]>>('/combos/active', {
      params: { type }
    });
    return response.data.data || [];
  },

  /**
   * Get featured combos
   */
  getFeaturedCombos: async (): Promise<Combo[]> => {
    const response = await api.get<ApiResponse<Combo[]>>('/combos/featured');
    return response.data.data || [];
  },

  /**
   * Get available combos (by day/time)
   */
  getAvailableCombos: async (): Promise<Combo[]> => {
    const response = await api.get<ApiResponse<Combo[]>>('/combos/available');
    return response.data.data || [];
  },

  /**
   * Get combo by ID with items
   */
  getComboById: async (id: number): Promise<ComboWithItems> => {
    const response = await api.get<ApiResponse<ComboWithItems>>(`/combos/${id}`);
    return response.data.data!;
  },

  /**
   * Get combo by code
   */
  getComboByCode: async (code: string): Promise<ComboWithItems> => {
    const response = await api.get<ApiResponse<ComboWithItems>>(`/combos/code/${code}`);
    return response.data.data!;
  },

  /**
   * Create a new combo
   */
  createCombo: async (data: CreateComboRequest): Promise<ComboWithItems> => {
    const response = await api.post<ApiResponse<ComboWithItems>>('/combos', data);
    return response.data.data!;
  },

  /**
   * Update a combo
   */
  updateCombo: async (id: number, data: Partial<CreateComboRequest>): Promise<ComboWithItems> => {
    const response = await api.put<ApiResponse<ComboWithItems>>(`/combos/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete a combo
   */
  deleteCombo: async (id: number): Promise<void> => {
    await api.delete(`/combos/${id}`);
  },

  /**
   * Toggle combo active status
   */
  toggleActive: async (id: number): Promise<Combo> => {
    const response = await api.patch<ApiResponse<Combo>>(`/combos/${id}/toggle-active`);
    return response.data.data!;
  },

  /**
   * Toggle combo featured status
   */
  toggleFeatured: async (id: number): Promise<Combo> => {
    const response = await api.patch<ApiResponse<Combo>>(`/combos/${id}/toggle-featured`);
    return response.data.data!;
  },

  // Combo Items Management
  /**
   * Add item to combo
   */
  addItem: async (combo_id: number, item: Omit<ComboItem, 'id' | 'combo_id'>): Promise<ComboItem> => {
    const response = await api.post<ApiResponse<ComboItem>>(`/combos/${combo_id}/items`, item);
    return response.data.data!;
  },

  /**
   * Update combo item
   */
  updateItem: async (combo_id: number, item_id: number, data: Partial<ComboItem>): Promise<ComboItem> => {
    const response = await api.put<ApiResponse<ComboItem>>(`/combos/${combo_id}/items/${item_id}`, data);
    return response.data.data!;
  },

  /**
   * Remove item from combo
   */
  removeItem: async (combo_id: number, item_id: number): Promise<void> => {
    await api.delete(`/combos/${combo_id}/items/${item_id}`);
  },

  /**
   * Reorder combo items
   */
  reorderItems: async (combo_id: number, item_orders: Array<{ id: number; display_order: number }>): Promise<void> => {
    await api.post(`/combos/${combo_id}/items/reorder`, { item_orders });
  },

  // Availability and Pricing
  /**
   * Check combo availability
   */
  checkAvailability: async (id: number): Promise<ComboAvailability> => {
    const response = await api.get<ApiResponse<ComboAvailability>>(`/combos/${id}/availability`);
    return response.data.data!;
  },

  /**
   * Calculate combo price with selections
   */
  calculatePrice: async (data: CalculatePriceRequest): Promise<CalculatePriceResponse> => {
    const response = await api.post<ApiResponse<CalculatePriceResponse>>('/combos/calculate-price', data);
    return response.data.data!;
  },

  /**
   * Update stock quantity
   */
  updateStock: async (id: number, quantity: number): Promise<Combo> => {
    const response = await api.patch<ApiResponse<Combo>>(`/combos/${id}/stock`, { quantity });
    return response.data.data!;
  },

  /**
   * Adjust stock (increment/decrement)
   */
  adjustStock: async (id: number, adjustment: number, reason?: string): Promise<Combo> => {
    const response = await api.post<ApiResponse<Combo>>(`/combos/${id}/stock/adjust`, {
      adjustment,
      reason
    });
    return response.data.data!;
  },

  // Analytics and Reports
  /**
   * Get combo statistics
   */
  getStats: async (start_date?: string, end_date?: string): Promise<ComboStats> => {
    const response = await api.get<ApiResponse<ComboStats>>('/combos/stats', {
      params: { start_date, end_date }
    });
    return response.data.data!;
  },

  /**
   * Get combo sales report
   */
  getSalesReport: async (combo_id: number, start_date?: string, end_date?: string): Promise<any> => {
    const response = await api.get<ApiResponse>(`/combos/${combo_id}/sales-report`, {
      params: { start_date, end_date }
    });
    return response.data.data;
  },

  /**
   * Get popular combos
   */
  getPopularCombos: async (limit: number = 10): Promise<Array<Combo & { sales_count: number; revenue: number }>> => {
    const response = await api.get<ApiResponse>('/combos/popular', {
      params: { limit }
    });
    return response.data.data || [];
  },

  // Bulk Operations
  /**
   * Bulk update combo status
   */
  bulkUpdateStatus: async (combo_ids: number[], is_active: boolean): Promise<void> => {
    await api.post('/combos/bulk/update-status', {
      combo_ids,
      is_active
    });
  },

  /**
   * Duplicate combo
   */
  duplicateCombo: async (id: number, new_name: string, new_code: string): Promise<ComboWithItems> => {
    const response = await api.post<ApiResponse<ComboWithItems>>(`/combos/${id}/duplicate`, {
      name: new_name,
      code: new_code
    });
    return response.data.data!;
  },

  // Image Management
  /**
   * Upload combo image
   */
  uploadImage: async (id: number, image: File): Promise<Combo> => {
    const formData = new FormData();
    formData.append('image', image);

    const response = await api.post<ApiResponse<Combo>>(`/combos/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data.data!;
  },

  /**
   * Delete combo image
   */
  deleteImage: async (id: number): Promise<Combo> => {
    const response = await api.delete<ApiResponse<Combo>>(`/combos/${id}/image`);
    return response.data.data!;
  }
};

export default combosService;
