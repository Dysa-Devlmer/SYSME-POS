/**
 * Rutas de Analytics
 * Define todos los endpoints de métricas y KPIs
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('./controller');
const authMiddleware = require('../../middleware/auth');
const { validateRequest } = require('../../middleware/validation');
const { query, body } = require('express-validator');

// Middleware de autenticación para todas las rutas
router.use(authMiddleware);

/**
 * @route   GET /api/analytics/sales
 * @desc    Obtener métricas de ventas
 * @access  Private
 */
router.get('/sales',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  (req, res) => analyticsController.getSalesMetrics(req, res)
);

/**
 * @route   GET /api/analytics/inventory
 * @desc    Obtener métricas de inventario
 * @access  Private
 */
router.get('/inventory',
  (req, res) => analyticsController.getInventoryMetrics(req, res)
);

/**
 * @route   GET /api/analytics/customers
 * @desc    Obtener métricas de clientes
 * @access  Private
 */
router.get('/customers',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  (req, res) => analyticsController.getCustomerMetrics(req, res)
);

/**
 * @route   GET /api/analytics/performance
 * @desc    Obtener métricas de rendimiento del sistema
 * @access  Private (Admin only)
 */
router.get('/performance',
  (req, res) => analyticsController.getPerformanceMetrics(req, res)
);

/**
 * @route   GET /api/analytics/kpis
 * @desc    Obtener KPIs configurados
 * @access  Private
 */
router.get('/kpis',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  (req, res) => analyticsController.getKPIs(req, res)
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Obtener análisis de tendencias
 * @access  Private
 */
router.get('/trends',
  [
    query('metric').isString().notEmpty(),
    query('period').isIn(['daily', 'weekly', 'monthly', 'yearly'])
  ],
  validateRequest,
  (req, res) => analyticsController.getTrendAnalysis(req, res)
);

/**
 * @route   GET /api/analytics/predictions
 * @desc    Obtener predicciones usando IA
 * @access  Private
 */
router.get('/predictions',
  [
    query('metric').isString().notEmpty(),
    query('days').optional().isInt({ min: 1, max: 365 })
  ],
  validateRequest,
  (req, res) => analyticsController.getPredictions(req, res)
);

/**
 * @route   POST /api/analytics/compare
 * @desc    Análisis comparativo entre períodos
 * @access  Private
 */
router.post('/compare',
  [
    body('period1.start').isISO8601(),
    body('period1.end').isISO8601(),
    body('period2.start').isISO8601(),
    body('period2.end').isISO8601()
  ],
  validateRequest,
  (req, res) => analyticsController.compareAnalysis(req, res)
);

/**
 * @route   GET /api/analytics/export
 * @desc    Exportar métricas en diferentes formatos
 * @access  Private
 */
router.get('/export',
  [
    query('format').optional().isIn(['csv', 'excel', 'pdf']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validateRequest,
  (req, res) => analyticsController.exportMetrics(req, res)
);

/**
 * @route   GET /api/analytics/dashboards/:dashboardId
 * @desc    Obtener dashboard personalizado
 * @access  Private
 */
router.get('/dashboards/:dashboardId',
  async (req, res) => {
    try {
      const { dashboardId } = req.params;

      // Por ahora retornar dashboard por defecto
      const dashboard = {
        id: dashboardId,
        name: 'Dashboard Principal',
        widgets: [
          {
            id: 'sales_overview',
            type: 'metric_card',
            title: 'Ventas del Mes',
            metric: 'sales',
            position: { x: 0, y: 0, w: 3, h: 2 }
          },
          {
            id: 'sales_chart',
            type: 'line_chart',
            title: 'Tendencia de Ventas',
            metric: 'sales_timeline',
            position: { x: 3, y: 0, w: 6, h: 4 }
          },
          {
            id: 'top_products',
            type: 'table',
            title: 'Productos Más Vendidos',
            metric: 'top_products',
            position: { x: 9, y: 0, w: 3, h: 4 }
          },
          {
            id: 'inventory_status',
            type: 'metric_card',
            title: 'Estado de Inventario',
            metric: 'inventory',
            position: { x: 0, y: 2, w: 3, h: 2 }
          }
        ],
        refreshInterval: 300000, // 5 minutos
        theme: 'light',
        filters: {
          dateRange: 'current_month',
          categories: [],
          locations: []
        }
      };

      res.json({ success: true, data: dashboard });
    } catch (error) {
      console.error('Error obteniendo dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/dashboards
 * @desc    Guardar configuración de dashboard
 * @access  Private
 */
router.post('/dashboards',
  [
    body('name').isString().notEmpty(),
    body('widgets').isArray(),
    body('refreshInterval').optional().isInt({ min: 10000 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const dashboardConfig = req.body;

      // Por ahora solo retornar el mismo dashboard con un ID
      const savedDashboard = {
        ...dashboardConfig,
        id: `dashboard_${Date.now()}`,
        userId: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      res.json({ success: true, data: savedDashboard });
    } catch (error) {
      console.error('Error guardando dashboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/heatmap
 * @desc    Obtener heatmap de ventas
 * @access  Private
 */
router.get('/heatmap',
  [
    query('granularity').optional().isIn(['hour', 'day', 'week'])
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { granularity = 'hour' } = req.query;

      // Generar datos de heatmap de ejemplo
      const heatmapData = [];

      if (granularity === 'hour') {
        // Heatmap por día de la semana y hora
        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        for (let day = 0; day < 7; day++) {
          for (let hour = 8; hour < 22; hour++) {
            heatmapData.push({
              day: days[day],
              hour: `${hour}:00`,
              value: Math.floor(Math.random() * 100)
            });
          }
        }
      }

      res.json({ success: true, data: heatmapData });
    } catch (error) {
      console.error('Error obteniendo heatmap:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/cohort
 * @desc    Obtener análisis de cohort
 * @access  Private
 */
router.get('/cohort',
  [
    query('cohortType').isIn(['weekly', 'monthly']),
    query('metric').isIn(['retention', 'revenue', 'orders']),
    query('periods').isInt({ min: 1, max: 12 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { cohortType, metric, periods } = req.query;

      // Generar datos de cohort de ejemplo
      const cohortData = {
        cohortType,
        metric,
        periods: parseInt(periods),
        data: []
      };

      // Generar cohorts
      for (let i = 0; i < periods; i++) {
        const cohort = {
          name: `Cohort ${i + 1}`,
          startDate: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)),
          values: []
        };

        // Valores de retención decrecientes
        for (let j = 0; j <= i && j < periods; j++) {
          cohort.values.push({
            period: j,
            value: Math.max(100 - (j * 15) + Math.random() * 10, 0)
          });
        }

        cohortData.data.push(cohort);
      }

      res.json({ success: true, data: cohortData });
    } catch (error) {
      console.error('Error obteniendo análisis de cohort:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/abc
 * @desc    Obtener análisis ABC de productos
 * @access  Private
 */
router.get('/abc',
  async (req, res) => {
    try {
      // Análisis ABC: A=20% productos/80% ventas, B=30%/15%, C=50%/5%
      const analysis = {
        categories: [
          {
            category: 'A',
            description: 'Alto valor',
            percentage: 20,
            salesPercentage: 80,
            products: [], // Se llenaría con productos reales
            color: '#10b981'
          },
          {
            category: 'B',
            description: 'Valor medio',
            percentage: 30,
            salesPercentage: 15,
            products: [],
            color: '#f59e0b'
          },
          {
            category: 'C',
            description: 'Bajo valor',
            percentage: 50,
            salesPercentage: 5,
            products: [],
            color: '#ef4444'
          }
        ],
        totalProducts: 0,
        totalSales: 0,
        recommendations: [
          'Mantener stock alto de productos categoría A',
          'Optimizar inventario de categoría B',
          'Considerar descontinuar productos de bajo movimiento en categoría C'
        ]
      };

      res.json({ success: true, data: analysis });
    } catch (error) {
      console.error('Error obteniendo análisis ABC:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   GET /api/analytics/basket
 * @desc    Obtener análisis de canasta (Market Basket Analysis)
 * @access  Private
 */
router.get('/basket',
  [
    query('minSupport').optional().isFloat({ min: 0.001, max: 1 })
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { minSupport = 0.01 } = req.query;

      // Análisis de canasta de ejemplo
      const basketAnalysis = {
        minSupport: parseFloat(minSupport),
        rules: [
          {
            antecedent: ['Pan'],
            consequent: ['Leche'],
            support: 0.15,
            confidence: 0.75,
            lift: 2.5
          },
          {
            antecedent: ['Cerveza'],
            consequent: ['Papas fritas'],
            support: 0.08,
            confidence: 0.65,
            lift: 3.2
          },
          {
            antecedent: ['Café'],
            consequent: ['Azúcar', 'Leche'],
            support: 0.12,
            confidence: 0.80,
            lift: 2.8
          }
        ],
        frequentItemsets: [
          { items: ['Pan', 'Leche'], support: 0.15 },
          { items: ['Cerveza', 'Papas fritas'], support: 0.08 },
          { items: ['Café', 'Azúcar'], support: 0.10 }
        ],
        recommendations: [
          'Ubicar Pan y Leche en áreas cercanas',
          'Crear promociones combinadas de Cerveza y Papas fritas',
          'Ofrecer descuentos en combos de Café con Azúcar y Leche'
        ]
      };

      res.json({ success: true, data: basketAnalysis });
    } catch (error) {
      console.error('Error obteniendo análisis de canasta:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * @route   POST /api/analytics/roi
 * @desc    Calcular ROI de una campaña o período
 * @access  Private
 */
router.post('/roi',
  [
    body('investment').isFloat({ min: 0 }),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('campaignId').optional().isString()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { investment, startDate, endDate, campaignId } = req.body;

      // Cálculo de ROI de ejemplo
      const revenue = Math.random() * investment * 3; // Simulación
      const profit = revenue - investment;
      const roi = (profit / investment) * 100;

      const roiAnalysis = {
        investment,
        revenue,
        profit,
        roi,
        roiPercentage: roi.toFixed(2),
        period: {
          start: startDate,
          end: endDate
        },
        campaignId,
        breakdown: {
          newCustomerRevenue: revenue * 0.4,
          returningCustomerRevenue: revenue * 0.6,
          directSales: revenue * 0.7,
          indirectSales: revenue * 0.3
        },
        projectedAnnualROI: roi * 12,
        paybackPeriod: investment / (profit / 30), // días
        recommendations: roi > 100
          ? ['Mantener o aumentar inversión', 'Replicar estrategia exitosa']
          : ['Optimizar estrategia', 'Reducir costos de adquisición']
      };

      res.json({ success: true, data: roiAnalysis });
    } catch (error) {
      console.error('Error calculando ROI:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

module.exports = router;