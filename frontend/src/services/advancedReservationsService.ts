/**
 * Advanced Reservations Service
 * Servicio frontend para el sistema avanzado de reservas
 */

import { apiClient as api } from '@/api/client';

// ============================================
// INTERFACES
// ============================================

export interface Shift {
  id: number;
  branch_id: number | null;
  name: string;
  shift_type: 'lunch' | 'dinner' | 'brunch' | 'late_night';
  start_time: string;
  end_time: string;
  max_reservations: number;
  max_covers: number;
  overbooking_percentage: number;
  days_of_week: number[];
  is_active: boolean;
  current_reservations?: number;
  current_covers?: number;
  occupancy_percentage?: number;
  covers_percentage?: number;
}

export interface WaitlistEntry {
  id: number;
  branch_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_size: number;
  requested_date: string;
  requested_shift_id: number | null;
  preferred_time: string | null;
  flexible_time: boolean;
  status: 'waiting' | 'notified' | 'converted' | 'expired' | 'removed';
  position: number;
  notification_sent: boolean;
  converted_to_reservation_id: number | null;
  expires_at: string;
  notes: string | null;
  created_at: string;
  shift_name?: string;
}

export interface NoShowHistory {
  id: number;
  customer_phone: string;
  customer_email: string | null;
  reservation_id: number;
  no_show_date: string;
  penalty_applied: boolean;
  penalty_type: string | null;
  penalty_amount: number;
  penalty_expires_at: string | null;
  notes: string | null;
  created_at: string;
  reservation_date?: string;
  reservation_time?: string;
}

export interface CustomerPreferences {
  id: number;
  customer_phone: string;
  customer_name: string | null;
  preferred_table_ids: string | null;
  preferred_area: string | null;
  dietary_restrictions: string | null;
  vip_status: boolean;
  total_reservations: number;
  total_no_shows: number;
  loyalty_member_id: number | null;
  notes: string | null;
}

export interface Reminder {
  id: number;
  reservation_id: number;
  reminder_type: 'sms' | 'email' | 'whatsapp';
  scheduled_at: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  message_content: string | null;
  response: string | null;
  customer_name?: string;
  customer_phone?: string;
  reservation_date?: string;
  reservation_time?: string;
  party_size?: number;
}

export interface WidgetConfig {
  id: number;
  branch_id: number | null;
  widget_token: string;
  is_active: boolean;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  welcome_message: string;
  success_message: string;
  require_email: boolean;
  require_special_requests: boolean;
  show_occasions: boolean;
  min_advance_hours: number;
  max_advance_days: number;
  allowed_party_sizes: number[];
  blocked_dates: string[];
  custom_css: string | null;
  branch_name?: string;
  branch_address?: string;
}

export interface Occasion {
  id: number;
  name: string;
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

export interface Block {
  id: number;
  branch_id: number | null;
  block_type: 'full_day' | 'time_range' | 'specific_tables';
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  affected_tables: number[] | null;
  created_by: number | null;
  created_at: string;
}

export interface ReservationDashboard {
  today: {
    date: string;
    reservations: any[];
    stats: {
      total: number;
      confirmed: number;
      seated: number;
      completed: number;
      no_shows: number;
      cancelled: number;
      total_covers: number;
    };
    waitlist: WaitlistEntry[];
  };
  upcoming: {
    date: string;
    count: number;
    covers: number;
  }[];
  shifts: Shift[];
  pending_reminders: number;
}

export interface NoShowReport {
  period: { start: string; end: string };
  summary: {
    total_reservations: number;
    total_no_shows: number;
    total_completed: number;
    overall_no_show_rate: number;
  };
  top_no_show_customers: {
    customer_phone: string;
    no_show_count: number;
    last_no_show: string;
  }[];
  daily_breakdown: {
    date: string;
    total_reservations: number;
    no_shows: number;
    no_show_rate: number;
  }[];
}

export interface OccupancyReport {
  date: string;
  hourly_occupancy: {
    hour: string;
    reservations: number;
    covers: number;
  }[];
  table_occupancy: {
    id: number;
    table_number: string;
    capacity: number;
    reservation_count: number;
    active_reservations: number;
  }[];
}

export interface PublicReservationRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  shift_id?: number;
  occasion?: string;
  special_requests?: string;
}

// ============================================
// SHIFTS SERVICE
// ============================================

export const shiftService = {
  getAll: async (branchId?: number): Promise<Shift[]> => {
    const params = branchId ? { branchId } : {};
    const response = await api.get('/reservations/advanced/shifts', { params });
    return response.data.shifts;
  },

  create: async (shift: Partial<Shift>): Promise<Shift> => {
    const response = await api.post('/reservations/advanced/shifts', shift);
    return response.data.shift;
  },

  update: async (id: number, updates: Partial<Shift>): Promise<Shift> => {
    const response = await api.put(`/reservations/advanced/shifts/${id}`, updates);
    return response.data.shift;
  }
};

// ============================================
// WAITLIST SERVICE
// ============================================

export const waitlistService = {
  getAll: async (filters?: {
    date?: string;
    branch_id?: number;
    status?: string;
  }): Promise<WaitlistEntry[]> => {
    const response = await api.get('/reservations/advanced/waitlist', { params: filters });
    return response.data.waitlist;
  },

  add: async (entry: {
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    party_size: number;
    requested_date: string;
    requested_shift_id?: number;
    preferred_time?: string;
    flexible_time?: boolean;
    notes?: string;
    branch_id?: number;
  }): Promise<{ waitlist: WaitlistEntry; message: string }> => {
    const response = await api.post('/reservations/advanced/waitlist', entry);
    return response.data;
  },

  convert: async (waitlistId: number, data: {
    table_id?: number;
    reservation_time?: string;
  }): Promise<any> => {
    const response = await api.post(`/reservations/advanced/waitlist/${waitlistId}/convert`, data);
    return response.data.reservation;
  },

  remove: async (waitlistId: number, reason?: string): Promise<void> => {
    await api.delete(`/reservations/advanced/waitlist/${waitlistId}`, {
      data: { reason }
    });
  }
};

// ============================================
// NO-SHOW SERVICE
// ============================================

export const noShowService = {
  record: async (reservationId: number, data: {
    apply_penalty?: boolean;
    penalty_type?: string;
    notes?: string;
  }): Promise<{ total_no_shows: number; penalty_applied: boolean }> => {
    const response = await api.post(`/reservations/advanced/no-show/${reservationId}`, data);
    return response.data;
  },

  getHistory: async (phone: string): Promise<{
    history: NoShowHistory[];
    preferences: CustomerPreferences | null;
    total_no_shows: number;
    active_penalties: number;
  }> => {
    const response = await api.get(`/reservations/advanced/no-show/history/${encodeURIComponent(phone)}`);
    return response.data;
  }
};

// ============================================
// REMINDERS SERVICE
// ============================================

export const reminderService = {
  getPending: async (): Promise<Reminder[]> => {
    const response = await api.get('/reservations/advanced/reminders/pending');
    return response.data.reminders;
  },

  schedule: async (reservationId: number, data: {
    reminder_type?: 'sms' | 'email' | 'whatsapp';
    hours_before?: number;
    message_content?: string;
  }): Promise<Reminder> => {
    const response = await api.post(`/reservations/advanced/reminders/${reservationId}`, data);
    return response.data.reminder;
  },

  markSent: async (reminderId: number, response?: string): Promise<void> => {
    await api.post(`/reservations/advanced/reminders/${reminderId}/sent`, { response });
  }
};

// ============================================
// WIDGET SERVICE
// ============================================

export const widgetService = {
  // Público
  getConfig: async (token: string): Promise<{
    config: WidgetConfig;
    occasions: Occasion[];
    shifts: Shift[];
  }> => {
    const response = await api.get(`/reservations/advanced/widget/${token}`);
    return response.data;
  },

  // Público
  createReservation: async (token: string, data: PublicReservationRequest): Promise<{
    success: boolean;
    waitlisted?: boolean;
    position?: number;
    reservation?: {
      code: string;
      date: string;
      time: string;
      party_size: number;
      status: string;
    };
    message: string;
  }> => {
    const response = await api.post(`/reservations/advanced/widget/${token}/book`, data);
    return response.data;
  },

  // Dashboard
  createConfig: async (config: Partial<WidgetConfig>): Promise<{
    config: WidgetConfig;
    embed_url: string;
  }> => {
    const response = await api.post('/reservations/advanced/widget-config', config);
    return response.data;
  },

  updateConfig: async (id: number, updates: Partial<WidgetConfig>): Promise<WidgetConfig> => {
    const response = await api.put(`/reservations/advanced/widget-config/${id}`, updates);
    return response.data.config;
  },

  // Generar código embed
  getEmbedCode: (token: string, options?: {
    width?: string;
    height?: string;
  }): string => {
    const baseUrl = import.meta.env.VITE_FRONTEND_URL || 'https://app.sysme.cl';
    const width = options?.width || '100%';
    const height = options?.height || '600px';
    return `<iframe src="${baseUrl}/reservations/widget/${token}" width="${width}" height="${height}" frameborder="0" style="border: none; border-radius: 8px;"></iframe>`;
  }
};

// ============================================
// BLOCKS SERVICE
// ============================================

export const blockService = {
  getAll: async (filters?: {
    start_date?: string;
    end_date?: string;
    branch_id?: number;
  }): Promise<Block[]> => {
    const response = await api.get('/reservations/advanced/blocks', { params: filters });
    return response.data.blocks;
  },

  create: async (block: {
    block_type: 'full_day' | 'time_range' | 'specific_tables';
    block_date: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
    affected_tables?: number[];
    branch_id?: number;
  }): Promise<Block> => {
    const response = await api.post('/reservations/advanced/blocks', block);
    return response.data.block;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/reservations/advanced/blocks/${id}`);
  }
};

// ============================================
// DASHBOARD & REPORTS SERVICE
// ============================================

export const dashboardService = {
  get: async (branchId?: number): Promise<ReservationDashboard> => {
    const params = branchId ? { branch_id: branchId } : {};
    const response = await api.get('/reservations/advanced/dashboard', { params });
    return response.data.dashboard;
  }
};

export const reportService = {
  getNoShowReport: async (startDate?: string, endDate?: string): Promise<NoShowReport> => {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/reservations/advanced/reports/no-shows', { params });
    return response.data.report;
  },

  getOccupancyReport: async (date?: string, branchId?: number): Promise<OccupancyReport> => {
    const params: Record<string, any> = {};
    if (date) params.date = date;
    if (branchId) params.branch_id = branchId;
    const response = await api.get('/reservations/advanced/reports/occupancy', { params });
    return response.data.report;
  }
};

// ============================================
// UTILITIES
// ============================================

export const reservationUtils = {
  formatTime: (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  },

  getShiftLabel: (type: string): string => {
    const labels: Record<string, string> = {
      lunch: 'Almuerzo',
      dinner: 'Cena',
      brunch: 'Brunch',
      late_night: 'Trasnoche'
    };
    return labels[type] || type;
  },

  getStatusLabel: (status: string): string => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmada',
      seated: 'Sentado',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No asistió',
      waiting: 'En espera',
      notified: 'Notificado',
      converted: 'Convertido',
      expired: 'Expirado',
      removed: 'Removido'
    };
    return labels[status] || status;
  },

  getStatusColor: (status: string): string => {
    const colors: Record<string, string> = {
      pending: 'yellow',
      confirmed: 'blue',
      seated: 'green',
      completed: 'gray',
      cancelled: 'red',
      no_show: 'red',
      waiting: 'yellow',
      notified: 'blue',
      converted: 'green',
      expired: 'gray',
      removed: 'red'
    };
    return colors[status] || 'gray';
  },

  calculateOccupancyColor: (percentage: number): string => {
    if (percentage >= 90) return 'red';
    if (percentage >= 70) return 'orange';
    if (percentage >= 50) return 'yellow';
    return 'green';
  },

  getDayName: (dayNumber: number): string => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dayNumber % 7];
  },

  isDateBlocked: (date: string, blockedDates: string[]): boolean => {
    return blockedDates.includes(date);
  },

  getMinReservationDate: (minAdvanceHours: number): string => {
    const date = new Date();
    date.setHours(date.getHours() + minAdvanceHours);
    return date.toISOString().slice(0, 10);
  },

  getMaxReservationDate: (maxAdvanceDays: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + maxAdvanceDays);
    return date.toISOString().slice(0, 10);
  }
};

// ============================================
// WEBSOCKET EVENTS
// ============================================

export const reservationSocketEvents = {
  NEW_RESERVATION: 'reservation:new',
  RESERVATION_UPDATED: 'reservation:updated',
  RESERVATION_CANCELLED: 'reservation:cancelled',
  NEW_WAITLIST_ENTRY: 'waitlist:new_entry',
  WAITLIST_CONVERTED: 'waitlist:converted',
  NO_SHOW_RECORDED: 'reservation:no_show'
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  shifts: shiftService,
  waitlist: waitlistService,
  noShow: noShowService,
  reminders: reminderService,
  widget: widgetService,
  blocks: blockService,
  dashboard: dashboardService,
  reports: reportService,
  utils: reservationUtils,
  events: reservationSocketEvents
};
