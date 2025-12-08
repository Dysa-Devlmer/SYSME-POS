// Sales Forecasting Service with Machine Learning
import { Database } from 'better-sqlite3';
import { getDB } from '../../../config/database.js';
import logger from '../../../config/logger.js';
import { EventEmitter } from 'events';

interface ForecastData {
  date: string;
  predicted_sales: number;
  confidence_lower: number;
  confidence_upper: number;
  trend: 'up' | 'down' | 'stable';
  seasonality_factor: number;
}

interface HistoricalData {
  date: string;
  total_sales: number;
  transaction_count: number;
  average_ticket: number;
  day_of_week: number;
  month: number;
  is_weekend: boolean;
  is_holiday: boolean;
}

export class ForecastingService extends EventEmitter {
  private db: Database;
  private modelWeights: Map<string, number[]>;

  constructor() {
    super();
    this.db = getDB();
    this.modelWeights = new Map();
    this.initializeModels();
  }

  private initializeModels() {
    // Initialize with default weights for different models
    this.modelWeights.set('trend', [0.8, 0.15, 0.05]); // Recent, medium, old data weights
    this.modelWeights.set('seasonality', Array(12).fill(1.0)); // Monthly factors
    this.modelWeights.set('weekday', Array(7).fill(1.0)); // Weekday factors
  }

  // Main forecasting method using exponential smoothing and seasonality
  async forecastSales(days: number = 30): Promise<ForecastData[]> {
    try {
      const historicalData = await this.getHistoricalData(90); // Get 90 days of data

      if (historicalData.length < 30) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Calculate trend using exponential smoothing
      const trend = this.calculateTrend(historicalData);

      // Calculate seasonality patterns
      const seasonality = this.calculateSeasonality(historicalData);

      // Generate forecast
      const forecasts: ForecastData[] = [];
      const lastDate = new Date(historicalData[historicalData.length - 1].date);
      const avgSales = historicalData.reduce((sum, d) => sum + d.total_sales, 0) / historicalData.length;
      const stdDev = this.calculateStdDev(historicalData.map(d => d.total_sales));

      for (let i = 1; i <= days; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        const dayOfWeek = forecastDate.getDay();
        const month = forecastDate.getMonth();

        // Apply trend and seasonality
        let predictedSales = avgSales * trend;
        predictedSales *= seasonality.weekday[dayOfWeek];
        predictedSales *= seasonality.monthly[month];

        // Add some random variation based on historical volatility
        const randomFactor = 1 + (Math.random() - 0.5) * 0.1;
        predictedSales *= randomFactor;

        // Calculate confidence intervals (95%)
        const confidenceInterval = 1.96 * stdDev;

        forecasts.push({
          date: forecastDate.toISOString().split('T')[0],
          predicted_sales: Math.round(predictedSales),
          confidence_lower: Math.round(predictedSales - confidenceInterval),
          confidence_upper: Math.round(predictedSales + confidenceInterval),
          trend: trend > 1.02 ? 'up' : trend < 0.98 ? 'down' : 'stable',
          seasonality_factor: seasonality.weekday[dayOfWeek] * seasonality.monthly[month]
        });
      }

      // Emit forecast completed event
      this.emit('forecastCompleted', forecasts);

      return forecasts;
    } catch (error) {
      logger.error('Error forecasting sales:', error);
      throw error;
    }
  }

  // Advanced forecast with product-level predictions
  async forecastByProduct(productId: number, days: number = 30): Promise<ForecastData[]> {
    try {
      const query = `
        SELECT
          DATE(s.sale_date) as date,
          SUM(si.quantity) as units_sold,
          SUM(si.quantity * si.price) as revenue,
          COUNT(DISTINCT s.id) as transactions
        FROM sales s
        JOIN sale_items si ON s.id = si.sale_id
        WHERE si.product_id = ?
          AND s.sale_date >= date('now', '-90 days')
        GROUP BY DATE(s.sale_date)
        ORDER BY date
      `;

      const productHistory = this.db.prepare(query).all(productId) as any[];

      if (productHistory.length < 7) {
        throw new Error('Insufficient product history for forecasting');
      }

      // Simple moving average with trend adjustment
      const recentAvg = productHistory.slice(-7).reduce((sum, d) => sum + d.units_sold, 0) / 7;
      const olderAvg = productHistory.slice(-14, -7).reduce((sum, d) => sum + d.units_sold, 0) / 7;
      const trend = recentAvg / (olderAvg || 1);

      const forecasts: ForecastData[] = [];
      const lastDate = new Date(productHistory[productHistory.length - 1].date);

      for (let i = 1; i <= days; i++) {
        const forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);

        const predictedUnits = recentAvg * Math.pow(trend, i / 7);
        const avgPrice = productHistory[productHistory.length - 1].revenue /
                        productHistory[productHistory.length - 1].units_sold;

        forecasts.push({
          date: forecastDate.toISOString().split('T')[0],
          predicted_sales: Math.round(predictedUnits * avgPrice),
          confidence_lower: Math.round(predictedUnits * avgPrice * 0.8),
          confidence_upper: Math.round(predictedUnits * avgPrice * 1.2),
          trend: trend > 1.02 ? 'up' : trend < 0.98 ? 'down' : 'stable',
          seasonality_factor: 1.0
        });
      }

      return forecasts;
    } catch (error) {
      logger.error('Error forecasting product sales:', error);
      throw error;
    }
  }

  // Inventory optimization recommendations
  async getInventoryRecommendations(): Promise<any[]> {
    try {
      const forecasts = await this.forecastSales(14); // 2-week forecast

      const query = `
        SELECT
          p.id,
          p.name,
          p.current_stock,
          p.reorder_point,
          p.reorder_quantity,
          AVG(si.quantity) as avg_daily_sales
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-30 days')
        GROUP BY p.id
      `;

      const products = this.db.prepare(query).all() as any[];
      const totalForecastedSales = forecasts.reduce((sum, f) => sum + f.predicted_sales, 0);

      const recommendations = products.map(product => {
        const dailySales = product.avg_daily_sales || 0;
        const forecastedDemand = dailySales * 14 * 1.2; // 20% safety buffer
        const daysOfStock = product.current_stock / (dailySales || 1);

        let action = 'none';
        let urgency = 'low';
        let quantity = 0;

        if (daysOfStock < 3) {
          action = 'urgent_reorder';
          urgency = 'critical';
          quantity = Math.max(product.reorder_quantity, forecastedDemand * 2);
        } else if (daysOfStock < 7) {
          action = 'reorder';
          urgency = 'high';
          quantity = Math.max(product.reorder_quantity, forecastedDemand);
        } else if (daysOfStock < 14) {
          action = 'monitor';
          urgency = 'medium';
          quantity = product.reorder_quantity;
        }

        return {
          product_id: product.id,
          product_name: product.name,
          current_stock: product.current_stock,
          days_of_stock: Math.round(daysOfStock),
          forecasted_demand: Math.round(forecastedDemand),
          recommended_action: action,
          urgency_level: urgency,
          recommended_quantity: Math.round(quantity),
          estimated_stockout_date: daysOfStock > 0 ?
            new Date(Date.now() + daysOfStock * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
            'already_out'
        };
      });

      return recommendations.filter(r => r.recommended_action !== 'none');
    } catch (error) {
      logger.error('Error generating inventory recommendations:', error);
      throw error;
    }
  }

  // Cash flow prediction
  async predictCashFlow(days: number = 30): Promise<any> {
    try {
      const salesForecast = await this.forecastSales(days);

      // Get historical expense patterns
      const expenseQuery = `
        SELECT
          category,
          AVG(amount) as avg_amount,
          COUNT(*) as frequency
        FROM expenses
        WHERE date >= date('now', '-60 days')
        GROUP BY category
      `;

      const expenses = this.db.prepare(expenseQuery).all() as any[];
      const dailyExpenses = expenses.reduce((sum, e) => sum + (e.avg_amount / 30), 0);

      const cashFlowPrediction = salesForecast.map(forecast => {
        const estimatedExpenses = dailyExpenses * (0.9 + Math.random() * 0.2); // ±10% variation
        const netCashFlow = forecast.predicted_sales - estimatedExpenses;

        return {
          date: forecast.date,
          predicted_revenue: forecast.predicted_sales,
          predicted_expenses: Math.round(estimatedExpenses),
          net_cash_flow: Math.round(netCashFlow),
          cumulative_cash_flow: 0 // Will be calculated below
        };
      });

      // Calculate cumulative cash flow
      let cumulative = 0;
      cashFlowPrediction.forEach(day => {
        cumulative += day.net_cash_flow;
        day.cumulative_cash_flow = cumulative;
      });

      return {
        daily_predictions: cashFlowPrediction,
        summary: {
          total_predicted_revenue: cashFlowPrediction.reduce((sum, d) => sum + d.predicted_revenue, 0),
          total_predicted_expenses: cashFlowPrediction.reduce((sum, d) => sum + d.predicted_expenses, 0),
          net_predicted_cash_flow: cumulative,
          average_daily_revenue: Math.round(
            cashFlowPrediction.reduce((sum, d) => sum + d.predicted_revenue, 0) / days
          ),
          average_daily_expenses: Math.round(
            cashFlowPrediction.reduce((sum, d) => sum + d.predicted_expenses, 0) / days
          )
        }
      };
    } catch (error) {
      logger.error('Error predicting cash flow:', error);
      throw error;
    }
  }

  // Helper methods
  private async getHistoricalData(days: number): Promise<HistoricalData[]> {
    const query = `
      SELECT
        DATE(sale_date) as date,
        SUM(total) as total_sales,
        COUNT(*) as transaction_count,
        AVG(total) as average_ticket,
        CAST(strftime('%w', sale_date) AS INTEGER) as day_of_week,
        CAST(strftime('%m', sale_date) AS INTEGER) as month,
        CASE WHEN strftime('%w', sale_date) IN ('0', '6') THEN 1 ELSE 0 END as is_weekend,
        0 as is_holiday
      FROM sales
      WHERE sale_date >= date('now', '-' || ? || ' days')
        AND status = 'completed'
      GROUP BY DATE(sale_date)
      ORDER BY date
    `;

    return this.db.prepare(query).all(days) as HistoricalData[];
  }

  private calculateTrend(data: HistoricalData[]): number {
    const weights = this.modelWeights.get('trend')!;
    const recentPeriod = Math.floor(data.length / 3);

    const recentAvg = data.slice(-recentPeriod)
      .reduce((sum, d) => sum + d.total_sales, 0) / recentPeriod;

    const olderAvg = data.slice(0, recentPeriod)
      .reduce((sum, d) => sum + d.total_sales, 0) / recentPeriod;

    return recentAvg / (olderAvg || 1);
  }

  private calculateSeasonality(data: HistoricalData[]) {
    // Calculate weekday factors
    const weekdayTotals = Array(7).fill(0);
    const weekdayCounts = Array(7).fill(0);

    data.forEach(d => {
      weekdayTotals[d.day_of_week] += d.total_sales;
      weekdayCounts[d.day_of_week]++;
    });

    const avgSales = data.reduce((sum, d) => sum + d.total_sales, 0) / data.length;
    const weekdayFactors = weekdayTotals.map((total, i) =>
      (total / weekdayCounts[i]) / avgSales || 1
    );

    // Calculate monthly factors
    const monthlyTotals = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);

    data.forEach(d => {
      monthlyTotals[d.month - 1] += d.total_sales;
      monthlyCounts[d.month - 1]++;
    });

    const monthlyFactors = monthlyTotals.map((total, i) =>
      monthlyCounts[i] > 0 ? (total / monthlyCounts[i]) / avgSales : 1
    );

    return {
      weekday: weekdayFactors,
      monthly: monthlyFactors
    };
  }

  private calculateStdDev(values: number[]): number {
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
    const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
    return Math.sqrt(variance);
  }

  // Train models with new data (called periodically)
  async trainModels(): Promise<void> {
    try {
      logger.info('🔄 Training forecasting models...');

      const data = await this.getHistoricalData(180);
      if (data.length < 30) {
        logger.warn('Insufficient data for model training');
        return;
      }

      // Update model weights based on recent performance
      // This is a simplified version - in production you'd use proper ML libraries
      const seasonality = this.calculateSeasonality(data);
      this.modelWeights.set('weekday', seasonality.weekday);
      this.modelWeights.set('seasonality', seasonality.monthly);

      logger.info('✅ Forecasting models updated successfully');
    } catch (error) {
      logger.error('Error training models:', error);
    }
  }
}