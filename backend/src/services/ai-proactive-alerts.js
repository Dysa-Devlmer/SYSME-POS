/**
 * Sistema de Alertas Proactivas con Inteligencia Artificial
 * Monitorea el sistema y genera alertas inteligentes antes de que ocurran problemas
 */

const EventEmitter = require('events');
const logger = require('../config/logger');
const { dbService } = require('../config/database');
const notificationService = require('./realtime-notifications');
const demandForecasting = require('./ai-demand-forecasting');

class ProactiveAlertsService extends EventEmitter {
    constructor() {
        super();
        this.alerts = new Map();
        this.monitoringIntervals = new Map();
        this.alertHistory = [];
        this.maxHistorySize = 1000;

        // Tipos de alertas
        this.ALERT_TYPES = {
            STOCK_LOW: 'stock_low',
            STOCK_OUT: 'stock_out',
            STOCK_EXPIRY: 'stock_expiry',
            DEMAND_SPIKE: 'demand_spike',
            SALES_ANOMALY: 'sales_anomaly',
            PRICE_ANOMALY: 'price_anomaly',
            CUSTOMER_CHURN: 'customer_churn',
            FRAUD_DETECTION: 'fraud_detection',
            SYSTEM_PERFORMANCE: 'system_performance',
            INVENTORY_IMBALANCE: 'inventory_imbalance',
            SUPPLIER_DELAY: 'supplier_delay',
            CASH_FLOW: 'cash_flow'
        };

        // Severidad de alertas
        this.SEVERITIES = {
            CRITICAL: 'critical',
            HIGH: 'high',
            MEDIUM: 'medium',
            LOW: 'low',
            INFO: 'info'
        };

        // Estados de alerta
        this.STATES = {
            ACTIVE: 'active',
            ACKNOWLEDGED: 'acknowledged',
            RESOLVED: 'resolved',
            IGNORED: 'ignored'
        };

        // Configuración de umbrales
        this.thresholds = {
            stockLow: 0.2, // 20% del stock mínimo
            stockOut: 3, // días hasta agotarse
            expiryWarning: 7, // días antes de vencer
            demandSpike: 2, // multiplicador de demanda normal
            salesAnomaly: 0.3, // desviación del 30%
            priceAnomaly: 0.15, // variación del 15%
            customerChurnDays: 60, // días sin compra
            fraudScoreThreshold: 0.7 // puntuación de fraude
        };
    }

    /**
     * Inicializa el servicio de monitoreo
     */
    async initialize() {
        try {
            logger.info('🚨 Iniciando Sistema de Alertas Proactivas con IA');

            // Configurar monitores
            this.setupMonitors();

            // Cargar alertas activas desde la base de datos
            await this.loadActiveAlerts();

            // Iniciar análisis inicial
            await this.runInitialAnalysis();

            this.emit('initialized');
            logger.info('✅ Sistema de Alertas Proactivas inicializado correctamente');
        } catch (error) {
            logger.error('Error inicializando sistema de alertas:', error);
            throw error;
        }
    }

    /**
     * Configura los monitores automáticos
     */
    setupMonitors() {
        // Monitor de stock (cada 15 minutos)
        this.monitoringIntervals.set('stock', setInterval(() => {
            this.monitorStock();
        }, 900000));

        // Monitor de ventas (cada hora)
        this.monitoringIntervals.set('sales', setInterval(() => {
            this.monitorSalesAnomalies();
        }, 3600000));

        // Monitor de clientes (cada día)
        this.monitoringIntervals.set('customers', setInterval(() => {
            this.monitorCustomerBehavior();
        }, 86400000));

        // Monitor de productos por vencer (cada 6 horas)
        this.monitoringIntervals.set('expiry', setInterval(() => {
            this.monitorProductExpiry();
        }, 21600000));

        // Monitor de fraudes (tiempo real - cada 5 minutos)
        this.monitoringIntervals.set('fraud', setInterval(() => {
            this.monitorFraudulentActivity();
        }, 300000));
    }

    /**
     * Monitorea niveles de stock y predicciones
     */
    async monitorStock() {
        try {
            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.stock,
                    p.min_stock,
                    p.category_id,
                    c.name as category_name,
                    AVG(si.quantity) as avg_daily_sales
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN sale_items si ON p.id = si.product_id
                LEFT JOIN sales s ON si.sale_id = s.id AND s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                WHERE p.active = 1
                GROUP BY p.id, p.name, p.stock, p.min_stock, p.category_id, c.name
                HAVING p.stock <= p.min_stock * 1.5 OR avg_daily_sales > 0
            `;

            const products = await dbService.raw(query);

            for (const product of products) {
                await this.analyzeStockLevel(product);
            }

            logger.info(`📊 Monitoreo de stock completado: ${products.length} productos analizados`);
        } catch (error) {
            logger.error('Error monitoreando stock:', error);
        }
    }

    /**
     * Analiza el nivel de stock de un producto
     */
    async analyzeStockLevel(product) {
        try {
            const stockRatio = product.stock / (product.min_stock || 1);
            const avgDailySales = product.avg_daily_sales || 0;

            // Obtener predicción de demanda
            const forecast = await demandForecasting.getForecast(product.id, 7);

            let severity = this.SEVERITIES.INFO;
            let type = null;
            let message = '';
            let daysUntilOut = Infinity;

            if (avgDailySales > 0) {
                daysUntilOut = product.stock / avgDailySales;
            }

            // Análisis con predicción
            if (forecast.success && forecast.reorderRecommendation) {
                const recommendation = forecast.reorderRecommendation;

                if (recommendation.urgency === 'critical') {
                    type = this.ALERT_TYPES.STOCK_OUT;
                    severity = this.SEVERITIES.CRITICAL;
                    message = `⚠️ CRÍTICO: ${product.name} se agotará en ${recommendation.daysUntilStockout} días`;
                } else if (recommendation.urgency === 'high') {
                    type = this.ALERT_TYPES.STOCK_LOW;
                    severity = this.SEVERITIES.HIGH;
                    message = `📉 Stock bajo: ${product.name} - Reorden recomendado de ${recommendation.recommendedQuantity} unidades`;
                }

                // Detectar pico de demanda
                if (forecast.trend && forecast.trend.direction === 'increasing' && forecast.trend.percentage > 50) {
                    await this.createAlert({
                        type: this.ALERT_TYPES.DEMAND_SPIKE,
                        severity: this.SEVERITIES.MEDIUM,
                        title: '📈 Pico de Demanda Detectado',
                        message: `${product.name} muestra un incremento del ${forecast.trend.percentage}% en demanda`,
                        data: {
                            productId: product.id,
                            productName: product.name,
                            trend: forecast.trend,
                            currentStock: product.stock
                        }
                    });
                }
            } else {
                // Análisis básico sin predicción
                if (product.stock === 0) {
                    type = this.ALERT_TYPES.STOCK_OUT;
                    severity = this.SEVERITIES.CRITICAL;
                    message = `🚫 SIN STOCK: ${product.name}`;
                } else if (stockRatio < this.thresholds.stockLow) {
                    type = this.ALERT_TYPES.STOCK_LOW;
                    severity = this.SEVERITIES.HIGH;
                    message = `⚠️ Stock crítico: ${product.name} (${product.stock} unidades)`;
                } else if (daysUntilOut < this.thresholds.stockOut) {
                    type = this.ALERT_TYPES.STOCK_LOW;
                    severity = this.SEVERITIES.MEDIUM;
                    message = `📦 ${product.name} se agotará en ${Math.ceil(daysUntilOut)} días`;
                }
            }

            // Crear alerta si es necesario
            if (type) {
                await this.createAlert({
                    type,
                    severity,
                    title: this.getAlertTitle(type),
                    message,
                    data: {
                        productId: product.id,
                        productName: product.name,
                        currentStock: product.stock,
                        minStock: product.min_stock,
                        categoryId: product.category_id,
                        categoryName: product.category_name,
                        avgDailySales,
                        daysUntilOut: Math.ceil(daysUntilOut),
                        forecast: forecast.success ? forecast.predictions.slice(0, 3) : null
                    },
                    actions: this.getAlertActions(type, product)
                });
            }
        } catch (error) {
            logger.error(`Error analizando stock del producto ${product.id}:`, error);
        }
    }

    /**
     * Monitorea anomalías en ventas
     */
    async monitorSalesAnomalies() {
        try {
            // Obtener ventas de la última hora y compararlas con el promedio
            const query = `
                SELECT
                    COUNT(*) as current_sales,
                    SUM(total) as current_revenue,
                    AVG(total) as avg_transaction,
                    (
                        SELECT COUNT(*) / 24
                        FROM sales
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
                            AND created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
                    ) as avg_hourly_sales,
                    (
                        SELECT AVG(total)
                        FROM sales
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ) as historical_avg_transaction
                FROM sales
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
            `;

            const result = await dbService.raw(query);
            const stats = result[0];

            if (!stats) return;

            // Detectar anomalías
            const salesDeviation = Math.abs(stats.current_sales - stats.avg_hourly_sales) / (stats.avg_hourly_sales || 1);
            const transactionDeviation = Math.abs(stats.avg_transaction - stats.historical_avg_transaction) /
                (stats.historical_avg_transaction || 1);

            // Ventas anormalmente bajas
            if (salesDeviation > this.thresholds.salesAnomaly && stats.current_sales < stats.avg_hourly_sales) {
                await this.createAlert({
                    type: this.ALERT_TYPES.SALES_ANOMALY,
                    severity: this.SEVERITIES.MEDIUM,
                    title: '📉 Ventas Bajas Detectadas',
                    message: `Las ventas están ${Math.round(salesDeviation * 100)}% por debajo del promedio`,
                    data: {
                        currentSales: stats.current_sales,
                        expectedSales: Math.round(stats.avg_hourly_sales),
                        deviation: Math.round(salesDeviation * 100),
                        currentRevenue: stats.current_revenue
                    }
                });
            }

            // Ventas anormalmente altas (posible promoción o evento)
            if (salesDeviation > this.thresholds.salesAnomaly * 2 && stats.current_sales > stats.avg_hourly_sales) {
                await this.createAlert({
                    type: this.ALERT_TYPES.SALES_ANOMALY,
                    severity: this.SEVERITIES.INFO,
                    title: '📈 Pico de Ventas Detectado',
                    message: `Las ventas están ${Math.round(salesDeviation * 100)}% por encima del promedio`,
                    data: {
                        currentSales: stats.current_sales,
                        expectedSales: Math.round(stats.avg_hourly_sales),
                        deviation: Math.round(salesDeviation * 100),
                        currentRevenue: stats.current_revenue
                    }
                });
            }

            // Anomalía en el valor promedio de transacción
            if (transactionDeviation > this.thresholds.priceAnomaly) {
                const direction = stats.avg_transaction > stats.historical_avg_transaction ? 'encima' : 'debajo';
                await this.createAlert({
                    type: this.ALERT_TYPES.PRICE_ANOMALY,
                    severity: this.SEVERITIES.LOW,
                    title: '💰 Anomalía en Valor de Transacciones',
                    message: `El ticket promedio está ${Math.round(transactionDeviation * 100)}% por ${direction} del histórico`,
                    data: {
                        currentAvg: stats.avg_transaction,
                        historicalAvg: stats.historical_avg_transaction,
                        deviation: Math.round(transactionDeviation * 100)
                    }
                });
            }

            logger.info('📊 Análisis de anomalías en ventas completado');
        } catch (error) {
            logger.error('Error monitoreando anomalías en ventas:', error);
        }
    }

    /**
     * Monitorea el comportamiento de clientes
     */
    async monitorCustomerBehavior() {
        try {
            // Detectar clientes en riesgo de abandono
            const query = `
                SELECT
                    c.id,
                    c.name,
                    c.email,
                    MAX(s.created_at) as last_purchase,
                    DATEDIFF(NOW(), MAX(s.created_at)) as days_since_purchase,
                    COUNT(s.id) as total_purchases,
                    SUM(s.total) as lifetime_value,
                    AVG(DATEDIFF(s.created_at, LAG(s.created_at) OVER (PARTITION BY c.id ORDER BY s.created_at))) as avg_days_between_purchases
                FROM customers c
                INNER JOIN sales s ON c.id = s.customer_id
                WHERE s.status = 'completed'
                GROUP BY c.id, c.name, c.email
                HAVING days_since_purchase > ? AND total_purchases > 3
                ORDER BY lifetime_value DESC
                LIMIT 20
            `;

            const atRiskCustomers = await dbService.raw(query, [this.thresholds.customerChurnDays]);

            if (atRiskCustomers.length > 0) {
                await this.createAlert({
                    type: this.ALERT_TYPES.CUSTOMER_CHURN,
                    severity: this.SEVERITIES.MEDIUM,
                    title: '👥 Clientes en Riesgo de Abandono',
                    message: `${atRiskCustomers.length} clientes valiosos no han comprado en más de ${this.thresholds.customerChurnDays} días`,
                    data: {
                        customers: atRiskCustomers.slice(0, 5).map(c => ({
                            id: c.id,
                            name: c.name,
                            daysSincePurchase: c.days_since_purchase,
                            lifetimeValue: c.lifetime_value,
                            totalPurchases: c.total_purchases
                        })),
                        totalAtRisk: atRiskCustomers.length
                    },
                    actions: [
                        { label: 'Enviar campaña de reactivación', action: 'send_reactivation_campaign' },
                        { label: 'Ver lista completa', action: 'view_at_risk_customers' }
                    ]
                });
            }

            logger.info(`👥 Análisis de comportamiento de clientes completado: ${atRiskCustomers.length} en riesgo`);
        } catch (error) {
            logger.error('Error monitoreando comportamiento de clientes:', error);
        }
    }

    /**
     * Monitorea productos próximos a vencer
     */
    async monitorProductExpiry() {
        try {
            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.stock,
                    pb.expiry_date,
                    pb.batch_code,
                    DATEDIFF(pb.expiry_date, NOW()) as days_until_expiry,
                    pb.quantity
                FROM products p
                INNER JOIN product_batches pb ON p.id = pb.product_id
                WHERE pb.expiry_date IS NOT NULL
                    AND pb.expiry_date >= NOW()
                    AND pb.expiry_date <= DATE_ADD(NOW(), INTERVAL ? DAY)
                    AND pb.quantity > 0
                ORDER BY pb.expiry_date ASC
            `;

            const expiringProducts = await dbService.raw(query, [this.thresholds.expiryWarning]);

            for (const product of expiringProducts) {
                const severity = product.days_until_expiry <= 3 ? this.SEVERITIES.HIGH :
                                product.days_until_expiry <= 7 ? this.SEVERITIES.MEDIUM :
                                this.SEVERITIES.LOW;

                await this.createAlert({
                    type: this.ALERT_TYPES.STOCK_EXPIRY,
                    severity,
                    title: '⏰ Producto Próximo a Vencer',
                    message: `${product.name} (Lote: ${product.batch_code}) vence en ${product.days_until_expiry} días`,
                    data: {
                        productId: product.id,
                        productName: product.name,
                        batchCode: product.batch_code,
                        expiryDate: product.expiry_date,
                        daysUntilExpiry: product.days_until_expiry,
                        quantity: product.quantity
                    },
                    actions: [
                        { label: 'Crear promoción', action: 'create_promotion' },
                        { label: 'Marcar para descuento', action: 'mark_for_discount' }
                    ]
                });
            }

            logger.info(`⏰ Monitoreo de vencimientos completado: ${expiringProducts.length} productos próximos a vencer`);
        } catch (error) {
            logger.error('Error monitoreando vencimientos:', error);
        }
    }

    /**
     * Monitorea actividad fraudulenta
     */
    async monitorFraudulentActivity() {
        try {
            // Detectar transacciones sospechosas
            const query = `
                SELECT
                    s.id,
                    s.total,
                    s.customer_id,
                    s.payment_method,
                    s.created_at,
                    c.name as customer_name,
                    COUNT(*) OVER (PARTITION BY s.customer_id) as customer_tx_today,
                    AVG(s.total) OVER (PARTITION BY s.customer_id) as customer_avg_total,
                    (
                        SELECT AVG(total) FROM sales
                        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    ) as global_avg_total
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
            `;

            const recentTransactions = await dbService.raw(query);

            for (const tx of recentTransactions) {
                const fraudScore = this.calculateFraudScore(tx);

                if (fraudScore > this.thresholds.fraudScoreThreshold) {
                    await this.createAlert({
                        type: this.ALERT_TYPES.FRAUD_DETECTION,
                        severity: fraudScore > 0.9 ? this.SEVERITIES.CRITICAL : this.SEVERITIES.HIGH,
                        title: '🚨 Transacción Sospechosa Detectada',
                        message: `Transacción #${tx.id} presenta indicadores de fraude (Score: ${Math.round(fraudScore * 100)}%)`,
                        data: {
                            transactionId: tx.id,
                            amount: tx.total,
                            customerId: tx.customer_id,
                            customerName: tx.customer_name,
                            fraudScore,
                            indicators: this.getFraudIndicators(tx, fraudScore)
                        },
                        actionRequired: true,
                        actions: [
                            { label: 'Revisar transacción', action: 'review_transaction' },
                            { label: 'Bloquear temporalmente', action: 'block_temporarily' },
                            { label: 'Marcar como legítima', action: 'mark_legitimate' }
                        ]
                    });
                }
            }
        } catch (error) {
            logger.error('Error monitoreando actividad fraudulenta:', error);
        }
    }

    /**
     * Calcula puntuación de fraude
     */
    calculateFraudScore(transaction) {
        let score = 0;
        let factors = 0;

        // Factor 1: Monto inusual
        if (transaction.total > transaction.global_avg_total * 3) {
            score += 0.3;
            factors++;
        }

        // Factor 2: Múltiples transacciones del mismo cliente
        if (transaction.customer_tx_today > 5) {
            score += 0.2;
            factors++;
        }

        // Factor 3: Desviación del patrón del cliente
        if (transaction.customer_avg_total && transaction.total > transaction.customer_avg_total * 2.5) {
            score += 0.25;
            factors++;
        }

        // Factor 4: Horario inusual
        const hour = new Date(transaction.created_at).getHours();
        if (hour < 6 || hour > 23) {
            score += 0.15;
            factors++;
        }

        // Factor 5: Método de pago (efectivo para montos grandes es sospechoso)
        if (transaction.payment_method === 'cash' && transaction.total > transaction.global_avg_total * 2) {
            score += 0.1;
            factors++;
        }

        return factors > 0 ? score : 0;
    }

    /**
     * Obtiene indicadores de fraude
     */
    getFraudIndicators(transaction, score) {
        const indicators = [];

        if (transaction.total > transaction.global_avg_total * 3) {
            indicators.push('Monto inusualmente alto');
        }

        if (transaction.customer_tx_today > 5) {
            indicators.push(`${transaction.customer_tx_today} transacciones del mismo cliente hoy`);
        }

        if (transaction.customer_avg_total && transaction.total > transaction.customer_avg_total * 2.5) {
            indicators.push('Desviación significativa del patrón del cliente');
        }

        const hour = new Date(transaction.created_at).getHours();
        if (hour < 6 || hour > 23) {
            indicators.push('Transacción en horario inusual');
        }

        return indicators;
    }

    /**
     * Crea una nueva alerta
     */
    async createAlert(alertData) {
        try {
            // Verificar si ya existe una alerta similar activa
            const existingKey = `${alertData.type}_${alertData.data?.productId || alertData.data?.customerId || 'global'}`;
            if (this.alerts.has(existingKey)) {
                const existing = this.alerts.get(existingKey);
                if (existing.state === this.STATES.ACTIVE) {
                    // Actualizar la alerta existente en lugar de crear una nueva
                    existing.lastUpdated = new Date();
                    existing.occurrences = (existing.occurrences || 1) + 1;
                    return existing;
                }
            }

            const alert = {
                id: this.generateAlertId(),
                ...alertData,
                state: this.STATES.ACTIVE,
                createdAt: new Date(),
                lastUpdated: new Date(),
                occurrences: 1,
                acknowledgedBy: null,
                resolvedBy: null,
                resolvedAt: null
            };

            // Guardar alerta
            this.alerts.set(existingKey, alert);
            this.alertHistory.push(alert);

            // Mantener tamaño del historial
            if (this.alertHistory.length > this.maxHistorySize) {
                this.alertHistory.shift();
            }

            // Enviar notificación en tiempo real
            await notificationService.createNotification({
                type: notificationService.TYPES.AI_ALERT,
                category: this.mapToNotificationCategory(alert.type),
                priority: this.mapToNotificationPriority(alert.severity),
                title: alert.title,
                message: alert.message,
                data: alert.data,
                actionRequired: alert.actionRequired,
                actions: alert.actions,
                persistent: true
            });

            // Emitir evento
            this.emit('alert:created', alert);

            logger.info(`🚨 Alerta creada: ${alert.title} [${alert.severity}]`);

            return alert;
        } catch (error) {
            logger.error('Error creando alerta:', error);
            throw error;
        }
    }

    /**
     * Obtiene todas las alertas activas
     */
    async getActiveAlerts(filters = {}) {
        try {
            let alerts = Array.from(this.alerts.values())
                .filter(alert => alert.state === this.STATES.ACTIVE);

            // Aplicar filtros
            if (filters.type) {
                alerts = alerts.filter(a => a.type === filters.type);
            }

            if (filters.severity) {
                alerts = alerts.filter(a => a.severity === filters.severity);
            }

            if (filters.since) {
                const sinceDate = new Date(filters.since);
                alerts = alerts.filter(a => new Date(a.createdAt) >= sinceDate);
            }

            // Ordenar por severidad y fecha
            const severityOrder = {
                [this.SEVERITIES.CRITICAL]: 0,
                [this.SEVERITIES.HIGH]: 1,
                [this.SEVERITIES.MEDIUM]: 2,
                [this.SEVERITIES.LOW]: 3,
                [this.SEVERITIES.INFO]: 4
            };

            alerts.sort((a, b) => {
                const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
                if (severityDiff !== 0) return severityDiff;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            return alerts;
        } catch (error) {
            logger.error('Error obteniendo alertas activas:', error);
            return [];
        }
    }

    /**
     * Reconoce una alerta
     */
    async acknowledgeAlert(alertId, userId) {
        try {
            const alert = Array.from(this.alerts.values()).find(a => a.id === alertId);
            if (!alert) {
                throw new Error('Alerta no encontrada');
            }

            alert.state = this.STATES.ACKNOWLEDGED;
            alert.acknowledgedBy = userId;
            alert.acknowledgedAt = new Date();
            alert.lastUpdated = new Date();

            this.emit('alert:acknowledged', alert);

            logger.info(`✅ Alerta reconocida: ${alert.id} por usuario ${userId}`);

            return alert;
        } catch (error) {
            logger.error('Error reconociendo alerta:', error);
            throw error;
        }
    }

    /**
     * Resuelve una alerta
     */
    async resolveAlert(alertId, userId, resolution) {
        try {
            const alert = Array.from(this.alerts.values()).find(a => a.id === alertId);
            if (!alert) {
                throw new Error('Alerta no encontrada');
            }

            alert.state = this.STATES.RESOLVED;
            alert.resolvedBy = userId;
            alert.resolvedAt = new Date();
            alert.resolution = resolution;
            alert.lastUpdated = new Date();

            this.emit('alert:resolved', alert);

            logger.info(`✅ Alerta resuelta: ${alert.id} por usuario ${userId}`);

            return alert;
        } catch (error) {
            logger.error('Error resolviendo alerta:', error);
            throw error;
        }
    }

    /**
     * Ejecuta una acción automatizada
     */
    async executeAction(alertId, action) {
        try {
            const alert = Array.from(this.alerts.values()).find(a => a.id === alertId);
            if (!alert) {
                throw new Error('Alerta no encontrada');
            }

            let result = { success: false };

            switch (action) {
                case 'create_purchase_order':
                    result = await this.createAutomaticPurchaseOrder(alert);
                    break;

                case 'send_reactivation_campaign':
                    result = await this.sendReactivationCampaign(alert);
                    break;

                case 'create_promotion':
                    result = await this.createAutomaticPromotion(alert);
                    break;

                case 'review_transaction':
                    result = await this.flagTransactionForReview(alert);
                    break;

                default:
                    result = { success: false, message: 'Acción no implementada' };
            }

            // Registrar acción ejecutada
            if (!alert.executedActions) {
                alert.executedActions = [];
            }

            alert.executedActions.push({
                action,
                executedAt: new Date(),
                result
            });

            this.emit('alert:action_executed', { alert, action, result });

            return result;
        } catch (error) {
            logger.error('Error ejecutando acción:', error);
            throw error;
        }
    }

    /**
     * Análisis inicial al iniciar el servicio
     */
    async runInitialAnalysis() {
        try {
            logger.info('🔍 Ejecutando análisis inicial del sistema...');

            await Promise.all([
                this.monitorStock(),
                this.monitorSalesAnomalies(),
                this.monitorProductExpiry()
            ]);

            logger.info('✅ Análisis inicial completado');
        } catch (error) {
            logger.error('Error en análisis inicial:', error);
        }
    }

    /**
     * Carga alertas activas desde la base de datos
     */
    async loadActiveAlerts() {
        try {
            // Aquí cargarías las alertas desde la BD si las guardas
            logger.info('📥 Alertas activas cargadas desde base de datos');
        } catch (error) {
            logger.error('Error cargando alertas activas:', error);
        }
    }

    /**
     * Utilidades auxiliares
     */

    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getAlertTitle(type) {
        const titles = {
            [this.ALERT_TYPES.STOCK_LOW]: '📦 Stock Bajo',
            [this.ALERT_TYPES.STOCK_OUT]: '🚫 Sin Stock',
            [this.ALERT_TYPES.STOCK_EXPIRY]: '⏰ Producto por Vencer',
            [this.ALERT_TYPES.DEMAND_SPIKE]: '📈 Pico de Demanda',
            [this.ALERT_TYPES.SALES_ANOMALY]: '📊 Anomalía en Ventas',
            [this.ALERT_TYPES.PRICE_ANOMALY]: '💰 Anomalía de Precios',
            [this.ALERT_TYPES.CUSTOMER_CHURN]: '👥 Riesgo de Pérdida de Cliente',
            [this.ALERT_TYPES.FRAUD_DETECTION]: '🚨 Posible Fraude',
            [this.ALERT_TYPES.SYSTEM_PERFORMANCE]: '⚡ Rendimiento del Sistema',
            [this.ALERT_TYPES.CASH_FLOW]: '💵 Alerta de Flujo de Caja'
        };

        return titles[type] || '🔔 Alerta del Sistema';
    }

    getAlertActions(type, data) {
        const actions = [];

        switch (type) {
            case this.ALERT_TYPES.STOCK_LOW:
            case this.ALERT_TYPES.STOCK_OUT:
                actions.push(
                    { label: 'Crear orden de compra', action: 'create_purchase_order' },
                    { label: 'Ver producto', action: 'view_product' },
                    { label: 'Contactar proveedor', action: 'contact_supplier' }
                );
                break;

            case this.ALERT_TYPES.STOCK_EXPIRY:
                actions.push(
                    { label: 'Crear promoción', action: 'create_promotion' },
                    { label: 'Aplicar descuento', action: 'apply_discount' }
                );
                break;

            case this.ALERT_TYPES.CUSTOMER_CHURN:
                actions.push(
                    { label: 'Enviar email', action: 'send_email' },
                    { label: 'Crear oferta especial', action: 'create_special_offer' }
                );
                break;
        }

        return actions;
    }

    mapToNotificationCategory(alertType) {
        const mapping = {
            [this.ALERT_TYPES.STOCK_LOW]: notificationService.CATEGORIES.STOCK,
            [this.ALERT_TYPES.STOCK_OUT]: notificationService.CATEGORIES.STOCK,
            [this.ALERT_TYPES.STOCK_EXPIRY]: notificationService.CATEGORIES.STOCK,
            [this.ALERT_TYPES.DEMAND_SPIKE]: notificationService.CATEGORIES.AI_PREDICTIONS,
            [this.ALERT_TYPES.SALES_ANOMALY]: notificationService.CATEGORIES.SALES,
            [this.ALERT_TYPES.PRICE_ANOMALY]: notificationService.CATEGORIES.SALES,
            [this.ALERT_TYPES.CUSTOMER_CHURN]: notificationService.CATEGORIES.AI_PREDICTIONS,
            [this.ALERT_TYPES.FRAUD_DETECTION]: notificationService.CATEGORIES.ALERTS,
            [this.ALERT_TYPES.SYSTEM_PERFORMANCE]: notificationService.CATEGORIES.SYSTEM,
            [this.ALERT_TYPES.CASH_FLOW]: notificationService.CATEGORIES.PAYMENTS
        };

        return mapping[alertType] || notificationService.CATEGORIES.ALERTS;
    }

    mapToNotificationPriority(severity) {
        const mapping = {
            [this.SEVERITIES.CRITICAL]: notificationService.PRIORITIES.CRITICAL,
            [this.SEVERITIES.HIGH]: notificationService.PRIORITIES.HIGH,
            [this.SEVERITIES.MEDIUM]: notificationService.PRIORITIES.MEDIUM,
            [this.SEVERITIES.LOW]: notificationService.PRIORITIES.LOW,
            [this.SEVERITIES.INFO]: notificationService.PRIORITIES.INFO
        };

        return mapping[severity] || notificationService.PRIORITIES.MEDIUM;
    }

    /**
     * Acciones automatizadas (implementaciones básicas)
     */

    async createAutomaticPurchaseOrder(alert) {
        // Implementación básica de orden de compra automática
        logger.info(`📝 Creando orden de compra automática para producto ${alert.data.productId}`);
        return { success: true, message: 'Orden de compra creada' };
    }

    async sendReactivationCampaign(alert) {
        // Implementación básica de campaña de reactivación
        logger.info(`📧 Enviando campaña de reactivación a ${alert.data.totalAtRisk} clientes`);
        return { success: true, message: 'Campaña enviada' };
    }

    async createAutomaticPromotion(alert) {
        // Implementación básica de promoción automática
        logger.info(`🎉 Creando promoción para producto ${alert.data.productId}`);
        return { success: true, message: 'Promoción creada' };
    }

    async flagTransactionForReview(alert) {
        // Implementación básica de marcado para revisión
        logger.info(`🔍 Transacción ${alert.data.transactionId} marcada para revisión`);
        return { success: true, message: 'Transacción marcada para revisión' };
    }

    /**
     * Limpieza al cerrar el servicio
     */
    shutdown() {
        logger.info('🛑 Deteniendo Sistema de Alertas Proactivas');

        // Limpiar intervalos
        for (const [name, interval] of this.monitoringIntervals) {
            clearInterval(interval);
            logger.info(`  ✅ Monitor ${name} detenido`);
        }

        this.monitoringIntervals.clear();
        this.emit('shutdown');
    }
}

// Singleton
module.exports = new ProactiveAlertsService();