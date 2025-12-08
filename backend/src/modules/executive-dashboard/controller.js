/**
 * Executive Dashboard Controller
 * Dashboard ejecutivo con KPIs y métricas en tiempo real
 * Consolida datos de todos los módulos del sistema
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// ============================================
// UTILIDADES
// ============================================

const formatCLP = (amount) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(amount || 0);
};

const getDateRange = (period) => {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (period) {
    case 'today':
      return { start: today, end: today };
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday.toISOString().slice(0, 10), end: yesterday.toISOString().slice(0, 10) };
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      return { start: weekStart.toISOString().slice(0, 10), end: today };
    case 'month':
      const monthStart = new Date(now);
      monthStart.setDate(monthStart.getDate() - 30);
      return { start: monthStart.toISOString().slice(0, 10), end: today };
    case 'quarter':
      const quarterStart = new Date(now);
      quarterStart.setDate(quarterStart.getDate() - 90);
      return { start: quarterStart.toISOString().slice(0, 10), end: today };
    default:
      return { start: today, end: today };
  }
};

// ============================================
// DASHBOARD PRINCIPAL
// ============================================

export const getExecutiveDashboard = async (req, res) => {
  try {
    const { branch_id, period = 'today' } = req.query;
    const db = dbService.getDatabase();
    const { start, end } = getDateRange(period);
    const today = new Date().toISOString().slice(0, 10);

    // ============================================
    // KPIs DE VENTAS
    // ============================================

    let salesQuery = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(total), 0) as total_revenue,
        COALESCE(AVG(total), 0) as average_ticket,
        COALESCE(SUM(tax), 0) as total_tax,
        COUNT(DISTINCT customer_id) as unique_customers
      FROM sales
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND status = 'completed'
    `;
    const salesParams = [start, end];

    if (branch_id) {
      salesQuery += ' AND branch_id = ?';
      salesParams.push(branch_id);
    }

    const salesKPIs = db.prepare(salesQuery).get(...salesParams);

    // Comparación con período anterior
    const prevStart = new Date(start);
    const daysDiff = Math.ceil((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    let prevSalesQuery = `
      SELECT COALESCE(SUM(total), 0) as prev_revenue
      FROM sales
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND status = 'completed'
    `;
    const prevParams = [prevStart.toISOString().slice(0, 10), prevEnd.toISOString().slice(0, 10)];

    if (branch_id) {
      prevSalesQuery += ' AND branch_id = ?';
      prevParams.push(branch_id);
    }

    const prevSales = db.prepare(prevSalesQuery).get(...prevParams);

    const revenueChange = prevSales.prev_revenue > 0
      ? ((salesKPIs.total_revenue - prevSales.prev_revenue) / prevSales.prev_revenue * 100).toFixed(1)
      : 0;

    // ============================================
    // VENTAS POR HORA (PARA GRÁFICO)
    // ============================================

    let hourlyQuery = `
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as transactions,
        COALESCE(SUM(total), 0) as revenue
      FROM sales
      WHERE DATE(created_at) = ?
        AND status = 'completed'
    `;

    if (branch_id) hourlyQuery += ' AND branch_id = ?';
    hourlyQuery += ' GROUP BY strftime("%H", created_at) ORDER BY hour';

    const hourlyData = branch_id
      ? db.prepare(hourlyQuery).all(today, branch_id)
      : db.prepare(hourlyQuery).all(today);

    // ============================================
    // TOP PRODUCTOS
    // ============================================

    let topProductsQuery = `
      SELECT
        p.name,
        p.id,
        SUM(si.quantity) as quantity_sold,
        SUM(si.subtotal) as revenue
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
        AND s.status = 'completed'
    `;

    if (branch_id) topProductsQuery += ' AND s.branch_id = ?';
    topProductsQuery += ' GROUP BY p.id ORDER BY quantity_sold DESC LIMIT 10';

    const topProducts = branch_id
      ? db.prepare(topProductsQuery).all(start, end, branch_id)
      : db.prepare(topProductsQuery).all(start, end);

    // ============================================
    // VENTAS POR CATEGORÍA
    // ============================================

    let categoryQuery = `
      SELECT
        c.name as category,
        SUM(si.subtotal) as revenue,
        SUM(si.quantity) as quantity
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN categories c ON c.id = p.category_id
      JOIN sales s ON s.id = si.sale_id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
        AND s.status = 'completed'
    `;

    if (branch_id) categoryQuery += ' AND s.branch_id = ?';
    categoryQuery += ' GROUP BY c.id ORDER BY revenue DESC';

    const categoryData = branch_id
      ? db.prepare(categoryQuery).all(start, end, branch_id)
      : db.prepare(categoryQuery).all(start, end);

    // ============================================
    // MÉTODOS DE PAGO
    // ============================================

    let paymentQuery = `
      SELECT
        payment_method,
        COUNT(*) as count,
        SUM(total) as amount
      FROM sales
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND status = 'completed'
    `;

    if (branch_id) paymentQuery += ' AND branch_id = ?';
    paymentQuery += ' GROUP BY payment_method ORDER BY amount DESC';

    const paymentMethods = branch_id
      ? db.prepare(paymentQuery).all(start, end, branch_id)
      : db.prepare(paymentQuery).all(start, end);

    // ============================================
    // KPIs DE MESAS Y RESERVAS
    // ============================================

    const tablesKPIs = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM tables WHERE is_active = 1) as total_tables,
        (SELECT COUNT(*) FROM tables WHERE is_active = 1 AND status = 'occupied') as occupied_tables,
        (SELECT COUNT(*) FROM reservations WHERE reservation_date = ? AND status = 'confirmed') as todays_reservations,
        (SELECT SUM(party_size) FROM reservations WHERE reservation_date = ? AND status IN ('confirmed', 'seated')) as expected_covers
    `).get(today, today);

    const occupancyRate = tablesKPIs.total_tables > 0
      ? Math.round((tablesKPIs.occupied_tables / tablesKPIs.total_tables) * 100)
      : 0;

    // ============================================
    // KPIs DE DELIVERY
    // ============================================

    let deliveryQuery = `
      SELECT
        COUNT(*) as total_deliveries,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('pending', 'assigned', 'picked_up', 'in_transit') THEN 1 ELSE 0 END) as in_progress,
        AVG(CASE WHEN status = 'delivered' THEN
          (julianday(actual_delivery_time) - julianday(created_at)) * 24 * 60
        END) as avg_delivery_minutes
      FROM deliveries
      WHERE DATE(created_at) BETWEEN ? AND ?
    `;

    const deliveryKPIs = db.prepare(deliveryQuery).get(start, end);

    // Drivers activos
    const activeDrivers = db.prepare(`
      SELECT COUNT(*) as count FROM delivery_drivers WHERE status = 'available'
    `).get();

    // ============================================
    // KPIs DE INVENTARIO
    // ============================================

    const inventoryKPIs = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
        (SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock <= min_stock) as low_stock_count,
        (SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock = 0) as out_of_stock,
        (SELECT SUM(stock * cost) FROM products WHERE is_active = 1) as inventory_value
    `).get();

    // Alertas de stock bajo
    const lowStockAlerts = db.prepare(`
      SELECT id, name, stock, min_stock
      FROM products
      WHERE is_active = 1 AND stock <= min_stock AND stock > 0
      ORDER BY (stock * 1.0 / min_stock) ASC
      LIMIT 5
    `).all();

    // ============================================
    // KPIs DE LOYALTY
    // ============================================

    const loyaltyKPIs = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM loyalty_members WHERE status = 'active') as total_members,
        (SELECT COUNT(*) FROM loyalty_transactions WHERE DATE(created_at) = ?) as todays_transactions,
        (SELECT SUM(points) FROM loyalty_transactions WHERE DATE(created_at) = ? AND transaction_type = 'earn') as points_earned_today,
        (SELECT SUM(points) FROM loyalty_transactions WHERE DATE(created_at) = ? AND transaction_type = 'redeem') as points_redeemed_today
    `).get(today, today, today);

    // ============================================
    // TENDENCIA SEMANAL
    // ============================================

    let weeklyTrendQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(total) as revenue
      FROM sales
      WHERE DATE(created_at) >= DATE('now', '-7 days')
        AND status = 'completed'
    `;

    if (branch_id) weeklyTrendQuery += ' AND branch_id = ?';
    weeklyTrendQuery += ' GROUP BY DATE(created_at) ORDER BY date';

    const weeklyTrend = branch_id
      ? db.prepare(weeklyTrendQuery).all(branch_id)
      : db.prepare(weeklyTrendQuery).all();

    // ============================================
    // COMPARATIVA POR SUCURSAL
    // ============================================

    const branchComparison = db.prepare(`
      SELECT
        b.id,
        b.name,
        b.code,
        COUNT(s.id) as transactions,
        COALESCE(SUM(s.total), 0) as revenue,
        COALESCE(AVG(s.total), 0) as avg_ticket
      FROM branches b
      LEFT JOIN sales s ON s.branch_id = b.id
        AND DATE(s.created_at) BETWEEN ? AND ?
        AND s.status = 'completed'
      WHERE b.is_active = 1
      GROUP BY b.id
      ORDER BY revenue DESC
    `).all(start, end);

    // ============================================
    // ALERTAS ACTIVAS
    // ============================================

    const alerts = [];

    // Alertas de stock
    if (inventoryKPIs.out_of_stock > 0) {
      alerts.push({
        type: 'critical',
        category: 'inventory',
        message: `${inventoryKPIs.out_of_stock} productos sin stock`,
        icon: '🚨'
      });
    }

    if (inventoryKPIs.low_stock_count > 0) {
      alerts.push({
        type: 'warning',
        category: 'inventory',
        message: `${inventoryKPIs.low_stock_count} productos con stock bajo`,
        icon: '⚠️'
      });
    }

    // Alertas de delivery
    if (deliveryKPIs.in_progress > 5) {
      alerts.push({
        type: 'info',
        category: 'delivery',
        message: `${deliveryKPIs.in_progress} entregas en progreso`,
        icon: '🚚'
      });
    }

    // Alertas de reservas
    if (tablesKPIs.todays_reservations > 0) {
      alerts.push({
        type: 'info',
        category: 'reservations',
        message: `${tablesKPIs.todays_reservations} reservas confirmadas hoy`,
        icon: '📅'
      });
    }

    // Waitlist pendientes
    const waitlistCount = db.prepare(`
      SELECT COUNT(*) as count FROM reservation_waitlist
      WHERE status = 'waiting' AND requested_date = ?
    `).get(today);

    if (waitlistCount.count > 0) {
      alerts.push({
        type: 'warning',
        category: 'reservations',
        message: `${waitlistCount.count} personas en lista de espera`,
        icon: '⏳'
      });
    }

    // ============================================
    // RESPUESTA
    // ============================================

    res.json({
      success: true,
      period: { start, end, label: period },
      generated_at: new Date().toISOString(),
      kpis: {
        sales: {
          total_revenue: salesKPIs.total_revenue,
          total_revenue_formatted: formatCLP(salesKPIs.total_revenue),
          total_transactions: salesKPIs.total_transactions,
          average_ticket: Math.round(salesKPIs.average_ticket),
          average_ticket_formatted: formatCLP(salesKPIs.average_ticket),
          total_tax: salesKPIs.total_tax,
          unique_customers: salesKPIs.unique_customers,
          revenue_change_percent: parseFloat(revenueChange),
          revenue_trend: parseFloat(revenueChange) >= 0 ? 'up' : 'down'
        },
        tables: {
          total: tablesKPIs.total_tables,
          occupied: tablesKPIs.occupied_tables,
          occupancy_rate: occupancyRate,
          todays_reservations: tablesKPIs.todays_reservations || 0,
          expected_covers: tablesKPIs.expected_covers || 0
        },
        delivery: {
          total: deliveryKPIs.total_deliveries || 0,
          completed: deliveryKPIs.completed || 0,
          in_progress: deliveryKPIs.in_progress || 0,
          avg_delivery_minutes: Math.round(deliveryKPIs.avg_delivery_minutes || 0),
          active_drivers: activeDrivers.count
        },
        inventory: {
          total_products: inventoryKPIs.total_products,
          low_stock: inventoryKPIs.low_stock_count,
          out_of_stock: inventoryKPIs.out_of_stock,
          inventory_value: inventoryKPIs.inventory_value,
          inventory_value_formatted: formatCLP(inventoryKPIs.inventory_value)
        },
        loyalty: {
          total_members: loyaltyKPIs.total_members || 0,
          todays_transactions: loyaltyKPIs.todays_transactions || 0,
          points_earned_today: loyaltyKPIs.points_earned_today || 0,
          points_redeemed_today: loyaltyKPIs.points_redeemed_today || 0
        }
      },
      charts: {
        hourly_sales: hourlyData,
        weekly_trend: weeklyTrend,
        top_products: topProducts,
        categories: categoryData,
        payment_methods: paymentMethods,
        branch_comparison: branchComparison
      },
      alerts,
      low_stock_items: lowStockAlerts
    });

  } catch (error) {
    logger.error('Error getting executive dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard ejecutivo' });
  }
};

// ============================================
// RESUMEN RÁPIDO (WIDGET)
// ============================================

export const getQuickSummary = async (req, res) => {
  try {
    const db = dbService.getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    const summary = db.prepare(`
      SELECT
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE DATE(created_at) = ? AND status = 'completed') as today_revenue,
        (SELECT COUNT(*) FROM sales WHERE DATE(created_at) = ? AND status = 'completed') as today_transactions,
        (SELECT COUNT(*) FROM tables WHERE is_active = 1 AND status = 'occupied') as occupied_tables,
        (SELECT COUNT(*) FROM deliveries WHERE DATE(created_at) = ? AND status IN ('pending', 'assigned', 'in_transit')) as pending_deliveries,
        (SELECT COUNT(*) FROM reservations WHERE reservation_date = ? AND status = 'confirmed') as pending_reservations,
        (SELECT COUNT(*) FROM qr_sessions WHERE DATE(started_at) = ? AND status = 'active') as active_qr_sessions
    `).get(today, today, today, today, today);

    res.json({
      success: true,
      summary: {
        ...summary,
        today_revenue_formatted: formatCLP(summary.today_revenue)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Error getting quick summary:', error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
};

// ============================================
// MÉTRICAS EN TIEMPO REAL
// ============================================

export const getRealTimeMetrics = async (req, res) => {
  try {
    const db = dbService.getDatabase();
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000).toISOString();

    const metrics = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM sales WHERE created_at >= ? AND status = 'completed') as sales_last_hour,
        (SELECT COALESCE(SUM(total), 0) FROM sales WHERE created_at >= ? AND status = 'completed') as revenue_last_hour,
        (SELECT COUNT(*) FROM tables WHERE status = 'occupied') as current_occupied,
        (SELECT COUNT(*) FROM qr_sessions WHERE status = 'active') as active_sessions,
        (SELECT COUNT(*) FROM deliveries WHERE status = 'in_transit') as deliveries_in_transit,
        (SELECT COUNT(*) FROM qr_waiter_calls WHERE status = 'pending') as pending_waiter_calls
    `).get(oneHourAgo, oneHourAgo);

    res.json({
      success: true,
      realtime: {
        ...metrics,
        revenue_last_hour_formatted: formatCLP(metrics.revenue_last_hour)
      },
      timestamp: now.toISOString()
    });

  } catch (error) {
    logger.error('Error getting real-time metrics:', error);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
};

// ============================================
// COMPARATIVA DE PERÍODOS
// ============================================

export const getPeriodComparison = async (req, res) => {
  try {
    const { period1_start, period1_end, period2_start, period2_end } = req.query;
    const db = dbService.getDatabase();

    if (!period1_start || !period1_end || !period2_start || !period2_end) {
      return res.status(400).json({ error: 'Se requieren ambos períodos' });
    }

    const getPeriodData = (start, end) => {
      return db.prepare(`
        SELECT
          COUNT(*) as transactions,
          COALESCE(SUM(total), 0) as revenue,
          COALESCE(AVG(total), 0) as avg_ticket,
          COUNT(DISTINCT customer_id) as unique_customers,
          COUNT(DISTINCT DATE(created_at)) as active_days
        FROM sales
        WHERE DATE(created_at) BETWEEN ? AND ?
          AND status = 'completed'
      `).get(start, end);
    };

    const period1 = getPeriodData(period1_start, period1_end);
    const period2 = getPeriodData(period2_start, period2_end);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    res.json({
      success: true,
      comparison: {
        period1: {
          range: { start: period1_start, end: period1_end },
          data: {
            ...period1,
            revenue_formatted: formatCLP(period1.revenue),
            avg_ticket_formatted: formatCLP(period1.avg_ticket)
          }
        },
        period2: {
          range: { start: period2_start, end: period2_end },
          data: {
            ...period2,
            revenue_formatted: formatCLP(period2.revenue),
            avg_ticket_formatted: formatCLP(period2.avg_ticket)
          }
        },
        changes: {
          revenue: parseFloat(calculateChange(period1.revenue, period2.revenue)),
          transactions: parseFloat(calculateChange(period1.transactions, period2.transactions)),
          avg_ticket: parseFloat(calculateChange(period1.avg_ticket, period2.avg_ticket)),
          customers: parseFloat(calculateChange(period1.unique_customers, period2.unique_customers))
        }
      }
    });

  } catch (error) {
    logger.error('Error getting period comparison:', error);
    res.status(500).json({ error: 'Error al comparar períodos' });
  }
};

// ============================================
// EXPORTAR REPORTE
// ============================================

export const exportDashboardReport = async (req, res) => {
  try {
    const { format = 'json', period = 'today', branch_id } = req.query;
    const db = dbService.getDatabase();
    const { start, end } = getDateRange(period);

    // Obtener todos los datos del dashboard
    const salesData = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as transactions,
        SUM(total) as revenue,
        AVG(total) as avg_ticket
      FROM sales
      WHERE DATE(created_at) BETWEEN ? AND ?
        AND status = 'completed'
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all(start, end);

    const topProducts = db.prepare(`
      SELECT
        p.name,
        p.sku,
        SUM(si.quantity) as quantity,
        SUM(si.subtotal) as revenue
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
        AND s.status = 'completed'
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 20
    `).all(start, end);

    const report = {
      generated_at: new Date().toISOString(),
      period: { start, end, label: period },
      daily_sales: salesData,
      top_products: topProducts,
      summary: {
        total_revenue: salesData.reduce((sum, d) => sum + d.revenue, 0),
        total_transactions: salesData.reduce((sum, d) => sum + d.transactions, 0),
        average_daily_revenue: salesData.length > 0
          ? salesData.reduce((sum, d) => sum + d.revenue, 0) / salesData.length
          : 0
      }
    };

    if (format === 'csv') {
      // Generar CSV
      let csv = 'Fecha,Transacciones,Ingresos,Ticket Promedio\n';
      salesData.forEach(row => {
        csv += `${row.date},${row.transactions},${row.revenue},${Math.round(row.avg_ticket)}\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${start}_${end}.csv`);
      return res.send(csv);
    }

    res.json({ success: true, report });

  } catch (error) {
    logger.error('Error exporting dashboard report:', error);
    res.status(500).json({ error: 'Error al exportar reporte' });
  }
};

// ============================================
// GRÁFICOS ESPECÍFICOS
// ============================================

// Ventas por día de la semana
export const getSalesByDayOfWeek = async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const db = dbService.getDatabase();

    const data = db.prepare(`
      SELECT
        CASE strftime('%w', created_at)
          WHEN '0' THEN 'Domingo'
          WHEN '1' THEN 'Lunes'
          WHEN '2' THEN 'Martes'
          WHEN '3' THEN 'Miércoles'
          WHEN '4' THEN 'Jueves'
          WHEN '5' THEN 'Viernes'
          WHEN '6' THEN 'Sábado'
        END as day_name,
        strftime('%w', created_at) as day_number,
        COUNT(*) as transactions,
        AVG(total) as avg_revenue,
        SUM(total) as total_revenue
      FROM sales
      WHERE created_at >= DATE('now', '-' || ? || ' days')
        AND status = 'completed'
      GROUP BY strftime('%w', created_at)
      ORDER BY day_number
    `).all(weeks * 7);

    res.json({ success: true, data });

  } catch (error) {
    logger.error('Error getting sales by day:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
};

// Ventas por hora del día
export const getSalesByHour = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const db = dbService.getDatabase();

    const data = db.prepare(`
      SELECT
        strftime('%H', created_at) as hour,
        COUNT(*) as transactions,
        AVG(total) as avg_revenue,
        SUM(total) as total_revenue
      FROM sales
      WHERE created_at >= DATE('now', '-' || ? || ' days')
        AND status = 'completed'
      GROUP BY strftime('%H', created_at)
      ORDER BY hour
    `).all(days);

    res.json({ success: true, data });

  } catch (error) {
    logger.error('Error getting sales by hour:', error);
    res.status(500).json({ error: 'Error al obtener datos' });
  }
};

// Rendimiento de meseros
export const getServerPerformance = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const { start, end } = getDateRange(period);
    const db = dbService.getDatabase();

    const data = db.prepare(`
      SELECT
        u.id,
        u.name,
        COUNT(s.id) as transactions,
        COALESCE(SUM(s.total), 0) as total_sales,
        COALESCE(AVG(s.total), 0) as avg_ticket,
        COALESCE(SUM(t.amount), 0) as total_tips
      FROM users u
      LEFT JOIN sales s ON s.user_id = u.id
        AND DATE(s.created_at) BETWEEN ? AND ?
        AND s.status = 'completed'
      LEFT JOIN tips t ON t.sale_id = s.id
      WHERE u.role IN ('waiter', 'cashier')
        AND u.is_active = 1
      GROUP BY u.id
      ORDER BY total_sales DESC
    `).all(start, end);

    res.json({
      success: true,
      period: { start, end },
      data: data.map(d => ({
        ...d,
        total_sales_formatted: formatCLP(d.total_sales),
        avg_ticket_formatted: formatCLP(d.avg_ticket),
        total_tips_formatted: formatCLP(d.total_tips)
      }))
    });

  } catch (error) {
    logger.error('Error getting server performance:', error);
    res.status(500).json({ error: 'Error al obtener rendimiento' });
  }
};

export default {
  getExecutiveDashboard,
  getQuickSummary,
  getRealTimeMetrics,
  getPeriodComparison,
  exportDashboardReport,
  getSalesByDayOfWeek,
  getSalesByHour,
  getServerPerformance
};
