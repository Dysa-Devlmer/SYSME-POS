/**
 * =====================================================
 * AI Controller - Artificial Intelligence Features
 * =====================================================
 * Handles all AI/ML related endpoints:
 * - Demand forecasting
 * - Product recommendations
 * - Proactive alerts
 * - Pattern analysis
 * - Auto-reordering
 *
 * @module controllers/ai
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const DemandForecastingService = require('../services/ai/demand-forecasting.service');
const RecommendationService = require('../services/ai/recommendation.service');
const ProactiveAlertsService = require('../services/ai/proactive-alerts.service');

class AIController {
  /**
   * Get demand forecast for a product
   * GET /api/ai/forecast/:productId
   */
  async getDemandForecast(req, res, next) {
    try {
      const { productId } = req.params;
      const { daysAhead = 7 } = req.query;

      const forecast = await DemandForecastingService.predictDemand(
        parseInt(productId),
        parseInt(daysAhead)
      );

      return res.json({
        success: true,
        data: forecast
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get reorder recommendations based on forecasts
   * GET /api/ai/reorder-recommendations
   */
  async getReorderRecommendations(req, res, next) {
    try {
      const { confidence_threshold = 0.6 } = req.query;

      const recommendations = await DemandForecastingService.getReorderRecommendations(
        parseFloat(confidence_threshold)
      );

      return res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sales pattern analysis
   * GET /api/ai/patterns/sales
   */
  async getSalesPatterns(req, res, next) {
    try {
      const { productId, daysBack = 30 } = req.query;

      const patterns = await DemandForecastingService.analyzeSalesPatterns(
        productId ? parseInt(productId) : null,
        parseInt(daysBack)
      );

      return res.json({
        success: true,
        data: patterns
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get personalized recommendations for a customer
   * GET /api/ai/recommendations/:customerId
   */
  async getPersonalizedRecommendations(req, res, next) {
    try {
      const { customerId } = req.params;
      const { limit = 10 } = req.query;

      const recommendations = await RecommendationService.getPersonalizedRecommendations(
        parseInt(customerId),
        parseInt(limit)
      );

      return res.json({
        success: true,
        data: recommendations,
        count: recommendations.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get frequently bought together products
   * GET /api/ai/frequently-bought-together/:productId
   */
  async getFrequentlyBoughtTogether(req, res, next) {
    try {
      const { productId } = req.params;
      const { limit = 5 } = req.query;

      const related = RecommendationService.getFrequentlyBoughtTogether(
        parseInt(productId),
        parseInt(limit)
      );

      return res.json({
        success: true,
        data: related,
        count: related.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get upsell options for a product
   * GET /api/ai/upsell/:productId
   */
  async getUpsellOptions(req, res, next) {
    try {
      const { productId } = req.params;
      const { limit = 3 } = req.query;

      const upsells = RecommendationService.getUpsellOptions(
        parseInt(productId),
        parseInt(limit)
      );

      return res.json({
        success: true,
        data: upsells,
        count: upsells.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cross-sell suggestions for cart
   * POST /api/ai/cross-sell
   */
  async getCrossSellSuggestions(req, res, next) {
    try {
      const { cartItems, limit = 5 } = req.body;

      const suggestions = RecommendationService.getSuggestedAddons(
        cartItems,
        limit
      );

      return res.json({
        success: true,
        data: suggestions,
        count: suggestions.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending products
   * GET /api/ai/trending
   */
  async getTrendingProducts(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const trending = RecommendationService.getTrendingProducts(
        parseInt(limit)
      );

      return res.json({
        success: true,
        data: trending,
        count: trending.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Run all monitoring checks and get alerts
   * GET /api/ai/alerts/monitor
   */
  async monitorAndGetAlerts(req, res, next) {
    try {
      const result = await ProactiveAlertsService.monitorAndAlert();

      return res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active alerts
   * GET /api/ai/alerts
   */
  async getActiveAlerts(req, res, next) {
    try {
      const { severity, type, limit } = req.query;

      const filters = {
        severity,
        type,
        limit: limit ? parseInt(limit) : undefined
      };

      const alerts = ProactiveAlertsService.getActiveAlerts(filters);

      return res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dismiss an alert
   * PUT /api/ai/alerts/:alertId/dismiss
   */
  async dismissAlert(req, res, next) {
    try {
      const { alertId } = req.params;

      const result = ProactiveAlertsService.dismissAlert(parseInt(alertId));

      return res.json({
        success: true,
        message: 'Alert dismissed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Take automated action on an alert
   * POST /api/ai/alerts/:alertId/action
   */
  async takeAlertAction(req, res, next) {
    try {
      const { alertId } = req.params;
      const { action } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          error: { message: 'Action is required' }
        });
      }

      const result = await ProactiveAlertsService.takeAutomatedAction(
        parseInt(alertId),
        action
      );

      return res.json({
        success: true,
        message: 'Action executed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get alert statistics
   * GET /api/ai/alerts/statistics
   */
  async getAlertStatistics(req, res, next) {
    try {
      const { daysBack = 30 } = req.query;

      const stats = ProactiveAlertsService.getAlertStatistics(
        parseInt(daysBack)
      );

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get AI dashboard overview
   * GET /api/ai/dashboard
   */
  async getAIDashboard(req, res, next) {
    try {
      // Get various AI metrics for dashboard
      const [
        reorderRecs,
        activeAlerts,
        trending,
        alertStats
      ] = await Promise.all([
        DemandForecastingService.getReorderRecommendations(0.6),
        ProactiveAlertsService.getActiveAlerts({ limit: 10 }),
        RecommendationService.getTrendingProducts(5),
        ProactiveAlertsService.getAlertStatistics(7)
      ]);

      return res.json({
        success: true,
        data: {
          reorder_recommendations: {
            count: reorderRecs.length,
            urgent: reorderRecs.filter(r => r.urgency >= 75).length,
            items: reorderRecs.slice(0, 5)
          },
          active_alerts: {
            total: activeAlerts.length,
            critical: activeAlerts.filter(a => a.severity === 'critical').length,
            high: activeAlerts.filter(a => a.severity === 'high').length,
            items: activeAlerts.slice(0, 5)
          },
          trending_products: {
            count: trending.length,
            items: trending
          },
          alert_statistics: alertStats
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AIController();
