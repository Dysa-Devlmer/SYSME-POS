// =====================================================
// Suppliers Service
// =====================================================
import { api } from './client';

export const suppliersService = {
  getSuppliers: async (params?: { search?: string; is_active?: boolean }) => {
    const response = await api.get('/suppliers', { params });
    return response.data;
  },

  getSupplier: async (id: number) => {
    const response = await api.get(`/suppliers/${id}`);
    return response.data;
  },

  createSupplier: async (data: any) => {
    const response = await api.post('/suppliers', data);
    return response.data;
  },

  updateSupplier: async (id: number, data: any) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id: number) => {
    const response = await api.delete(`/suppliers/${id}`);
    return response.data;
  },
};

export default suppliersService;
