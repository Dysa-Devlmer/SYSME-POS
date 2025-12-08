// =====================================================
// Reservations Service
// =====================================================
import { api } from './client';

export const reservationsService = {
  getReservations: async (params?: {
    date?: string;
    status?: string;
    location_id?: number;
  }) => {
    const response = await api.get('/reservations', { params });
    return response.data;
  },

  createReservation: async (data: {
    customer_id?: number;
    location_id: number;
    reservation_datetime: string;
    party_size: number;
    table_id?: number;
    special_requests?: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
  }) => {
    const response = await api.post('/reservations', data);
    return response.data;
  },

  updateReservation: async (id: number, data: any) => {
    const response = await api.put(`/reservations/${id}`, data);
    return response.data;
  },

  confirmReservation: async (id: number) => {
    const response = await api.post(`/reservations/${id}/confirm`);
    return response.data;
  },

  cancelReservation: async (id: number, data: { cancellation_reason?: string }) => {
    const response = await api.post(`/reservations/${id}/cancel`, data);
    return response.data;
  },

  // Waitlist
  getWaitlist: async (params?: { location_id?: number }) => {
    const response = await api.get('/reservations/waitlist', { params });
    return response.data;
  },

  addToWaitlist: async (data: {
    location_id: number;
    party_size: number;
    customer_name: string;
    customer_phone: string;
    estimated_wait_minutes?: number;
  }) => {
    const response = await api.post('/reservations/waitlist', data);
    return response.data;
  },

  seatWaitlist: async (id: number, data: { table_id?: number }) => {
    const response = await api.post(`/reservations/waitlist/${id}/seat`, data);
    return response.data;
  },
};

export default reservationsService;
