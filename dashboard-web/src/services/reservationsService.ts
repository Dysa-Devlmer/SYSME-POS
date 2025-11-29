/**
 * Reservations Service
 * Handles all API calls related to table reservations
 */

import api from './api';

// ============================================
// INTERFACES
// ============================================

export interface ReservationSettings {
  id: number;
  is_enabled: boolean;
  advance_booking_days: number;
  min_booking_hours: number;
  max_party_size: number;
  default_duration_minutes: number;
  require_phone: boolean;
  require_email: boolean;
  require_deposit: boolean;
  deposit_amount: number;
  auto_confirm: boolean;
  cancellation_hours: number;
  send_reminders: boolean;
  reminder_hours_before: number;
  business_hours_start: string; // HH:mm format
  business_hours_end: string;
  slot_interval_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: number;
  reservation_code: string;

  // Customer info
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;

  // Reservation details
  reservation_date: string; // YYYY-MM-DD
  reservation_time: string; // HH:mm
  duration_minutes: number;
  end_time: string; // HH:mm (calculated)

  // Table assignment
  table_id?: number;
  table_number?: string;
  capacity?: number;
  preferred_area?: 'indoor' | 'outdoor' | 'private' | 'bar';

  // Status
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  confirmation_code?: string;

  // Special requests
  special_requests?: string;
  occasion?: string;

  // Deposit
  deposit_required: boolean;
  deposit_amount: number;
  deposit_paid: boolean;
  deposit_paid_at?: string;

  // Notifications
  reminder_sent: boolean;
  reminder_sent_at?: string;
  confirmation_sent: boolean;
  confirmation_sent_at?: string;

  // Tracking
  created_by?: number;
  confirmed_by?: number;
  seated_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;

  // Notes
  notes?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ReservationHistory {
  id: number;
  reservation_id: number;
  action: string;
  previous_status?: string;
  new_status?: string;
  changed_by?: number;
  change_details?: string;
  notes?: string;
  created_at: string;
}

export interface ReservationWithHistory extends Reservation {
  history: ReservationHistory[];
}

export interface AvailabilityCheck {
  available: boolean;
  total_tables: number;
  occupied_tables: number;
  available_tables: number;
  suitable_tables: Array<{
    id: number;
    table_number: string;
    capacity: number;
    area: string;
  }>;
}

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
}

export interface ReservationStats {
  date: string;
  total_reservations: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_shows: number;
  total_guests: number;
  avg_party_size: number;
}

export interface CreateReservationData {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes?: number;
  table_id?: number;
  preferred_area?: string;
  special_requests?: string;
  occasion?: string;
}

export interface UpdateReservationData {
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  party_size?: number;
  reservation_date?: string;
  reservation_time?: string;
  duration_minutes?: number;
  table_id?: number;
  preferred_area?: string;
  special_requests?: string;
  occasion?: string;
  notes?: string;
}

export interface GetReservationsParams {
  date?: string;
  status?: string;
  table_id?: number;
  customer_phone?: string;
}

export interface CheckAvailabilityParams {
  date: string;
  time: string;
  party_size?: number;
  duration_minutes?: number;
}

// ============================================
// API SERVICE
// ============================================

const reservationsService = {
  // Settings
  settings: {
    get: async (): Promise<ReservationSettings> => {
      const response = await api.get('/reservations/settings');
      return response.data.data;
    },

    update: async (data: Partial<ReservationSettings>): Promise<ReservationSettings> => {
      const response = await api.put('/reservations/settings', data);
      return response.data.data;
    }
  },

  // Reservations CRUD
  create: async (data: CreateReservationData): Promise<Reservation> => {
    const response = await api.post('/reservations', data);
    return response.data.data;
  },

  getAll: async (params?: GetReservationsParams): Promise<Reservation[]> => {
    const response = await api.get('/reservations', { params });
    return response.data.data;
  },

  getById: async (id: number): Promise<ReservationWithHistory> => {
    const response = await api.get(`/reservations/${id}`);
    return response.data.data;
  },

  update: async (id: number, data: UpdateReservationData): Promise<Reservation> => {
    const response = await api.put(`/reservations/${id}`, data);
    return response.data.data;
  },

  // Status management
  confirm: async (id: number): Promise<Reservation> => {
    const response = await api.post(`/reservations/${id}/confirm`);
    return response.data.data;
  },

  cancel: async (id: number, reason?: string): Promise<Reservation> => {
    const response = await api.post(`/reservations/${id}/cancel`, { reason });
    return response.data.data;
  },

  markAsSeated: async (id: number): Promise<Reservation> => {
    const response = await api.post(`/reservations/${id}/seated`);
    return response.data.data;
  },

  markAsCompleted: async (id: number): Promise<Reservation> => {
    const response = await api.post(`/reservations/${id}/completed`);
    return response.data.data;
  },

  markAsNoShow: async (id: number): Promise<Reservation> => {
    const response = await api.post(`/reservations/${id}/no-show`);
    return response.data.data;
  },

  // Availability
  checkAvailability: async (params: CheckAvailabilityParams): Promise<AvailabilityCheck> => {
    const response = await api.get('/reservations/availability/check', { params });
    return response.data.data;
  },

  getTimeSlots: async (date: string): Promise<TimeSlot[]> => {
    const response = await api.get('/reservations/availability/slots', {
      params: { date }
    });
    return response.data.data;
  },

  // Reports
  getStats: async (start_date?: string, end_date?: string): Promise<ReservationStats[]> => {
    const response = await api.get('/reservations/stats/summary', {
      params: { start_date, end_date }
    });
    return response.data.data;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const reservationUtils = {
  /**
   * Get status badge color
   */
  getStatusColor: (status: Reservation['status']): string => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      seated: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  },

  /**
   * Get status display text
   */
  getStatusText: (status: Reservation['status']): string => {
    const texts = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      seated: 'En mesa',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No asistió'
    };
    return texts[status] || status;
  },

  /**
   * Format time to HH:mm
   */
  formatTime: (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  },

  /**
   * Format date to readable format
   */
  formatDate: (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  /**
   * Format date to input value (YYYY-MM-DD)
   */
  formatDateInput: (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Check if reservation is upcoming
   */
  isUpcoming: (reservation: Reservation): boolean => {
    const now = new Date();
    const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`);
    return reservationDateTime > now;
  },

  /**
   * Check if reservation is today
   */
  isToday: (reservation: Reservation): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return reservation.reservation_date === today;
  },

  /**
   * Get occasion icon
   */
  getOccasionIcon: (occasion?: string): string => {
    const icons: Record<string, string> = {
      birthday: '🎂',
      anniversary: '💑',
      business: '💼',
      celebration: '🎉',
      romantic: '❤️'
    };
    return icons[occasion || ''] || '🍽️';
  },

  /**
   * Calculate end time from start time and duration
   */
  calculateEndTime: (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  },

  /**
   * Validate phone number (Chilean format)
   */
  validatePhone: (phone: string): boolean => {
    // Chilean phone: +56 9 XXXX XXXX or 9 XXXX XXXX
    const cleanPhone = phone.replace(/\s/g, '');
    return /^(\+56)?9\d{8}$/.test(cleanPhone);
  },

  /**
   * Format phone number (Chilean)
   */
  formatPhone: (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 11 && cleanPhone.startsWith('56')) {
      return `+56 ${cleanPhone.substring(2, 3)} ${cleanPhone.substring(3, 7)} ${cleanPhone.substring(7)}`;
    } else if (cleanPhone.length === 9) {
      return `${cleanPhone.substring(0, 1)} ${cleanPhone.substring(1, 5)} ${cleanPhone.substring(5)}`;
    }
    return phone;
  }
};

export default reservationsService;
