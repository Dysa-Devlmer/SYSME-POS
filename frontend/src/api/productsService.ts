// =====================================================
// Products Service
// =====================================================
import { api } from './client';

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  category_id?: number;
  price: number;
  cost?: number;
  unit_of_measure: string;
  is_active: boolean;
  category_name?: string;
}

export const productsService = {
  /**
   * Get all products
   */
  getProducts: async (params?: {
    category_id?: number;
    search?: string;
    is_active?: boolean;
  }) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  /**
   * Get product by ID
   */
  getProduct: async (id: number) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  /**
   * Create product
   */
  createProduct: async (data: Partial<Product>) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  /**
   * Update product
   */
  updateProduct: async (id: number, data: Partial<Product>) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  /**
   * Delete product
   */
  deleteProduct: async (id: number) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  /**
   * Get categories
   */
  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },

  /**
   * Create category
   */
  createCategory: async (data: { name: string; description?: string }) => {
    const response = await api.post('/products/categories', data);
    return response.data;
  },
};

export default productsService;
