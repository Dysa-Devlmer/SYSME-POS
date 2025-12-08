/**
 * Executive Dashboard Service
 * Servicio frontend para el dashboard ejecutivo
 */

import api from './api';

// ============================================
// INTERFACES
// ============================================

export interface SalesKPIs {
  total_revenue: number;
  total_revenue_formatted: string;
  total_transactions: number;
  average_ticket: number;
  average_ticket_formatted: string;
  total_tax: number;
  unique_customers: number;
  revenue_change_percent: number;
  revenue_trend: 'up' | 'down';
}

export interface TablesKPIs {
  total: number;
  occupied: number;
  occupancy_rate: number;
  todays_reservations: number;
  expected_covers: number;
}

export interface DeliveryKPIs {
  total: number;
  completed: number;
  in_progress: number;
  avg_delivery_minutes: number;
  active_drivers: number;
}

export interface InventoryKPIs {
  total_products: number;
  low_stock: number;
  out_of_stock: number;
  inventory_value: number;
  inventory_value_formatted: string;
}

export interface LoyaltyKPIs {
  total_members: number;
  todays_transactions: number;
  points_earned_today: number;
  points_redeemed_today: number;
}

export interface DashboardKPIs {
  sales: SalesKPIs;
  tables: TablesKPIs;
  delivery: DeliveryKPIs;
  inventory: InventoryKPIs;
  loyalty: LoyaltyKPIs;
}

export interface HourlySale {
  hour: string;
  transactions: number;
  revenue: number;
}

export interface WeeklyTrend {
  date: string;
  transactions: number;
  revenue: number;
}

export interface TopProduct {
  id: number;
  name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CategorySale {
  category: string;
  revenue: number;
  quantity: number;
}

export interface PaymentMethod {
  payment_method: string;
  count: number;
  amount: number;
}

export interface BranchComparison {
  id: number;
  name: string;
  code: string;
  transactions: number;
  revenue: number;
  avg_ticket: number;
}

export interface DashboardCharts {
  hourly_sales: HourlySale[];
  weekly_trend: WeeklyTrend[];
  top_products: TopProduct[];
  categories: CategorySale[];
  payment_methods: PaymentMethod[];
  branch_comparison: BranchComparison[];
}

export interface DashboardAlert {
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  icon: string;
}

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  min_stock: number;
}

export interface ExecutiveDashboard {
  period: {
    start: string;
    end: string;
    label: string;
  };
  generated_at: string;
  kpis: DashboardKPIs;
  charts: DashboardCharts;
  alerts: DashboardAlert[];
  low_stock_items: LowStockItem[];
}

export interface QuickSummary {
  today_revenue: number;
  today_revenue_formatted: string;
  today_transactions: number;
  occupied_tables: number;
  pending_deliveries: number;
  pending_reservations: number;
  active_qr_sessions: number;
  timestamp: string;
}

export interface RealTimeMetrics {
  sales_last_hour: number;
  revenue_last_hour: number;
  revenue_last_hour_formatted: string;
  current_occupied: number;
  active_sessions: number;
  deliveries_in_transit: number;
  pending_waiter_calls: number;
  timestamp: string;
}

export interface PeriodData {
  transactions: number;
  revenue: number;
  revenue_formatted: string;
  avg_ticket: number;
  avg_ticket_formatted: string;
  unique_customers: number;
  active_days: number;
}

export interface PeriodComparison {
  period1: {
    range: { start: string; end: string };
    data: PeriodData;
  };
  period2: {
    range: { start: string; end: string };
    data: PeriodData;
  };
  changes: {
    revenue: number;
    transactions: number;
    avg_ticket: number;
    customers: number;
  };
}

export interface DayOfWeekSales {
  day_name: string;
  day_number: string;
  transactions: number;
  avg_revenue: number;
  total_revenue: number;
}

export interface HourlySalesPattern {
  hour: string;
  transactions: number;
  avg_revenue: number;
  total_revenue: number;
}

export interface ServerPerformance {
  id: number;
  name: string;
  transactions: number;
  total_sales: number;
  total_sales_formatted: string;
  avg_ticket: number;
  avg_ticket_formatted: string;
  total_tips: number;
  total_tips_formatted: string;
}

export type DashboardPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter';

// ============================================
// SERVICIO PRINCIPAL
// ============================================

export const dashboardService = {
  // Dashboard ejecutivo completo
  getExecutive: async (options?: {
    branch_id?: number;
    period?: DashboardPeriod;
  }): Promise<ExecutiveDashboard> => {
    const response = await api.get('/executive-dashboard', { params: options });
    return response.data;
  },

  // Resumen rápido para widgets
  getQuickSummary: async (): Promise<QuickSummary> => {
    const response = await api.get('/executive-dashboard/quick-summary');
    return response.data.summary;
  },

  // Métricas en tiempo real
  getRealTime: async (): Promise<RealTimeMetrics> => {
    const response = await api.get('/executive-dashboard/realtime');
    return response.data.realtime;
  },

  // Comparar dos períodos
  comparePeriods: async (
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
  ): Promise<PeriodComparison> => {
    const response = await api.get('/executive-dashboard/compare', {
      params: {
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End
      }
    });
    return response.data.comparison;
  },

  // Exportar reporte
  exportReport: async (options: {
    format?: 'json' | 'csv';
    period?: DashboardPeriod;
    branch_id?: number;
  }): Promise<Blob | any> => {
    const response = await api.get('/executive-dashboard/export', {
      params: options,
      responseType: options.format === 'csv' ? 'blob' : 'json'
    });
    return response.data;
  },

  // Descargar CSV
  downloadCSV: async (period: DashboardPeriod = 'week'): Promise<void> => {
    const response = await api.get('/executive-dashboard/export', {
      params: { format: 'csv', period },
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

// ============================================
// SERVICIO DE GRÁFICOS
// ============================================

export const chartService = {
  // Ventas por día de la semana
  getByDayOfWeek: async (weeks: number = 4): Promise<DayOfWeekSales[]> => {
    const response = await api.get('/executive-dashboard/charts/by-day-of-week', {
      params: { weeks }
    });
    return response.data.data;
  },

  // Ventas por hora
  getByHour: async (days: number = 7): Promise<HourlySalesPattern[]> => {
    const response = await api.get('/executive-dashboard/charts/by-hour', {
      params: { days }
    });
    return response.data.data;
  },

  // Rendimiento de meseros
  getServerPerformance: async (period: DashboardPeriod = 'week'): Promise<ServerPerformance[]> => {
    const response = await api.get('/executive-dashboard/charts/server-performance', {
      params: { period }
    });
    return response.data.data;
  }
};

// ============================================
// UTILIDADES
// ============================================

export const dashboardUtils = {
  // Formatear número como moneda CLP
  formatCLP: (amount: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  },

  // Formatear porcentaje con signo
  formatPercentChange: (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  },

  // Obtener color según tendencia
  getTrendColor: (value: number): string => {
    if (value > 0) return 'green';
    if (value < 0) return 'red';
    return 'gray';
  },

  // Obtener color de alerta
  getAlertColor: (type: string): string => {
    switch (type) {
      case 'critical': return 'red';
      case 'warning': return 'yellow';
      case 'info': return 'blue';
      default: return 'gray';
    }
  },

  // Obtener color de ocupación
  getOccupancyColor: (rate: number): string => {
    if (rate >= 90) return 'red';
    if (rate >= 70) return 'orange';
    if (rate >= 50) return 'yellow';
    return 'green';
  },

  // Formatear hora
  formatHour: (hour: string): string => {
    const h = parseInt(hour);
    return `${h}:00`;
  },

  // Obtener label del período
  getPeriodLabel: (period: DashboardPeriod): string => {
    const labels: Record<DashboardPeriod, string> = {
      today: 'Hoy',
      yesterday: 'Ayer',
      week: 'Última semana',
      month: 'Último mes',
      quarter: 'Último trimestre'
    };
    return labels[period];
  },

  // Calcular porcentaje de stock
  getStockPercentage: (stock: number, minStock: number): number => {
    if (minStock === 0) return 100;
    return Math.round((stock / minStock) * 100);
  },

  // Obtener icono de método de pago
  getPaymentIcon: (method: string): string => {
    const icons: Record<string, string> = {
      cash: '💵',
      credit_card: '💳',
      debit_card: '💳',
      transfer: '🏦',
      other: '💰'
    };
    return icons[method] || '💰';
  },

  // Obtener label de método de pago
  getPaymentLabel: (method: string): string => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      credit_card: 'Tarjeta Crédito',
      debit_card: 'Tarjeta Débito',
      transfer: 'Transferencia',
      other: 'Otro'
    };
    return labels[method] || method;
  }
};

// ============================================
// CONFIGURACIÓN DE GRÁFICOS
// ============================================

export const chartConfig = {
  // Colores para gráficos
  colors: {
    primary: '#E53935',
    secondary: '#1976D2',
    success: '#4CAF50',
    warning: '#FF9800',
    danger: '#F44336',
    info: '#2196F3',
    gray: '#9E9E9E'
  },

  // Paleta para categorías
  categoryPalette: [
    '#E53935', '#1976D2', '#4CAF50', '#FF9800', '#9C27B0',
    '#00BCD4', '#795548', '#607D8B', '#E91E63', '#3F51B5'
  ],

  // Configuración de Chart.js para ventas por hora
  hourlyChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `$${context.raw.toLocaleString('es-CL')}`;
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

  // Configuración para gráfico de tendencia semanal
  weeklyTrendOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' as const }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  },

  // Configuración para gráfico de pie
  pieChartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const }
    }
  }
};

// ============================================
// HOOKS HELPERS
// ============================================

export const getRefreshInterval = (period: DashboardPeriod): number => {
  // Intervalo de refresco en milisegundos según período
  switch (period) {
    case 'today': return 30000; // 30 segundos
    case 'yesterday': return 300000; // 5 minutos
    default: return 60000; // 1 minuto
  }
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  dashboard: dashboardService,
  charts: chartService,
  utils: dashboardUtils,
  config: chartConfig,
  getRefreshInterval
};
