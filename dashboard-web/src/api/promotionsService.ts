// =====================================================
// Promotions Service
// =====================================================
import { api } from './client';

export const promotionsService = {
  // Promotions
  getPromotions: async (params?: { is_active?: boolean }) => {
    const response = await api.get('/promotions/promotions', { params });
    return response.data;
  },

  createPromotion: async (data: any) => {
    const response = await api.post('/promotions/promotions', data);
    return response.data;
  },

  // Coupons
  getCoupons: async (params?: { is_active?: boolean; code?: string }) => {
    const response = await api.get('/promotions/coupons', { params });
    return response.data;
  },

  createCoupon: async (data: {
    code: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    max_uses?: number;
    max_uses_per_customer?: number;
    valid_from?: string;
    valid_until?: string;
    min_purchase_amount?: number;
  }) => {
    const response = await api.post('/promotions/coupons', data);
    return response.data;
  },

  validateCoupon: async (code: string, data: {
    order_total: number;
    customer_id?: number;
  }) => {
    const response = await api.post(`/promotions/coupons/${code}/validate`, data);
    return response.data;
  },

  // Gift Cards
  getGiftCards: async (params?: { status?: string }) => {
    const response = await api.get('/promotions/gift-cards', { params });
    return response.data;
  },

  createGiftCard: async (data: {
    card_number: string;
    initial_balance: number;
    customer_id?: number;
  }) => {
    const response = await api.post('/promotions/gift-cards', data);
    return response.data;
  },
};

export default promotionsService;
