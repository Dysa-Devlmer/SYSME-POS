// Business Intelligence Module - Main Entry Point
import express from 'express';
import { authMiddleware } from '../auth/middleware.js';
import { ForecastingService } from './services/ForecastingService.js';
import { MenuEngineeringService } from './services/MenuEngineeringService.js';
import { RFMAnalysisService } from './services/RFMAnalysisService.js';
import { AnomalyDetectionService } from './services/AnomalyDetectionService.js';
import { DashboardService } from './services/DashboardService.js';
import { RecommendationEngine } from './services/RecommendationEngine.js';
import { analyticsRoutes } from './routes/analytics.routes.js';
import { forecastingRoutes } from './routes/forecasting.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { reportsRoutes } from './routes/reports.routes.js';
import * as biWebSocket from './websocket/bi.websocket.js';
import logger from '../../config/logger.js';

const router = express.Router();

// Initialize services
export const forecastingService = new ForecastingService();
export const menuEngineeringService = new MenuEngineeringService();
export const rfmAnalysisService = new RFMAnalysisService();
export const anomalyDetectionService = new AnomalyDetectionService();
export const dashboardService = new DashboardService();
export const recommendationEngine = new RecommendationEngine();

// Apply authentication to all BI routes
router.use(authMiddleware);

// Mount route modules
router.use('/analytics', analyticsRoutes);
router.use('/forecasting', forecastingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);

// Initialize background jobs
export function initializeBIModule() {
  logger.info('🧠 Initializing Business Intelligence Module...');

  // Schedule periodic model training
  setInterval(() => {
    forecastingService.trainModels();
  }, 24 * 60 * 60 * 1000); // Daily

  // Schedule anomaly detection
  setInterval(() => {
    anomalyDetectionService.detectAnomalies();
  }, 60 * 60 * 1000); // Hourly

  // Real-time dashboard updates
  setInterval(() => {
    dashboardService.updateMetrics();
  }, 5 * 60 * 1000); // Every 5 minutes

  logger.info('✅ Business Intelligence Module initialized');
}

// Export WebSocket handlers
export { biWebSocket };

export default router;