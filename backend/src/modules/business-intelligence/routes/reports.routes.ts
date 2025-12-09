// Reports Routes - Generate and export reports
import express from 'express';
import {
  forecastingService,
  menuEngineeringService,
  rfmAnalysisService,
  anomalyDetectionService,
  dashboardService,
  recommendationEngine
} from '../index.js';
import logger from '../../../config/logger.js';

const router = express.Router();

// Comprehensive business report
router.get('/comprehensive', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Gather all data in parallel
    const [
      dashboard,
      forecast,
      menuAnalysis,
      customerSegments,
      anomalies,
      recommendations
    ] = await Promise.all([
      dashboardService.getDashboardMetrics(period as string),
      forecastingService.forecastSales(30),
      menuEngineeringService.analyzeMenuItems(30),
      rfmAnalysisService.analyzeSegments(),
      anomalyDetectionService.getAnomalySummary(),
      recommendationEngine.generateRecommendations()
    ]);

    const report = {
      generated_at: new Date().toISOString(),
      period,
      executive_summary: {
        revenue: dashboard.sales.month_to_date,
        growth_rate: dashboard.sales.growth_rate,
        customer_count: dashboard.customers.new_customers_today,
        operational_efficiency: dashboard.operations.productivity_score,
        critical_alerts: anomalies.by_severity.critical
      },
      dashboard_metrics: dashboard,
      sales_forecast: {
        next_30_days: forecast,
        summary: {
          total_predicted: forecast.reduce((sum, f) => sum + f.predicted_sales, 0),
          average_daily: Math.round(forecast.reduce((sum, f) => sum + f.predicted_sales, 0) / 30),
          trend: forecast[0]?.trend || 'stable'
        }
      },
      menu_performance: {
        star_items: menuAnalysis.filter(i => i.classification === 'star').length,
        items_to_remove: menuAnalysis.filter(i => i.classification === 'dog').length,
        top_performers: menuAnalysis.slice(0, 5)
      },
      customer_insights: {
        segments: customerSegments,
        vip_percentage: customerSegments.find(s => s.segment === 'Champions')?.percentage_of_base || 0,
        at_risk_percentage: customerSegments.find(s => s.segment === 'At Risk')?.percentage_of_base || 0
      },
      anomaly_detection: anomalies,
      recommendations: recommendations.slice(0, 10)
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating comprehensive report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive report'
    });
  }
});

// Sales performance report
router.get('/sales-performance', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const salesMetrics = await dashboardService.getSalesMetrics('month');
    const forecast = await forecastingService.forecastSales(30);
    const cashFlow = await forecastingService.predictCashFlow(30);

    const report = {
      generated_at: new Date().toISOString(),
      period: { start_date, end_date },
      current_performance: salesMetrics,
      forecast: forecast,
      cash_flow_projection: cashFlow,
      key_insights: [
        `Current growth rate: ${salesMetrics.growth_rate}%`,
        `Average ticket size: $${salesMetrics.average_ticket}`,
        `Projected next 30 days: $${forecast.reduce((sum, f) => sum + f.predicted_sales, 0)}`
      ]
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating sales report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate sales report'
    });
  }
});

// Customer analytics report
router.get('/customer-analytics', async (req, res) => {
  try {
    const rfmAnalysis = await rfmAnalysisService.analyzeCustomers();
    const segments = await rfmAnalysisService.analyzeSegments();
    const churnPredictions = await rfmAnalysisService.predictChurn();
    const campaigns = await rfmAnalysisService.getRetentionCampaigns();

    const report = {
      generated_at: new Date().toISOString(),
      total_customers: rfmAnalysis.length,
      customer_segments: segments,
      rfm_distribution: {
        champions: rfmAnalysis.filter(c => c.segment === 'Champions').length,
        loyal: rfmAnalysis.filter(c => c.segment === 'Loyal Customers').length,
        at_risk: rfmAnalysis.filter(c => c.segment === 'At Risk').length,
        lost: rfmAnalysis.filter(c => c.segment === 'Lost').length
      },
      churn_analysis: {
        at_risk_count: churnPredictions.length,
        total_value_at_risk: churnPredictions.reduce((sum, c) => sum + c.estimated_loss, 0),
        top_at_risk: churnPredictions.slice(0, 10)
      },
      recommended_campaigns: campaigns
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating customer analytics report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate customer analytics report'
    });
  }
});

// Menu optimization report
router.get('/menu-optimization', async (req, res) => {
  try {
    const menuAnalysis = await menuEngineeringService.analyzeMenuItems(30);
    const categoryPerformance = await menuEngineeringService.analyzeCategoryPerformance();
    const priceRecommendations = await menuEngineeringService.getOptimalPriceRecommendations();
    const comboRecommendations = await menuEngineeringService.getComboRecommendations();

    const report = {
      generated_at: new Date().toISOString(),
      menu_items_analysis: {
        total_items: menuAnalysis.length,
        classifications: {
          stars: menuAnalysis.filter(i => i.classification === 'star'),
          puzzles: menuAnalysis.filter(i => i.classification === 'puzzle'),
          plow_horses: menuAnalysis.filter(i => i.classification === 'plow_horse'),
          dogs: menuAnalysis.filter(i => i.classification === 'dog')
        }
      },
      category_performance: categoryPerformance,
      optimization_opportunities: {
        price_adjustments: priceRecommendations,
        combo_suggestions: comboRecommendations
      },
      action_items: [
        `Remove ${menuAnalysis.filter(i => i.classification === 'dog').length} underperforming items`,
        `Create ${comboRecommendations.length} new combo meals`,
        `Adjust prices for ${priceRecommendations.length} items`
      ]
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating menu optimization report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate menu optimization report'
    });
  }
});

// Operational efficiency report
router.get('/operational-efficiency', async (req, res) => {
  try {
    const operationalMetrics = await dashboardService.getOperationalMetrics('month');
    const anomalies = await anomalyDetectionService.detectAnomalies();
    const inventoryRecs = await forecastingService.getInventoryRecommendations();

    const report = {
      generated_at: new Date().toISOString(),
      efficiency_metrics: operationalMetrics,
      detected_issues: {
        total_anomalies: anomalies.length,
        critical_anomalies: anomalies.filter(a => a.severity === 'critical'),
        by_type: {
          fraud: anomalies.filter(a => a.type === 'fraud'),
          inventory: anomalies.filter(a => a.type === 'inventory'),
          refunds: anomalies.filter(a => a.type === 'refund')
        }
      },
      inventory_optimization: {
        items_needing_reorder: inventoryRecs.filter(i => i.recommended_action === 'urgent_reorder'),
        overstocked_items: inventoryRecs.filter(i => i.days_of_stock > 30),
        recommendations: inventoryRecs.slice(0, 10)
      },
      improvement_areas: [
        operationalMetrics.service_speed > 25 ? 'Reduce service time' : null,
        operationalMetrics.labor_cost_percentage > 30 ? 'Optimize labor costs' : null,
        operationalMetrics.waste_percentage > 5 ? 'Reduce waste' : null
      ].filter(Boolean)
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating operational efficiency report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate operational efficiency report'
    });
  }
});

// Export report as CSV
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;

    let data: any;

    switch (type) {
      case 'customers':
        data = await rfmAnalysisService.analyzeCustomers();
        break;
      case 'menu':
        data = await menuEngineeringService.analyzeMenuItems(30);
        break;
      case 'forecast':
        data = await forecastingService.forecastSales(30);
        break;
      case 'anomalies':
        data = await anomalyDetectionService.detectAnomalies();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type'
        });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
      res.send(csvData);
    } else {
      res.json({
        success: true,
        data
      });
    }
  } catch (error) {
    logger.error('Error exporting report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');

  const csvRows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      return typeof value === 'object' ? JSON.stringify(value) : value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}

export { router as reportsRoutes };