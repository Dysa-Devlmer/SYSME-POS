/**
 * Dashboard Service - Real-time analytics and KPIs
 * Consolidated data for dashboard visualization
 */

import reportsService from './reportsService';

// ============================================
// TYPES
// ============================================

export interface DashboardKPIs {
  today_sales: number;
  today_revenue: number;
  today_transactions: number;
  active_tables: number;
  open_cash_sessions: number;
  low_stock_products: number;
  today_vs_yesterday_percentage: number;
  week_vs_last_week_percentage: number;
}

export interface DashboardChartData {
  hourly_sales: Array<{
    hour: string;
    sales: number;
    revenue: number;
  }>;
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  top_categories: Array<{
    name: string;
    revenue: number;
  }>;
  payment_methods: Array<{
    method: string;
    amount: number;
    percentage: number;
  }>;
  weekly_trend: Array<{
    day: string;
    sales: number;
    revenue: number;
  }>;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  charts: DashboardChartData;
  last_updated: string;
}

// ============================================
// DASHBOARD SERVICE
// ============================================

const dashboardService = {
  /**
   * Get complete dashboard data (KPIs + Charts)
   */
  getDashboardData: async (): Promise<DashboardData> => {
    try {
      // Fetch all data in parallel
      const [
        todaySales,
        yesterdaySales,
        hourlySales,
        topProducts,
        topCategories,
        paymentMethods,
        weeklySales,
        inventory,
        cashSessions
      ] = await Promise.all([
        // Today's sales
        reportsService.sales.getSalesReport({
          ...reportsService.dates.getToday(),
          group_by: 'day'
        }),
        // Yesterday's sales
        reportsService.sales.getSalesReport({
          ...reportsService.dates.getYesterday(),
          group_by: 'day'
        }),
        // Hourly sales for today
        reportsService.sales.getHourlySales({
          date: reportsService.dates.getToday().start_date
        }),
        // Top 10 products this week
        reportsService.performance.getProductPerformance({
          ...reportsService.dates.getThisWeek(),
          limit: 10
        }),
        // Top categories this week
        reportsService.performance.getCategoryPerformance(
          reportsService.dates.getThisWeek()
        ),
        // Payment methods today
        reportsService.sales.getPaymentMethods(
          reportsService.dates.getToday()
        ),
        // Weekly sales trend
        reportsService.sales.getSalesReport({
          ...reportsService.dates.getThisWeek(),
          group_by: 'day'
        }),
        // Inventory status
        reportsService.inventory.getInventoryReport(),
        // Cash sessions today
        reportsService.cash.getCashSessionsReport(
          reportsService.dates.getToday()
        )
      ]);

      // Calculate KPIs
      const todayRevenue = todaySales.summary.total_revenue || 0;
      const yesterdayRevenue = yesterdaySales.summary.total_revenue || 0;
      const todayTransactions = todaySales.summary.total_sales || 0;

      const todayVsYesterdayPercentage = yesterdayRevenue > 0
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
        : 0;

      const kpis: DashboardKPIs = {
        today_sales: todayTransactions,
        today_revenue: todayRevenue,
        today_transactions: todayTransactions,
        active_tables: 0, // This would come from tables service
        open_cash_sessions: cashSessions.summary.open_sessions,
        low_stock_products: inventory.summary.low_stock_count,
        today_vs_yesterday_percentage: todayVsYesterdayPercentage,
        week_vs_last_week_percentage: 0 // Would need last week data
      };

      // Prepare chart data
      const totalPayments = paymentMethods.reduce((sum, pm) => sum + pm.total_amount, 0);

      const charts: DashboardChartData = {
        hourly_sales: hourlySales.map(h => ({
          hour: h.hour,
          sales: h.sales_count,
          revenue: h.revenue
        })),
        top_products: topProducts.slice(0, 10).map(p => ({
          name: p.name,
          quantity: p.units_sold,
          revenue: p.total_revenue
        })),
        top_categories: topCategories.slice(0, 5).map(c => ({
          name: c.name,
          revenue: c.total_revenue
        })),
        payment_methods: paymentMethods.map(pm => ({
          method: pm.payment_method,
          amount: pm.total_amount,
          percentage: totalPayments > 0 ? (pm.total_amount / totalPayments) * 100 : 0
        })),
        weekly_trend: weeklySales.by_period.map(p => ({
          day: p.period,
          sales: p.sales_count,
          revenue: p.revenue
        }))
      };

      return {
        kpis,
        charts,
        last_updated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  /**
   * Get real-time KPIs only (faster update)
   */
  getKPIsOnly: async (): Promise<DashboardKPIs> => {
    const [todaySales, inventory, cashSessions] = await Promise.all([
      reportsService.sales.getSalesReport({
        ...reportsService.dates.getToday(),
        group_by: 'day'
      }),
      reportsService.inventory.getInventoryReport(),
      reportsService.cash.getCashSessionsReport(
        reportsService.dates.getToday()
      )
    ]);

    return {
      today_sales: todaySales.summary.total_sales || 0,
      today_revenue: todaySales.summary.total_revenue || 0,
      today_transactions: todaySales.summary.total_sales || 0,
      active_tables: 0,
      open_cash_sessions: cashSessions.summary.open_sessions,
      low_stock_products: inventory.summary.low_stock_count,
      today_vs_yesterday_percentage: 0,
      week_vs_last_week_percentage: 0
    };
  }
};

export default dashboardService;
