/**
 * =====================================================
 * AI Routes - Artificial Intelligence Features
 * =====================================================
 * Routes for AI/ML endpoints:
 * - Demand forecasting
 * - Product recommendations
 * - Proactive alerts
 * - Pattern analysis
 *
 * @module routes/ai
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

// =====================================================
// DEMAND FORECASTING ROUTES
// =====================================================

/**
 * @route   GET /api/ai/forecast/:productId
 * @desc    Get demand forecast for a product
 * @access  Private (Admin, Manager, Analyst)
 */
router.get(
  '/forecast/:productId',
  authenticate,
  authorize(['admin', 'manager', 'analyst']),
  aiController.getDemandForecast
);

/**
 * @route   GET /api/ai/reorder-recommendations
 * @desc    Get reorder recommendations based on forecasts
 * @access  Private (Admin, Manager, Inventory)
 */
router.get(
  '/reorder-recommendations',
  authenticate,
  authorize(['admin', 'manager', 'inventory']),
  aiController.getReorderRecommendations
);

/**
 * @route   GET /api/ai/patterns/sales
 * @desc    Get sales pattern analysis
 * @access  Private (Admin, Manager, Analyst)
 */
router.get(
  '/patterns/sales',
  authenticate,
  authorize(['admin', 'manager', 'analyst']),
  aiController.getSalesPatterns
);

// =====================================================
// RECOMMENDATION ROUTES
// =====================================================

/**
 * @route   GET /api/ai/recommendations/:customerId
 * @desc    Get personalized recommendations for a customer
 * @access  Private (All authenticated users)
 */
router.get(
  '/recommendations/:customerId',
  authenticate,
  aiController.getPersonalizedRecommendations
);

/**
 * @route   GET /api/ai/frequently-bought-together/:productId
 * @desc    Get frequently bought together products
 * @access  Public (for POS interface)
 */
router.get(
  '/frequently-bought-together/:productId',
  aiController.getFrequentlyBoughtTogether
);

/**
 * @route   GET /api/ai/upsell/:productId
 * @desc    Get upsell options for a product
 * @access  Public (for POS interface)
 */
router.get(
  '/upsell/:productId',
  aiController.getUpsellOptions
);

/**
 * @route   POST /api/ai/cross-sell
 * @desc    Get cross-sell suggestions for cart
 * @access  Public (for POS interface)
 */
router.post(
  '/cross-sell',
  aiController.getCrossSellSuggestions
);

/**
 * @route   GET /api/ai/trending
 * @desc    Get trending products
 * @access  Public
 */
router.get(
  '/trending',
  aiController.getTrendingProducts
);

// =====================================================
// PROACTIVE ALERTS ROUTES
// =====================================================

/**
 * @route   GET /api/ai/alerts/monitor
 * @desc    Run all monitoring checks and get alerts
 * @access  Private (Admin, Manager)
 */
router.get(
  '/alerts/monitor',
  authenticate,
  authorize(['admin', 'manager']),
  aiController.monitorAndGetAlerts
);

/**
 * @route   GET /api/ai/alerts
 * @desc    Get active alerts
 * @access  Private (Admin, Manager, Supervisor)
 */
router.get(
  '/alerts',
  authenticate,
  authorize(['admin', 'manager', 'supervisor']),
  aiController.getActiveAlerts
);

/**
 * @route   PUT /api/ai/alerts/:alertId/dismiss
 * @desc    Dismiss an alert
 * @access  Private (Admin, Manager)
 */
router.put(
  '/alerts/:alertId/dismiss',
  authenticate,
  authorize(['admin', 'manager']),
  aiController.dismissAlert
);

/**
 * @route   POST /api/ai/alerts/:alertId/action
 * @desc    Take automated action on an alert
 * @access  Private (Admin only)
 */
router.post(
  '/alerts/:alertId/action',
  authenticate,
  authorize(['admin']),
  aiController.takeAlertAction
);

/**
 * @route   GET /api/ai/alerts/statistics
 * @desc    Get alert statistics
 * @access  Private (Admin, Manager, Analyst)
 */
router.get(
  '/alerts/statistics',
  authenticate,
  authorize(['admin', 'manager', 'analyst']),
  aiController.getAlertStatistics
);

// =====================================================
// DASHBOARD ROUTE
// =====================================================

/**
 * @route   GET /api/ai/dashboard
 * @desc    Get AI dashboard overview
 * @access  Private (Admin, Manager)
 */
router.get(
  '/dashboard',
  authenticate,
  authorize(['admin', 'manager']),
  aiController.getAIDashboard
);

module.exports = router;
