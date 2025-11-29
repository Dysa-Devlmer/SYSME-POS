/**
 * Controlador de Analytics
 * Gestiona todos los endpoints de métricas y KPIs
 */

const db = require('../../config/database');
const cacheManager = require('../../services/cache-manager');
const auditService = require('../../services/audit-service');
const aiDemandService = require('../../services/ai-demand-service');
const aiRecommendationService = require('../../services/ai-recommendation-service');
const moment = require('moment');

class AnalyticsController {
  constructor() {
    this.CACHE_TTL = {
      SALES: 300,        // 5 minutos
      INVENTORY: 600,    // 10 minutos
      CUSTOMERS: 900,    // 15 minutos
      PERFORMANCE: 60,   // 1 minuto
      KPI: 300,         // 5 minutos
      TRENDS: 1800,     // 30 minutos
      PREDICTIONS: 3600 // 1 hora
    };
  }

  /**
   * Obtiene métricas de ventas
   */
  async getSalesMetrics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = this.getDateRange(startDate, endDate);

      // Intentar obtener de caché
      const cacheKey = `analytics:sales:${dateRange.start}:${dateRange.end}`;
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Calcular métricas
      const [currentMetrics, previousMetrics] = await Promise.all([
        this.calculateSalesMetrics(dateRange),
        this.calculateSalesMetrics(this.getPreviousPeriod(dateRange))
      ]);

      // Calcular crecimiento
      const metrics = {
        ...currentMetrics,
        salesGrowth: this.calculateGrowth(currentMetrics.totalSales, previousMetrics.totalSales),
        transactionGrowth: this.calculateGrowth(currentMetrics.totalTransactions, previousMetrics.totalTransactions),
        ticketGrowth: this.calculateGrowth(currentMetrics.averageTicket, previousMetrics.averageTicket)
      };

      // Obtener datos adicionales
      const [timeline, topProducts, hourlyBreakdown, categoryBreakdown] = await Promise.all([
        this.getSalesTimeline(dateRange),
        this.getTopProducts(dateRange),
        this.getHourlyBreakdown(dateRange),
        this.getCategoryBreakdown(dateRange)
      ]);

      const result = {
        ...metrics,
        timeline,
        topProducts,
        hourlyBreakdown,
        categoryBreakdown
      };

      // Guardar en caché
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.SALES);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: req.user?.id,
        action: 'VIEW_SALES_METRICS',
        resource: 'analytics',
        details: { dateRange }
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error obteniendo métricas de ventas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene métricas de inventario
   */
  async getInventoryMetrics(req, res) {
    try {
      const cacheKey = 'analytics:inventory';
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Obtener métricas básicas
      const [products, lowStock, movements] = await Promise.all([
        db('products').count('id as count').first(),
        db('products').where('stock', '<=', db.raw('min_stock')).count('id as count').first(),
        db('stock_movements')
          .select(db.raw('DATE(created_at) as date'), db.raw('SUM(quantity) as total'))
          .where('created_at', '>=', moment().subtract(30, 'days').toDate())
          .groupBy(db.raw('DATE(created_at)'))
      ]);

      // Calcular valor total del inventario
      const totalValue = await db('products')
        .sum(db.raw('stock * cost'))
        .first();

      // Productos sin stock
      const outOfStock = await db('products')
        .where('stock', 0)
        .count('id as count')
        .first();

      // Productos próximos a vencer (30 días)
      const expiringProducts = await db('products')
        .where('expiry_date', '<=', moment().add(30, 'days').toDate())
        .where('expiry_date', '>', new Date())
        .count('id as count')
        .first();

      // Tasa de rotación
      const turnoverRate = await this.calculateTurnoverRate();

      // Top productos con más movimiento
      const topMovingProducts = await db('stock_movements')
        .select('products.id', 'products.name')
        .sum('stock_movements.quantity as movement')
        .join('products', 'stock_movements.product_id', 'products.id')
        .where('stock_movements.type', 'sale')
        .where('stock_movements.created_at', '>=', moment().subtract(30, 'days').toDate())
        .groupBy('products.id', 'products.name')
        .orderBy('movement', 'desc')
        .limit(10);

      // Productos sin movimiento (stock muerto)
      const deadStock = await db('products')
        .select('products.id', 'products.name')
        .select(db.raw('DATEDIFF(NOW(), MAX(stock_movements.created_at)) as days_without_movement'))
        .leftJoin('stock_movements', 'products.id', 'stock_movements.product_id')
        .groupBy('products.id', 'products.name')
        .having(db.raw('days_without_movement'), '>', 60)
        .orHaving(db.raw('MAX(stock_movements.id)'), 'is', null)
        .limit(10);

      const result = {
        totalProducts: products.count,
        totalValue: totalValue['sum(stock * cost)'] || 0,
        lowStock: lowStock.count,
        outOfStock: outOfStock.count,
        expiringProducts: expiringProducts.count,
        turnoverRate,
        topMovingProducts,
        deadStock
      };

      // Guardar en caché
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.INVENTORY);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: req.user?.id,
        action: 'VIEW_INVENTORY_METRICS',
        resource: 'analytics'
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error obteniendo métricas de inventario:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene métricas de clientes
   */
  async getCustomerMetrics(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = this.getDateRange(startDate, endDate);

      const cacheKey = `analytics:customers:${dateRange.start}:${dateRange.end}`;
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Total de clientes
      const totalCustomers = await db('customers').count('id as count').first();

      // Nuevos clientes en el período
      const newCustomers = await db('customers')
        .whereBetween('created_at', [dateRange.start, dateRange.end])
        .count('id as count')
        .first();

      // Clientes recurrentes
      const returningCustomers = await db('sales')
        .countDistinct('customer_id as count')
        .whereBetween('created_at', [dateRange.start, dateRange.end])
        .whereIn('customer_id', function() {
          this.select('customer_id')
            .from('sales')
            .where('created_at', '<', dateRange.start)
            .groupBy('customer_id');
        })
        .first();

      // Tasa de retención
      const previousPeriod = this.getPreviousPeriod(dateRange);
      const previousCustomers = await db('sales')
        .countDistinct('customer_id as count')
        .whereBetween('created_at', [previousPeriod.start, previousPeriod.end])
        .first();

      const retentionRate = previousCustomers.count > 0
        ? (returningCustomers.count / previousCustomers.count) * 100
        : 0;

      // Satisfacción del cliente (basado en reviews si existe)
      const satisfaction = await this.calculateCustomerSatisfaction();

      // Crecimiento de clientes
      const previousNewCustomers = await db('customers')
        .whereBetween('created_at', [previousPeriod.start, previousPeriod.end])
        .count('id as count')
        .first();

      const customerGrowth = this.calculateGrowth(newCustomers.count, previousNewCustomers.count);

      // Gasto promedio por cliente
      const averageSpend = await db('sales')
        .avg('total as avg')
        .whereBetween('created_at', [dateRange.start, dateRange.end])
        .first();

      // Valor de vida del cliente (CLV)
      const lifetimeValue = await this.calculateCLV();

      // Tasa de abandono
      const churnRate = await this.calculateChurnRate(dateRange);

      // Top clientes
      const topCustomers = await db('sales')
        .select('customers.id', 'customers.name')
        .sum('sales.total as total_spent')
        .count('sales.id as visits')
        .join('customers', 'sales.customer_id', 'customers.id')
        .whereBetween('sales.created_at', [dateRange.start, dateRange.end])
        .groupBy('customers.id', 'customers.name')
        .orderBy('total_spent', 'desc')
        .limit(10);

      const result = {
        totalCustomers: totalCustomers.count,
        newCustomers: newCustomers.count,
        returningCustomers: returningCustomers.count,
        retentionRate,
        satisfaction,
        customerGrowth,
        averageSpend: averageSpend.avg || 0,
        lifetimeValue,
        churnRate,
        topCustomers
      };

      // Guardar en caché
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.CUSTOMERS);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: req.user?.id,
        action: 'VIEW_CUSTOMER_METRICS',
        resource: 'analytics',
        details: { dateRange }
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error obteniendo métricas de clientes:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene métricas de rendimiento del sistema
   */
  async getPerformanceMetrics(req, res) {
    try {
      const cacheKey = 'analytics:performance';
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Obtener métricas del sistema
      const metrics = {
        responseTime: await this.getAverageResponseTime(),
        uptime: await this.getSystemUptime(),
        errors: await this.getErrorCount(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        diskUsage: await this.getDiskUsage(),
        activeUsers: await this.getActiveUsersCount(),
        requestsPerSecond: await this.getRequestsPerSecond(),
        cacheHitRate: await cacheManager.getHitRate(),
        databaseConnections: await this.getDatabaseConnectionCount()
      };

      // Guardar en caché
      await cacheManager.set(cacheKey, metrics, this.CACHE_TTL.PERFORMANCE);

      res.json({ success: true, data: metrics });
    } catch (error) {
      console.error('Error obteniendo métricas de rendimiento:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene KPIs configurados
   */
  async getKPIs(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const dateRange = this.getDateRange(startDate, endDate);

      const cacheKey = `analytics:kpis:${dateRange.start}:${dateRange.end}`;
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Definir KPIs
      const kpis = [
        {
          id: 'sales_target',
          name: 'Meta de Ventas',
          value: await this.calculateSalesTotal(dateRange),
          target: 100000,
          unit: '$',
          category: 'sales',
          importance: 'high'
        },
        {
          id: 'conversion_rate',
          name: 'Tasa de Conversión',
          value: await this.calculateConversionRate(dateRange),
          target: 70,
          unit: '%',
          category: 'sales',
          importance: 'high'
        },
        {
          id: 'average_ticket',
          name: 'Ticket Promedio',
          value: await this.calculateAverageTicket(dateRange),
          target: 500,
          unit: '$',
          category: 'sales',
          importance: 'medium'
        },
        {
          id: 'customer_retention',
          name: 'Retención de Clientes',
          value: await this.calculateRetention(dateRange),
          target: 80,
          unit: '%',
          category: 'customers',
          importance: 'high'
        },
        {
          id: 'inventory_turnover',
          name: 'Rotación de Inventario',
          value: await this.calculateTurnoverRate(),
          target: 12,
          unit: 'veces',
          category: 'inventory',
          importance: 'medium'
        },
        {
          id: 'stockout_rate',
          name: 'Tasa de Quiebres de Stock',
          value: await this.calculateStockoutRate(),
          target: 5,
          unit: '%',
          category: 'inventory',
          importance: 'high'
        }
      ];

      // Calcular si se alcanzó el objetivo y tendencia
      for (const kpi of kpis) {
        kpi.achieved = kpi.value >= kpi.target;
        kpi.trend = await this.calculateKPITrend(kpi.id, dateRange);
      }

      // Guardar en caché
      await cacheManager.set(cacheKey, kpis, this.CACHE_TTL.KPI);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: req.user?.id,
        action: 'VIEW_KPIS',
        resource: 'analytics',
        details: { dateRange }
      });

      res.json({ success: true, data: kpis });
    } catch (error) {
      console.error('Error obteniendo KPIs:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene análisis de tendencias
   */
  async getTrendAnalysis(req, res) {
    try {
      const { metric, period } = req.query;

      if (!metric || !period) {
        return res.status(400).json({
          success: false,
          error: 'Metric y period son requeridos'
        });
      }

      const cacheKey = `analytics:trends:${metric}:${period}`;
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      // Obtener datos históricos
      const historicalData = await this.getHistoricalData(metric, period);

      // Calcular tendencia
      const trend = this.calculateTrend(historicalData);

      // Proyección futura
      const projection = await this.projectTrend(historicalData, trend);

      // Análisis de estacionalidad
      const seasonality = this.analyzeSeasonality(historicalData);

      const result = {
        metric,
        period,
        historicalData,
        trend,
        projection,
        seasonality,
        insights: this.generateTrendInsights(trend, seasonality)
      };

      // Guardar en caché
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.TRENDS);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error obteniendo análisis de tendencias:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Obtiene predicciones usando IA
   */
  async getPredictions(req, res) {
    try {
      const { metric, days = 7 } = req.query;

      if (!metric) {
        return res.status(400).json({
          success: false,
          error: 'Metric es requerido'
        });
      }

      const cacheKey = `analytics:predictions:${metric}:${days}`;
      const cached = await cacheManager.get(cacheKey);

      if (cached) {
        return res.json({ success: true, data: cached });
      }

      let predictions;

      // Usar servicios de IA según la métrica
      switch (metric) {
        case 'demand':
          predictions = await aiDemandService.predictDemand(null, parseInt(days));
          break;

        case 'sales':
          predictions = await this.predictSales(parseInt(days));
          break;

        case 'inventory':
          predictions = await this.predictInventoryNeeds(parseInt(days));
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Métrica no soportada para predicciones'
          });
      }

      const result = {
        metric,
        days,
        predictions,
        confidence: this.calculateConfidence(predictions),
        factors: await this.getInfluencingFactors(metric)
      };

      // Guardar en caché
      await cacheManager.set(cacheKey, result, this.CACHE_TTL.PREDICTIONS);

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: req.user?.id,
        action: 'VIEW_PREDICTIONS',
        resource: 'analytics',
        details: { metric, days }
      });

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error obteniendo predicciones:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Análisis comparativo entre períodos
   */
  async compareAnalysis(req, res) {
    try {
      const { period1, period2 } = req.body;

      if (!period1 || !period2) {
        return res.status(400).json({
          success: false,
          error: 'Se requieren dos períodos para comparar'
        });
      }

      // Obtener métricas para ambos períodos
      const [metrics1, metrics2] = await Promise.all([
        this.getComprehensiveMetrics(period1),
        this.getComprehensiveMetrics(period2)
      ]);

      // Calcular diferencias
      const comparison = {
        sales: {
          period1: metrics1.sales,
          period2: metrics2.sales,
          difference: metrics2.sales - metrics1.sales,
          percentageChange: this.calculatePercentageChange(metrics1.sales, metrics2.sales)
        },
        transactions: {
          period1: metrics1.transactions,
          period2: metrics2.transactions,
          difference: metrics2.transactions - metrics1.transactions,
          percentageChange: this.calculatePercentageChange(metrics1.transactions, metrics2.transactions)
        },
        customers: {
          period1: metrics1.customers,
          period2: metrics2.customers,
          difference: metrics2.customers - metrics1.customers,
          percentageChange: this.calculatePercentageChange(metrics1.customers, metrics2.customers)
        },
        averageTicket: {
          period1: metrics1.averageTicket,
          period2: metrics2.averageTicket,
          difference: metrics2.averageTicket - metrics1.averageTicket,
          percentageChange: this.calculatePercentageChange(metrics1.averageTicket, metrics2.averageTicket)
        }
      };

      // Generar insights
      const insights = this.generateComparativeInsights(comparison);

      const result = {
        period1,
        period2,
        comparison,
        insights
      };

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Error en análisis comparativo:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * Exporta métricas en diferentes formatos
   */
  async exportMetrics(req, res) {
    try {
      const { format = 'csv', startDate, endDate } = req.query;
      const dateRange = this.getDateRange(startDate, endDate);

      // Obtener todas las métricas
      const metrics = await this.getAllMetrics(dateRange);

      let exportData;
      let contentType;
      let filename;

      switch (format.toLowerCase()) {
        case 'csv':
          exportData = this.exportToCSV(metrics);
          contentType = 'text/csv';
          filename = `metrics_${moment().format('YYYY-MM-DD')}.csv`;
          break;

        case 'excel':
          exportData = await this.exportToExcel(metrics);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          filename = `metrics_${moment().format('YYYY-MM-DD')}.xlsx`;
          break;

        case 'pdf':
          exportData = await this.exportToPDF(metrics);
          contentType = 'application/pdf';
          filename = `metrics_${moment().format('YYYY-MM-DD')}.pdf`;
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Formato no soportado'
          });
      }

      // Auditar
      await auditService.log({
        level: 'INFO',
        userId: req.user?.id,
        action: 'EXPORT_METRICS',
        resource: 'analytics',
        details: { format, dateRange }
      });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      console.error('Error exportando métricas:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Métodos auxiliares

  getDateRange(startDate, endDate) {
    return {
      start: startDate ? new Date(startDate) : moment().startOf('month').toDate(),
      end: endDate ? new Date(endDate) : moment().endOf('month').toDate()
    };
  }

  getPreviousPeriod(dateRange) {
    const duration = moment(dateRange.end).diff(moment(dateRange.start), 'days');
    return {
      start: moment(dateRange.start).subtract(duration, 'days').toDate(),
      end: moment(dateRange.start).subtract(1, 'day').toDate()
    };
  }

  calculateGrowth(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  calculatePercentageChange(oldValue, newValue) {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  async calculateSalesMetrics(dateRange) {
    const result = await db('sales')
      .sum('total as totalSales')
      .count('id as totalTransactions')
      .avg('total as averageTicket')
      .whereBetween('created_at', [dateRange.start, dateRange.end])
      .first();

    return {
      totalSales: result.totalSales || 0,
      totalTransactions: result.totalTransactions || 0,
      averageTicket: result.averageTicket || 0
    };
  }

  async getSalesTimeline(dateRange) {
    return await db('sales')
      .select(db.raw('DATE(created_at) as date'))
      .sum('total as total')
      .count('id as transactions')
      .whereBetween('created_at', [dateRange.start, dateRange.end])
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date');
  }

  async getTopProducts(dateRange) {
    return await db('sales_items')
      .select('products.id', 'products.name')
      .sum('sales_items.quantity as quantity')
      .sum('sales_items.total as total')
      .join('products', 'sales_items.product_id', 'products.id')
      .join('sales', 'sales_items.sale_id', 'sales.id')
      .whereBetween('sales.created_at', [dateRange.start, dateRange.end])
      .groupBy('products.id', 'products.name')
      .orderBy('total', 'desc')
      .limit(10);
  }

  async getHourlyBreakdown(dateRange) {
    return await db('sales')
      .select(db.raw('HOUR(created_at) as hour'))
      .sum('total as sales')
      .count('id as transactions')
      .whereBetween('created_at', [dateRange.start, dateRange.end])
      .groupBy(db.raw('HOUR(created_at)'))
      .orderBy('hour');
  }

  async getCategoryBreakdown(dateRange) {
    const breakdown = await db('sales_items')
      .select('categories.id', 'categories.name')
      .sum('sales_items.total as total')
      .join('products', 'sales_items.product_id', 'products.id')
      .join('categories', 'products.category_id', 'categories.id')
      .join('sales', 'sales_items.sale_id', 'sales.id')
      .whereBetween('sales.created_at', [dateRange.start, dateRange.end])
      .groupBy('categories.id', 'categories.name')
      .orderBy('total', 'desc');

    const totalSales = breakdown.reduce((sum, cat) => sum + cat.total, 0);

    return breakdown.map(cat => ({
      ...cat,
      percentage: (cat.total / totalSales) * 100
    }));
  }

  async calculateTurnoverRate() {
    // Costo de bienes vendidos en el último mes
    const cogs = await db('sales_items')
      .sum(db.raw('quantity * cost'))
      .join('products', 'sales_items.product_id', 'products.id')
      .join('sales', 'sales_items.sale_id', 'sales.id')
      .where('sales.created_at', '>=', moment().subtract(30, 'days').toDate())
      .first();

    // Inventario promedio
    const avgInventory = await db('products')
      .avg(db.raw('stock * cost'))
      .first();

    if (!avgInventory['avg(stock * cost)'] || avgInventory['avg(stock * cost)'] === 0) {
      return 0;
    }

    return (cogs['sum(quantity * cost)'] || 0) / avgInventory['avg(stock * cost)'];
  }

  async calculateCustomerSatisfaction() {
    // Si existe tabla de reviews
    const hasReviews = await db.schema.hasTable('reviews');

    if (!hasReviews) {
      return 85; // Valor por defecto
    }

    const satisfaction = await db('reviews')
      .avg('rating as avg')
      .where('created_at', '>=', moment().subtract(30, 'days').toDate())
      .first();

    return satisfaction.avg ? (satisfaction.avg / 5) * 100 : 85;
  }

  async calculateCLV() {
    // Promedio de compra * Frecuencia de compra * Duración de relación
    const avgPurchase = await db('sales').avg('total as avg').first();
    const avgFrequency = await db('sales')
      .select(db.raw('COUNT(*) / COUNT(DISTINCT customer_id) as freq'))
      .first();

    // Asumiendo una duración promedio de 2 años
    const avgDuration = 24; // meses

    return (avgPurchase.avg || 0) * (avgFrequency.freq || 0) * avgDuration;
  }

  async calculateChurnRate(dateRange) {
    // Clientes que no han comprado en los últimos 60 días
    const inactiveCustomers = await db('customers')
      .count('id as count')
      .whereNotIn('id', function() {
        this.select('customer_id')
          .from('sales')
          .where('created_at', '>=', moment().subtract(60, 'days').toDate())
          .whereNotNull('customer_id');
      })
      .first();

    const totalCustomers = await db('customers').count('id as count').first();

    return totalCustomers.count > 0
      ? (inactiveCustomers.count / totalCustomers.count) * 100
      : 0;
  }

  // Métodos adicionales para métricas específicas...

  async getAverageResponseTime() {
    // Implementar lógica real de monitoreo
    return Math.random() * 50 + 20; // Mock: 20-70ms
  }

  async getSystemUptime() {
    // Calcular uptime real
    const uptimeSeconds = process.uptime();
    const totalSeconds = 86400 * 30; // 30 días
    return (uptimeSeconds / totalSeconds) * 100;
  }

  async getErrorCount() {
    // Obtener de logs
    return await auditService.getEventCount({
      level: 'ERROR',
      startDate: moment().subtract(24, 'hours').toDate()
    });
  }

  async getDiskUsage() {
    // Implementar verificación real de disco
    return {
      used: Math.random() * 500,
      total: 1000,
      percentage: Math.random() * 50 + 20
    };
  }

  async getActiveUsersCount() {
    // Contar usuarios activos en las últimas 5 minutos
    return await db('user_sessions')
      .countDistinct('user_id as count')
      .where('last_activity', '>=', moment().subtract(5, 'minutes').toDate())
      .first()
      .then(r => r.count || 0);
  }

  async getRequestsPerSecond() {
    // Implementar contador real de requests
    return Math.random() * 100 + 50;
  }

  async getDatabaseConnectionCount() {
    // Obtener conexiones activas de la base de datos
    const result = await db.raw('SHOW STATUS LIKE "Threads_connected"');
    return result[0] ? parseInt(result[0].Value) : 0;
  }

  // Métodos de exportación (simplificados)

  exportToCSV(metrics) {
    // Implementar exportación real a CSV
    const lines = ['Metric,Value'];
    for (const [key, value] of Object.entries(metrics)) {
      lines.push(`"${key}","${value}"`);
    }
    return lines.join('\n');
  }

  async exportToExcel(metrics) {
    // Implementar con librería como xlsx
    return Buffer.from(JSON.stringify(metrics));
  }

  async exportToPDF(metrics) {
    // Implementar con librería como pdfkit
    return Buffer.from(JSON.stringify(metrics));
  }
}

module.exports = new AnalyticsController();