/**
 * Tables Service
 * API service for restaurant tables and salons management
 */

import { api, ApiResponse } from './client';

// Interfaces
export interface Salon {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tarifa {
  id: number;
  name: string;
  description?: string;
  multiplier: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: number;
  table_number: string;
  description?: string;
  salon_id: number;
  tarifa_id: number;
  max_capacity: number;
  status: 'free' | 'occupied' | 'reserved' | 'cleaning';
  position_x: number;
  position_y: number;
  is_active: boolean;
  salon_name?: string;
  tarifa_name?: string;
  tarifa_multiplier?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTableRequest {
  table_number: string;
  description?: string;
  salon_id: number;
  tarifa_id: number;
  max_capacity?: number;
  position_x?: number;
  position_y?: number;
}

export interface UpdateTableRequest {
  table_number?: string;
  description?: string;
  salon_id?: number;
  tarifa_id?: number;
  max_capacity?: number;
  status?: 'free' | 'occupied' | 'reserved' | 'cleaning';
  position_x?: number;
  position_y?: number;
}

// Tables Service
export const tablesService = {
  /**
   * Get all salons
   */
  getSalons: async (): Promise<Salon[]> => {
    const response = await api.get<ApiResponse<{ salons: Salon[] }>>('/tables/salons');
    return response.data.data?.salons || [];
  },

  /**
   * Get all tarifas
   */
  getTarifas: async (): Promise<Tarifa[]> => {
    const response = await api.get<ApiResponse<{ tarifas: Tarifa[] }>>('/tables/tarifas');
    return response.data.data?.tarifas || [];
  },

  /**
   * Get all tables
   */
  getTables: async (salonId?: number): Promise<Table[]> => {
    const params = salonId ? { salon_id: salonId } : undefined;
    const response = await api.get<ApiResponse<{ tables: Table[] }>>('/tables', { params });
    return response.data.data?.tables || [];
  },

  /**
   * Get table by ID
   */
  getTableById: async (id: number): Promise<Table> => {
    const response = await api.get<ApiResponse<Table>>(`/tables/${id}`);
    return response.data.data!;
  },

  /**
   * Create new table
   */
  createTable: async (data: CreateTableRequest): Promise<Table> => {
    const response = await api.post<ApiResponse<{ table: Table }>>('/tables', data);
    return response.data.data!.table;
  },

  /**
   * Update table
   */
  updateTable: async (id: number, data: UpdateTableRequest): Promise<Table> => {
    const response = await api.put<ApiResponse<{ table: Table }>>(`/tables/${id}`, data);
    return response.data.data!.table;
  },

  /**
   * Update table position (for drag and drop)
   */
  updateTablePosition: async (id: number, x: number, y: number): Promise<Table> => {
    return tablesService.updateTable(id, {
      position_x: x,
      position_y: y
    });
  },

  /**
   * Update table status
   */
  updateTableStatus: async (
    id: number,
    status: 'free' | 'occupied' | 'reserved' | 'cleaning'
  ): Promise<Table> => {
    return tablesService.updateTable(id, { status });
  },

  /**
   * Delete table (soft delete)
   */
  deleteTable: async (id: number): Promise<void> => {
    await api.delete(`/tables/${id}`);
  }
};

export default tablesService;
