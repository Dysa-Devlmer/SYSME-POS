/**
 * Pricing Tiers API Service
 * Handles all pricing tier related API calls
 */

import api from './client';

// Types
export interface PricingTier {
  id: number;
  code: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_active: boolean;
  valid_days?: string[]; // JSON parsed
  valid_start_time?: string; // HH:MM
  valid_end_time?: string; // HH:MM
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface ProductPrice {
  id: number;
  product_id: number;
  pricing_tier_id: number;
  price: number;
  product_name: string;
  default_price: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTierRequest {
  code: string;
  name: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  valid_days?: string[];
  valid_start_time?: string;
  valid_end_time?: string;
  priority?: number;
}

export interface UpdateTierRequest {
  code?: string;
  name?: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  valid_days?: string[];
  valid_start_time?: string;
  valid_end_time?: string;
  priority?: number;
}

export interface SetProductPriceRequest {
  price: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Get all pricing tiers
 * @param includeInactive - Include inactive tiers
 */
export const getAllTiers = async (includeInactive = false): Promise<PricingTier[]> => {
  const response = await api.get<ApiResponse<PricingTier[]>>('/pricing-tiers', {
    params: { include_inactive: includeInactive ? '1' : undefined }
  });
  return response.data.data || [];
};

/**
 * Get only active pricing tiers
 */
export const getActiveTiers = async (): Promise<PricingTier[]> => {
  const response = await api.get<ApiResponse<PricingTier[]>>('/pricing-tiers/active');
  return response.data.data || [];
};

/**
 * Get default pricing tier
 */
export const getDefaultTier = async (): Promise<PricingTier> => {
  const response = await api.get<ApiResponse<PricingTier>>('/pricing-tiers/default');
  if (!response.data.data) {
    throw new Error('No default tier found');
  }
  return response.data.data;
};

/**
 * Get applicable tier for a table/time
 * @param tableId - Optional table ID to check
 */
export const getApplicableTier = async (tableId?: number): Promise<PricingTier> => {
  const response = await api.get<ApiResponse<PricingTier>>('/pricing-tiers/applicable', {
    params: { table_id: tableId }
  });
  if (!response.data.data) {
    throw new Error('No applicable tier found');
  }
  return response.data.data;
};

/**
 * Get pricing tier by ID
 * @param id - Tier ID
 */
export const getTierById = async (id: number): Promise<PricingTier> => {
  const response = await api.get<ApiResponse<PricingTier>>(`/pricing-tiers/${id}`);
  if (!response.data.data) {
    throw new Error('Tier not found');
  }
  return response.data.data;
};

/**
 * Create new pricing tier
 * @param data - Tier data
 */
export const createTier = async (data: CreateTierRequest): Promise<PricingTier> => {
  const response = await api.post<ApiResponse<PricingTier>>('/pricing-tiers', data);
  if (!response.data.data) {
    throw new Error(response.data.error || 'Failed to create tier');
  }
  return response.data.data;
};

/**
 * Update pricing tier
 * @param id - Tier ID
 * @param data - Update data
 */
export const updateTier = async (id: number, data: UpdateTierRequest): Promise<PricingTier> => {
  const response = await api.put<ApiResponse<PricingTier>>(`/pricing-tiers/${id}`, data);
  if (!response.data.data) {
    throw new Error(response.data.error || 'Failed to update tier');
  }
  return response.data.data;
};

/**
 * Delete pricing tier
 * @param id - Tier ID
 */
export const deleteTier = async (id: number): Promise<void> => {
  const response = await api.delete<ApiResponse<void>>(`/pricing-tiers/${id}`);
  if (!response.data.success) {
    throw new Error(response.data.error || 'Failed to delete tier');
  }
};

/**
 * Get product prices for a tier
 * @param tierId - Tier ID
 */
export const getProductPrices = async (tierId: number): Promise<ProductPrice[]> => {
  const response = await api.get<ApiResponse<ProductPrice[]>>(`/pricing-tiers/${tierId}/products`);
  return response.data.data || [];
};

/**
 * Set product price for tier
 * @param tierId - Tier ID
 * @param productId - Product ID
 * @param price - Price value
 */
export const setProductPrice = async (
  tierId: number,
  productId: number,
  price: number
): Promise<ProductPrice> => {
  const response = await api.post<ApiResponse<ProductPrice>>(
    `/pricing-tiers/${tierId}/products/${productId}`,
    { price }
  );
  if (!response.data.data) {
    throw new Error(response.data.error || 'Failed to set product price');
  }
  return response.data.data;
};

/**
 * Toggle tier active status
 * @param id - Tier ID
 * @param isActive - New active status
 */
export const toggleTierActive = async (id: number, isActive: boolean): Promise<PricingTier> => {
  return updateTier(id, { is_active: isActive });
};

/**
 * Set tier as default
 * @param id - Tier ID
 */
export const setAsDefault = async (id: number): Promise<PricingTier> => {
  return updateTier(id, { is_default: true });
};

// Export all as default object
const pricingTiersService = {
  getAllTiers,
  getActiveTiers,
  getDefaultTier,
  getApplicableTier,
  getTierById,
  createTier,
  updateTier,
  deleteTier,
  getProductPrices,
  setProductPrice,
  toggleTierActive,
  setAsDefault
};

export default pricingTiersService;
