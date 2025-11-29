/**
 * Servicio de Analytics y Métricas
 * Gestiona todas las métricas y KPIs del sistema
 */

import api from './api';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface SalesMetrics {
  totalSales: number;
  totalTransactions: number;
  averageTicket: number;
  salesGrowth: number;
  transactionGrowth: number;
  ticketGrowth: number;
  salesTarget?: number;
  timeline: Array<{
    date: string;
    total: number;
    transactions: number;
  }>;
  topProducts: Array<{
    id: number;
    name: string;
    quantity: number;
    total: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    sales: number;
    transactions: number;
  }>;
  categoryBreakdown: Array<{
    id: number;
    name: string;
    total: number;
    percentage: number;
  }>;
}

export interface InventoryMetrics {
  totalProducts: number;
  totalValue: number;
  lowStock: number;
  outOfStock: number;
  expiringProducts: number;
  turnoverRate: number;
  topMovingProducts: Array<{
    id: number;
    name: string;
    movement: number;
  }>;
  deadStock: Array<{
    id: number;
    name: string;
    daysWithoutMovement: number;
  }>;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  retentionRate: number;
  satisfaction: number;
  customerGrowth: number;
  averageSpend: number;
  lifetimeValue: number;
  churnRate: number;
  topCustomers: Array<{
    id: number;
    name: string;
    totalSpent: number;
    visits: number;
  }>;
}

export interface PerformanceMetrics {
  responseTime: number;
  uptime: number;
  errors: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeUsers: number;
  requestsPerSecond: number;
  cacheHitRate: number;
  databaseConnections: number;
}

export interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  achieved: boolean;
  trend: number[];
  category: string;
  importance: 'high' | 'medium' | 'low';
}

class AnalyticsService {
  /**
   * Obtiene métricas de ventas
   */
  async getSalesMetrics(dateRange?: DateRange): Promise<SalesMetrics> {
    try {
      const params = dateRange ? {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      } : {};

      const response = await api.get('/analytics/sales', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo métricas de ventas:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas de inventario
   */
  async getInventoryMetrics(): Promise<InventoryMetrics> {
    try {
      const response = await api.get('/analytics/inventory');
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo métricas de inventario:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas de clientes
   */
  async getCustomerMetrics(dateRange?: DateRange): Promise<CustomerMetrics> {
    try {
      const params = dateRange ? {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      } : {};

      const response = await api.get('/analytics/customers', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo métricas de clientes:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas de rendimiento del sistema
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const response = await api.get('/analytics/performance');
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo métricas de rendimiento:', error);
      throw error;
    }
  }

  /**
   * Obtiene KPIs configurados
   */
  async getKPIs(dateRange?: DateRange): Promise<KPI[]> {
    try {
      const params = dateRange ? {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      } : {};

      const response = await api.get('/analytics/kpis', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo KPIs:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis de tendencias
   */
  async getTrendAnalysis(metric: string, period: string): Promise<any> {
    try {
      const response = await api.get('/analytics/trends', {
        params: { metric, period }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo análisis de tendencias:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis comparativo
   */
  async getComparativeAnalysis(period1: DateRange, period2: DateRange): Promise<any> {
    try {
      const response = await api.post('/analytics/compare', {
        period1: {
          start: period1.start.toISOString(),
          end: period1.end.toISOString()
        },
        period2: {
          start: period2.start.toISOString(),
          end: period2.end.toISOString()
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo análisis comparativo:', error);
      throw error;
    }
  }

  /**
   * Obtiene predicciones
   */
  async getPredictions(metric: string, days: number = 7): Promise<any> {
    try {
      const response = await api.get('/analytics/predictions', {
        params: { metric, days }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo predicciones:', error);
      throw error;
    }
  }

  /**
   * Exporta métricas
   */
  async exportMetrics(format: 'pdf' | 'excel' | 'csv', dateRange?: DateRange): Promise<Blob> {
    try {
      const params = dateRange ? {
        format,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      } : { format };

      const response = await api.get('/analytics/export', {
        params,
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Error exportando métricas:', error);
      throw error;
    }
  }

  /**
   * Obtiene dashboard personalizado
   */
  async getCustomDashboard(dashboardId: string): Promise<any> {
    try {
      const response = await api.get(`/analytics/dashboards/${dashboardId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo dashboard personalizado:', error);
      throw error;
    }
  }

  /**
   * Guarda configuración de dashboard
   */
  async saveDashboardConfig(config: any): Promise<any> {
    try {
      const response = await api.post('/analytics/dashboards', config);
      return response.data.data;
    } catch (error) {
      console.error('Error guardando configuración de dashboard:', error);
      throw error;
    }
  }

  /**
   * Obtiene métricas en tiempo real via WebSocket
   */
  subscribeToRealTimeMetrics(callback: (metrics: any) => void): () => void {
    // Aquí implementarías la suscripción WebSocket
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/analytics`);

    ws.onmessage = (event) => {
      const metrics = JSON.parse(event.data);
      callback(metrics);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Retornar función de limpieza
    return () => {
      ws.close();
    };
  }

  /**
   * Calcula ROI de una campaña o período
   */
  async calculateROI(params: {
    investment: number;
    dateRange: DateRange;
    campaignId?: string;
  }): Promise<any> {
    try {
      const response = await api.post('/analytics/roi', {
        investment: params.investment,
        startDate: params.dateRange.start.toISOString(),
        endDate: params.dateRange.end.toISOString(),
        campaignId: params.campaignId
      });
      return response.data.data;
    } catch (error) {
      console.error('Error calculando ROI:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis de cohort
   */
  async getCohortAnalysis(params: {
    cohortType: 'weekly' | 'monthly';
    metric: 'retention' | 'revenue' | 'orders';
    periods: number;
  }): Promise<any> {
    try {
      const response = await api.get('/analytics/cohort', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo análisis de cohort:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis ABC de productos
   */
  async getABCAnalysis(): Promise<any> {
    try {
      const response = await api.get('/analytics/abc');
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo análisis ABC:', error);
      throw error;
    }
  }

  /**
   * Obtiene heatmap de ventas
   */
  async getSalesHeatmap(granularity: 'hour' | 'day' | 'week' = 'hour'): Promise<any> {
    try {
      const response = await api.get('/analytics/heatmap', {
        params: { granularity }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo heatmap de ventas:', error);
      throw error;
    }
  }

  /**
   * Obtiene análisis de canasta
   */
  async getBasketAnalysis(minSupport: number = 0.01): Promise<any> {
    try {
      const response = await api.get('/analytics/basket', {
        params: { minSupport }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error obteniendo análisis de canasta:', error);
      throw error;
    }
  }
}

// Singleton
const analyticsService = new AnalyticsService();
export default analyticsService;