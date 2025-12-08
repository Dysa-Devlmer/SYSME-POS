/**
 * Business Intelligence Service
 * Servicio frontend para análisis de inteligencia de negocios
 */

import { apiClient as api } from '@/api/client';

// ============================================
// INTERFACES
// ============================================

export interface DashboardSummary {
  sales: {
    total_transactions: number;
    total_revenue: number;
    avg_ticket: number;
  };
  inventory: {
    total_products: number;
    low_stock: number;
  };
  generated_at: string;
}

export interface SalesForecast {
  historical: {
    date: string;
    revenue: number;
    transactions: number;
  }[];
  forecast: {
    next_day_estimate: number;
    confidence: number;
    method: string;
  };
}

export interface MenuProduct {
  id: number;
  name: string;
  price: number;
  cost: number;
  total_sold: number;
  total_revenue: number;
  margin: number;
  classification: 'star' | 'puzzle' | 'plow_horse' | 'dog';
}

export interface MenuEngineering {
  products: MenuProduct[];
  summary: {
    stars: number;
    puzzles: number;
    plow_horses: number;
    dogs: number;
  };
}

export interface RFMCustomer {
  id: number;
  name: string;
  phone: string;
  last_purchase: string;
  frequency: number;
  monetary: number;
  rfm_score?: number;
  segment?: string;
}

export interface RFMAnalysis {
  customers: RFMCustomer[];
  total_analyzed: number;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high';
  data: any;
  message: string;
}

export interface AnomalyDetection {
  anomalies: Anomaly[];
  checked_at: string;
}

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export const biService = {
  // Dashboard summary
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get('/business-intelligence/dashboard/summary');
    return response.data.data;
  },

  // Sales forecasting
  getSalesForecast: async (): Promise<SalesForecast> => {
    const response = await api.get('/business-intelligence/forecasting/sales');
    return response.data.data;
  },

  // Menu engineering
  getMenuEngineering: async (): Promise<MenuEngineering> => {
    const response = await api.get('/business-intelligence/menu-engineering');
    return response.data.data;
  },

  // RFM Analysis
  getRFMAnalysis: async (): Promise<RFMAnalysis> => {
    const response = await api.get('/business-intelligence/customers/rfm');
    return response.data.data;
  },

  // Anomaly detection
  getAnomalies: async (): Promise<AnomalyDetection> => {
    const response = await api.get('/business-intelligence/anomalies');
    return response.data.data;
  }
};

// ============================================
// UTILIDADES
// ============================================

export const biUtils = {
  // Formatear moneda CLP
  formatCLP: (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  },

  // Obtener color según clasificación de producto
  getProductClassificationColor: (classification: string): string => {
    const colors: Record<string, string> = {
      star: 'green',
      puzzle: 'yellow',
      plow_horse: 'blue',
      dog: 'red'
    };
    return colors[classification] || 'gray';
  },

  // Obtener label de clasificación
  getProductClassificationLabel: (classification: string): string => {
    const labels: Record<string, string> = {
      star: '⭐ Estrella',
      puzzle: '🧩 Enigma',
      plow_horse: '🐴 Caballo de Arado',
      dog: '🐕 Perro'
    };
    return labels[classification] || classification;
  },

  // Obtener descripción de clasificación
  getProductClassificationDesc: (classification: string): string => {
    const descs: Record<string, string> = {
      star: 'Alta popularidad, alto margen - Mantener y promover',
      puzzle: 'Baja popularidad, alto margen - Promocionar más',
      plow_horse: 'Alta popularidad, bajo margen - Revisar precios',
      dog: 'Baja popularidad, bajo margen - Considerar eliminar'
    };
    return descs[classification] || '';
  },

  // Calcular RFM score
  calculateRFMScore: (customer: RFMCustomer): number => {
    // Simple scoring: recency (days ago), frequency, monetary
    const daysSinceLastPurchase = Math.floor(
      (Date.now() - new Date(customer.last_purchase).getTime()) / (1000 * 60 * 60 * 24)
    );

    const recencyScore = daysSinceLastPurchase <= 30 ? 5 : daysSinceLastPurchase <= 60 ? 3 : 1;
    const frequencyScore = customer.frequency >= 10 ? 5 : customer.frequency >= 5 ? 3 : 1;
    const monetaryScore = customer.monetary >= 100000 ? 5 : customer.monetary >= 50000 ? 3 : 1;

    return recencyScore + frequencyScore + monetaryScore;
  },

  // Segmentar cliente según RFM
  segmentCustomer: (rfmScore: number): string => {
    if (rfmScore >= 12) return '🏆 VIP';
    if (rfmScore >= 9) return '💎 Leal';
    if (rfmScore >= 6) return '👤 Regular';
    return '😴 En Riesgo';
  },

  // Obtener color de anomalía
  getAnomalySeverityColor: (severity: string): string => {
    const colors: Record<string, string> = {
      low: 'blue',
      medium: 'yellow',
      high: 'red'
    };
    return colors[severity] || 'gray';
  },

  // Obtener icono de anomalía
  getAnomalyIcon: (type: string): string => {
    const icons: Record<string, string> = {
      high_value_transaction: '💰',
      excessive_refunds: '↩️',
      low_sales: '📉',
      inventory_alert: '📦',
      default: '⚠️'
    };
    return icons[type] || icons.default;
  },

  // Calcular tendencia
  calculateTrend: (data: number[]): 'up' | 'down' | 'stable' => {
    if (data.length < 2) return 'stable';
    const first = data.slice(0, Math.floor(data.length / 2)).reduce((a, b) => a + b, 0);
    const second = data.slice(Math.floor(data.length / 2)).reduce((a, b) => a + b, 0);
    const diff = ((second - first) / first) * 100;

    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  },

  // Formatear porcentaje
  formatPercent: (value: number): string => {
    return `${value.toFixed(1)}%`;
  },

  // Formatear confianza de forecast
  formatConfidence: (confidence: number): string => {
    return `${(confidence * 100).toFixed(0)}%`;
  }
};

// ============================================
// CONFIGURACIÓN DE GRÁFICOS
// ============================================

export const biChartConfig = {
  colors: {
    primary: '#E53935',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#2196F3',
    star: '#4CAF50',
    puzzle: '#FF9800',
    plowHorse: '#2196F3',
    dog: '#F44336'
  },

  // Forecast chart options
  forecastChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: $${context.raw.toLocaleString('es-CL')}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: number) => `$${(value / 1000).toFixed(0)}K`
        }
      }
    }
  },

  // BCG Matrix chart options
  bcgChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const }
    }
  },

  // RFM scatter options
  rfmScatterOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.raw.name}: $${context.raw.y.toLocaleString('es-CL')}`;
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Frecuencia' }
      },
      y: {
        title: { display: true, text: 'Valor Monetario' }
      }
    }
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  service: biService,
  utils: biUtils,
  chartConfig: biChartConfig
};
