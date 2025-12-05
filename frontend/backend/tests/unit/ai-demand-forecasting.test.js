/**
 * =====================================================
 * Unit Tests - Demand Forecasting Service
 * =====================================================
 * Tests for AI demand forecasting algorithms
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const { expect } = require('chai');
const DemandForecastingService = require('../../services/ai/demand-forecasting.service');

describe('Demand Forecasting Service', () => {
  describe('calculateMovingAverage()', () => {
    it('should calculate 7-day moving average correctly', () => {
      const data = [10, 12, 15, 14, 13, 16, 18];
      const result = DemandForecastingService.calculateMovingAverage(data, 3);

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(7);
      expect(result[2]).to.be.closeTo(12.33, 0.1); // Average of [10, 12, 15]
    });

    it('should handle edge cases with small datasets', () => {
      const data = [5, 10];
      const result = DemandForecastingService.calculateMovingAverage(data, 3);

      expect(result).to.have.lengthOf(2);
      expect(result[0]).to.equal(5);
      expect(result[1]).to.equal(7.5); // Average of [5, 10]
    });
  });

  describe('calculateEMA()', () => {
    it('should calculate exponential moving average correctly', () => {
      const data = [10, 12, 15, 14, 13];
      const alpha = 0.3;
      const result = DemandForecastingService.calculateEMA(data, alpha);

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(5);
      expect(result[0]).to.equal(10); // First value unchanged
      expect(result[1]).to.be.closeTo(10.6, 0.1); // 0.3 * 12 + 0.7 * 10
    });

    it('should use correct smoothing factor', () => {
      const data = [100, 200];
      const alpha = 0.5;
      const result = DemandForecastingService.calculateEMA(data, alpha);

      expect(result[1]).to.equal(150); // 0.5 * 200 + 0.5 * 100
    });
  });

  describe('detectTrend()', () => {
    it('should detect increasing trend', () => {
      const data = [10, 12, 15, 18, 20, 22, 25, 28, 30, 32, 35, 38, 40, 42];
      const trend = DemandForecastingService.detectTrend(data);

      expect(trend).to.equal('increasing');
    });

    it('should detect decreasing trend', () => {
      const data = [40, 38, 35, 32, 30, 28, 25, 22, 20, 18, 15, 12, 10, 8];
      const trend = DemandForecastingService.detectTrend(data);

      expect(trend).to.equal('decreasing');
    });

    it('should detect stable trend', () => {
      const data = [20, 21, 20, 19, 20, 21, 20, 19, 20, 21, 20, 19, 20, 21];
      const trend = DemandForecastingService.detectTrend(data);

      expect(trend).to.equal('stable');
    });

    it('should return insufficient_data for short datasets', () => {
      const data = [10, 12, 15];
      const trend = DemandForecastingService.detectTrend(data);

      expect(trend).to.equal('insufficient_data');
    });
  });

  describe('linearRegression()', () => {
    it('should calculate slope and intercept correctly', () => {
      const data = [2, 4, 6, 8, 10]; // Perfect linear: y = 2x (slope=2, intercept=2)
      const { slope, intercept } = DemandForecastingService.linearRegression(data);

      expect(slope).to.be.closeTo(2, 0.1);
      expect(intercept).to.be.closeTo(2, 0.1);
    });

    it('should handle horizontal line (no trend)', () => {
      const data = [5, 5, 5, 5, 5];
      const { slope, intercept } = DemandForecastingService.linearRegression(data);

      expect(slope).to.be.closeTo(0, 0.01);
      expect(intercept).to.be.closeTo(5, 0.1);
    });

    it('should calculate negative slope for decreasing trend', () => {
      const data = [10, 8, 6, 4, 2];
      const { slope } = DemandForecastingService.linearRegression(data);

      expect(slope).to.be.lessThan(0);
    });
  });

  describe('calculateConfidence()', () => {
    it('should return higher confidence for more data points', () => {
      const confidence90 = DemandForecastingService.calculateConfidence(90, 'stable');
      const confidence30 = DemandForecastingService.calculateConfidence(30, 'stable');

      expect(confidence90).to.be.greaterThan(confidence30);
    });

    it('should return higher confidence for stable trend', () => {
      const stableConf = DemandForecastingService.calculateConfidence(60, 'stable');
      const increasingConf = DemandForecastingService.calculateConfidence(60, 'increasing');

      expect(stableConf).to.be.greaterThan(increasingConf);
    });

    it('should cap confidence at 1.0', () => {
      const confidence = DemandForecastingService.calculateConfidence(120, 'stable');

      expect(confidence).to.be.at.most(1.0);
    });

    it('should have minimum base confidence', () => {
      const confidence = DemandForecastingService.calculateConfidence(14, 'insufficient_data');

      expect(confidence).to.be.at.least(0.5);
    });
  });

  describe('calculateUrgency()', () => {
    it('should return critical urgency for very low stock', () => {
      const urgency = DemandForecastingService.calculateUrgency(5, 50);
      // Ratio = 5/50 = 0.1 < 0.2 = Critical (100)

      expect(urgency).to.equal(100);
    });

    it('should return high urgency for low stock', () => {
      const urgency = DemandForecastingService.calculateUrgency(20, 50);
      // Ratio = 20/50 = 0.4 => 0.3-0.5 range = High (75)

      expect(urgency).to.equal(75);
    });

    it('should return medium urgency for moderate stock', () => {
      const urgency = DemandForecastingService.calculateUrgency(35, 50);
      // Ratio = 35/50 = 0.7 => 0.5-0.7 range = Medium (50)

      expect(urgency).to.equal(50);
    });

    it('should return low urgency for adequate stock', () => {
      const urgency = DemandForecastingService.calculateUrgency(50, 50);
      // Ratio = 50/50 = 1.0 => 0.7-1.0 range = Low (25)

      expect(urgency).to.equal(25);
    });

    it('should return very low urgency for excess stock', () => {
      const urgency = DemandForecastingService.calculateUrgency(60, 50);
      // Ratio = 60/50 = 1.2 > 1.0 = Very Low (10)

      expect(urgency).to.equal(10);
    });
  });

  describe('detectSeasonality()', () => {
    it('should detect day-of-week patterns', () => {
      const salesData = [
        { day_of_week: 0, quantity_sold: 10 }, // Sunday
        { day_of_week: 1, quantity_sold: 15 }, // Monday
        { day_of_week: 5, quantity_sold: 30 }, // Friday
        { day_of_week: 6, quantity_sold: 35 }  // Saturday
      ];

      const result = DemandForecastingService.detectSeasonality(salesData);

      expect(result).to.have.property('day_of_week_patterns');
      expect(result).to.have.property('peak_day');
      expect(result).to.have.property('low_day');

      expect(result.day_of_week_patterns).to.be.an('array').with.lengthOf(7);
      expect(result.peak_day).to.be.within(0, 6);
      expect(result.low_day).to.be.within(0, 6);
    });

    it('should identify peak day correctly', () => {
      const salesData = [
        { day_of_week: 0, quantity_sold: 10 },
        { day_of_week: 5, quantity_sold: 50 }, // Friday - peak
        { day_of_week: 5, quantity_sold: 50 }
      ];

      const result = DemandForecastingService.detectSeasonality(salesData);

      expect(result.peak_day).to.equal(5); // Friday
    });

    it('should handle empty sales data', () => {
      const salesData = [];
      const result = DemandForecastingService.detectSeasonality(salesData);

      expect(result.day_of_week_patterns).to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
    });
  });
});

describe('Demand Forecasting Integration', () => {
  // Note: These tests require database access and are more integration-level
  // They are skipped here to keep unit tests fast and isolated

  describe.skip('predictDemand()', () => {
    it('should generate predictions for valid product', async () => {
      const productId = 1;
      const daysAhead = 7;

      const result = await DemandForecastingService.predictDemand(productId, daysAhead);

      expect(result).to.have.property('product_id', productId);
      expect(result).to.have.property('predictions');
      expect(result).to.have.property('trend');
      expect(result).to.have.property('confidence');
      expect(result.predictions).to.be.an('array').with.lengthOf(daysAhead);
    });

    it('should return insufficient data message for new product', async () => {
      const productId = 9999; // Non-existent product
      const result = await DemandForecastingService.predictDemand(productId, 7);

      expect(result).to.have.property('message');
      expect(result.message).to.include('Insufficient historical data');
    });
  });

  describe.skip('getReorderRecommendations()', () => {
    it('should return products needing reorder', async () => {
      const threshold = 0.6;
      const result = await DemandForecastingService.getReorderRecommendations(threshold);

      expect(result).to.be.an('array');

      if (result.length > 0) {
        const recommendation = result[0];
        expect(recommendation).to.have.property('product_id');
        expect(recommendation).to.have.property('current_stock');
        expect(recommendation).to.have.property('predicted_demand_7d');
        expect(recommendation).to.have.property('recommended_order_quantity');
        expect(recommendation).to.have.property('urgency');
        expect(recommendation).to.have.property('confidence');
      }
    });

    it('should filter by confidence threshold', async () => {
      const highThreshold = 0.9;
      const lowThreshold = 0.3;

      const highResults = await DemandForecastingService.getReorderRecommendations(highThreshold);
      const lowResults = await DemandForecastingService.getReorderRecommendations(lowThreshold);

      expect(lowResults.length).to.be.at.least(highResults.length);
    });
  });
});
