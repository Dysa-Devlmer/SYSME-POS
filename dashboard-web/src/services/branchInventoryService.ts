/**
 * =====================================================
 * SYSME POS - Multi-Branch Inventory Sync Service
 * =====================================================
 * Servicio para sincronización de inventario entre sucursales
 *
 * @module branchInventoryService
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

export interface Branch {
  id: number;
  code: string;
  name: string;
  address?: string;
  commune?: string;
  city: string;
  region: string;
  phone?: string;
  email?: string;
  manager_id?: number;
  manager_name?: string;
  is_warehouse: boolean;
  is_active: boolean;
  timezone: string;
  opening_time: string;
  closing_time: string;
  latitude?: number;
  longitude?: number;
  stock_summary?: {
    total_products: number;
    total_units: number;
    low_stock_count: number;
    out_of_stock_count: number;
  };
  created_at: string;
  updated_at: string;
}

export interface BranchInventoryItem {
  id: number;
  branch_id: number;
  product_id: number;
  product_name: string;
  sku: string;
  barcode?: string;
  price: number;
  cost: number;
  category_name?: string;
  quantity: number;
  min_stock: number;
  max_stock: number;
  reorder_point: number;
  avg_daily_sales: number;
  days_of_stock?: number;
  location_code?: string;
  stock_status: 'normal' | 'low' | 'critical' | 'out_of_stock';
  created_at: string;
  updated_at: string;
}

export interface TransferItem {
  id: number;
  transfer_id: number;
  product_id: number;
  product_name: string;
  sku?: string;
  category_name?: string;
  quantity_requested: number;
  quantity_shipped?: number;
  quantity_received?: number;
  unit_cost: number;
  total_cost: number;
  status: 'pending' | 'shipped' | 'received' | 'cancelled';
  notes?: string;
}

export interface InventoryTransfer {
  id: number;
  transfer_number: string;
  from_branch_id: number;
  from_branch_name: string;
  from_branch_code: string;
  to_branch_id: number;
  to_branch_name: string;
  to_branch_code: string;
  status: 'pending' | 'approved' | 'shipped' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  transfer_type: 'manual' | 'automatic' | 'rebalance';
  requested_by?: number;
  requested_by_name?: string;
  approved_by?: number;
  approved_by_name?: string;
  shipped_by?: number;
  received_by?: number;
  requested_at: string;
  approved_at?: string;
  shipped_at?: string;
  received_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  estimated_arrival?: string;
  shipping_cost: number;
  total_cost?: number;
  notes?: string;
  items?: TransferItem[];
  items_count?: number;
  created_at: string;
  updated_at: string;
}

export interface LowStockAlert {
  id: number;
  branch_id: number;
  branch_name: string;
  branch_code: string;
  product_id: number;
  product_name: string;
  sku?: string;
  current_quantity: number;
  min_stock: number;
  reorder_point: number;
  suggested_quantity: number;
  suggested_from_branch_id?: number;
  suggested_branch_name?: string;
  suggested_branch_code?: string;
  suggested_branch_quantity?: number;
  alert_type: 'low_stock' | 'out_of_stock';
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: number;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_type?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface StockMovement {
  id: number;
  branch_id: number;
  branch_name: string;
  product_id: number;
  product_name: string;
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'transfer_cancel' | 'return' | 'waste';
  quantity: number;
  quantity_before: number;
  quantity_after: number;
  reference_type?: string;
  reference_id?: number;
  unit_cost?: number;
  total_cost?: number;
  notes?: string;
  performed_by?: number;
  performed_at: string;
}

export interface TransferSuggestion {
  needs_branch_id: number;
  needs_branch_name: string;
  product_id: number;
  product_name: string;
  current_quantity: number;
  min_stock: number;
  reorder_point: number;
  max_stock: number;
  has_branch_id: number;
  has_branch_name: string;
  available_quantity: number;
  suggested_quantity: number;
}

export interface InventorySyncDashboard {
  branch_summary: Array<{
    id: number;
    code: string;
    name: string;
    total_products: number;
    total_units: number;
    critical_count: number;
    low_count: number;
    out_of_stock_count: number;
  }>;
  pending_transfers: InventoryTransfer[];
  active_alerts_count: number;
  recent_movements: StockMovement[];
  transfer_stats: {
    total_transfers: number;
    completed: number;
    pending: number;
    in_transit: number;
    cancelled: number;
  };
}

export interface ProductBranchStock {
  branch_id: number;
  branch_code: string;
  branch_name: string;
  is_warehouse: boolean;
  quantity: number;
  min_stock: number;
  reorder_point: number;
  max_stock: number;
  avg_daily_sales?: number;
  status: 'normal' | 'low' | 'critical' | 'out_of_stock';
}

// ====================================
// WEBSOCKET CONNECTION
// ====================================

let socket: Socket | null = null;

export const connectInventorySync = (
  callbacks?: {
    onStockUpdated?: (data: any) => void;
    onTransferCreated?: (data: any) => void;
    onTransferApproved?: (data: any) => void;
    onTransferShipped?: (data: any) => void;
    onTransferCompleted?: (data: any) => void;
    onLowStockAlert?: (data: any) => void;
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
    console.log('Inventory Sync connected to WebSocket');
    socket?.emit('join', { room: 'inventory' });
  });

  if (callbacks) {
    if (callbacks.onStockUpdated) {
      socket.on('stock_updated', callbacks.onStockUpdated);
    }
    if (callbacks.onTransferCreated) {
      socket.on('transfer_created', callbacks.onTransferCreated);
    }
    if (callbacks.onTransferApproved) {
      socket.on('transfer_approved', callbacks.onTransferApproved);
    }
    if (callbacks.onTransferShipped) {
      socket.on('transfer_shipped', callbacks.onTransferShipped);
    }
    if (callbacks.onTransferCompleted) {
      socket.on('transfer_completed', callbacks.onTransferCompleted);
    }
    if (callbacks.onLowStockAlert) {
      socket.on('low_stock_alert', callbacks.onLowStockAlert);
    }
  }

  return socket;
};

export const disconnectInventorySync = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ====================================
// INITIALIZATION
// ====================================

export const initBranchInventoryTables = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await axios.post(`${API_URL}/branch-inventory/init`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error initializing tables');
  }
};

// ====================================
// BRANCHES
// ====================================

export const getBranches = async (activeOnly = true, includeStock = false): Promise<Branch[]> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/branches`, {
      params: { active_only: activeOnly, include_stock: includeStock }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching branches');
  }
};

export const createBranch = async (branch: Partial<Branch>): Promise<Branch> => {
  try {
    const response = await axios.post(`${API_URL}/branch-inventory/branches`, branch);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error creating branch');
  }
};

export const updateBranch = async (id: number, updates: Partial<Branch>): Promise<Branch> => {
  try {
    const response = await axios.put(`${API_URL}/branch-inventory/branches/${id}`, updates);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating branch');
  }
};

// ====================================
// BRANCH INVENTORY
// ====================================

export const getBranchInventory = async (
  branchId: number,
  options?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    low_stock_only?: boolean;
  }
): Promise<{ data: BranchInventoryItem[]; pagination: any }> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/branch/${branchId}/inventory`, {
      params: options
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching inventory');
  }
};

export const updateBranchStock = async (
  branchId: number,
  productId: number,
  quantity: number,
  movementType: 'set' | 'add' | 'subtract' | 'adjustment' = 'adjustment',
  notes?: string
): Promise<{ quantity_before: number; quantity_after: number; change: number }> => {
  try {
    const response = await axios.put(
      `${API_URL}/branch-inventory/branch/${branchId}/product/${productId}/stock`,
      { quantity, movement_type: movementType, notes }
    );
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error updating stock');
  }
};

export const getProductAcrossBranches = async (
  productId: number
): Promise<{
  product: any;
  branches: ProductBranchStock[];
  summary: {
    total_stock: number;
    branches_count: number;
    low_stock_count: number;
    branches_with_stock: number;
  };
}> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/product/${productId}/branches`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching product stock');
  }
};

// ====================================
// TRANSFERS
// ====================================

export const getTransfers = async (
  options?: {
    page?: number;
    limit?: number;
    status?: string;
    from_branch_id?: number;
    to_branch_id?: number;
    start_date?: string;
    end_date?: string;
  }
): Promise<{ data: InventoryTransfer[]; pagination: any }> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/transfers`, { params: options });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching transfers');
  }
};

export const getTransferById = async (id: number): Promise<InventoryTransfer> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/transfers/${id}`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching transfer');
  }
};

export const createTransfer = async (transfer: {
  from_branch_id: number;
  to_branch_id: number;
  items: Array<{ product_id: number; quantity: number; notes?: string }>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  estimated_arrival?: string;
}): Promise<InventoryTransfer> => {
  try {
    const response = await axios.post(`${API_URL}/branch-inventory/transfers`, transfer);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error creating transfer');
  }
};

export const approveTransfer = async (id: number): Promise<void> => {
  try {
    await axios.post(`${API_URL}/branch-inventory/transfers/${id}/approve`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error approving transfer');
  }
};

export const shipTransfer = async (
  id: number,
  itemsShipped?: Array<{ product_id: number; quantity: number }>
): Promise<void> => {
  try {
    await axios.post(`${API_URL}/branch-inventory/transfers/${id}/ship`, {
      items_shipped: itemsShipped
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error shipping transfer');
  }
};

export const receiveTransfer = async (
  id: number,
  itemsReceived?: Array<{ product_id: number; quantity: number }>
): Promise<void> => {
  try {
    await axios.post(`${API_URL}/branch-inventory/transfers/${id}/receive`, {
      items_received: itemsReceived
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error receiving transfer');
  }
};

export const cancelTransfer = async (id: number, reason: string): Promise<void> => {
  try {
    await axios.post(`${API_URL}/branch-inventory/transfers/${id}/cancel`, { reason });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error cancelling transfer');
  }
};

// ====================================
// ALERTS
// ====================================

export const getLowStockAlerts = async (
  branchId?: number,
  status: 'active' | 'acknowledged' | 'resolved' = 'active'
): Promise<LowStockAlert[]> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/alerts`, {
      params: { branch_id: branchId, status }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching alerts');
  }
};

export const acknowledgeAlert = async (id: number): Promise<void> => {
  try {
    await axios.post(`${API_URL}/branch-inventory/alerts/${id}/acknowledge`);
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error acknowledging alert');
  }
};

export const resolveAlert = async (
  id: number,
  resolutionType: string,
  notes?: string
): Promise<void> => {
  try {
    await axios.post(`${API_URL}/branch-inventory/alerts/${id}/resolve`, {
      resolution_type: resolutionType,
      notes
    });
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error resolving alert');
  }
};

// ====================================
// ANALYTICS & DASHBOARD
// ====================================

export const getInventorySyncDashboard = async (): Promise<InventorySyncDashboard> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/dashboard`);
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching dashboard');
  }
};

export const getSuggestedTransfers = async (branchId?: number): Promise<TransferSuggestion[]> => {
  try {
    const response = await axios.get(`${API_URL}/branch-inventory/suggestions`, {
      params: { branch_id: branchId }
    });
    return response.data.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Error fetching suggestions');
  }
};

// ====================================
// UTILITIES
// ====================================

export const getStockStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    normal: '#10B981',      // Green
    low: '#F59E0B',         // Yellow
    critical: '#EF4444',    // Red
    out_of_stock: '#6B7280' // Gray
  };
  return colors[status] || '#6B7280';
};

export const getTransferStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: '#F59E0B',     // Yellow
    approved: '#3B82F6',    // Blue
    shipped: '#8B5CF6',     // Purple
    completed: '#10B981',   // Green
    cancelled: '#EF4444'    // Red
  };
  return colors[status] || '#6B7280';
};

export const getTransferStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    approved: 'Aprobada',
    shipped: 'En Tránsito',
    completed: 'Completada',
    cancelled: 'Cancelada'
  };
  return labels[status] || status;
};

export const getStockStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    normal: 'Normal',
    low: 'Bajo',
    critical: 'Crítico',
    out_of_stock: 'Sin Stock'
  };
  return labels[status] || status;
};

export const formatQuantity = (quantity: number, unit?: string): string => {
  const formatted = quantity.toLocaleString('es-CL', { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
};

export const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    low: '#6B7280',
    normal: '#3B82F6',
    high: '#F59E0B',
    urgent: '#EF4444'
  };
  return colors[priority] || '#3B82F6';
};

export const getPriorityLabel = (priority: string): string => {
  const labels: Record<string, string> = {
    low: 'Baja',
    normal: 'Normal',
    high: 'Alta',
    urgent: 'Urgente'
  };
  return labels[priority] || priority;
};

// ====================================
// DEFAULT EXPORT
// ====================================

export default {
  // WebSocket
  connectInventorySync,
  disconnectInventorySync,

  // Init
  initBranchInventoryTables,

  // Branches
  getBranches,
  createBranch,
  updateBranch,

  // Inventory
  getBranchInventory,
  updateBranchStock,
  getProductAcrossBranches,

  // Transfers
  getTransfers,
  getTransferById,
  createTransfer,
  approveTransfer,
  shipTransfer,
  receiveTransfer,
  cancelTransfer,

  // Alerts
  getLowStockAlerts,
  acknowledgeAlert,
  resolveAlert,

  // Dashboard
  getInventorySyncDashboard,
  getSuggestedTransfers,

  // Utilities
  getStockStatusColor,
  getTransferStatusColor,
  getTransferStatusLabel,
  getStockStatusLabel,
  formatQuantity,
  getPriorityColor,
  getPriorityLabel
};
