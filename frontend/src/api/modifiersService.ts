/**
 * Modifiers Service - API calls for Product Modifiers System
 * Manages modifier groups, modifiers, and product associations
 */

import { api, ApiResponse } from './client';

// ============================================
// TYPES
// ============================================

export interface ModifierGroup {
  id: number;
  name: string;
  description?: string;
  type: 'required' | 'optional';
  min_selections: number;
  max_selections: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  modifiers_count?: number;
  modifiers?: Modifier[];
}

export interface Modifier {
  id: number;
  group_id: number;
  name: string;
  code?: string;
  price: number;
  is_default: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  group_name?: string;
  group?: ModifierGroup;
}

export interface ProductModifierGroup {
  id: number;
  product_id: number;
  modifier_group_id: number;
  is_required: boolean;
  display_order: number;
  created_at: string;
}

export interface ModifierGroupAssignment {
  modifier_group_id: number;
  is_required: boolean;
  display_order: number;
}

export interface OrderItemModifier {
  id: number;
  order_item_id: number;
  modifier_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

// ============================================
// MODIFIER GROUPS SERVICE
// ============================================

export const modifierGroupsService = {
  /**
   * Get all modifier groups
   */
  getAll: async (activeOnly: boolean = false): Promise<ModifierGroup[]> => {
    const params = activeOnly ? { active_only: 'true' } : {};
    const response = await api.get<ApiResponse<ModifierGroup[]>>('/modifiers/groups', { params });
    return response.data.data || [];
  },

  /**
   * Get a single modifier group with its modifiers
   */
  getById: async (id: number): Promise<ModifierGroup> => {
    const response = await api.get<ApiResponse<ModifierGroup>>(`/modifiers/groups/${id}`);
    return response.data.data!;
  },

  /**
   * Create a new modifier group
   */
  create: async (data: {
    name: string;
    description?: string;
    type?: 'required' | 'optional';
    min_selections?: number;
    max_selections?: number;
    display_order?: number;
  }): Promise<ModifierGroup> => {
    const response = await api.post<ApiResponse<ModifierGroup>>('/modifiers/groups', data);
    return response.data.data!;
  },

  /**
   * Update a modifier group
   */
  update: async (id: number, data: Partial<ModifierGroup>): Promise<ModifierGroup> => {
    const response = await api.put<ApiResponse<ModifierGroup>>(`/modifiers/groups/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete (soft) a modifier group
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/modifiers/groups/${id}`);
  }
};

// ============================================
// MODIFIERS SERVICE
// ============================================

export const modifiersService = {
  /**
   * Get all modifiers (optionally filtered by group)
   */
  getAll: async (groupId?: number, activeOnly: boolean = false): Promise<Modifier[]> => {
    const params: any = {};
    if (groupId) params.group_id = groupId;
    if (activeOnly) params.active_only = 'true';

    const response = await api.get<ApiResponse<Modifier[]>>('/modifiers/modifiers', { params });
    return response.data.data || [];
  },

  /**
   * Get a single modifier
   */
  getById: async (id: number): Promise<Modifier> => {
    const response = await api.get<ApiResponse<Modifier>>(`/modifiers/modifiers/${id}`);
    return response.data.data!;
  },

  /**
   * Create a new modifier
   */
  create: async (data: {
    group_id: number;
    name: string;
    code?: string;
    price?: number;
    is_default?: boolean;
    display_order?: number;
  }): Promise<Modifier> => {
    const response = await api.post<ApiResponse<Modifier>>('/modifiers/modifiers', data);
    return response.data.data!;
  },

  /**
   * Update a modifier
   */
  update: async (id: number, data: Partial<Modifier>): Promise<Modifier> => {
    const response = await api.put<ApiResponse<Modifier>>(`/modifiers/modifiers/${id}`, data);
    return response.data.data!;
  },

  /**
   * Delete (soft) a modifier
   */
  delete: async (id: number): Promise<void> => {
    await api.delete(`/modifiers/modifiers/${id}`);
  }
};

// ============================================
// PRODUCT ASSOCIATIONS SERVICE
// ============================================

export const productModifiersService = {
  /**
   * Get all modifier groups assigned to a product
   */
  getProductModifierGroups: async (productId: number): Promise<ModifierGroup[]> => {
    const response = await api.get<ApiResponse<ModifierGroup[]>>(
      `/modifiers/products/${productId}/groups`
    );
    return response.data.data || [];
  },

  /**
   * Assign modifier groups to a product
   */
  assignGroupsToProduct: async (
    productId: number,
    groups: ModifierGroupAssignment[]
  ): Promise<ProductModifierGroup[]> => {
    const response = await api.post<ApiResponse<ProductModifierGroup[]>>(
      `/modifiers/products/${productId}/groups`,
      { groups }
    );
    return response.data.data || [];
  },

  /**
   * Remove a modifier group from a product
   */
  removeGroupFromProduct: async (productId: number, groupId: number): Promise<void> => {
    await api.delete(`/modifiers/products/${productId}/groups/${groupId}`);
  }
};

// ============================================
// COMBINED SERVICE (Main Export)
// ============================================

const modifiersApiService = {
  groups: modifierGroupsService,
  modifiers: modifiersService,
  products: productModifiersService
};

export default modifiersApiService;
