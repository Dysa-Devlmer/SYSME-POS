// Dashboard Routes
import express from 'express';
import { dashboardService, recommendationEngine } from '../index.js';
import logger from '../../../config/logger.js';

const router = express.Router();

// Dashboard endpoints
router.get('/metrics', async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const metrics = await dashboardService.getDashboardMetrics(period as string);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting dashboard metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard metrics'
    });
  }
});

router.get('/executive-summary', async (req, res) => {
  try {
    const summary = await dashboardService.getExecutiveSummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error getting executive summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get executive summary'
    });
  }
});

// Recommendations endpoints
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await recommendationEngine.generateRecommendations();
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations'
    });
  }
});

router.get('/recommendations/:area', async (req, res) => {
  try {
    const { area } = req.params;
    const recommendations = await recommendationEngine.getTargetedRecommendations(area);
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting targeted recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get targeted recommendations'
    });
  }
});

router.post('/recommendations/:id/track', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await recommendationEngine.trackImplementation(id, status);

    res.json({
      success: true,
      message: 'Recommendation tracking updated'
    });
  } catch (error) {
    logger.error('Error tracking recommendation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track recommendation'
    });
  }
});

// Auto-update control
router.post('/auto-update/start', async (req, res) => {
  try {
    const { interval = 300000 } = req.body;
    dashboardService.startAutoUpdate(interval);
    res.json({
      success: true,
      message: `Auto-update started with ${interval}ms interval`
    });
  } catch (error) {
    logger.error('Error starting auto-update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start auto-update'
    });
  }
});

router.post('/auto-update/stop', async (req, res) => {
  try {
    dashboardService.stopAutoUpdate();
    res.json({
      success: true,
      message: 'Auto-update stopped'
    });
  } catch (error) {
    logger.error('Error stopping auto-update:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop auto-update'
    });
  }
});

export { router as dashboardRoutes };