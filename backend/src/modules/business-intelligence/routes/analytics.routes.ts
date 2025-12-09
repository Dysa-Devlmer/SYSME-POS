// Analytics Routes
import express from 'express';
import { menuEngineeringService, rfmAnalysisService } from '../index.js';
import logger from '../../../config/logger.js';

const router = express.Router();

// Menu Engineering endpoints
router.get('/menu/analysis', async (req, res) => {
  try {
    const { period = 30 } = req.query;
    const analysis = await menuEngineeringService.analyzeMenuItems(Number(period));
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze menu items'
    });
  }
});

router.get('/menu/categories', async (req, res) => {
  try {
    const analysis = await menuEngineeringService.analyzeCategoryPerformance();
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze categories'
    });
  }
});

router.get('/menu/pricing', async (req, res) => {
  try {
    const recommendations = await menuEngineeringService.getOptimalPriceRecommendations();
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting price recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price recommendations'
    });
  }
});

router.get('/menu/combos', async (req, res) => {
  try {
    const recommendations = await menuEngineeringService.getComboRecommendations();
    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    logger.error('Error getting combo recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get combo recommendations'
    });
  }
});

// RFM Analysis endpoints
router.get('/customers/rfm', async (req, res) => {
  try {
    const analysis = await rfmAnalysisService.analyzeCustomers();
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze customers'
    });
  }
});

router.get('/customers/segments', async (req, res) => {
  try {
    const segments = await rfmAnalysisService.analyzeSegments();
    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    logger.error('Error analyzing segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze customer segments'
    });
  }
});

router.get('/customers/churn', async (req, res) => {
  try {
    const predictions = await rfmAnalysisService.predictChurn();
    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    logger.error('Error predicting churn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict churn'
    });
  }
});

router.get('/customers/retention-campaigns', async (req, res) => {
  try {
    const campaigns = await rfmAnalysisService.getRetentionCampaigns();
    res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    logger.error('Error getting retention campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get retention campaigns'
    });
  }
});

router.get('/customers/:id/next-actions', async (req, res) => {
  try {
    const { id } = req.params;
    const actions = await rfmAnalysisService.getNextBestActions(Number(id));
    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    logger.error('Error getting next best actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get next best actions'
    });
  }
});

export { router as analyticsRoutes };