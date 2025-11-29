/**
 * Rutas de API para servicios de Inteligencia Artificial
 */

const express = require('express');
const router = express.Router();
const aiController = require('./controller');
const { authenticateToken } = require('../../middleware/auth');
const { checkPermission } = require('../../middleware/permissions');

// Middleware para todas las rutas de IA
router.use(authenticateToken);

// Dashboard y estadísticas
router.get('/dashboard',
    checkPermission('ai.view'),
    aiController.getDashboard.bind(aiController)
);

router.get('/stats',
    checkPermission('ai.view'),
    aiController.getAIStats.bind(aiController)
);

// Predicción de demanda
router.get('/forecast/:productId',
    checkPermission('ai.forecast'),
    aiController.getDemandForecast.bind(aiController)
);

router.get('/reorder-recommendations',
    checkPermission('inventory.manage'),
    aiController.getReorderRecommendations.bind(aiController)
);

// Recomendaciones
router.get('/recommendations/customer/:customerId',
    checkPermission('ai.recommendations'),
    aiController.getPersonalizedRecommendations.bind(aiController)
);

router.get('/frequently-bought/:productId',
    aiController.getFrequentlyBoughtTogether.bind(aiController)
);

router.get('/trending',
    aiController.getTrendingProducts.bind(aiController)
);

router.get('/upsell/:productId',
    aiController.getUpsellRecommendations.bind(aiController)
);

router.post('/cross-sell',
    aiController.getCrossSellingRecommendations.bind(aiController)
);

// Alertas proactivas
router.get('/alerts',
    checkPermission('ai.alerts'),
    aiController.getActiveAlerts.bind(aiController)
);

router.put('/alerts/:alertId/acknowledge',
    checkPermission('ai.alerts'),
    aiController.acknowledgeAlert.bind(aiController)
);

router.put('/alerts/:alertId/resolve',
    checkPermission('ai.alerts'),
    aiController.resolveAlert.bind(aiController)
);

router.post('/alerts/:alertId/action',
    checkPermission('ai.alerts.execute'),
    aiController.executeAlertAction.bind(aiController)
);

// Análisis
router.get('/sales-analysis',
    checkPermission('reports.sales'),
    aiController.getSalesAnalysis.bind(aiController)
);

// Administración
router.post('/initialize',
    checkPermission('admin.system'),
    aiController.initializeServices.bind(aiController)
);

module.exports = router;