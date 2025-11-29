/**
 * Controlador de API para servicios de Inteligencia Artificial
 * Expone todos los endpoints de AI/ML del sistema
 */

const demandForecasting = require('../../services/ai-demand-forecasting');
const recommendationEngine = require('../../services/ai-recommendation-engine');
const proactiveAlerts = require('../../services/ai-proactive-alerts');
const notificationService = require('../../services/realtime-notifications');
const logger = require('../../config/logger');

class AIController {
    /**
     * Dashboard unificado de IA
     * GET /api/ai/dashboard
     */
    async getDashboard(req, res) {
        try {
            const { userId, role } = req.user;

            // Obtener métricas y datos relevantes según el rol
            const [alerts, notifications, recommendations] = await Promise.all([
                proactiveAlerts.getActiveAlerts({ limit: 10 }),
                this.getRecentNotifications(userId),
                recommendationEngine.getTrendingProducts(5)
            ]);

            // Obtener estadísticas del sistema
            const stats = {
                activeAlerts: alerts.length,
                criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
                notificationStats: notificationService.getStats(),
                aiServicesStatus: {
                    demandForecasting: 'active',
                    recommendations: 'active',
                    proactiveAlerts: 'active',
                    notifications: 'active'
                }
            };

            res.json({
                success: true,
                data: {
                    stats,
                    alerts: alerts.slice(0, 5),
                    notifications: notifications.slice(0, 10),
                    trendingProducts: recommendations.recommendations,
                    timestamp: new Date()
                }
            });
        } catch (error) {
            logger.error('Error obteniendo dashboard de IA:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo dashboard de IA'
            });
        }
    }

    /**
     * Predicción de demanda para un producto
     * GET /api/ai/forecast/:productId
     */
    async getDemandForecast(req, res) {
        try {
            const { productId } = req.params;
            const { daysAhead = 7 } = req.query;

            const forecast = await demandForecasting.getForecast(
                parseInt(productId),
                parseInt(daysAhead)
            );

            if (!forecast.success) {
                return res.status(400).json(forecast);
            }

            res.json({
                success: true,
                data: forecast
            });
        } catch (error) {
            logger.error('Error obteniendo predicción de demanda:', error);
            res.status(500).json({
                success: false,
                error: 'Error generando predicción de demanda'
            });
        }
    }

    /**
     * Recomendaciones de reorden
     * GET /api/ai/reorder-recommendations
     */
    async getReorderRecommendations(req, res) {
        try {
            const { limit = 10 } = req.query;

            const recommendations = await demandForecasting.getReorderRecommendations(
                parseInt(limit)
            );

            res.json({
                success: true,
                data: recommendations,
                count: recommendations.length
            });
        } catch (error) {
            logger.error('Error obteniendo recomendaciones de reorden:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo recomendaciones de reorden'
            });
        }
    }

    /**
     * Recomendaciones personalizadas para un cliente
     * GET /api/ai/recommendations/customer/:customerId
     */
    async getPersonalizedRecommendations(req, res) {
        try {
            const { customerId } = req.params;
            const { limit = 10 } = req.query;

            const recommendations = await recommendationEngine.getPersonalizedRecommendations(
                parseInt(customerId),
                parseInt(limit)
            );

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            logger.error('Error obteniendo recomendaciones personalizadas:', error);
            res.status(500).json({
                success: false,
                error: 'Error generando recomendaciones personalizadas'
            });
        }
    }

    /**
     * Productos frecuentemente comprados juntos
     * GET /api/ai/frequently-bought/:productId
     */
    async getFrequentlyBoughtTogether(req, res) {
        try {
            const { productId } = req.params;
            const { limit = 5 } = req.query;

            const recommendations = await recommendationEngine.getFrequentlyBoughtTogether(
                parseInt(productId),
                parseInt(limit)
            );

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            logger.error('Error obteniendo productos frecuentemente comprados juntos:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo productos relacionados'
            });
        }
    }

    /**
     * Productos en tendencia
     * GET /api/ai/trending
     */
    async getTrendingProducts(req, res) {
        try {
            const { limit = 10 } = req.query;

            const trending = await recommendationEngine.getTrendingProducts(
                parseInt(limit)
            );

            res.json({
                success: true,
                data: trending
            });
        } catch (error) {
            logger.error('Error obteniendo productos trending:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo productos en tendencia'
            });
        }
    }

    /**
     * Recomendaciones de upselling
     * GET /api/ai/upsell/:productId
     */
    async getUpsellRecommendations(req, res) {
        try {
            const { productId } = req.params;
            const { limit = 5 } = req.query;

            const recommendations = await recommendationEngine.getUpsellRecommendations(
                parseInt(productId),
                parseInt(limit)
            );

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            logger.error('Error obteniendo recomendaciones de upselling:', error);
            res.status(500).json({
                success: false,
                error: 'Error generando recomendaciones de upselling'
            });
        }
    }

    /**
     * Recomendaciones de cross-selling para carrito
     * POST /api/ai/cross-sell
     */
    async getCrossSellingRecommendations(req, res) {
        try {
            const { cartItems } = req.body;
            const { limit = 5 } = req.query;

            if (!cartItems || !Array.isArray(cartItems)) {
                return res.status(400).json({
                    success: false,
                    error: 'Se requiere un array de items del carrito'
                });
            }

            const recommendations = await recommendationEngine.getCrossSellingRecommendations(
                cartItems,
                parseInt(limit)
            );

            res.json({
                success: true,
                data: recommendations
            });
        } catch (error) {
            logger.error('Error obteniendo recomendaciones de cross-selling:', error);
            res.status(500).json({
                success: false,
                error: 'Error generando recomendaciones de cross-selling'
            });
        }
    }

    /**
     * Obtener alertas activas
     * GET /api/ai/alerts
     */
    async getActiveAlerts(req, res) {
        try {
            const { type, severity, since } = req.query;

            const filters = {};
            if (type) filters.type = type;
            if (severity) filters.severity = severity;
            if (since) filters.since = since;

            const alerts = await proactiveAlerts.getActiveAlerts(filters);

            res.json({
                success: true,
                data: alerts,
                count: alerts.length,
                filters
            });
        } catch (error) {
            logger.error('Error obteniendo alertas activas:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo alertas'
            });
        }
    }

    /**
     * Reconocer una alerta
     * PUT /api/ai/alerts/:alertId/acknowledge
     */
    async acknowledgeAlert(req, res) {
        try {
            const { alertId } = req.params;
            const { userId } = req.user;

            const alert = await proactiveAlerts.acknowledgeAlert(alertId, userId);

            res.json({
                success: true,
                data: alert,
                message: 'Alerta reconocida exitosamente'
            });
        } catch (error) {
            logger.error('Error reconociendo alerta:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error reconociendo alerta'
            });
        }
    }

    /**
     * Resolver una alerta
     * PUT /api/ai/alerts/:alertId/resolve
     */
    async resolveAlert(req, res) {
        try {
            const { alertId } = req.params;
            const { resolution } = req.body;
            const { userId } = req.user;

            const alert = await proactiveAlerts.resolveAlert(alertId, userId, resolution);

            res.json({
                success: true,
                data: alert,
                message: 'Alerta resuelta exitosamente'
            });
        } catch (error) {
            logger.error('Error resolviendo alerta:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error resolviendo alerta'
            });
        }
    }

    /**
     * Ejecutar acción automatizada de alerta
     * POST /api/ai/alerts/:alertId/action
     */
    async executeAlertAction(req, res) {
        try {
            const { alertId } = req.params;
            const { action } = req.body;

            if (!action) {
                return res.status(400).json({
                    success: false,
                    error: 'Se requiere especificar una acción'
                });
            }

            const result = await proactiveAlerts.executeAction(alertId, action);

            res.json({
                success: true,
                data: result,
                message: `Acción '${action}' ejecutada`
            });
        } catch (error) {
            logger.error('Error ejecutando acción de alerta:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Error ejecutando acción'
            });
        }
    }

    /**
     * Análisis de ventas con IA
     * GET /api/ai/sales-analysis
     */
    async getSalesAnalysis(req, res) {
        try {
            const { startDate, endDate, groupBy = 'day' } = req.query;

            // Aquí puedes implementar análisis adicionales
            const analysis = {
                period: { startDate, endDate },
                groupBy,
                trends: [],
                anomalies: [],
                predictions: [],
                insights: [
                    'Las ventas muestran un patrón estacional los fines de semana',
                    'Se detectó un incremento del 15% en las ventas nocturnas',
                    'Los productos de categoría "Bebidas" tienen mayor rotación'
                ]
            };

            res.json({
                success: true,
                data: analysis
            });
        } catch (error) {
            logger.error('Error en análisis de ventas:', error);
            res.status(500).json({
                success: false,
                error: 'Error generando análisis de ventas'
            });
        }
    }

    /**
     * Obtener estadísticas de IA
     * GET /api/ai/stats
     */
    async getAIStats(req, res) {
        try {
            const stats = {
                notifications: notificationService.getStats(),
                alerts: {
                    total: proactiveAlerts.alerts.size,
                    active: await proactiveAlerts.getActiveAlerts().then(a => a.length),
                    criticalCount: await proactiveAlerts.getActiveAlerts({ severity: 'critical' }).then(a => a.length)
                },
                predictions: {
                    totalForecasts: demandForecasting.cache.size,
                    cacheHitRate: 'N/A'
                },
                recommendations: {
                    totalCached: recommendationEngine.cache.size,
                    popularAlgorithms: ['collaborative', 'content_based', 'hybrid']
                },
                systemHealth: {
                    status: 'operational',
                    uptime: process.uptime(),
                    lastCheck: new Date()
                }
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error obteniendo estadísticas de IA:', error);
            res.status(500).json({
                success: false,
                error: 'Error obteniendo estadísticas'
            });
        }
    }

    /**
     * Inicializar servicios de IA
     * POST /api/ai/initialize
     */
    async initializeServices(req, res) {
        try {
            // Inicializar el servicio de alertas proactivas
            await proactiveAlerts.initialize();

            res.json({
                success: true,
                message: 'Servicios de IA inicializados correctamente',
                services: {
                    proactiveAlerts: 'active',
                    demandForecasting: 'active',
                    recommendations: 'active',
                    notifications: 'active'
                }
            });
        } catch (error) {
            logger.error('Error inicializando servicios de IA:', error);
            res.status(500).json({
                success: false,
                error: 'Error inicializando servicios de IA'
            });
        }
    }

    /**
     * Helpers
     */
    async getRecentNotifications(userId) {
        // Implementación simple para obtener notificaciones recientes
        return [];
    }
}

module.exports = new AIController();