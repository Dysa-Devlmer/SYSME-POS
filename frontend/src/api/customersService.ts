// =====================================================
// Customers Service
// =====================================================
import { api } from './client';

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  loyalty_points: number;
  loyalty_tier_name?: string;
  total_orders?: number;
  lifetime_value?: number;
}

export interface CustomerDetails extends Customer {
  addresses: Array<{
    id: number;
    address_line1: string;
    city: string;
    state: string;
    postal_code: string;
    is_default: boolean;
  }>;
  recent_orders: Array<any>;
  loyalty_summary: {
    current_points: number;
    total_earned: number;
    total_redeemed: number;
  };
}

export const customersService = {
  /**
   * Get customers list
   */
  getCustomers: async (params?: {
    search?: string;
    tier?: number;
    segment?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  /**
   * Get customer by ID
   */
  getCustomer: async (id: number): Promise<{ data: CustomerDetails }> => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  /**
   * Create customer
   */
  createCustomer: async (data: {
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    date_of_birth?: string;
    gender?: string;
    notes?: string;
    address?: {
      address_line1: string;
      city: string;
      state: string;
      postal_code: string;
      country?: string;
    };
  }) => {
    const response = await api.post('/customers', data);
    return response.data;
  },

  /**
   * Update customer
   */
  updateCustomer: async (id: number, data: Partial<Customer>) => {
    const response = await api.put(`/customers/${id}`, data);
    return response.data;
  },

  /**
   * Delete customer
   */
  deleteCustomer: async (id: number) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  /**
   * Get customer orders
   */
  getCustomerOrders: async (id: number, params?: {
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get(`/customers/${id}/orders`, { params });
    return response.data;
  },

  /**
   * Get customer loyalty info
   */
  getCustomerLoyalty: async (id: number) => {
    const response = await api.get(`/customers/${id}/loyalty`);
    return response.data;
  },

  /**
   * Add loyalty points
   */
  addLoyaltyPoints: async (id: number, data: {
    points: number;
    reason: string;
    notes?: string;
  }) => {
    const response = await api.post(`/customers/${id}/loyalty/add-points`, data);
    return response.data;
  },

  /**
   * Redeem reward
   */
  redeemReward: async (id: number, data: {
    reward_id: number;
  }) => {
    const response = await api.post(`/customers/${id}/loyalty/redeem`, data);
    return response.data;
  },

  /**
   * Get customer statistics
   */
  getCustomerStats: async () => {
    const response = await api.get('/customers/stats');
    return response.data;
  },
};

export default customersService;
