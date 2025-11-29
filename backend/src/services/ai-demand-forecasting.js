/**
 * Servicio de Predicción de Demanda con Machine Learning
 * Utiliza múltiples algoritmos de análisis de series temporales para predecir la demanda futura
 */

const logger = require('../config/logger');
const { dbService } = require('../config/database');
const notificationService = require('./realtime-notifications');

class DemandForecastingService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hora
        this.confidenceThresholds = {
            high: 0.85,
            medium: 0.7,
            low: 0.5
        };
    }

    /**
     * Obtiene predicción de demanda para un producto
     */
    async getForecast(productId, daysAhead = 7) {
        try {
            const cacheKey = `forecast_${productId}_${daysAhead}`;

            // Verificar caché
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            // Obtener datos históricos
            const historicalData = await this.getHistoricalSalesData(productId);

            if (!historicalData || historicalData.length < 7) {
                return {
                    success: false,
                    message: 'Datos históricos insuficientes para predicción',
                    minimumRequired: 7,
                    available: historicalData ? historicalData.length : 0
                };
            }

            // Aplicar múltiples algoritmos de predicción
            const movingAverage = this.calculateMovingAverage(historicalData, 7);
            const exponentialSmoothing = this.calculateExponentialSmoothing(historicalData);
            const linearRegression = this.calculateLinearRegression(historicalData);
            const seasonalPattern = this.detectSeasonality(historicalData);

            // Generar predicciones
            const predictions = this.generatePredictions({
                historicalData,
                movingAverage,
                exponentialSmoothing,
                linearRegression,
                seasonalPattern,
                daysAhead
            });

            // Calcular métricas de confianza
            const confidence = this.calculateConfidence(historicalData, predictions);

            // Detectar tendencias
            const trend = this.detectTrend(historicalData);

            // Calcular recomendaciones de reorden
            const reorderRecommendation = await this.calculateReorderPoint(productId, predictions);

            const result = {
                success: true,
                productId,
                predictions,
                confidence,
                trend,
                reorderRecommendation,
                algorithms: {
                    movingAverage: movingAverage.value,
                    exponentialSmoothing: exponentialSmoothing.value,
                    linearRegression: linearRegression.slope,
                    seasonality: seasonalPattern
                },
                metadata: {
                    historicalDays: historicalData.length,
                    generatedAt: new Date(),
                    daysAhead
                }
            };

            // Guardar en caché
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            // Verificar si necesita alerta
            await this.checkAndCreateAlerts(productId, result);

            return result;
        } catch (error) {
            logger.error('Error en predicción de demanda:', error);
            throw error;
        }
    }

    /**
     * Obtiene datos históricos de ventas
     */
    async getHistoricalSalesData(productId, days = 30) {
        try {
            const query = `
                SELECT
                    DATE(s.created_at) as date,
                    SUM(si.quantity) as quantity_sold,
                    COUNT(DISTINCT s.id) as num_transactions,
                    AVG(si.price) as avg_price
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                WHERE si.product_id = ?
                    AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                    AND s.status != 'cancelled'
                GROUP BY DATE(s.created_at)
                ORDER BY date ASC
            `;

            const results = await dbService.raw(query, [productId, days]);

            // Rellenar días sin ventas con 0
            return this.fillMissingDates(results, days);
        } catch (error) {
            logger.error('Error obteniendo datos históricos:', error);
            return [];
        }
    }

    /**
     * Calcula el promedio móvil
     */
    calculateMovingAverage(data, window = 7) {
        if (data.length < window) {
            return { value: 0, series: [] };
        }

        const series = [];
        for (let i = window - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < window; j++) {
                sum += data[i - j].quantity_sold || 0;
            }
            series.push(sum / window);
        }

        return {
            value: series[series.length - 1] || 0,
            series
        };
    }

    /**
     * Calcula suavizado exponencial (Exponential Moving Average)
     */
    calculateExponentialSmoothing(data, alpha = 0.3) {
        if (data.length === 0) return { value: 0, series: [] };

        const series = [];
        let ema = data[0].quantity_sold || 0;

        for (let i = 0; i < data.length; i++) {
            const current = data[i].quantity_sold || 0;
            ema = alpha * current + (1 - alpha) * ema;
            series.push(ema);
        }

        return {
            value: ema,
            series
        };
    }

    /**
     * Calcula regresión lineal
     */
    calculateLinearRegression(data) {
        const n = data.length;
        if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

        for (let i = 0; i < n; i++) {
            const x = i;
            const y = data[i].quantity_sold || 0;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumX2 += x * x;
            sumY2 += y * y;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calcular R²
        const yMean = sumY / n;
        let ssTotal = 0, ssResidual = 0;

        for (let i = 0; i < n; i++) {
            const y = data[i].quantity_sold || 0;
            const yPred = slope * i + intercept;
            ssTotal += Math.pow(y - yMean, 2);
            ssResidual += Math.pow(y - yPred, 2);
        }

        const r2 = 1 - (ssResidual / ssTotal);

        return {
            slope,
            intercept,
            r2: isNaN(r2) ? 0 : r2,
            predict: (x) => slope * x + intercept
        };
    }

    /**
     * Detecta patrones de estacionalidad
     */
    detectSeasonality(data) {
        if (data.length < 14) {
            return { hasSeasonality: false, pattern: null };
        }

        // Análisis por día de la semana
        const dayPatterns = {};

        for (const entry of data) {
            const dayOfWeek = new Date(entry.date).getDay();
            if (!dayPatterns[dayOfWeek]) {
                dayPatterns[dayOfWeek] = [];
            }
            dayPatterns[dayOfWeek].push(entry.quantity_sold || 0);
        }

        // Calcular promedio por día
        const dayAverages = {};
        for (const day in dayPatterns) {
            const values = dayPatterns[day];
            dayAverages[day] = values.reduce((a, b) => a + b, 0) / values.length;
        }

        // Detectar si hay variación significativa entre días
        const averages = Object.values(dayAverages);
        const overallAvg = averages.reduce((a, b) => a + b, 0) / averages.length;
        const variance = averages.reduce((sum, val) => sum + Math.pow(val - overallAvg, 2), 0) / averages.length;
        const coefficientOfVariation = Math.sqrt(variance) / overallAvg;

        return {
            hasSeasonality: coefficientOfVariation > 0.2,
            pattern: 'weekly',
            dayAverages,
            coefficientOfVariation,
            peakDays: this.findPeakDays(dayAverages),
            lowDays: this.findLowDays(dayAverages)
        };
    }

    /**
     * Genera predicciones combinando algoritmos
     */
    generatePredictions(params) {
        const { historicalData, movingAverage, exponentialSmoothing, linearRegression, seasonalPattern, daysAhead } = params;
        const predictions = [];
        const lastDataPoint = historicalData.length - 1;

        for (let i = 1; i <= daysAhead; i++) {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + i);

            // Peso de cada algoritmo
            const weights = {
                ma: 0.3,
                ema: 0.3,
                lr: 0.2,
                seasonal: 0.2
            };

            // Predicción base
            let prediction =
                weights.ma * (movingAverage.value || 0) +
                weights.ema * (exponentialSmoothing.value || 0) +
                weights.lr * linearRegression.predict(lastDataPoint + i);

            // Aplicar estacionalidad si existe
            if (seasonalPattern.hasSeasonality) {
                const dayOfWeek = futureDate.getDay();
                const seasonalFactor = seasonalPattern.dayAverages[dayOfWeek] /
                    (Object.values(seasonalPattern.dayAverages).reduce((a, b) => a + b, 0) / 7);
                prediction *= seasonalFactor;
            }

            // Calcular intervalo de confianza
            const stdDev = this.calculateStandardDeviation(historicalData.map(d => d.quantity_sold));
            const confidenceInterval = {
                lower: Math.max(0, prediction - 1.96 * stdDev),
                upper: prediction + 1.96 * stdDev
            };

            predictions.push({
                date: futureDate.toISOString().split('T')[0],
                dayOfWeek: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][futureDate.getDay()],
                predicted_quantity: Math.round(prediction * 10) / 10,
                confidence_interval: {
                    lower: Math.round(confidenceInterval.lower * 10) / 10,
                    upper: Math.round(confidenceInterval.upper * 10) / 10
                },
                is_peak_day: seasonalPattern.peakDays?.includes(futureDate.getDay()),
                is_low_day: seasonalPattern.lowDays?.includes(futureDate.getDay())
            });
        }

        return predictions;
    }

    /**
     * Calcula la confianza de las predicciones
     */
    calculateConfidence(historicalData, predictions) {
        const dataPoints = historicalData.length;
        const variance = this.calculateVariance(historicalData.map(d => d.quantity_sold));
        const trend = this.detectTrend(historicalData);

        let confidence = 0.5; // Base

        // Más datos = mayor confianza
        if (dataPoints >= 30) confidence += 0.2;
        else if (dataPoints >= 14) confidence += 0.1;

        // Menor varianza = mayor confianza
        const cv = Math.sqrt(variance) / (historicalData.reduce((sum, d) => sum + d.quantity_sold, 0) / dataPoints);
        if (cv < 0.3) confidence += 0.2;
        else if (cv < 0.5) confidence += 0.1;

        // Tendencia clara = mayor confianza
        if (Math.abs(trend.strength) > 0.7) confidence += 0.1;

        confidence = Math.min(1, confidence);

        return {
            score: confidence,
            level: confidence >= this.confidenceThresholds.high ? 'high' :
                   confidence >= this.confidenceThresholds.medium ? 'medium' : 'low',
            factors: {
                dataPoints,
                variance,
                trendStrength: trend.strength
            }
        };
    }

    /**
     * Detecta tendencia en los datos
     */
    detectTrend(data) {
        if (data.length < 3) {
            return { direction: 'stable', strength: 0, percentage: 0 };
        }

        const regression = this.calculateLinearRegression(data);
        const firstValue = data[0].quantity_sold || 1;
        const lastValue = data[data.length - 1].quantity_sold || 1;
        const percentageChange = ((lastValue - firstValue) / firstValue) * 100;

        let direction = 'stable';
        if (regression.slope > 0.1) direction = 'increasing';
        else if (regression.slope < -0.1) direction = 'decreasing';

        return {
            direction,
            strength: regression.r2,
            slope: regression.slope,
            percentage: Math.round(percentageChange * 10) / 10
        };
    }

    /**
     * Calcula el punto de reorden óptimo
     */
    async calculateReorderPoint(productId, predictions) {
        try {
            // Obtener información del producto
            const product = await dbService.findById('products', productId);
            if (!product) return null;

            const currentStock = product.stock || 0;
            const minStock = product.min_stock || 5;
            const leadTime = product.lead_time_days || 3; // Días de entrega del proveedor

            // Calcular demanda durante el tiempo de entrega
            const leadTimeDemand = predictions
                .slice(0, Math.min(leadTime, predictions.length))
                .reduce((sum, p) => sum + p.predicted_quantity, 0);

            // Buffer de seguridad (20% adicional)
            const safetyStock = leadTimeDemand * 0.2;

            // Punto de reorden
            const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);

            // Cantidad a ordenar (para cubrir los próximos 7 días)
            const orderQuantity = Math.ceil(
                predictions.reduce((sum, p) => sum + p.predicted_quantity, 0) - currentStock
            );

            // Calcular urgencia
            const daysUntilStockout = currentStock / (leadTimeDemand / leadTime);
            let urgency = 'low';
            if (daysUntilStockout <= 1) urgency = 'critical';
            else if (daysUntilStockout <= 3) urgency = 'high';
            else if (daysUntilStockout <= 7) urgency = 'medium';

            return {
                currentStock,
                reorderPoint,
                shouldReorder: currentStock <= reorderPoint,
                recommendedQuantity: Math.max(0, orderQuantity),
                leadTimeDays: leadTime,
                daysUntilStockout: Math.round(daysUntilStockout * 10) / 10,
                urgency,
                safetyStock: Math.ceil(safetyStock)
            };
        } catch (error) {
            logger.error('Error calculando punto de reorden:', error);
            return null;
        }
    }

    /**
     * Verifica y crea alertas si es necesario
     */
    async checkAndCreateAlerts(productId, forecast) {
        try {
            const { reorderRecommendation, trend } = forecast;

            if (!reorderRecommendation) return;

            // Alerta de stock crítico
            if (reorderRecommendation.urgency === 'critical') {
                await notificationService.createNotification({
                    type: notificationService.TYPES.STOCK_OUT,
                    category: notificationService.CATEGORIES.STOCK,
                    priority: notificationService.PRIORITIES.CRITICAL,
                    title: '⚠️ Stock Crítico',
                    message: `Producto #${productId} se agotará en ${reorderRecommendation.daysUntilStockout} días`,
                    data: {
                        productId,
                        currentStock: reorderRecommendation.currentStock,
                        recommendedQuantity: reorderRecommendation.recommendedQuantity
                    },
                    actionRequired: true,
                    actions: [
                        { label: 'Crear orden de compra', action: 'create_purchase_order' },
                        { label: 'Ver detalles', action: 'view_product' }
                    ]
                });
            }

            // Alerta de tendencia anormal
            if (trend.direction === 'increasing' && trend.percentage > 50) {
                await notificationService.createNotification({
                    type: notificationService.TYPES.AI_ALERT,
                    category: notificationService.CATEGORIES.AI_PREDICTIONS,
                    priority: notificationService.PRIORITIES.MEDIUM,
                    title: '📈 Tendencia de Alta Demanda',
                    message: `Producto #${productId} muestra un aumento del ${trend.percentage}% en demanda`,
                    data: { productId, trend }
                });
            }
        } catch (error) {
            logger.error('Error creando alertas:', error);
        }
    }

    /**
     * Obtiene recomendaciones de reorden para todos los productos
     */
    async getReorderRecommendations(limit = 10) {
        try {
            // Obtener productos con stock bajo
            const query = `
                SELECT id, name, stock, min_stock, category_id
                FROM products
                WHERE stock <= min_stock * 1.5
                    AND active = 1
                ORDER BY (stock / GREATEST(min_stock, 1)) ASC
                LIMIT ?
            `;

            const products = await dbService.raw(query, [limit]);
            const recommendations = [];

            for (const product of products) {
                const forecast = await this.getForecast(product.id, 7);
                if (forecast.success && forecast.reorderRecommendation) {
                    recommendations.push({
                        product: {
                            id: product.id,
                            name: product.name,
                            categoryId: product.category_id
                        },
                        ...forecast.reorderRecommendation,
                        forecast: forecast.predictions.slice(0, 3) // Solo los próximos 3 días
                    });
                }
            }

            // Ordenar por urgencia
            const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            recommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

            return recommendations;
        } catch (error) {
            logger.error('Error obteniendo recomendaciones de reorden:', error);
            return [];
        }
    }

    /**
     * Utilidades auxiliares
     */

    fillMissingDates(data, days) {
        const filled = [];
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        for (let i = 0; i < days; i++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];

            const existing = data.find(d => d.date === dateStr);
            filled.push(existing || {
                date: dateStr,
                quantity_sold: 0,
                num_transactions: 0,
                avg_price: 0
            });
        }

        return filled;
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    }

    findPeakDays(dayAverages) {
        const values = Object.values(dayAverages);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const threshold = mean * 1.2;

        return Object.entries(dayAverages)
            .filter(([_, avg]) => avg > threshold)
            .map(([day, _]) => parseInt(day));
    }

    findLowDays(dayAverages) {
        const values = Object.values(dayAverages);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const threshold = mean * 0.8;

        return Object.entries(dayAverages)
            .filter(([_, avg]) => avg < threshold)
            .map(([day, _]) => parseInt(day));
    }
}

// Singleton
module.exports = new DemandForecastingService();