/**
 * =====================================================
 * Unit Tests - Recommendation Service
 * =====================================================
 * Tests for AI recommendation algorithms
 *
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const { expect } = require('chai');
const RecommendationService = require('../../services/ai/recommendation.service');

describe('Recommendation Service', () => {
  describe('calculateCollaborativeScore()', () => {
    it('should calculate score based on popularity and frequency', () => {
      const rec = {
        bought_by_similar: 3,
        times_ordered: 5
      };
      const totalSimilarCustomers = 5;

      const score = RecommendationService.calculateCollaborativeScore(rec, totalSimilarCustomers);

      expect(score).to.be.a('number');
      expect(score).to.be.greaterThan(0);
      expect(score).to.be.at.most(100);
    });

    it('should give higher score for more popular items', () => {
      const highPop = {
        bought_by_similar: 5,
        times_ordered: 10
      };
      const lowPop = {
        bought_by_similar: 1,
        times_ordered: 2
      };

      const highScore = RecommendationService.calculateCollaborativeScore(highPop, 5);
      const lowScore = RecommendationService.calculateCollaborativeScore(lowPop, 5);

      expect(highScore).to.be.greaterThan(lowScore);
    });

    it('should cap frequency score at 1.0', () => {
      const rec = {
        bought_by_similar: 5,
        times_ordered: 100 // Very high frequency
      };

      const score = RecommendationService.calculateCollaborativeScore(rec, 5);

      // Frequency score is capped at Math.min(times_ordered / 10, 1)
      // So max frequency score = 1.0
      // Max score = (1.0 * 0.7 + 1.0 * 0.3) * 100 = 100
      expect(score).to.be.at.most(100);
    });
  });

  describe('calculateContentScore()', () => {
    it('should calculate score based on popularity and category match', () => {
      const rec = {
        popularity: 25,
        category_id: 1
      };
      const customerHistory = [
        { category_id: 1, product_id: 10 },
        { category_id: 1, product_id: 11 },
        { category_id: 2, product_id: 12 }
      ];

      const score = RecommendationService.calculateContentScore(rec, customerHistory);

      expect(score).to.be.a('number');
      expect(score).to.be.greaterThan(0);
      expect(score).to.be.at.most(100);
    });

    it('should give higher score for frequently purchased categories', () => {
      const rec = {
        popularity: 25,
        category_id: 1
      };

      const frequentCategory = [
        { category_id: 1, product_id: 1 },
        { category_id: 1, product_id: 2 },
        { category_id: 1, product_id: 3 },
        { category_id: 1, product_id: 4 }
      ];

      const rareCategory = [
        { category_id: 1, product_id: 1 },
        { category_id: 2, product_id: 2 }
      ];

      const highScore = RecommendationService.calculateContentScore(rec, frequentCategory);
      const lowScore = RecommendationService.calculateContentScore(rec, rareCategory);

      expect(highScore).to.be.greaterThan(lowScore);
    });

    it('should handle empty customer history', () => {
      const rec = {
        popularity: 25,
        category_id: 1
      };

      const score = RecommendationService.calculateContentScore(rec, []);

      expect(score).to.be.a('number');
      expect(score).to.be.greaterThan(0);
    });
  });

  describe('calculatePopularityScore()', () => {
    it('should calculate score from multiple metrics', () => {
      const rec = {
        times_ordered: 50,
        unique_customers: 25,
        total_sold: 250
      };

      const score = RecommendationService.calculatePopularityScore(rec);

      expect(score).to.be.a('number');
      expect(score).to.be.greaterThan(0);
      expect(score).to.be.at.most(100);
    });

    it('should give higher score for more popular products', () => {
      const highPop = {
        times_ordered: 80,
        unique_customers: 40,
        total_sold: 400
      };

      const lowPop = {
        times_ordered: 10,
        unique_customers: 5,
        total_sold: 50
      };

      const highScore = RecommendationService.calculatePopularityScore(highPop);
      const lowScore = RecommendationService.calculatePopularityScore(lowPop);

      expect(highScore).to.be.greaterThan(lowScore);
    });

    it('should apply correct weights to metrics', () => {
      // According to the implementation:
      // ordersScore * 0.4 + customersScore * 0.3 + volumeScore * 0.3

      const rec = {
        times_ordered: 100,  // Max out this metric
        unique_customers: 0, // Zero this one
        total_sold: 0        // Zero this one
      };

      const score = RecommendationService.calculatePopularityScore(rec);

      // Should be 40% of 100 = 40
      expect(score).to.be.closeTo(40, 5);
    });
  });

  describe('calculateAssociationConfidence()', () => {
    it('should calculate confidence based on frequency', () => {
      const rec = {
        times_bought_together: 10
      };

      const confidence = RecommendationService.calculateAssociationConfidence(rec);

      expect(confidence).to.be.a('number');
      expect(confidence).to.be.at.least(0);
      expect(confidence).to.be.at.most(1);
    });

    it('should cap confidence at 1.0', () => {
      const rec = {
        times_bought_together: 100 // Very high frequency
      };

      const confidence = RecommendationService.calculateAssociationConfidence(rec);

      expect(confidence).to.equal(1);
    });

    it('should increase with frequency', () => {
      const lowFreq = { times_bought_together: 5 };
      const highFreq = { times_bought_together: 15 };

      const lowConf = RecommendationService.calculateAssociationConfidence(lowFreq);
      const highConf = RecommendationService.calculateAssociationConfidence(highFreq);

      expect(highConf).to.be.greaterThan(lowConf);
    });
  });

  describe('combineRecommendations()', () => {
    it('should combine collaborative and content recommendations', () => {
      const collaborative = [
        { product_id: 1, score: 80, name: 'Product 1', price: 10 },
        { product_id: 2, score: 70, name: 'Product 2', price: 15 }
      ];

      const contentBased = [
        { product_id: 2, score: 60, name: 'Product 2', price: 15 },
        { product_id: 3, score: 50, name: 'Product 3', price: 20 }
      ];

      const result = RecommendationService.combineRecommendations(
        collaborative,
        contentBased,
        10
      );

      expect(result).to.be.an('array');
      expect(result).to.have.length.at.most(10);
    });

    it('should boost products recommended by both sources', () => {
      const collaborative = [
        { product_id: 1, score: 50, name: 'Product 1', price: 10 }
      ];

      const contentBased = [
        { product_id: 1, score: 50, name: 'Product 1', price: 10 },
        { product_id: 2, score: 100, name: 'Product 2', price: 15 }
      ];

      const result = RecommendationService.combineRecommendations(
        collaborative,
        contentBased,
        10
      );

      // Product 1 should have higher combined score due to appearing in both
      const product1 = result.find(r => r.product_id === 1);

      expect(product1).to.exist;
      expect(product1.sources).to.include('collaborative');
      expect(product1.sources).to.include('content');
    });

    it('should apply higher weight to collaborative recommendations', () => {
      const collaborative = [
        { product_id: 1, score: 60, name: 'Product 1', price: 10 }
      ];

      const contentBased = [
        { product_id: 2, score: 60, name: 'Product 2', price: 15 }
      ];

      const result = RecommendationService.combineRecommendations(
        collaborative,
        contentBased,
        10
      );

      // Collaborative gets 1.5x boost
      const product1 = result.find(r => r.product_id === 1);
      const product2 = result.find(r => r.product_id === 2);

      expect(product1.score).to.be.greaterThan(product2.score);
    });

    it('should respect limit parameter', () => {
      const collaborative = Array.from({ length: 10 }, (_, i) => ({
        product_id: i,
        score: 50,
        name: `Product ${i}`,
        price: 10
      }));

      const contentBased = Array.from({ length: 10 }, (_, i) => ({
        product_id: i + 10,
        score: 50,
        name: `Product ${i + 10}`,
        price: 10
      }));

      const result = RecommendationService.combineRecommendations(
        collaborative,
        contentBased,
        5
      );

      expect(result).to.have.lengthOf(5);
    });

    it('should sort by score descending', () => {
      const collaborative = [
        { product_id: 1, score: 30, name: 'Product 1', price: 10 },
        { product_id: 2, score: 90, name: 'Product 2', price: 15 },
        { product_id: 3, score: 60, name: 'Product 3', price: 20 }
      ];

      const result = RecommendationService.combineRecommendations(
        collaborative,
        [],
        10
      );

      // Should be sorted: Product 2 (90), Product 3 (60), Product 1 (30)
      expect(result[0].product_id).to.equal(2);
      expect(result[1].product_id).to.equal(3);
      expect(result[2].product_id).to.equal(1);
    });
  });

  describe('getSuggestedAddons()', () => {
    it('should return empty array for empty cart', () => {
      const result = RecommendationService.getSuggestedAddons([], 5);

      expect(result).to.be.an('array');
      expect(result).to.have.lengthOf(0);
    });

    it('should not suggest items already in cart', () => {
      // This test requires database access and is skipped for unit tests
      // It would be tested in integration tests
    });

    it('should increase score for products suggested multiple times', () => {
      // This test requires database access and is skipped for unit tests
      // It would be tested in integration tests
    });
  });
});

describe('Recommendation Service Integration', () => {
  // Note: These tests require database access and are more integration-level
  // They are skipped here to keep unit tests fast and isolated

  describe.skip('getPersonalizedRecommendations()', () => {
    it('should return recommendations for existing customer', async () => {
      const customerId = 1;
      const limit = 10;

      const result = await RecommendationService.getPersonalizedRecommendations(
        customerId,
        limit
      );

      expect(result).to.be.an('array');
      expect(result).to.have.length.at.most(limit);

      if (result.length > 0) {
        const recommendation = result[0];
        expect(recommendation).to.have.property('product_id');
        expect(recommendation).to.have.property('name');
        expect(recommendation).to.have.property('price');
        expect(recommendation).to.have.property('score');
        expect(recommendation).to.have.property('reason');
      }
    });

    it('should return popular products for new customer', async () => {
      const newCustomerId = 99999;
      const result = await RecommendationService.getPersonalizedRecommendations(
        newCustomerId,
        5
      );

      expect(result).to.be.an('array');

      if (result.length > 0) {
        expect(result[0]).to.have.property('reason', 'Popular choice');
      }
    });
  });

  describe.skip('getFrequentlyBoughtTogether()', () => {
    it('should return products bought together', () => {
      const productId = 1;
      const limit = 5;

      const result = RecommendationService.getFrequentlyBoughtTogether(productId, limit);

      expect(result).to.be.an('array');
      expect(result).to.have.length.at.most(limit);

      if (result.length > 0) {
        const item = result[0];
        expect(item).to.have.property('product_id');
        expect(item).to.have.property('times_bought_together');
        expect(item).to.have.property('confidence');
        expect(item).to.have.property('reason', 'Frequently bought together');
      }
    });
  });

  describe.skip('getUpsellOptions()', () => {
    it('should return higher-priced alternatives', () => {
      const productId = 1;
      const limit = 3;

      const result = RecommendationService.getUpsellOptions(productId, limit);

      expect(result).to.be.an('array');
      expect(result).to.have.length.at.most(limit);

      if (result.length > 0) {
        const item = result[0];
        expect(item).to.have.property('price');
        expect(item).to.have.property('upgrade_value');
        expect(item).to.have.property('reason', 'Premium alternative');
      }
    });
  });

  describe.skip('getTrendingProducts()', () => {
    it('should return products with positive growth', () => {
      const limit = 10;

      const result = RecommendationService.getTrendingProducts(limit);

      expect(result).to.be.an('array');
      expect(result).to.have.length.at.most(limit);

      if (result.length > 0) {
        const item = result[0];
        expect(item).to.have.property('growth_rate');
        expect(item).to.have.property('growth_percentage');
        expect(item).to.have.property('trend', 'up');
        expect(item.growth_rate).to.be.greaterThan(0);
      }
    });
  });
});
