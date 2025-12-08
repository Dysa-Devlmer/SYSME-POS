// Business Intelligence Service - Frontend Integration
import api from './api';
import { io, Socket } from 'socket.io-client';

// Types
export interface ForecastData {
  date: string;
  predicted_sales: number;
  confidence_lower: number;
  confidence_upper: number;
  trend: 'up' | 'down' | 'stable';
  seasonality_factor: number;
}

export interface MenuItemAnalysis {
  product_id: number;
  product_name: string;
  category: string;
  classification: 'star' | 'puzzle' | 'plow_horse' | 'dog';
  profitability: number;
  popularity: number;
  profit_margin: number;
  sales_volume: number;
  revenue_contribution: number;
  recommendations: string[];
  price_elasticity: number;
}

export interface CustomerRFM {
  customer_id: number;
  customer_name: string;
  email: string;
  phone: string;
  recency_days: number;
  frequency: number;
  monetary_value: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_score: number;
  segment: string;
  lifetime_value: number;
  churn_probability: number;
  recommendations: string[];
}

export interface DashboardMetrics {
  period: string;
  real_time: {
    current_customers: number;
    active_orders: number;
    today_sales: number;
    hourly_rate: number;
    staff_online: number;
    tables_occupied: number;
    average_wait_time: number;
  };
  sales: {
    today: number;
    yesterday: number;
    week_to_date: number;
    month_to_date: number;
    year_to_date: number;
    growth_rate: number;
    average_ticket: number;
    conversion_rate: number;
  };
  operations: {
    order_accuracy: number;
    service_speed: number;
    table_turnover: number;
    labor_cost_percentage: number;
    food_cost_percentage: number;
    waste_percentage: number;
    productivity_score: number;
  };
  customers: {
    new_customers_today: number;
    returning_rate: number;
    satisfaction_score: number;
    average_lifetime_value: number;
    churn_rate: number;
    top_segments: any[];
  };
  financial: {
    gross_margin: number;
    net_margin: number;
    cash_flow: number;
    revenue_per_employee: number;
    revenue_per_table: number;
    break_even_point: number;
    profit_trend: string;
  };
  trends: {
    sales_trend: number[];
    customer_trend: number[];
    peak_hours: string[];
    best_sellers: any[];
    category_performance: any[];
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
  last_updated: string;
}

export interface Anomaly {
  id: string;
  type: 'fraud' | 'unusual_sale' | 'inventory' | 'refund' | 'discount' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  entity_type: string;
  entity_id: number;
  description: string;
  details: any;
  recommended_action: string;
  confidence_score: number;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
}

export interface Recommendation {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'very_high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  expected_benefit: string;
  implementation_steps: string[];
  metrics_to_track: string[];
  estimated_roi: number;
  confidence: number;
  data_points: any;
}

class BIService {
  private socket: Socket | null = null;
  private baseURL = '/api/business-intelligence';

  // Initialize WebSocket connection
  initializeWebSocket(token: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io('/business-intelligence', {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to BI WebSocket');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from BI WebSocket');
    });

    this.socket.on('error', (error: any) => {
      console.error('BI WebSocket error:', error);
    });

    return this.socket;
  }

  // Dashboard APIs
  async getDashboardMetrics(period: string = 'today'): Promise<DashboardMetrics> {
    const response = await api.get(`${this.baseURL}/dashboard/metrics`, {
      params: { period }
    });
    return response.data.data;
  }

  async getExecutiveSummary() {
    const response = await api.get(`${this.baseURL}/dashboard/executive-summary`);
    return response.data.data;
  }

  subscribeToDashboard(period: string = 'today', callback: (metrics: DashboardMetrics) => void) {
    if (!this.socket) throw new Error('WebSocket not initialized');

    this.socket.emit('subscribe:dashboard', { period });
    this.socket.on('dashboard:metrics', callback);
  }

  unsubscribeFromDashboard() {
    if (!this.socket) return;

    this.socket.emit('unsubscribe:dashboard');
    this.socket.off('dashboard:metrics');
  }

  // Forecasting APIs
  async getSalesForecast(days: number = 30): Promise<ForecastData[]> {
    const response = await api.get(`${this.baseURL}/forecasting/sales`, {
      params: { days }
    });
    return response.data.data;
  }

  async getProductForecast(productId: number, days: number = 30): Promise<ForecastData[]> {
    const response = await api.get(`${this.baseURL}/forecasting/sales/product/${productId}`, {
      params: { days }
    });
    return response.data.data;
  }

  async getInventoryRecommendations() {
    const response = await api.get(`${this.baseURL}/forecasting/inventory`);
    return response.data.data;
  }

  async getCashFlowPrediction(days: number = 30) {
    const response = await api.get(`${this.baseURL}/forecasting/cash-flow`, {
      params: { days }
    });
    return response.data.data;
  }

  subscribeToForecasts(callback: (forecast: ForecastData[]) => void) {
    if (!this.socket) throw new Error('WebSocket not initialized');

    this.socket.emit('subscribe:forecasts');
    this.socket.on('forecast:weekly', callback);
    this.socket.on('forecast:updated', callback);
  }

  // Menu Engineering APIs
  async getMenuAnalysis(period: number = 30): Promise<MenuItemAnalysis[]> {
    const response = await api.get(`${this.baseURL}/analytics/menu/analysis`, {
      params: { period }
    });
    return response.data.data;
  }

  async getCategoryPerformance() {
    const response = await api.get(`${this.baseURL}/analytics/menu/categories`);
    return response.data.data;
  }

  async getPriceRecommendations() {
    const response = await api.get(`${this.baseURL}/analytics/menu/pricing`);
    return response.data.data;
  }

  async getComboRecommendations() {
    const response = await api.get(`${this.baseURL}/analytics/menu/combos`);
    return response.data.data;
  }

  // Customer Analytics APIs
  async getRFMAnalysis(): Promise<CustomerRFM[]> {
    const response = await api.get(`${this.baseURL}/analytics/customers/rfm`);
    return response.data.data;
  }

  async getCustomerSegments() {
    const response = await api.get(`${this.baseURL}/analytics/customers/segments`);
    return response.data.data;
  }

  async getChurnPredictions() {
    const response = await api.get(`${this.baseURL}/analytics/customers/churn`);
    return response.data.data;
  }

  async getRetentionCampaigns() {
    const response = await api.get(`${this.baseURL}/analytics/customers/retention-campaigns`);
    return response.data.data;
  }

  async getNextBestActions(customerId: number) {
    const response = await api.get(`${this.baseURL}/analytics/customers/${customerId}/next-actions`);
    return response.data.data;
  }

  // Anomaly Detection APIs
  async detectAnomalies(): Promise<Anomaly[]> {
    const response = await api.get(`${this.baseURL}/forecasting/anomalies`);
    return response.data.data;
  }

  async getAnomalySummary() {
    const response = await api.get(`${this.baseURL}/forecasting/anomalies/summary`);
    return response.data.data;
  }

  async updateAnomalyStatus(id: string, status: string, notes?: string) {
    const response = await api.put(`${this.baseURL}/forecasting/anomalies/${id}/status`, {
      status,
      notes
    });
    return response.data;
  }

  subscribeToAnomalies(callback: (anomaly: Anomaly) => void) {
    if (!this.socket) throw new Error('WebSocket not initialized');

    this.socket.emit('subscribe:anomalies');
    this.socket.on('anomaly:detected', callback);
    this.socket.on('anomalies:summary', callback);
  }

  acknowledgeAlert(alertId: string) {
    if (!this.socket) throw new Error('WebSocket not initialized');

    this.socket.emit('alert:acknowledge', { alertId });
  }

  // Recommendations APIs
  async getRecommendations(): Promise<Recommendation[]> {
    const response = await api.get(`${this.baseURL}/dashboard/recommendations`);
    return response.data.data;
  }

  async getTargetedRecommendations(area: string): Promise<Recommendation[]> {
    const response = await api.get(`${this.baseURL}/dashboard/recommendations/${area}`);
    return response.data.data;
  }

  async trackRecommendation(id: string, status: 'started' | 'completed' | 'cancelled') {
    const response = await api.post(`${this.baseURL}/dashboard/recommendations/${id}/track`, {
      status
    });
    return response.data;
  }

  // Reports APIs
  async getComprehensiveReport(period: string = 'month') {
    const response = await api.get(`${this.baseURL}/reports/comprehensive`, {
      params: { period }
    });
    return response.data.data;
  }

  async getSalesPerformanceReport(startDate?: string, endDate?: string) {
    const response = await api.get(`${this.baseURL}/reports/sales-performance`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return response.data.data;
  }

  async getCustomerAnalyticsReport() {
    const response = await api.get(`${this.baseURL}/reports/customer-analytics`);
    return response.data.data;
  }

  async getMenuOptimizationReport() {
    const response = await api.get(`${this.baseURL}/reports/menu-optimization`);
    return response.data.data;
  }

  async getOperationalEfficiencyReport() {
    const response = await api.get(`${this.baseURL}/reports/operational-efficiency`);
    return response.data.data;
  }

  async exportReport(type: string, format: 'json' | 'csv' = 'json') {
    const response = await api.get(`${this.baseURL}/reports/export/${type}`, {
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json'
    });

    if (format === 'csv') {
      // Download CSV file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-report.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }

    return response.data;
  }

  // Real-time metric requests
  requestMetric(metric: string, params?: any) {
    if (!this.socket) throw new Error('WebSocket not initialized');

    this.socket.emit('request:metric', { metric, params });
  }

  // Auto-update control
  async startAutoUpdate(interval: number = 300000) {
    const response = await api.post(`${this.baseURL}/dashboard/auto-update/start`, { interval });
    return response.data;
  }

  async stopAutoUpdate() {
    const response = await api.post(`${this.baseURL}/dashboard/auto-update/stop`);
    return response.data;
  }

  // Train models (admin only)
  async trainModels() {
    const response = await api.post(`${this.baseURL}/forecasting/train`);
    return response.data;
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new BIService();