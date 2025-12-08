// Executive Dashboard Service - Real-time KPIs and Metrics
import { Database } from 'better-sqlite3';
import { getDB } from '../../../config/database.js';
import logger from '../../../config/logger.js';
import { EventEmitter } from 'events';

interface DashboardMetrics {
  period: string;
  real_time: RealTimeMetrics;
  sales: SalesMetrics;
  operations: OperationalMetrics;
  customers: CustomerMetrics;
  financial: FinancialMetrics;
  trends: TrendMetrics;
  alerts: Alert[];
  last_updated: string;
}

interface RealTimeMetrics {
  current_customers: number;
  active_orders: number;
  today_sales: number;
  hourly_rate: number;
  staff_online: number;
  tables_occupied: number;
  average_wait_time: number;
}

interface SalesMetrics {
  today: number;
  yesterday: number;
  week_to_date: number;
  month_to_date: number;
  year_to_date: number;
  growth_rate: number;
  average_ticket: number;
  conversion_rate: number;
}

interface OperationalMetrics {
  order_accuracy: number;
  service_speed: number;
  table_turnover: number;
  labor_cost_percentage: number;
  food_cost_percentage: number;
  waste_percentage: number;
  productivity_score: number;
}

interface CustomerMetrics {
  new_customers_today: number;
  returning_rate: number;
  satisfaction_score: number;
  average_lifetime_value: number;
  churn_rate: number;
  top_segments: any[];
}

interface FinancialMetrics {
  gross_margin: number;
  net_margin: number;
  cash_flow: number;
  revenue_per_employee: number;
  revenue_per_table: number;
  break_even_point: number;
  profit_trend: string;
}

interface TrendMetrics {
  sales_trend: number[];
  customer_trend: number[];
  peak_hours: string[];
  best_sellers: any[];
  category_performance: any[];
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
}

export class DashboardService extends EventEmitter {
  private db: Database;
  private metricsCache: Map<string, any>;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.db = getDB();
    this.metricsCache = new Map();
  }

  // Get comprehensive dashboard metrics
  async getDashboardMetrics(period: string = 'today'): Promise<DashboardMetrics> {
    try {
      const [
        realTime,
        sales,
        operations,
        customers,
        financial,
        trends,
        alerts
      ] = await Promise.all([
        this.getRealTimeMetrics(),
        this.getSalesMetrics(period),
        this.getOperationalMetrics(period),
        this.getCustomerMetrics(period),
        this.getFinancialMetrics(period),
        this.getTrendMetrics(period),
        this.getActiveAlerts()
      ]);

      const metrics: DashboardMetrics = {
        period,
        real_time: realTime,
        sales,
        operations,
        customers,
        financial,
        trends,
        alerts,
        last_updated: new Date().toISOString()
      };

      // Cache metrics
      this.metricsCache.set('dashboard', metrics);
      this.emit('metricsUpdated', metrics);

      return metrics;
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  // Real-time metrics
  private async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      // Current active customers
      const activeCustomers = this.db.prepare(`
        SELECT COUNT(DISTINCT customer_id) as count
        FROM sales
        WHERE sale_date >= datetime('now', '-1 hour')
          AND status = 'in_progress'
      `).get() as any;

      // Active orders
      const activeOrders = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM sales
        WHERE status IN ('pending', 'in_progress', 'preparing')
      `).get() as any;

      // Today's sales
      const todaySales = this.db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE DATE(sale_date) = DATE('now')
          AND status = 'completed'
      `).get() as any;

      // Hourly sales rate
      const hourlyRate = this.db.prepare(`
        SELECT COALESCE(SUM(total), 0) as total
        FROM sales
        WHERE sale_date >= datetime('now', '-1 hour')
          AND status = 'completed'
      `).get() as any;

      // Staff online (simplified - would need real session tracking)
      const staffOnline = this.db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM sales
        WHERE sale_date >= datetime('now', '-1 hour')
      `).get() as any;

      // Tables occupied (if table management exists)
      const tablesOccupied = this.db.prepare(`
        SELECT COUNT(DISTINCT table_number) as count
        FROM sales
        WHERE status = 'in_progress'
          AND table_number IS NOT NULL
      `).get() as any;

      // Average wait time (simplified)
      const avgWaitTime = this.db.prepare(`
        SELECT AVG(julianday(updated_at) - julianday(sale_date)) * 24 * 60 as minutes
        FROM sales
        WHERE DATE(sale_date) = DATE('now')
          AND status = 'completed'
      `).get() as any;

      return {
        current_customers: activeCustomers?.count || 0,
        active_orders: activeOrders?.count || 0,
        today_sales: todaySales?.total || 0,
        hourly_rate: hourlyRate?.total || 0,
        staff_online: staffOnline?.count || 0,
        tables_occupied: tablesOccupied?.count || 0,
        average_wait_time: Math.round(avgWaitTime?.minutes || 15)
      };
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      return {
        current_customers: 0,
        active_orders: 0,
        today_sales: 0,
        hourly_rate: 0,
        staff_online: 0,
        tables_occupied: 0,
        average_wait_time: 0
      };
    }
  }

  // Sales metrics
  private async getSalesMetrics(period: string): Promise<SalesMetrics> {
    try {
      const queries = {
        today: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
               FROM sales WHERE DATE(sale_date) = DATE('now') AND status = 'completed'`,
        yesterday: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
                   FROM sales WHERE DATE(sale_date) = DATE('now', '-1 day') AND status = 'completed'`,
        week: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
              FROM sales WHERE sale_date >= date('now', 'weekday 1', '-7 days') AND status = 'completed'`,
        month: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
               FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now') AND status = 'completed'`,
        year: `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count
              FROM sales WHERE strftime('%Y', sale_date) = strftime('%Y', 'now') AND status = 'completed'`,
        lastMonth: `SELECT COALESCE(SUM(total), 0) as total
                   FROM sales WHERE strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now', '-1 month') AND status = 'completed'`
      };

      const today = this.db.prepare(queries.today).get() as any;
      const yesterday = this.db.prepare(queries.yesterday).get() as any;
      const week = this.db.prepare(queries.week).get() as any;
      const month = this.db.prepare(queries.month).get() as any;
      const year = this.db.prepare(queries.year).get() as any;
      const lastMonth = this.db.prepare(queries.lastMonth).get() as any;

      const growthRate = lastMonth?.total > 0 ?
        ((month.total - lastMonth.total) / lastMonth.total) * 100 : 0;

      const avgTicket = today.count > 0 ? today.total / today.count : 0;

      // Conversion rate (simplified - would need visitor tracking)
      const conversionRate = 75; // Placeholder

      return {
        today: Math.round(today.total),
        yesterday: Math.round(yesterday.total),
        week_to_date: Math.round(week.total),
        month_to_date: Math.round(month.total),
        year_to_date: Math.round(year.total),
        growth_rate: Math.round(growthRate),
        average_ticket: Math.round(avgTicket),
        conversion_rate: conversionRate
      };
    } catch (error) {
      logger.error('Error getting sales metrics:', error);
      throw error;
    }
  }

  // Operational metrics
  private async getOperationalMetrics(period: string): Promise<OperationalMetrics> {
    try {
      // Order accuracy (simplified - would need order modification tracking)
      const orderAccuracy = 95;

      // Service speed (average time from order to completion)
      const serviceSpeed = this.db.prepare(`
        SELECT AVG(julianday(updated_at) - julianday(sale_date)) * 24 * 60 as minutes
        FROM sales
        WHERE DATE(sale_date) = DATE('now')
          AND status = 'completed'
      `).get() as any;

      // Table turnover rate
      const tableTurnover = this.db.prepare(`
        SELECT
          COUNT(DISTINCT table_number) as tables_used,
          COUNT(*) as total_orders,
          COUNT(*) * 1.0 / NULLIF(COUNT(DISTINCT table_number), 0) as turnover_rate
        FROM sales
        WHERE DATE(sale_date) = DATE('now')
          AND table_number IS NOT NULL
      `).get() as any;

      // Labor cost (simplified)
      const laborCost = this.db.prepare(`
        SELECT
          SUM(total) as revenue,
          COUNT(DISTINCT user_id) * 15 * 8 as labor_cost
        FROM sales
        WHERE DATE(sale_date) = DATE('now')
          AND status = 'completed'
      `).get() as any;

      const laborCostPercentage = laborCost?.revenue > 0 ?
        (laborCost.labor_cost / laborCost.revenue) * 100 : 30;

      // Food cost (simplified - would need ingredient tracking)
      const foodCostPercentage = 28;

      // Waste percentage (simplified)
      const wastePercentage = 3;

      // Productivity score (composite metric)
      const productivityScore = Math.round(
        (orderAccuracy * 0.3) +
        (100 - Math.min(100, serviceSpeed?.minutes || 30)) * 0.3 +
        ((tableTurnover?.turnover_rate || 2) * 10) * 0.2 +
        (100 - laborCostPercentage) * 0.2
      );

      return {
        order_accuracy: orderAccuracy,
        service_speed: Math.round(serviceSpeed?.minutes || 20),
        table_turnover: Math.round((tableTurnover?.turnover_rate || 2) * 10) / 10,
        labor_cost_percentage: Math.round(laborCostPercentage),
        food_cost_percentage: foodCostPercentage,
        waste_percentage: wastePercentage,
        productivity_score: productivityScore
      };
    } catch (error) {
      logger.error('Error getting operational metrics:', error);
      throw error;
    }
  }

  // Customer metrics
  private async getCustomerMetrics(period: string): Promise<CustomerMetrics> {
    try {
      // New customers today
      const newCustomers = this.db.prepare(`
        SELECT COUNT(DISTINCT c.id) as count
        FROM customers c
        WHERE DATE(c.created_at) = DATE('now')
      `).get() as any;

      // Returning customer rate
      const returningRate = this.db.prepare(`
        SELECT
          COUNT(DISTINCT CASE WHEN visit_count > 1 THEN customer_id END) * 100.0 /
          NULLIF(COUNT(DISTINCT customer_id), 0) as rate
        FROM (
          SELECT customer_id, COUNT(*) as visit_count
          FROM sales
          WHERE sale_date >= date('now', '-30 days')
            AND status = 'completed'
          GROUP BY customer_id
        )
      `).get() as any;

      // Satisfaction score (simplified - would need review system)
      const satisfactionScore = 4.5;

      // Average CLV
      const avgCLV = this.db.prepare(`
        SELECT AVG(total_spent) as avg_clv
        FROM (
          SELECT customer_id, SUM(total) as total_spent
          FROM sales
          WHERE status = 'completed'
          GROUP BY customer_id
        )
      `).get() as any;

      // Churn rate (customers who haven't ordered in 30 days)
      const churnRate = this.db.prepare(`
        SELECT
          COUNT(DISTINCT CASE WHEN last_order < date('now', '-30 days') THEN customer_id END) * 100.0 /
          NULLIF(COUNT(DISTINCT customer_id), 0) as rate
        FROM (
          SELECT customer_id, MAX(sale_date) as last_order
          FROM sales
          GROUP BY customer_id
        )
      `).get() as any;

      // Top segments
      const topSegments = this.db.prepare(`
        SELECT
          CASE
            WHEN total_spent > 1000 THEN 'VIP'
            WHEN total_spent > 500 THEN 'Regular'
            WHEN total_spent > 100 THEN 'Occasional'
            ELSE 'New'
          END as segment,
          COUNT(*) as count,
          AVG(total_spent) as avg_value
        FROM (
          SELECT customer_id, SUM(total) as total_spent
          FROM sales
          WHERE status = 'completed'
          GROUP BY customer_id
        )
        GROUP BY segment
        ORDER BY avg_value DESC
        LIMIT 4
      `).all() as any[];

      return {
        new_customers_today: newCustomers?.count || 0,
        returning_rate: Math.round(returningRate?.rate || 0),
        satisfaction_score: satisfactionScore,
        average_lifetime_value: Math.round(avgCLV?.avg_clv || 0),
        churn_rate: Math.round(churnRate?.rate || 0),
        top_segments: topSegments
      };
    } catch (error) {
      logger.error('Error getting customer metrics:', error);
      throw error;
    }
  }

  // Financial metrics
  private async getFinancialMetrics(period: string): Promise<FinancialMetrics> {
    try {
      const periodFilter = this.getPeriodFilter(period);

      // Revenue and costs
      const financials = this.db.prepare(`
        SELECT
          SUM(total) as revenue,
          SUM(total * 0.28) as food_cost,
          SUM(total * 0.25) as labor_cost,
          SUM(total * 0.15) as overhead,
          COUNT(DISTINCT user_id) as employee_count,
          COUNT(DISTINCT table_number) as tables_used
        FROM sales
        WHERE ${periodFilter}
          AND status = 'completed'
      `).get() as any;

      const grossProfit = financials.revenue - financials.food_cost;
      const netProfit = grossProfit - financials.labor_cost - financials.overhead;

      const grossMargin = financials.revenue > 0 ? (grossProfit / financials.revenue) * 100 : 0;
      const netMargin = financials.revenue > 0 ? (netProfit / financials.revenue) * 100 : 0;

      // Cash flow (simplified)
      const cashFlow = netProfit * 0.85; // Assuming 85% cash collection

      // Revenue per employee
      const revenuePerEmployee = financials.employee_count > 0 ?
        financials.revenue / financials.employee_count : 0;

      // Revenue per table
      const revenuePerTable = financials.tables_used > 0 ?
        financials.revenue / financials.tables_used : 0;

      // Break-even point (simplified)
      const fixedCosts = 5000; // Daily fixed costs
      const contributionMargin = grossMargin / 100;
      const breakEvenPoint = contributionMargin > 0 ? fixedCosts / contributionMargin : 0;

      // Profit trend
      const profitTrend = netMargin > 15 ? 'increasing' :
                         netMargin > 10 ? 'stable' : 'decreasing';

      return {
        gross_margin: Math.round(grossMargin),
        net_margin: Math.round(netMargin),
        cash_flow: Math.round(cashFlow),
        revenue_per_employee: Math.round(revenuePerEmployee),
        revenue_per_table: Math.round(revenuePerTable),
        break_even_point: Math.round(breakEvenPoint),
        profit_trend: profitTrend
      };
    } catch (error) {
      logger.error('Error getting financial metrics:', error);
      throw error;
    }
  }

  // Trend metrics
  private async getTrendMetrics(period: string): Promise<TrendMetrics> {
    try {
      // Sales trend (last 7 days)
      const salesTrend = this.db.prepare(`
        SELECT DATE(sale_date) as date, SUM(total) as total
        FROM sales
        WHERE sale_date >= date('now', '-7 days')
          AND status = 'completed'
        GROUP BY DATE(sale_date)
        ORDER BY date
      `).all() as any[];

      // Customer trend (last 7 days)
      const customerTrend = this.db.prepare(`
        SELECT DATE(sale_date) as date, COUNT(DISTINCT customer_id) as count
        FROM sales
        WHERE sale_date >= date('now', '-7 days')
        GROUP BY DATE(sale_date)
        ORDER BY date
      `).all() as any[];

      // Peak hours
      const peakHours = this.db.prepare(`
        SELECT
          strftime('%H:00', sale_date) as hour,
          COUNT(*) as order_count
        FROM sales
        WHERE sale_date >= date('now', '-7 days')
        GROUP BY hour
        ORDER BY order_count DESC
        LIMIT 3
      `).all() as any[];

      // Best sellers
      const bestSellers = this.db.prepare(`
        SELECT
          p.name,
          p.category,
          SUM(si.quantity) as units_sold,
          SUM(si.quantity * si.price) as revenue
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-7 days')
          AND s.status = 'completed'
        GROUP BY p.id
        ORDER BY revenue DESC
        LIMIT 5
      `).all() as any[];

      // Category performance
      const categoryPerformance = this.db.prepare(`
        SELECT
          p.category,
          SUM(si.quantity * si.price) as revenue,
          COUNT(DISTINCT s.id) as orders
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-7 days')
          AND s.status = 'completed'
        GROUP BY p.category
        ORDER BY revenue DESC
        LIMIT 5
      `).all() as any[];

      return {
        sales_trend: salesTrend.map(s => s.total),
        customer_trend: customerTrend.map(c => c.count),
        peak_hours: peakHours.map(h => h.hour),
        best_sellers: bestSellers,
        category_performance: categoryPerformance
      };
    } catch (error) {
      logger.error('Error getting trend metrics:', error);
      throw error;
    }
  }

  // Get active alerts
  private async getActiveAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      // Check for low stock
      const lowStock = this.db.prepare(`
        SELECT COUNT(*) as count
        FROM products
        WHERE current_stock < reorder_point
      `).get() as any;

      if (lowStock?.count > 0) {
        alerts.push({
          type: 'inventory',
          severity: 'warning',
          message: `${lowStock.count} products are below reorder point`,
          timestamp: new Date().toISOString()
        });
      }

      // Check for high refund rate
      const refundRate = this.db.prepare(`
        SELECT
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) * 100.0 /
          NULLIF(COUNT(*), 0) as rate
        FROM sales
        WHERE sale_date >= date('now', '-1 day')
      `).get() as any;

      if (refundRate?.rate > 10) {
        alerts.push({
          type: 'operations',
          severity: 'critical',
          message: `High refund rate detected: ${Math.round(refundRate.rate)}%`,
          timestamp: new Date().toISOString()
        });
      }

      // Check for system performance (simplified)
      const avgResponseTime = 250; // ms (would need real monitoring)
      if (avgResponseTime > 500) {
        alerts.push({
          type: 'system',
          severity: 'warning',
          message: 'System response time is above threshold',
          timestamp: new Date().toISOString()
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Error getting active alerts:', error);
      return alerts;
    }
  }

  // Get executive summary
  async getExecutiveSummary(): Promise<any> {
    try {
      const metrics = await this.getDashboardMetrics('today');

      const summary = {
        headline_metrics: {
          revenue_today: metrics.sales.today,
          growth_rate: `${metrics.sales.growth_rate > 0 ? '+' : ''}${metrics.sales.growth_rate}%`,
          active_customers: metrics.real_time.current_customers,
          satisfaction_score: metrics.customers.satisfaction_score
        },
        performance_indicators: {
          sales_target_achievement: this.calculateTargetAchievement(metrics.sales.month_to_date),
          operational_efficiency: metrics.operations.productivity_score,
          customer_retention: metrics.customers.returning_rate,
          profit_margin: metrics.financial.net_margin
        },
        key_insights: this.generateKeyInsights(metrics),
        recommended_actions: this.generateRecommendedActions(metrics),
        forecast_summary: await this.getForecastSummary()
      };

      return summary;
    } catch (error) {
      logger.error('Error generating executive summary:', error);
      throw error;
    }
  }

  // Helper methods
  private getPeriodFilter(period: string): string {
    switch (period) {
      case 'today':
        return "DATE(sale_date) = DATE('now')";
      case 'yesterday':
        return "DATE(sale_date) = DATE('now', '-1 day')";
      case 'week':
        return "sale_date >= date('now', 'weekday 1', '-7 days')";
      case 'month':
        return "strftime('%Y-%m', sale_date) = strftime('%Y-%m', 'now')";
      case 'year':
        return "strftime('%Y', sale_date) = strftime('%Y', 'now')";
      default:
        return "DATE(sale_date) = DATE('now')";
    }
  }

  private calculateTargetAchievement(actualSales: number): number {
    // Simplified - would need actual targets
    const monthlyTarget = 150000;
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const expectedToDate = (monthlyTarget / daysInMonth) * dayOfMonth;

    return Math.round((actualSales / expectedToDate) * 100);
  }

  private generateKeyInsights(metrics: DashboardMetrics): string[] {
    const insights: string[] = [];

    if (metrics.sales.growth_rate > 10) {
      insights.push(`Sales are up ${metrics.sales.growth_rate}% compared to last month`);
    } else if (metrics.sales.growth_rate < -10) {
      insights.push(`Sales are down ${Math.abs(metrics.sales.growth_rate)}% - immediate action needed`);
    }

    if (metrics.customers.churn_rate > 20) {
      insights.push(`High customer churn rate (${metrics.customers.churn_rate}%) detected`);
    }

    if (metrics.operations.labor_cost_percentage > 35) {
      insights.push('Labor costs are above industry standard');
    }

    if (metrics.financial.net_margin < 10) {
      insights.push('Net margin is below target - review costs and pricing');
    }

    if (metrics.trends.peak_hours.length > 0) {
      insights.push(`Peak hours: ${metrics.trends.peak_hours.join(', ')}`);
    }

    return insights;
  }

  private generateRecommendedActions(metrics: DashboardMetrics): string[] {
    const actions: string[] = [];

    if (metrics.operations.service_speed > 25) {
      actions.push('Optimize kitchen workflow to reduce service time');
    }

    if (metrics.customers.returning_rate < 40) {
      actions.push('Launch customer retention campaign');
    }

    if (metrics.financial.gross_margin < 70) {
      actions.push('Review supplier contracts and negotiate better rates');
    }

    if (metrics.alerts.some(a => a.severity === 'critical')) {
      actions.push('Address critical alerts immediately');
    }

    return actions;
  }

  private async getForecastSummary(): Promise<any> {
    // Simplified forecast summary
    return {
      next_7_days: {
        expected_revenue: 35000,
        confidence: 85
      },
      next_30_days: {
        expected_revenue: 150000,
        confidence: 75
      },
      recommendations: [
        'Increase inventory for predicted high-demand items',
        'Schedule additional staff for forecasted peak periods'
      ]
    };
  }

  // Update metrics periodically
  async updateMetrics(): Promise<void> {
    try {
      const metrics = await this.getDashboardMetrics('today');
      this.emit('metricsUpdated', metrics);
      logger.info('Dashboard metrics updated successfully');
    } catch (error) {
      logger.error('Error updating dashboard metrics:', error);
    }
  }

  // Start auto-update
  startAutoUpdate(intervalMs: number = 300000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, intervalMs);

    logger.info(`Dashboard auto-update started (interval: ${intervalMs}ms)`);
  }

  // Stop auto-update
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      logger.info('Dashboard auto-update stopped');
    }
  }
}