/**
 * =====================================================
 * AI Service - Frontend API Client
 * =====================================================
 * Service for interacting with AI/ML backend endpoints
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/ai`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const aiService = {
  // =====================================================
  // Demand Forecasting
  // =====================================================

  /**
   * Get demand forecast for a product
   */
  async getDemandForecast(productId: number, daysAhead: number = 7) {
    return apiClient.get(`/forecast/${productId}`, {
      params: { daysAhead }
    });
  },

  /**
   * Get reorder recommendations
   */
  async getReorderRecommendations(confidenceThreshold: number = 0.6) {
    return apiClient.get('/reorder-recommendations', {
      params: { confidence_threshold: confidenceThreshold }
    });
  },

  /**
   * Get sales pattern analysis
   */
  async getSalesPatterns(productId?: number, daysBack: number = 30) {
    return apiClient.get('/patterns/sales', {
      params: { productId, daysBack }
    });
  },

  // =====================================================
  // Recommendations
  // =====================================================

  /**
   * Get personalized recommendations for a customer
   */
  async getPersonalizedRecommendations(customerId: number, limit: number = 10) {
    return apiClient.get(`/recommendations/${customerId}`, {
      params: { limit }
    });
  },

  /**
   * Get frequently bought together products
   */
  async getFrequentlyBoughtTogether(productId: number, limit: number = 5) {
    return apiClient.get(`/frequently-bought-together/${productId}`, {
      params: { limit }
    });
  },

  /**
   * Get upsell options for a product
   */
  async getUpsellOptions(productId: number, limit: number = 3) {
    return apiClient.get(`/upsell/${productId}`, {
      params: { limit }
    });
  },

  /**
   * Get cross-sell suggestions for cart
   */
  async getCrossSellSuggestions(cartItems: any[], limit: number = 5) {
    return apiClient.post('/cross-sell', {
      cartItems,
      limit
    });
  },

  /**
   * Get trending products
   */
  async getTrendingProducts(limit: number = 10) {
    return apiClient.get('/trending', {
      params: { limit }
    });
  },

  // =====================================================
  // Proactive Alerts
  // =====================================================

  /**
   * Run monitoring and get alerts
   */
  async monitorAndGetAlerts() {
    return apiClient.get('/alerts/monitor');
  },

  /**
   * Get active alerts
   */
  async getActiveAlerts(filters?: {
    severity?: string;
    type?: string;
    limit?: number;
  }) {
    return apiClient.get('/alerts', {
      params: filters
    });
  },

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: number) {
    return apiClient.put(`/alerts/${alertId}/dismiss`);
  },

  /**
   * Take automated action on an alert
   */
  async takeAlertAction(alertId: number, action: string) {
    return apiClient.post(`/alerts/${alertId}/action`, {
      action
    });
  },

  /**
   * Get alert statistics
   */
  async getAlertStatistics(daysBack: number = 30) {
    return apiClient.get('/alerts/statistics', {
      params: { daysBack }
    });
  },

  // =====================================================
  // Dashboard
  // =====================================================

  /**
   * Get AI dashboard overview
   */
  async getDashboard() {
    return apiClient.get('/dashboard');
  }
};

export default aiService;
