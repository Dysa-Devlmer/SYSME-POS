/**
 * =====================================================
 * SYSME POS - Delivery Management Service
 * =====================================================
 * Servicio para gestión de entregas a domicilio
 *
 * @module deliveryService
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

export type DriverStatus = 'offline' | 'available' | 'busy' | 'break' | 'returning';
export type DeliveryStatus = 'pending' | 'assigned' | 'picking_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
export type VehicleType = 'motorcycle' | 'bicycle' | 'car' | 'walking';
export type DeliveryPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface DeliveryDriver {
  id: number;
  user_id?: number;
  code: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  rut?: string;
  photo_url?: string;
  vehicle_type: VehicleType;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  license_number?: string;
  license_expiry?: string;
  status: DriverStatus;
  is_active: boolean;
  is_verified: boolean;
  current_latitude?: number;
  current_longitude?: number;
  last_location_at?: string;
  current_delivery_id?: number;
  home_branch_id?: number;
  home_branch_name?: string;
  max_concurrent_orders: number;
  rating_average: number;
  total_ratings: number;
  total_deliveries: number;
  total_earnings: number;
  commission_type: 'percentage' | 'fixed';
  commission_value: number;
  bank_name?: string;
  bank_account_type?: string;
  bank_account_number?: string;
  active_deliveries?: number;
  today_stats?: {
    deliveries_today: number;
    earnings_today: number;
  };
  created_at: string;
  updated_at: string;
}

export interface DeliveryZone {
  id: number;
  name: string;
  code?: string;
  description?: string;
  branch_id?: number;
  branch_name?: string;
  polygon_coordinates?: string;
  center_latitude?: number;
  center_longitude?: number;
  radius_km?: number;
  min_order_amount: number;
  delivery_fee: number;
  free_delivery_min?: number;
  estimated_time_minutes: number;
  is_active: boolean;
  priority: number;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Delivery {
  id: number;
  delivery_number: string;
  sale_id: number;
  sale_number?: string;
  branch_id: number;
  branch_name?: string;
  branch_address?: string;
  driver_id?: number;
  driver_name?: string;
  driver_phone?: string;
  driver_latitude?: number;
  driver_longitude?: number;
  zone_id?: number;
  zone_name?: string;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  customer_name?: string;
  customer_phone?: string;
  customer_address: string;
  customer_address_detail?: string;
  customer_commune?: string;
  customer_city: string;
  customer_latitude?: number;
  customer_longitude?: number;
  customer_notes?: string;
  estimated_pickup_at?: string;
  estimated_delivery_at?: string;
  actual_pickup_at?: string;
  actual_delivery_at?: string;
  distance_km?: number;
  delivery_fee: number;
  driver_tip: number;
  driver_commission: number;
  order_total?: number;
  payment_method: 'prepaid' | 'cash' | 'card_on_delivery';
  payment_collected: number;
  requires_change_for?: number;
  proof_photo_url?: string;
  signature_url?: string;
  customer_rating?: number;
  customer_feedback?: string;
  driver_notes?: string;
  cancel_reason?: string;
  failed_reason?: string;
  is_scheduled: boolean;
  scheduled_for?: string;
  external_order_id?: string;
  external_platform?: string;
  status_history?: DeliveryStatusHistory[];
  driver_route?: Array<{ latitude: number; longitude: number; recorded_at: string }>;
  created_at: string;
  updated_at: string;
}

export interface DeliveryStatusHistory {
  id: number;
  delivery_id: number;
  status: DeliveryStatus;
  previous_status?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  changed_by?: number;
  changed_at: string;
}

export interface DriverLocation {
  driver_id: number;
  delivery_id?: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  battery_level?: number;
  recorded_at: string;
}

export interface DeliveryDashboard {
  today_stats: {
    total_deliveries: number;
    completed: number;
    pending: number;
    in_progress: number;
    cancelled: number;
    failed: number;
    total_fees: number;
    total_tips: number;
    avg_rating: number;
  };
  active_deliveries: Delivery[];
  available_drivers: DeliveryDriver[];
  hourly_distribution: Array<{ hour: string; count: number }>;
  timestamp: string;
}

export interface DeliveryFeeResult {
  covered: boolean;
  zone_id?: number;
  zone_name?: string;
  delivery_fee?: number;
  estimated_time?: number;
  free_delivery_min?: number;
  min_order?: number;
}

export interface DriverPerformance {
  id: number;
  code: string;
  name: string;
  total_deliveries: number;
  completed: number;
  failed: number;
  avg_rating: number;
  total_commissions: number;
  total_tips: number;
  total_distance: number;
  avg_delivery_minutes: number;
}

// ====================================
// WEBSOCKET CONNECTION
// ====================================

let socket: Socket | null = null;

export const connectDelivery = (
  callbacks?: {
    onNewDelivery?: (data: any) => void;
    onDeliveryAssigned?: (data: any) => void;
    onDeliveryStatusUpdated?: (data: any) => void;
    onDriverStatusChanged?: (data: any) => void;
    onDriverLocationUpdated?: (data: any) => void;
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
    console.log('Delivery connected to WebSocket');
    socket?.emit('join', { room: 'delivery' });
  });

  if (callbacks) {
    if (callbacks.onNewDelivery) {
      socket.on('new_delivery', callbacks.onNewDelivery);
    }
    if (callbacks.onDeliveryAssigned) {
      socket.on('delivery_assigned', callbacks.onDeliveryAssigned);
    }
    if (callbacks.onDeliveryStatusUpdated) {
      socket.on('delivery_status_updated', callbacks.onDeliveryStatusUpdated);
    }
    if (callbacks.onDriverStatusChanged) {
      socket.on('driver_status_changed', callbacks.onDriverStatusChanged);
    }
    if (callbacks.onDriverLocationUpdated) {
      socket.on('driver_location_updated', callbacks.onDriverLocationUpdated);
    }
  }

  return socket;
};

export const disconnectDelivery = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ====================================
// INITIALIZATION
// ====================================

export const initDeliveryTables = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios.post(`${API_URL}/delivery/init`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error initializing delivery');
  }
};

// ====================================
// DRIVERS
// ====================================

export const getDrivers = async (options?: {
  status?: DriverStatus;
  branch_id?: number;
  active_only?: boolean;
  include_stats?: boolean;
}): Promise<DeliveryDriver[]> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/drivers`, { params: options });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching drivers');
  }
};

export const getDriverById = async (id: number): Promise<DeliveryDriver> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/drivers/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching driver');
  }
};

export const createDriver = async (driver: Partial<DeliveryDriver>): Promise<DeliveryDriver> => {
  try {
    const response = await axios.post(`${API_URL}/delivery/drivers`, driver);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error creating driver');
  }
};

export const updateDriver = async (id: number, updates: Partial<DeliveryDriver>): Promise<DeliveryDriver> => {
  try {
    const response = await axios.put(`${API_URL}/delivery/drivers/${id}`, updates);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating driver');
  }
};

export const updateDriverStatus = async (id: number, status: DriverStatus): Promise<void> => {
  try {
    await axios.put(`${API_URL}/delivery/drivers/${id}/status`, { status });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating driver status');
  }
};

export const updateDriverLocation = async (
  id: number,
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    battery_level?: number;
    delivery_id?: number;
  }
): Promise<void> => {
  try {
    await axios.post(`${API_URL}/delivery/drivers/${id}/location`, location);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating location');
  }
};

// ====================================
// DELIVERY ZONES
// ====================================

export const getDeliveryZones = async (options?: {
  branch_id?: number;
  active_only?: boolean;
}): Promise<DeliveryZone[]> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/zones`, { params: options });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching zones');
  }
};

export const createDeliveryZone = async (zone: Partial<DeliveryZone>): Promise<DeliveryZone> => {
  try {
    const response = await axios.post(`${API_URL}/delivery/zones`, zone);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error creating zone');
  }
};

export const updateDeliveryZone = async (id: number, updates: Partial<DeliveryZone>): Promise<DeliveryZone> => {
  try {
    const response = await axios.put(`${API_URL}/delivery/zones/${id}`, updates);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating zone');
  }
};

export const calculateDeliveryFee = async (
  latitude: number,
  longitude: number,
  branchId: number,
  orderTotal: number
): Promise<DeliveryFeeResult> => {
  try {
    const response = await axios.post(`${API_URL}/delivery/zones/calculate-fee`, {
      latitude,
      longitude,
      branch_id: branchId,
      order_total: orderTotal
    });
    return response.data.data;
  } catch (error: any) {
    if (error.response?.data?.data) {
      return error.response.data.data;
    }
    throw new Error(error.response?.data?.message || 'Error calculating fee');
  }
};

// ====================================
// DELIVERIES
// ====================================

export const getDeliveries = async (options?: {
  page?: number;
  limit?: number;
  status?: string;
  branch_id?: number;
  driver_id?: number;
  date?: string;
  start_date?: string;
  end_date?: string;
}): Promise<{ data: Delivery[]; pagination: any }> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/deliveries`, { params: options });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching deliveries');
  }
};

export const getDeliveryById = async (id: number): Promise<Delivery> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/deliveries/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching delivery');
  }
};

export const createDelivery = async (delivery: {
  sale_id: number;
  branch_id: number;
  customer_name?: string;
  customer_phone?: string;
  customer_address: string;
  customer_address_detail?: string;
  customer_commune?: string;
  customer_city?: string;
  customer_latitude?: number;
  customer_longitude?: number;
  customer_notes?: string;
  zone_id?: number;
  delivery_fee?: number;
  payment_method?: 'prepaid' | 'cash' | 'card_on_delivery';
  requires_change_for?: number;
  is_scheduled?: boolean;
  scheduled_for?: string;
  priority?: DeliveryPriority;
}): Promise<Delivery> => {
  try {
    const response = await axios.post(`${API_URL}/delivery/deliveries`, delivery);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error creating delivery');
  }
};

export const assignDriver = async (deliveryId: number, driverId: number): Promise<void> => {
  try {
    await axios.post(`${API_URL}/delivery/deliveries/${deliveryId}/assign`, {
      driver_id: driverId
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error assigning driver');
  }
};

export const autoAssignDriver = async (deliveryId: number): Promise<void> => {
  try {
    await axios.post(`${API_URL}/delivery/deliveries/${deliveryId}/auto-assign`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error auto-assigning driver');
  }
};

export const updateDeliveryStatus = async (
  deliveryId: number,
  status: DeliveryStatus,
  options?: {
    notes?: string;
    latitude?: number;
    longitude?: number;
    proof_photo_url?: string;
    signature_url?: string;
    payment_collected?: number;
  }
): Promise<void> => {
  try {
    await axios.put(`${API_URL}/delivery/deliveries/${deliveryId}/status`, {
      status,
      ...options
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating status');
  }
};

export const rateDelivery = async (
  deliveryId: number,
  rating: number,
  feedback?: string
): Promise<void> => {
  try {
    await axios.post(`${API_URL}/delivery/deliveries/${deliveryId}/rate`, {
      rating,
      feedback
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error rating delivery');
  }
};

export const trackDelivery = async (deliveryNumber: string): Promise<{
  delivery_number: string;
  status: DeliveryStatus;
  customer_address: string;
  estimated_delivery_at?: string;
  actual_delivery_at?: string;
  driver_first_name?: string;
  current_latitude?: number;
  current_longitude?: number;
  vehicle_type?: VehicleType;
}> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/tracking/${deliveryNumber}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error tracking delivery');
  }
};

// ====================================
// DASHBOARD & ANALYTICS
// ====================================

export const getDeliveryDashboard = async (branchId?: number): Promise<DeliveryDashboard> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/dashboard`, {
      params: { branch_id: branchId }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching dashboard');
  }
};

export const getDriverPerformance = async (options?: {
  start_date?: string;
  end_date?: string;
  driver_id?: number;
}): Promise<DriverPerformance[]> => {
  try {
    const response = await axios.get(`${API_URL}/delivery/performance`, { params: options });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching performance');
  }
};

// ====================================
// UTILITIES
// ====================================

export const getDeliveryStatusColor = (status: DeliveryStatus): string => {
  const colors: Record<DeliveryStatus, string> = {
    pending: '#F59E0B',      // Yellow
    assigned: '#3B82F6',     // Blue
    picking_up: '#8B5CF6',   // Purple
    in_transit: '#06B6D4',   // Cyan
    delivered: '#10B981',    // Green
    cancelled: '#6B7280',    // Gray
    failed: '#EF4444'        // Red
  };
  return colors[status] || '#6B7280';
};

export const getDeliveryStatusLabel = (status: DeliveryStatus): string => {
  const labels: Record<DeliveryStatus, string> = {
    pending: 'Pendiente',
    assigned: 'Asignado',
    picking_up: 'Recogiendo',
    in_transit: 'En Camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    failed: 'Fallido'
  };
  return labels[status] || status;
};

export const getDriverStatusColor = (status: DriverStatus): string => {
  const colors: Record<DriverStatus, string> = {
    offline: '#6B7280',    // Gray
    available: '#10B981',  // Green
    busy: '#F59E0B',       // Yellow
    break: '#8B5CF6',      // Purple
    returning: '#3B82F6'   // Blue
  };
  return colors[status] || '#6B7280';
};

export const getDriverStatusLabel = (status: DriverStatus): string => {
  const labels: Record<DriverStatus, string> = {
    offline: 'Desconectado',
    available: 'Disponible',
    busy: 'Ocupado',
    break: 'En Descanso',
    returning: 'Regresando'
  };
  return labels[status] || status;
};

export const getVehicleIcon = (type: VehicleType): string => {
  const icons: Record<VehicleType, string> = {
    motorcycle: '🏍️',
    bicycle: '🚴',
    car: '🚗',
    walking: '🚶'
  };
  return icons[type] || '🚗';
};

export const getPriorityColor = (priority: DeliveryPriority): string => {
  const colors: Record<DeliveryPriority, string> = {
    low: '#6B7280',
    normal: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444'
  };
  return colors[priority] || '#3B82F6';
};

export const getPriorityLabel = (priority: DeliveryPriority): string => {
  const labels: Record<DeliveryPriority, string> = {
    low: 'Baja',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente'
  };
  return labels[priority] || priority;
};

export const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

export const calculateETA = (estimatedAt: string): string => {
  const now = new Date();
  const eta = new Date(estimatedAt);
  const diffMinutes = Math.round((eta.getTime() - now.getTime()) / 60000);

  if (diffMinutes < 0) return 'Atrasado';
  if (diffMinutes === 0) return 'Llegando';
  if (diffMinutes < 60) return `${diffMinutes} min`;
  return formatDuration(diffMinutes);
};

// ====================================
// DEFAULT EXPORT
// ====================================

export default {
  // WebSocket
  connectDelivery,
  disconnectDelivery,

  // Init
  initDeliveryTables,

  // Drivers
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  updateDriverStatus,
  updateDriverLocation,

  // Zones
  getDeliveryZones,
  createDeliveryZone,
  updateDeliveryZone,
  calculateDeliveryFee,

  // Deliveries
  getDeliveries,
  getDeliveryById,
  createDelivery,
  assignDriver,
  autoAssignDriver,
  updateDeliveryStatus,
  rateDelivery,
  trackDelivery,

  // Dashboard
  getDeliveryDashboard,
  getDriverPerformance,

  // Utilities
  getDeliveryStatusColor,
  getDeliveryStatusLabel,
  getDriverStatusColor,
  getDriverStatusLabel,
  getVehicleIcon,
  getPriorityColor,
  getPriorityLabel,
  formatDistance,
  formatDuration,
  calculateETA
};
