// Forecasting Routes
import express from 'express';
import { forecastingService, anomalyDetectionService } from '../index.js';
import logger from '../../../config/logger.js';

const router = express.Router();

// Sales forecasting endpoints
router.get('/sales', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const forecast = await forecastingService.forecastSales(Number(days));
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    logger.error('Error forecasting sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to forecast sales'
    });
  }
});

router.get('/sales/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;
    const forecast = await forecastingService.forecastByProduct(Number(productId), Number(days));
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    logger.error('Error forecasting product sales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to forecast product sales'
    });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const recommendations = await forecastingService.getInventoryRecommendations();
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting inventory recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inventory recommendations'
    });
  }
});

router.get('/cash-flow', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const prediction = await forecastingService.predictCashFlow(Number(days));
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.error('Error predicting cash flow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict cash flow'
    });
  }
});

// Anomaly detection endpoints
router.get('/anomalies', async (req, res) => {
  try {
    const anomalies = await anomalyDetectionService.detectAnomalies();
    res.json({
      success: true,
      data: anomalies
    });
  } catch (error) {
    logger.error('Error detecting anomalies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect anomalies'
    });
  }
});

router.get('/anomalies/summary', async (req, res) => {
  try {
    const summary = await anomalyDetectionService.getAnomalySummary();
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error('Error getting anomaly summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get anomaly summary'
    });
  }
});

router.put('/anomalies/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    await anomalyDetectionService.updateAnomalyStatus(id, status, notes);

    res.json({
      success: true,
      message: 'Anomaly status updated'
    });
  } catch (error) {
    logger.error('Error updating anomaly status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update anomaly status'
    });
  }
});

// Model training endpoint (admin only)
router.post('/train', async (req, res) => {
  try {
    // Check admin role
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    await forecastingService.trainModels();

    res.json({
      success: true,
      message: 'Model training initiated'
    });
  } catch (error) {
    logger.error('Error training models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train models'
    });
  }
});

export { router as forecastingRoutes };