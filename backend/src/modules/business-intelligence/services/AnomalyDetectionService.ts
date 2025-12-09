// Anomaly Detection Service - Fraud and unusual pattern detection
import { Database } from 'better-sqlite3';
import { getDB } from '../../../config/database.js';
import logger from '../../../config/logger.js';
import { EventEmitter } from 'events';

interface Anomaly {
  id: string;
  type: 'fraud' | 'unusual_sale' | 'inventory' | 'refund' | 'discount' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  entity_type: string;
  entity_id: number;
  description: string;
  details: any;
  recommended_action: string;
  confidence_score: number;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
}

interface AnomalyRule {
  name: string;
  type: string;
  threshold: number;
  checkFunction: () => Promise<Anomaly[]>;
}

export class AnomalyDetectionService extends EventEmitter {
  private db: Database;
  private rules: AnomalyRule[];
  private detectedAnomalies: Map<string, Anomaly>;

  constructor() {
    super();
    this.db = getDB();
    this.detectedAnomalies = new Map();
    this.initializeRules();
  }

  private initializeRules() {
    this.rules = [
      {
        name: 'Excessive Refunds',
        type: 'refund',
        threshold: 0.15, // 15% refund rate
        checkFunction: () => this.checkExcessiveRefunds()
      },
      {
        name: 'Unusual Discounts',
        type: 'discount',
        threshold: 0.5, // 50% discount
        checkFunction: () => this.checkUnusualDiscounts()
      },
      {
        name: 'Suspicious Transactions',
        type: 'fraud',
        threshold: 3, // 3 standard deviations
        checkFunction: () => this.checkSuspiciousTransactions()
      },
      {
        name: 'Inventory Discrepancies',
        type: 'inventory',
        threshold: 0.1, // 10% discrepancy
        checkFunction: () => this.checkInventoryDiscrepancies()
      },
      {
        name: 'Unusual Sales Patterns',
        type: 'pattern',
        threshold: 2.5, // 2.5 standard deviations
        checkFunction: () => this.checkUnusualSalesPatterns()
      }
    ];
  }

  // Main anomaly detection method
  async detectAnomalies(): Promise<Anomaly[]> {
    try {
      logger.info('🔍 Starting anomaly detection...');
      const allAnomalies: Anomaly[] = [];

      for (const rule of this.rules) {
        try {
          const anomalies = await rule.checkFunction();
          allAnomalies.push(...anomalies);
        } catch (error) {
          logger.error(`Error checking rule ${rule.name}:`, error);
        }
      }

      // Store new anomalies
      allAnomalies.forEach(anomaly => {
        if (!this.detectedAnomalies.has(anomaly.id)) {
          this.detectedAnomalies.set(anomaly.id, anomaly);
          this.emit('anomalyDetected', anomaly);
        }
      });

      logger.info(`✅ Detected ${allAnomalies.length} anomalies`);
      return allAnomalies;
    } catch (error) {
      logger.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  // Check for excessive refunds
  private async checkExcessiveRefunds(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Check by employee
      const employeeRefunds = `
        SELECT
          u.id as user_id,
          u.username,
          u.role,
          COUNT(CASE WHEN s.status = 'refunded' THEN 1 END) as refund_count,
          COUNT(*) as total_sales,
          CAST(COUNT(CASE WHEN s.status = 'refunded' THEN 1 END) AS FLOAT) /
            NULLIF(COUNT(*), 0) as refund_rate,
          SUM(CASE WHEN s.status = 'refunded' THEN s.total END) as refund_amount
        FROM users u
        JOIN sales s ON u.id = s.user_id
        WHERE s.sale_date >= date('now', '-7 days')
        GROUP BY u.id
        HAVING refund_rate > ?
      `;

      const suspiciousEmployees = this.db.prepare(employeeRefunds).all(this.rules[0].threshold) as any[];

      suspiciousEmployees.forEach(emp => {
        anomalies.push({
          id: `refund_emp_${emp.user_id}_${Date.now()}`,
          type: 'refund',
          severity: emp.refund_rate > 0.3 ? 'critical' : 'high',
          detected_at: new Date().toISOString(),
          entity_type: 'employee',
          entity_id: emp.user_id,
          description: `Employee ${emp.username} has unusually high refund rate`,
          details: {
            username: emp.username,
            refund_rate: Math.round(emp.refund_rate * 100),
            refund_count: emp.refund_count,
            total_sales: emp.total_sales,
            refund_amount: emp.refund_amount
          },
          recommended_action: 'Review employee transactions and verify refunds',
          confidence_score: Math.min(95, Math.round(emp.refund_rate * 200)),
          status: 'new'
        });
      });

      // Check by time period
      const timeRefunds = `
        SELECT
          DATE(sale_date) as date,
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refund_count,
          COUNT(*) as total_sales,
          CAST(COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS FLOAT) /
            NULLIF(COUNT(*), 0) as refund_rate
        FROM sales
        WHERE sale_date >= date('now', '-1 day')
        GROUP BY DATE(sale_date)
        HAVING refund_rate > ?
      `;

      const suspiciousDays = this.db.prepare(timeRefunds).all(this.rules[0].threshold * 2) as any[];

      suspiciousDays.forEach(day => {
        anomalies.push({
          id: `refund_day_${day.date}`,
          type: 'refund',
          severity: 'medium',
          detected_at: new Date().toISOString(),
          entity_type: 'time_period',
          entity_id: 0,
          description: `Abnormally high refund rate on ${day.date}`,
          details: {
            date: day.date,
            refund_rate: Math.round(day.refund_rate * 100),
            refund_count: day.refund_count,
            total_sales: day.total_sales
          },
          recommended_action: 'Investigate all refunds from this period',
          confidence_score: Math.min(90, Math.round(day.refund_rate * 150)),
          status: 'new'
        });
      });
    } catch (error) {
      logger.error('Error checking excessive refunds:', error);
    }

    return anomalies;
  }

  // Check for unusual discounts
  private async checkUnusualDiscounts(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      const query = `
        SELECT
          s.id as sale_id,
          s.total,
          s.subtotal,
          s.discount,
          s.discount / NULLIF(s.subtotal, 0) as discount_rate,
          s.user_id,
          u.username,
          s.sale_date
        FROM sales s
        JOIN users u ON s.user_id = u.id
        WHERE s.sale_date >= date('now', '-3 days')
          AND s.discount > 0
          AND s.discount / NULLIF(s.subtotal, 0) > ?
        ORDER BY discount_rate DESC
      `;

      const suspiciousDiscounts = this.db.prepare(query).all(this.rules[1].threshold) as any[];

      suspiciousDiscounts.forEach(sale => {
        anomalies.push({
          id: `discount_${sale.sale_id}`,
          type: 'discount',
          severity: sale.discount_rate > 0.7 ? 'critical' : 'high',
          detected_at: new Date().toISOString(),
          entity_type: 'sale',
          entity_id: sale.sale_id,
          description: `Excessive discount applied to sale #${sale.sale_id}`,
          details: {
            sale_id: sale.sale_id,
            discount_percentage: Math.round(sale.discount_rate * 100),
            discount_amount: sale.discount,
            total: sale.total,
            employee: sale.username,
            date: sale.sale_date
          },
          recommended_action: 'Verify discount authorization and reason',
          confidence_score: Math.min(95, Math.round(sale.discount_rate * 100)),
          status: 'new'
        });
      });
    } catch (error) {
      logger.error('Error checking unusual discounts:', error);
    }

    return anomalies;
  }

  // Check for suspicious transactions
  private async checkSuspiciousTransactions(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Get average transaction value and standard deviation
      const stats = this.db.prepare(`
        SELECT
          AVG(total) as avg_total,
          AVG(total) + (3 * STDEV(total)) as upper_bound,
          AVG(total) - (3 * STDEV(total)) as lower_bound
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
          AND status = 'completed'
      `).get() as any;

      // Find outliers
      const outliers = `
        SELECT
          s.*,
          u.username,
          c.name as customer_name,
          ABS(s.total - ?) / ? as zscore
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.sale_date >= date('now', '-1 day')
          AND (s.total > ? OR s.total < ?)
          AND s.status = 'completed'
      `;

      const suspiciousSales = this.db.prepare(outliers).all(
        stats.avg_total,
        stats.avg_total,
        stats.upper_bound,
        Math.max(0, stats.lower_bound)
      ) as any[];

      suspiciousSales.forEach(sale => {
        // Check for additional red flags
        const redFlags = [];
        if (!sale.customer_id) redFlags.push('No customer linked');
        if (sale.total > stats.upper_bound * 1.5) redFlags.push('Extremely high value');
        if (sale.payment_method === 'cash' && sale.total > 1000) redFlags.push('Large cash transaction');

        if (redFlags.length > 0) {
          anomalies.push({
            id: `suspicious_${sale.id}`,
            type: 'fraud',
            severity: redFlags.length > 2 ? 'critical' : 'high',
            detected_at: new Date().toISOString(),
            entity_type: 'transaction',
            entity_id: sale.id,
            description: `Suspicious transaction detected`,
            details: {
              sale_id: sale.id,
              amount: sale.total,
              z_score: Math.round(sale.zscore * 10) / 10,
              employee: sale.username,
              customer: sale.customer_name || 'Unknown',
              red_flags: redFlags,
              payment_method: sale.payment_method
            },
            recommended_action: 'Review transaction details and verify with customer',
            confidence_score: Math.min(95, 60 + (redFlags.length * 10)),
            status: 'new'
          });
        }
      });

      // Check for velocity anomalies (too many transactions in short time)
      const velocityCheck = `
        SELECT
          user_id,
          username,
          COUNT(*) as transaction_count,
          SUM(total) as total_amount,
          MIN(sale_date) as first_sale,
          MAX(sale_date) as last_sale,
          (julianday(MAX(sale_date)) - julianday(MIN(sale_date))) * 24 * 60 as minutes_span
        FROM (
          SELECT s.*, u.username
          FROM sales s
          JOIN users u ON s.user_id = u.id
          WHERE s.sale_date >= datetime('now', '-1 hour')
        )
        GROUP BY user_id
        HAVING transaction_count > 20
      `;

      const velocityAnomalies = this.db.prepare(velocityCheck).all() as any[];

      velocityAnomalies.forEach(item => {
        anomalies.push({
          id: `velocity_${item.user_id}_${Date.now()}`,
          type: 'pattern',
          severity: 'medium',
          detected_at: new Date().toISOString(),
          entity_type: 'employee',
          entity_id: item.user_id,
          description: `Unusual transaction velocity detected`,
          details: {
            employee: item.username,
            transaction_count: item.transaction_count,
            total_amount: item.total_amount,
            time_span_minutes: Math.round(item.minutes_span),
            rate_per_minute: Math.round(item.transaction_count / (item.minutes_span || 1) * 10) / 10
          },
          recommended_action: 'Verify if employee is actually processing these transactions',
          confidence_score: 75,
          status: 'new'
        });
      });
    } catch (error) {
      logger.error('Error checking suspicious transactions:', error);
    }

    return anomalies;
  }

  // Check for inventory discrepancies
  private async checkInventoryDiscrepancies(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      const query = `
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.current_stock,
          COALESCE(SUM(si.quantity), 0) as units_sold,
          p.current_stock + COALESCE(SUM(si.quantity), 0) as expected_stock,
          ABS(p.current_stock - (p.current_stock + COALESCE(SUM(si.quantity), 0))) as discrepancy
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-7 days')
          AND s.status = 'completed'
        GROUP BY p.id
        HAVING discrepancy > p.current_stock * ?
      `;

      const discrepancies = this.db.prepare(query).all(this.rules[3].threshold) as any[];

      discrepancies.forEach(item => {
        anomalies.push({
          id: `inventory_${item.product_id}_${Date.now()}`,
          type: 'inventory',
          severity: item.discrepancy > item.current_stock * 0.3 ? 'high' : 'medium',
          detected_at: new Date().toISOString(),
          entity_type: 'product',
          entity_id: item.product_id,
          description: `Inventory discrepancy detected for ${item.product_name}`,
          details: {
            product_name: item.product_name,
            current_stock: item.current_stock,
            units_sold: item.units_sold,
            expected_stock: item.expected_stock,
            discrepancy: item.discrepancy,
            discrepancy_percentage: Math.round((item.discrepancy / item.current_stock) * 100)
          },
          recommended_action: 'Conduct physical inventory count',
          confidence_score: 80,
          status: 'new'
        });
      });
    } catch (error) {
      logger.error('Error checking inventory discrepancies:', error);
    }

    return anomalies;
  }

  // Check for unusual sales patterns
  private async checkUnusualSalesPatterns(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    try {
      // Check for unusual hourly patterns
      const hourlyStats = `
        SELECT
          strftime('%H', sale_date) as hour,
          COUNT(*) as transaction_count,
          AVG(total) as avg_total
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
          AND status = 'completed'
        GROUP BY hour
      `;

      const normalPattern = this.db.prepare(hourlyStats).all() as any[];
      const avgHourlyTransactions = normalPattern.reduce((sum, h) => sum + h.transaction_count, 0) / 24;

      // Check recent hourly activity
      const recentHourly = `
        SELECT
          strftime('%H', sale_date) as hour,
          DATE(sale_date) as date,
          COUNT(*) as transaction_count,
          SUM(total) as total_sales
        FROM sales
        WHERE sale_date >= datetime('now', '-24 hours')
          AND status = 'completed'
        GROUP BY hour, date
      `;

      const recentActivity = this.db.prepare(recentHourly).all() as any[];

      recentActivity.forEach(activity => {
        const normalForHour = normalPattern.find(p => p.hour === activity.hour);
        const expectedCount = normalForHour?.transaction_count || avgHourlyTransactions;

        if (activity.transaction_count > expectedCount * 2.5) {
          anomalies.push({
            id: `pattern_${activity.date}_${activity.hour}`,
            type: 'pattern',
            severity: 'low',
            detected_at: new Date().toISOString(),
            entity_type: 'time_pattern',
            entity_id: 0,
            description: `Unusual sales activity at ${activity.hour}:00`,
            details: {
              date: activity.date,
              hour: activity.hour,
              transaction_count: activity.transaction_count,
              expected_count: Math.round(expectedCount),
              variance_percentage: Math.round((activity.transaction_count / expectedCount - 1) * 100),
              total_sales: activity.total_sales
            },
            recommended_action: 'Monitor for continued unusual patterns',
            confidence_score: 65,
            status: 'new'
          });
        }
      });

      // Check for duplicate transactions
      const duplicateCheck = `
        SELECT
          s1.id as sale1_id,
          s2.id as sale2_id,
          s1.total,
          s1.customer_id,
          s1.user_id,
          s1.sale_date as sale1_date,
          s2.sale_date as sale2_date,
          ABS(julianday(s2.sale_date) - julianday(s1.sale_date)) * 24 * 60 as minutes_apart
        FROM sales s1
        JOIN sales s2 ON s1.total = s2.total
          AND s1.customer_id = s2.customer_id
          AND s1.id < s2.id
        WHERE s1.sale_date >= date('now', '-1 day')
          AND ABS(julianday(s2.sale_date) - julianday(s1.sale_date)) * 24 * 60 < 5
      `;

      const duplicates = this.db.prepare(duplicateCheck).all() as any[];

      duplicates.forEach(dup => {
        anomalies.push({
          id: `duplicate_${dup.sale1_id}_${dup.sale2_id}`,
          type: 'pattern',
          severity: 'medium',
          detected_at: new Date().toISOString(),
          entity_type: 'transaction',
          entity_id: dup.sale1_id,
          description: 'Potential duplicate transaction detected',
          details: {
            sale1_id: dup.sale1_id,
            sale2_id: dup.sale2_id,
            amount: dup.total,
            minutes_apart: Math.round(dup.minutes_apart),
            customer_id: dup.customer_id
          },
          recommended_action: 'Verify if both transactions are legitimate',
          confidence_score: 85,
          status: 'new'
        });
      });
    } catch (error) {
      logger.error('Error checking sales patterns:', error);
    }

    return anomalies;
  }

  // Get anomaly summary
  async getAnomalySummary(): Promise<any> {
    try {
      const activeAnomalies = Array.from(this.detectedAnomalies.values())
        .filter(a => a.status === 'new' || a.status === 'investigating');

      const summary = {
        total_active: activeAnomalies.length,
        by_severity: {
          critical: activeAnomalies.filter(a => a.severity === 'critical').length,
          high: activeAnomalies.filter(a => a.severity === 'high').length,
          medium: activeAnomalies.filter(a => a.severity === 'medium').length,
          low: activeAnomalies.filter(a => a.severity === 'low').length
        },
        by_type: {
          fraud: activeAnomalies.filter(a => a.type === 'fraud').length,
          refund: activeAnomalies.filter(a => a.type === 'refund').length,
          discount: activeAnomalies.filter(a => a.type === 'discount').length,
          inventory: activeAnomalies.filter(a => a.type === 'inventory').length,
          pattern: activeAnomalies.filter(a => a.type === 'pattern').length
        },
        recent_anomalies: activeAnomalies
          .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
          .slice(0, 10),
        estimated_impact: this.calculateEstimatedImpact(activeAnomalies)
      };

      return summary;
    } catch (error) {
      logger.error('Error getting anomaly summary:', error);
      throw error;
    }
  }

  // Update anomaly status
  async updateAnomalyStatus(anomalyId: string, status: string, notes?: string): Promise<void> {
    try {
      const anomaly = this.detectedAnomalies.get(anomalyId);
      if (anomaly) {
        anomaly.status = status as any;
        if (notes) {
          anomaly.details.resolution_notes = notes;
        }
        this.emit('anomalyUpdated', anomaly);
      }
    } catch (error) {
      logger.error('Error updating anomaly status:', error);
      throw error;
    }
  }

  private calculateEstimatedImpact(anomalies: Anomaly[]): number {
    let impact = 0;

    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'fraud':
          impact += anomaly.details.amount || 0;
          break;
        case 'refund':
          impact += anomaly.details.refund_amount || 0;
          break;
        case 'discount':
          impact += anomaly.details.discount_amount || 0;
          break;
        case 'inventory':
          impact += (anomaly.details.discrepancy || 0) * 10; // Estimated value per unit
          break;
      }
    });

    return Math.round(impact);
  }
}