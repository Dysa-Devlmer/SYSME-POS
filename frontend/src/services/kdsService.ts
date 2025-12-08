/**
 * =====================================================
 * SYSME POS - Kitchen Display System (KDS) Service
 * =====================================================
 * Servicio para interactuar con el sistema de pantalla de cocina
 *
 * @module kdsService
 * @author JARVIS AI Assistant
 * @date 2025-12-07
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

// ====================================
// INTERFACES Y TIPOS
// ====================================

export interface KDSStation {
  id: number;
  code: string;
  name: string;
  display_name: string;
  color: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  branch_id?: number;
  printer_id?: number;
  alert_minutes: number;
  auto_bump_minutes?: number;
  show_item_notes: boolean;
  show_modifiers: boolean;
  sound_enabled: boolean;
  sound_new_order: string;
  sound_urgent: string;
  item_counts?: {
    total: number;
    pending: number;
    preparing: number;
    ready: number;
  };
  created_at: string;
  updated_at: string;
}

export interface KDSOrderItem {
  kds_item_id: number;
  sale_item_id: number;
  status: 'pending' | 'preparing' | 'ready' | 'served' | 'voided';
  priority: 'scheduled' | 'normal' | 'rush' | 'urgent';
  quantity: number;
  product_name: string;
  modifiers: string[];
  notes?: string;
  started_at?: string;
  completed_at?: string;
  position: number;
}

export interface KDSOrder {
  sale_id: number;
  sale_number: string;
  table_number?: number;
  order_type: 'dine_in' | 'takeout' | 'delivery';
  salon_name?: string;
  order_notes?: string;
  priority: 'scheduled' | 'normal' | 'rush' | 'urgent';
  fire_time?: string;
  target_time?: string;
  elapsed_minutes: number;
  is_urgent: boolean;
  is_late: boolean;
  total_items: number;
  ready_items: number;
  created_at: string;
  items: KDSOrderItem[];
}

export interface CategoryRouting {
  id: number;
  category_id: number;
  station_id: number;
  priority: number;
  category_name: string;
  station_name: string;
  station_code: string;
  station_color: string;
}

export interface KDSAnalytics {
  avg_prep_time: Array<{
    station_name: string;
    station_code: string;
    items_completed: number;
    avg_prep_seconds: number;
    avg_prep_minutes: number;
    min_prep_seconds: number;
    max_prep_seconds: number;
  }>;
  hourly_stats: Array<{
    hour: number;
    items: number;
    avg_minutes: number;
  }>;
  recall_stats: {
    total_items: number;
    recalled_items: number;
    recall_rate: number;
  };
  current_queue: Array<{
    station_name: string;
    pending_items: number;
  }>;
  date_range: {
    start: string;
    end: string;
  };
}

export interface BumpResult {
  item_id: number;
  previous_status: string;
  new_status: string;
}

// ====================================
// WEBSOCKET CONNECTION
// ====================================

let socket: Socket | null = null;

export const connectKDS = (
  stationCode?: string,
  callbacks?: {
    onNewOrder?: (data: any) => void;
    onItemBumped?: (data: any) => void;
    onOrderBumped?: (data: any) => void;
    onOrderRecalled?: (data: any) => void;
    onPriorityChanged?: (data: any) => void;
    onOrderReady?: (data: any) => void;
  }
): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    transports: ['websocket'],
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('KDS Connected to WebSocket');

    // Join appropriate room
    if (stationCode) {
      socket?.emit('join', { room: `kds-station-${stationCode}` });
    }
    socket?.emit('join', { room: 'kitchen' });
  });

  // Register event handlers
  if (callbacks) {
    if (callbacks.onNewOrder) {
      socket.on('new_order', callbacks.onNewOrder);
    }
    if (callbacks.onItemBumped) {
      socket.on('item_bumped', callbacks.onItemBumped);
    }
    if (callbacks.onOrderBumped) {
      socket.on('order_bumped', callbacks.onOrderBumped);
    }
    if (callbacks.onOrderRecalled) {
      socket.on('order_recalled', callbacks.onOrderRecalled);
    }
    if (callbacks.onPriorityChanged) {
      socket.on('priority_changed', callbacks.onPriorityChanged);
    }
    if (callbacks.onOrderReady) {
      socket.on('order_ready', callbacks.onOrderReady);
    }
  }

  socket.on('disconnect', () => {
    console.log('KDS Disconnected from WebSocket');
  });

  return socket;
};

export const disconnectKDS = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ====================================
// INITIALIZATION
// ====================================

export const initKDSTables = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios.post(`${API_URL}/kds/init`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error initializing KDS');
  }
};

// ====================================
// STATION MANAGEMENT
// ====================================

export const getStations = async (activeOnly = true): Promise<KDSStation[]> => {
  try {
    const response = await axios.get(`${API_URL}/kds/stations`, {
      params: { active_only: activeOnly }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching stations');
  }
};

export const createStation = async (station: Partial<KDSStation>): Promise<KDSStation> => {
  try {
    const response = await axios.post(`${API_URL}/kds/stations`, station);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error creating station');
  }
};

export const updateStation = async (id: number, updates: Partial<KDSStation>): Promise<KDSStation> => {
  try {
    const response = await axios.put(`${API_URL}/kds/stations/${id}`, updates);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating station');
  }
};

// ====================================
// CATEGORY ROUTING
// ====================================

export const getCategoryRouting = async (): Promise<CategoryRouting[]> => {
  try {
    const response = await axios.get(`${API_URL}/kds/routing`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching routing');
  }
};

export const setCategoryRouting = async (
  categoryId: number,
  stationId: number,
  priority = 0
): Promise<void> => {
  try {
    await axios.post(`${API_URL}/kds/routing`, {
      category_id: categoryId,
      station_id: stationId,
      priority
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error setting routing');
  }
};

// ====================================
// ORDER DISPLAY
// ====================================

export const getStationOrders = async (
  stationId: number,
  includeReady = false
): Promise<{ orders: KDSOrder[]; order_count: number; item_count: number }> => {
  try {
    const response = await axios.get(`${API_URL}/kds/station/${stationId}/orders`, {
      params: { include_ready: includeReady }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching station orders');
  }
};

export const getExpoView = async (includeServed = false): Promise<KDSOrder[]> => {
  try {
    const response = await axios.get(`${API_URL}/kds/expo`, {
      params: { include_served: includeServed }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching expo view');
  }
};

// ====================================
// BUMP ACTIONS
// ====================================

export const bumpItem = async (
  itemId: number,
  action: 'next' | 'ready' | 'start' | 'undo' = 'next'
): Promise<BumpResult> => {
  try {
    const response = await axios.post(`${API_URL}/kds/bump/item/${itemId}`, { action });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error bumping item');
  }
};

export const bumpOrder = async (
  saleId: number,
  stationId?: number,
  action: 'ready' | 'served' = 'ready'
): Promise<{ items_bumped: number }> => {
  try {
    const response = await axios.post(`${API_URL}/kds/bump/order/${saleId}`, {
      station_id: stationId,
      action
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error bumping order');
  }
};

// ====================================
// RECALL
// ====================================

export const recallOrder = async (
  saleId: number,
  stationId?: number
): Promise<{ items_recalled: number }> => {
  try {
    const response = await axios.post(`${API_URL}/kds/recall/${saleId}`, {
      station_id: stationId
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error recalling order');
  }
};

export const getRecallableOrders = async (
  stationId?: number,
  minutes = 30
): Promise<Array<{
  sale_id: number;
  sale_number: string;
  table_number?: number;
  completed_at: string;
}>> => {
  try {
    const response = await axios.get(`${API_URL}/kds/recallable`, {
      params: { station_id: stationId, minutes }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching recallable orders');
  }
};

// ====================================
// PRIORITY
// ====================================

export const setOrderPriority = async (
  saleId: number,
  priority: 'scheduled' | 'normal' | 'rush' | 'urgent',
  fireTime?: string,
  targetTime?: string
): Promise<void> => {
  try {
    await axios.put(`${API_URL}/kds/priority/${saleId}`, {
      priority,
      fire_time: fireTime,
      target_time: targetTime
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error setting priority');
  }
};

// ====================================
// ANALYTICS
// ====================================

export const getKDSAnalytics = async (
  stationId?: number,
  startDate?: string,
  endDate?: string
): Promise<KDSAnalytics> => {
  try {
    const response = await axios.get(`${API_URL}/kds/analytics`, {
      params: {
        station_id: stationId,
        start_date: startDate,
        end_date: endDate
      }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching analytics');
  }
};

// ====================================
// UTILITIES
// ====================================

export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: '#F59E0B',    // Yellow
    preparing: '#3B82F6',  // Blue
    ready: '#10B981',      // Green
    served: '#6B7280',     // Gray
    voided: '#EF4444'      // Red
  };
  return colors[status] || '#6B7280';
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    scheduled: '#8B5CF6',  // Purple
    normal: '#3B82F6',     // Blue
    rush: '#F59E0B',       // Yellow
    urgent: '#EF4444'      // Red
  };
  return colors[priority] || '#3B82F6';
};

export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    scheduled: 'Programado',
    normal: 'Normal',
    rush: 'Rápido',
    urgent: 'URGENTE'
  };
  return labels[priority] || priority;
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    preparing: 'Preparando',
    ready: 'Listo',
    served: 'Servido',
    voided: 'Anulado'
  };
  return labels[status] || status;
};

export const formatElapsedTime = (minutes: number): string => {
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const playSound = (type: 'new_order' | 'urgent' | 'ready'): void => {
  const sounds: Record<string, string> = {
    new_order: '/sounds/ding.mp3',
    urgent: '/sounds/alert.mp3',
    ready: '/sounds/success.mp3'
  };

  const audio = new Audio(sounds[type]);
  audio.volume = 0.5;
  audio.play().catch(() => {
    console.warn('Could not play sound - user interaction required');
  });
};

// ====================================
// DEFAULT EXPORT
// ====================================

export default {
  // WebSocket
  connectKDS,
  disconnectKDS,

  // Init
  initKDSTables,

  // Stations
  getStations,
  createStation,
  updateStation,

  // Routing
  getCategoryRouting,
  setCategoryRouting,

  // Orders
  getStationOrders,
  getExpoView,

  // Bump
  bumpItem,
  bumpOrder,

  // Recall
  recallOrder,
  getRecallableOrders,

  // Priority
  setOrderPriority,

  // Analytics
  getKDSAnalytics,

  // Utilities
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel,
  formatElapsedTime,
  playSound
};
