// Business Intelligence WebSocket Handler
import { Server, Socket } from 'socket.io';
import {
  dashboardService,
  forecastingService,
  anomalyDetectionService
} from '../index.js';
import logger from '../../../config/logger.js';

let io: Server;

export function initializeWebSocket(socketIo: Server) {
  io = socketIo;

  // Create BI namespace
  const biNamespace = io.of('/business-intelligence');

  biNamespace.on('connection', (socket: Socket) => {
    logger.info(`BI WebSocket client connected: ${socket.id}`);

    // Join room based on user role
    const userRole = socket.handshake.auth?.role || 'viewer';
    socket.join(`bi-${userRole}`);

    // Subscribe to real-time dashboard updates
    socket.on('subscribe:dashboard', async (data) => {
      try {
        socket.join('dashboard-updates');

        // Send initial dashboard data
        const metrics = await dashboardService.getDashboardMetrics(data.period || 'today');
        socket.emit('dashboard:metrics', metrics);

        logger.info(`Client ${socket.id} subscribed to dashboard updates`);
      } catch (error) {
        logger.error('Error subscribing to dashboard:', error);
        socket.emit('error', { message: 'Failed to subscribe to dashboard' });
      }
    });

    // Subscribe to anomaly detection
    socket.on('subscribe:anomalies', async () => {
      try {
        socket.join('anomaly-updates');

        // Send current anomalies
        const summary = await anomalyDetectionService.getAnomalySummary();
        socket.emit('anomalies:summary', summary);

        logger.info(`Client ${socket.id} subscribed to anomaly updates`);
      } catch (error) {
        logger.error('Error subscribing to anomalies:', error);
        socket.emit('error', { message: 'Failed to subscribe to anomalies' });
      }
    });

    // Subscribe to forecasting updates
    socket.on('subscribe:forecasts', async () => {
      try {
        socket.join('forecast-updates');

        // Send current forecast
        const forecast = await forecastingService.forecastSales(7);
        socket.emit('forecast:weekly', forecast);

        logger.info(`Client ${socket.id} subscribed to forecast updates`);
      } catch (error) {
        logger.error('Error subscribing to forecasts:', error);
        socket.emit('error', { message: 'Failed to subscribe to forecasts' });
      }
    });

    // Request specific metric update
    socket.on('request:metric', async (data) => {
      try {
        const { metric, params } = data;
        let result;

        switch (metric) {
          case 'sales_forecast':
            result = await forecastingService.forecastSales(params?.days || 30);
            break;
          case 'inventory_recommendations':
            result = await forecastingService.getInventoryRecommendations();
            break;
          case 'cash_flow':
            result = await forecastingService.predictCashFlow(params?.days || 30);
            break;
          default:
            throw new Error(`Unknown metric: ${metric}`);
        }

        socket.emit(`metric:${metric}`, result);
      } catch (error) {
        logger.error('Error getting metric:', error);
        socket.emit('error', { message: 'Failed to get metric data' });
      }
    });

    // Handle real-time alerts
    socket.on('alert:acknowledge', async (data) => {
      try {
        const { alertId } = data;

        // Broadcast to admin room
        biNamespace.to('bi-admin').emit('alert:acknowledged', {
          alertId,
          acknowledgedBy: socket.handshake.auth?.username || 'Unknown',
          timestamp: new Date().toISOString()
        });

        logger.info(`Alert ${alertId} acknowledged by ${socket.id}`);
      } catch (error) {
        logger.error('Error acknowledging alert:', error);
        socket.emit('error', { message: 'Failed to acknowledge alert' });
      }
    });

    // Unsubscribe from updates
    socket.on('unsubscribe:dashboard', () => {
      socket.leave('dashboard-updates');
      logger.info(`Client ${socket.id} unsubscribed from dashboard updates`);
    });

    socket.on('unsubscribe:anomalies', () => {
      socket.leave('anomaly-updates');
      logger.info(`Client ${socket.id} unsubscribed from anomaly updates`);
    });

    socket.on('unsubscribe:forecasts', () => {
      socket.leave('forecast-updates');
      logger.info(`Client ${socket.id} unsubscribed from forecast updates`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`BI WebSocket client disconnected: ${socket.id}`);
    });
  });

  // Set up event listeners for service updates
  setupServiceListeners(biNamespace);

  logger.info('Business Intelligence WebSocket initialized');
}

// Set up listeners for service events
function setupServiceListeners(namespace: any) {
  // Dashboard metrics updates
  dashboardService.on('metricsUpdated', (metrics) => {
    namespace.to('dashboard-updates').emit('dashboard:metrics', metrics);
  });

  // Anomaly detection alerts
  anomalyDetectionService.on('anomalyDetected', (anomaly) => {
    // Send to anomaly subscribers
    namespace.to('anomaly-updates').emit('anomaly:detected', anomaly);

    // Send critical anomalies to all admin users
    if (anomaly.severity === 'critical') {
      namespace.to('bi-admin').emit('alert:critical', {
        type: 'anomaly',
        data: anomaly,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Forecast updates
  forecastingService.on('forecastCompleted', (forecast) => {
    namespace.to('forecast-updates').emit('forecast:updated', forecast);
  });
}

// Broadcast dashboard update to all connected clients
export function broadcastDashboardUpdate(metrics: any) {
  if (io) {
    io.of('/business-intelligence').to('dashboard-updates').emit('dashboard:metrics', metrics);
  }
}

// Broadcast anomaly alert
export function broadcastAnomalyAlert(anomaly: any) {
  if (io) {
    const biNamespace = io.of('/business-intelligence');

    // Send to anomaly subscribers
    biNamespace.to('anomaly-updates').emit('anomaly:detected', anomaly);

    // Send critical alerts to admins
    if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
      biNamespace.to('bi-admin').emit('alert:anomaly', anomaly);
    }
  }
}

// Broadcast forecast update
export function broadcastForecastUpdate(forecast: any) {
  if (io) {
    io.of('/business-intelligence').to('forecast-updates').emit('forecast:updated', forecast);
  }
}

// Send personalized recommendation to specific user
export function sendRecommendation(userId: string, recommendation: any) {
  if (io) {
    io.of('/business-intelligence').to(`user-${userId}`).emit('recommendation:new', recommendation);
  }
}

// Broadcast business insight
export function broadcastInsight(insight: any) {
  if (io) {
    io.of('/business-intelligence').emit('insight:new', {
      ...insight,
      timestamp: new Date().toISOString()
    });
  }
}