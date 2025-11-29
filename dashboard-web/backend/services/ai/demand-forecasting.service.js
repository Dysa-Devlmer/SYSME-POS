/**
 * =====================================================
 * Demand Forecasting Service - AI/ML
 * =====================================================
 * Predicts product demand using historical sales data
 * Uses time-series analysis and pattern recognition
 *
 * @module services/ai/demand-forecasting
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const Database = require('better-sqlite3');
const path = require('path');

class DemandForecastingService {
  constructor() {
    this.db = null;
    this.models = new Map(); // Cache for trained models per product
  }

  /**
   * Initialize database connection
   */
  initDB() {
    if (!this.db) {
      const dbPath = path.join(__dirname, '../../database.sqlite');
      this.db = new Database(dbPath);
    }
    return this.db;
  }

  /**
   * Get historical sales data for a product
   */
  getHistoricalSales(productId, daysBack = 90) {
    const db = this.initDB();

    const query = `
      SELECT
        DATE(o.created_at) as date,
        SUM(od.quantity) as quantity_sold,
        COUNT(DISTINCT o.order_id) as order_count,
        AVG(od.unit_price) as avg_price,
        CAST(strftime('%w', o.created_at) AS INTEGER) as day_of_week,
        CAST(strftime('%H', o.created_at) AS INTEGER) as hour_of_day
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      WHERE od.product_id = ?
        AND o.created_at >= datetime('now', '-' || ? || ' days')
        AND o.status = 'completed'
      GROUP BY DATE(o.created_at)
      ORDER BY date ASC
    `;

    return db.prepare(query).all(productId, daysBack);
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(data, window = 7) {
    const result = [];

    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - window + 1);
      const subset = data.slice(start, i + 1);
      const avg = subset.reduce((sum, val) => sum + val, 0) / subset.length;
      result.push(avg);
    }

    return result;
  }

  /**
   * Calculate exponential moving average
   */
  calculateEMA(data, alpha = 0.3) {
    const result = [data[0]];

    for (let i = 1; i < data.length; i++) {
      const ema = alpha * data[i] + (1 - alpha) * result[i - 1];
      result.push(ema);
    }

    return result;
  }

  /**
   * Detect trend (increasing, decreasing, stable)
   */
  detectTrend(data) {
    if (data.length < 7) return 'insufficient_data';

    const recentAvg = data.slice(-7).reduce((a, b) => a + b, 0) / 7;
    const olderAvg = data.slice(-14, -7).reduce((a, b) => a + b, 0) / 7;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Detect seasonality patterns
   */
  detectSeasonality(salesData) {
    const dayOfWeekPatterns = Array(7).fill(0);
    const counts = Array(7).fill(0);

    salesData.forEach(record => {
      const dow = record.day_of_week;
      dayOfWeekPatterns[dow] += record.quantity_sold;
      counts[dow]++;
    });

    // Calculate averages
    const avgByDay = dayOfWeekPatterns.map((sum, idx) =>
      counts[idx] > 0 ? sum / counts[idx] : 0
    );

    return {
      day_of_week_patterns: avgByDay,
      peak_day: avgByDay.indexOf(Math.max(...avgByDay)),
      low_day: avgByDay.indexOf(Math.min(...avgByDay))
    };
  }

  /**
   * Simple linear regression for trend prediction
   */
  linearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    data.forEach((y, x) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * Predict future demand for a product
   */
  async predictDemand(productId, daysAhead = 7) {
    try {
      const historicalData = this.getHistoricalSales(productId, 90);

      if (historicalData.length < 14) {
        return {
          product_id: productId,
          predictions: [],
          confidence: 'low',
          message: 'Insufficient historical data (minimum 14 days required)',
          recommendation: 'Collect more sales data'
        };
      }

      // Extract quantities
      const quantities = historicalData.map(d => d.quantity_sold);

      // Calculate trend
      const trend = this.detectTrend(quantities);

      // Calculate moving averages
      const ma7 = this.calculateMovingAverage(quantities, 7);
      const ema = this.calculateEMA(quantities, 0.3);

      // Linear regression for trend
      const regression = this.linearRegression(quantities);

      // Detect seasonality
      const seasonality = this.detectSeasonality(historicalData);

      // Generate predictions
      const predictions = [];
      const lastDataPoint = quantities.length;

      for (let i = 1; i <= daysAhead; i++) {
        // Base prediction from regression
        let predicted = regression.slope * (lastDataPoint + i) + regression.intercept;

        // Adjust for day of week seasonality
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        const dayOfWeek = futureDate.getDay();
        const seasonalityFactor = seasonality.day_of_week_patterns[dayOfWeek] /
          (seasonality.day_of_week_patterns.reduce((a, b) => a + b, 0) / 7);

        predicted *= seasonalityFactor;

        // Apply EMA influence
        const emaInfluence = ema[ema.length - 1] * 0.3;
        predicted = predicted * 0.7 + emaInfluence * 0.3;

        // Ensure non-negative
        predicted = Math.max(0, predicted);

        predictions.push({
          date: futureDate.toISOString().split('T')[0],
          day_of_week: dayOfWeek,
          predicted_quantity: Math.round(predicted),
          confidence_score: this.calculateConfidence(historicalData.length, trend)
        });
      }

      // Calculate overall confidence
      const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence_score, 0) / predictions.length;

      return {
        product_id: productId,
        predictions,
        trend,
        seasonality,
        confidence: avgConfidence > 0.7 ? 'high' : avgConfidence > 0.5 ? 'medium' : 'low',
        historical_avg: quantities.reduce((a, b) => a + b, 0) / quantities.length,
        data_points: historicalData.length
      };

    } catch (error) {
      console.error('Error predicting demand:', error);
      throw error;
    }
  }

  /**
   * Calculate prediction confidence based on data quality
   */
  calculateConfidence(dataPoints, trend) {
    let confidence = 0.5; // Base confidence

    // More data = higher confidence
    if (dataPoints >= 90) confidence += 0.3;
    else if (dataPoints >= 60) confidence += 0.2;
    else if (dataPoints >= 30) confidence += 0.1;

    // Stable trend = higher confidence
    if (trend === 'stable') confidence += 0.1;
    else if (trend === 'increasing' || trend === 'decreasing') confidence += 0.05;

    return Math.min(1, confidence);
  }

  /**
   * Get reorder recommendations based on predictions
   */
  async getReorderRecommendations(threshold = 0.7) {
    const db = this.initDB();

    // Get products with current stock levels
    const products = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.sku,
        COALESCE(SUM(i.quantity), 0) as current_stock,
        p.reorder_point,
        p.reorder_quantity
      FROM products p
      LEFT JOIN inventory_items i ON p.product_id = i.product_id
      WHERE p.is_active = 1
      GROUP BY p.product_id
    `).all();

    const recommendations = [];

    for (const product of products) {
      try {
        const forecast = await this.predictDemand(product.product_id, 7);

        if (forecast.predictions.length === 0) continue;

        // Calculate total predicted demand for next 7 days
        const predictedDemand = forecast.predictions.reduce(
          (sum, p) => sum + p.predicted_quantity, 0
        );

        const avgConfidence = forecast.predictions.reduce(
          (sum, p) => sum + p.confidence_score, 0
        ) / forecast.predictions.length;

        // Only recommend if confidence is above threshold
        if (avgConfidence < threshold) continue;

        // Check if reorder is needed
        if (product.current_stock < predictedDemand) {
          const shortfall = predictedDemand - product.current_stock;

          recommendations.push({
            product_id: product.product_id,
            product_name: product.name,
            sku: product.sku,
            current_stock: product.current_stock,
            predicted_demand_7d: Math.round(predictedDemand),
            shortfall: Math.round(shortfall),
            recommended_order_quantity: Math.max(
              Math.round(shortfall * 1.2), // 20% buffer
              product.reorder_quantity || Math.round(shortfall)
            ),
            urgency: this.calculateUrgency(product.current_stock, predictedDemand),
            confidence: avgConfidence,
            trend: forecast.trend,
            stock_out_risk: product.current_stock / predictedDemand < 0.3 ? 'high' :
                           product.current_stock / predictedDemand < 0.5 ? 'medium' : 'low'
          });
        }
      } catch (error) {
        console.error(`Error processing product ${product.product_id}:`, error);
      }
    }

    // Sort by urgency (highest first)
    recommendations.sort((a, b) => b.urgency - a.urgency);

    return recommendations;
  }

  /**
   * Calculate urgency score (0-100)
   */
  calculateUrgency(currentStock, predictedDemand) {
    const ratio = currentStock / predictedDemand;

    if (ratio < 0.2) return 100; // Critical
    if (ratio < 0.3) return 90;  // Very high
    if (ratio < 0.5) return 75;  // High
    if (ratio < 0.7) return 50;  // Medium
    if (ratio < 1.0) return 25;  // Low
    return 10; // Very low
  }

  /**
   * Analyze sales patterns
   */
  async analyzeSalesPatterns(productId = null, daysBack = 30) {
    const db = this.initDB();

    let query = `
      SELECT
        DATE(o.created_at) as date,
        CAST(strftime('%w', o.created_at) AS INTEGER) as day_of_week,
        CAST(strftime('%H', o.created_at) AS INTEGER) as hour,
        COUNT(DISTINCT o.order_id) as order_count,
        SUM(od.quantity) as items_sold,
        SUM(od.quantity * od.unit_price) as revenue
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      WHERE o.status = 'completed'
        AND o.created_at >= datetime('now', '-' || ? || ' days')
    `;

    const params = [daysBack];

    if (productId) {
      query += ' AND od.product_id = ?';
      params.push(productId);
    }

    query += ' GROUP BY date, day_of_week, hour ORDER BY date, hour';

    const data = db.prepare(query).all(...params);

    // Analyze patterns
    const hourlyPattern = Array(24).fill(0);
    const dailyPattern = Array(7).fill(0);
    const hourlyCounts = Array(24).fill(0);
    const dailyCounts = Array(7).fill(0);

    data.forEach(record => {
      hourlyPattern[record.hour] += record.revenue;
      hourlyCounts[record.hour]++;
      dailyPattern[record.day_of_week] += record.revenue;
      dailyCounts[record.day_of_week]++;
    });

    return {
      hourly_pattern: hourlyPattern.map((sum, idx) =>
        hourlyCounts[idx] > 0 ? sum / hourlyCounts[idx] : 0
      ),
      daily_pattern: dailyPattern.map((sum, idx) =>
        dailyCounts[idx] > 0 ? sum / dailyCounts[idx] : 0
      ),
      peak_hour: hourlyPattern.indexOf(Math.max(...hourlyPattern)),
      peak_day: dailyPattern.indexOf(Math.max(...dailyPattern)),
      total_orders: data.reduce((sum, d) => sum + d.order_count, 0),
      total_revenue: data.reduce((sum, d) => sum + d.revenue, 0)
    };
  }
}

module.exports = new DemandForecastingService();
