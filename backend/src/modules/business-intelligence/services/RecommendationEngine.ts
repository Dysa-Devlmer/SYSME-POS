// Recommendation Engine - AI-powered business recommendations
import { Database } from 'better-sqlite3';
import { getDB } from '../../../config/database.js';
import logger from '../../../config/logger.js';

interface Recommendation {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'very_high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  expected_benefit: string;
  implementation_steps: string[];
  metrics_to_track: string[];
  estimated_roi: number;
  confidence: number;
  data_points: any;
}

export class RecommendationEngine {
  private db: Database;

  constructor() {
    this.db = getDB();
  }

  // Generate comprehensive business recommendations
  async generateRecommendations(): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = [];

      // Analyze different business aspects
      const [
        pricingRecs,
        inventoryRecs,
        staffingRecs,
        marketingRecs,
        operationalRecs,
        menuRecs
      ] = await Promise.all([
        this.analyzePricingOpportunities(),
        this.analyzeInventoryOptimization(),
        this.analyzeStaffingEfficiency(),
        this.analyzeMarketingOpportunities(),
        this.analyzeOperationalImprovements(),
        this.analyzeMenuOptimization()
      ]);

      recommendations.push(
        ...pricingRecs,
        ...inventoryRecs,
        ...staffingRecs,
        ...marketingRecs,
        ...operationalRecs,
        ...menuRecs
      );

      // Sort by priority (impact * confidence / effort)
      recommendations.sort((a, b) => b.priority - a.priority);

      return recommendations.slice(0, 20); // Top 20 recommendations
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      throw error;
    }
  }

  // Pricing opportunity analysis
  private async analyzePricingOpportunities(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Find underpriced popular items
      const underpriced = this.db.prepare(`
        SELECT
          p.id,
          p.name,
          p.price,
          p.category,
          COUNT(si.id) as sales_count,
          AVG(si.price) as avg_selling_price,
          (SELECT AVG(price) FROM products WHERE category = p.category) as category_avg
        FROM products p
        JOIN sale_items si ON p.id = si.product_id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-30 days')
        GROUP BY p.id
        HAVING sales_count > 50
          AND p.price < category_avg * 0.9
        ORDER BY sales_count DESC
        LIMIT 5
      `).all() as any[];

      underpriced.forEach(item => {
        const priceIncrease = Math.round((item.category_avg - item.price) * 0.5);
        const estimatedRevenue = item.sales_count * priceIncrease;

        recommendations.push({
          id: `pricing_${item.id}`,
          category: 'pricing',
          type: 'price_optimization',
          title: `Increase price of ${item.name}`,
          description: `${item.name} is underpriced compared to category average. High demand suggests price elasticity.`,
          impact: estimatedRevenue > 1000 ? 'high' : 'medium',
          effort: 'low',
          priority: this.calculatePriority('high', 'low', 85),
          expected_benefit: `Additional revenue of $${estimatedRevenue}/month`,
          implementation_steps: [
            `Increase price from $${item.price} to $${item.price + priceIncrease}`,
            'Update menu and POS system',
            'Monitor sales volume for 2 weeks',
            'Adjust if sales drop more than 15%'
          ],
          metrics_to_track: ['Sales volume', 'Revenue', 'Customer complaints'],
          estimated_roi: estimatedRevenue * 12,
          confidence: 85,
          data_points: {
            current_price: item.price,
            suggested_price: item.price + priceIncrease,
            category_average: item.category_avg,
            monthly_sales: item.sales_count
          }
        });
      });

      // Dynamic pricing opportunities
      const peakHours = this.db.prepare(`
        SELECT
          strftime('%H', sale_date) as hour,
          COUNT(*) as order_count,
          AVG(total) as avg_total
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
        GROUP BY hour
        HAVING order_count > (SELECT AVG(order_count) FROM (
          SELECT COUNT(*) as order_count
          FROM sales
          WHERE sale_date >= date('now', '-30 days')
          GROUP BY strftime('%H', sale_date)
        ))
        ORDER BY order_count DESC
        LIMIT 3
      `).all() as any[];

      if (peakHours.length > 0) {
        recommendations.push({
          id: 'dynamic_pricing',
          category: 'pricing',
          type: 'dynamic_pricing',
          title: 'Implement peak hour pricing',
          description: 'Increase prices by 10-15% during peak hours when demand is highest',
          impact: 'high',
          effort: 'medium',
          priority: this.calculatePriority('high', 'medium', 75),
          expected_benefit: '8-12% increase in revenue during peak hours',
          implementation_steps: [
            'Configure time-based pricing in POS',
            `Set peak hours: ${peakHours.map(h => h.hour + ':00').join(', ')}`,
            'Apply 10% increase to select items',
            'Communicate change to customers',
            'Monitor customer response'
          ],
          metrics_to_track: ['Peak hour revenue', 'Customer count', 'Average ticket'],
          estimated_roi: 25000,
          confidence: 75,
          data_points: {
            peak_hours: peakHours.map(h => h.hour),
            avg_orders_peak: Math.round(peakHours[0]?.order_count || 0)
          }
        });
      }
    } catch (error) {
      logger.error('Error analyzing pricing opportunities:', error);
    }

    return recommendations;
  }

  // Inventory optimization analysis
  private async analyzeInventoryOptimization(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Overstocked items
      const overstocked = this.db.prepare(`
        SELECT
          p.id,
          p.name,
          p.current_stock,
          p.cost,
          AVG(si.quantity) as daily_sales,
          p.current_stock / NULLIF(AVG(si.quantity), 0) as days_of_stock
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-30 days')
        GROUP BY p.id
        HAVING days_of_stock > 60
        ORDER BY (p.current_stock * p.cost) DESC
        LIMIT 5
      `).all() as any[];

      overstocked.forEach(item => {
        const excessValue = (item.current_stock - (item.daily_sales * 30)) * item.cost;

        recommendations.push({
          id: `inventory_excess_${item.id}`,
          category: 'inventory',
          type: 'stock_reduction',
          title: `Reduce inventory of ${item.name}`,
          description: `Excessive stock levels tying up capital. Current stock will last ${Math.round(item.days_of_stock)} days.`,
          impact: 'medium',
          effort: 'low',
          priority: this.calculatePriority('medium', 'low', 80),
          expected_benefit: `Free up $${Math.round(excessValue)} in working capital`,
          implementation_steps: [
            'Pause or reduce orders for this item',
            'Run promotion to move excess stock',
            'Adjust reorder point to ' + Math.round(item.daily_sales * 14),
            'Monitor stock levels weekly'
          ],
          metrics_to_track: ['Stock levels', 'Cash flow', 'Waste percentage'],
          estimated_roi: excessValue,
          confidence: 80,
          data_points: {
            current_stock: item.current_stock,
            daily_sales: Math.round(item.daily_sales * 10) / 10,
            days_of_stock: Math.round(item.days_of_stock),
            excess_value: Math.round(excessValue)
          }
        });
      });

      // Just-in-time opportunities
      const highTurnover = this.db.prepare(`
        SELECT
          p.id,
          p.name,
          p.reorder_point,
          p.reorder_quantity,
          AVG(si.quantity) as daily_sales,
          COUNT(DISTINCT DATE(s.sale_date)) as active_days
        FROM products p
        JOIN sale_items si ON p.id = si.product_id
        JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-30 days')
        GROUP BY p.id
        HAVING daily_sales > 10
        ORDER BY daily_sales DESC
        LIMIT 3
      `).all() as any[];

      if (highTurnover.length > 0) {
        recommendations.push({
          id: 'jit_inventory',
          category: 'inventory',
          type: 'jit_implementation',
          title: 'Implement just-in-time inventory for high-turnover items',
          description: 'Reduce holding costs by ordering high-turnover items more frequently in smaller quantities',
          impact: 'medium',
          effort: 'medium',
          priority: this.calculatePriority('medium', 'medium', 70),
          expected_benefit: 'Reduce inventory holding costs by 20-30%',
          implementation_steps: [
            'Negotiate daily/bi-daily delivery with suppliers',
            'Reduce order quantities by 50%',
            'Increase order frequency',
            'Set up automatic reordering',
            'Monitor stock-outs closely'
          ],
          metrics_to_track: ['Holding costs', 'Stock-out frequency', 'Waste reduction'],
          estimated_roi: 15000,
          confidence: 70,
          data_points: {
            items_count: highTurnover.length,
            top_items: highTurnover.slice(0, 3).map(i => i.name)
          }
        });
      }
    } catch (error) {
      logger.error('Error analyzing inventory optimization:', error);
    }

    return recommendations;
  }

  // Staffing efficiency analysis
  private async analyzeStaffingEfficiency(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Analyze productivity by hour
      const hourlyProductivity = this.db.prepare(`
        SELECT
          strftime('%H', sale_date) as hour,
          COUNT(DISTINCT user_id) as staff_count,
          COUNT(*) as orders,
          SUM(total) as revenue,
          SUM(total) / COUNT(DISTINCT user_id) as revenue_per_staff
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
        GROUP BY hour
        ORDER BY hour
      `).all() as any[];

      // Find overstaffed periods
      const avgProductivity = hourlyProductivity.reduce((sum, h) => sum + h.revenue_per_staff, 0) / hourlyProductivity.length;
      const overstaffed = hourlyProductivity.filter(h => h.revenue_per_staff < avgProductivity * 0.7);

      if (overstaffed.length > 0) {
        recommendations.push({
          id: 'staffing_optimization',
          category: 'staffing',
          type: 'schedule_optimization',
          title: 'Optimize staff scheduling',
          description: `Reduce staffing during low-productivity hours: ${overstaffed.map(h => h.hour + ':00').join(', ')}`,
          impact: 'high',
          effort: 'low',
          priority: this.calculatePriority('high', 'low', 85),
          expected_benefit: 'Reduce labor costs by 10-15%',
          implementation_steps: [
            'Review current schedules',
            'Reduce staff by 1-2 people during identified hours',
            'Cross-train staff for flexibility',
            'Implement shift-swapping system',
            'Monitor service quality'
          ],
          metrics_to_track: ['Labor cost percentage', 'Service time', 'Customer satisfaction'],
          estimated_roi: 30000,
          confidence: 85,
          data_points: {
            low_productivity_hours: overstaffed.map(h => h.hour),
            potential_savings: overstaffed.length * 15 * 30 * 4 // hours * wage * days * weeks
          }
        });
      }

      // Performance-based recommendations
      const staffPerformance = this.db.prepare(`
        SELECT
          u.id,
          u.username,
          COUNT(s.id) as sales_count,
          SUM(s.total) as total_revenue,
          AVG(s.total) as avg_ticket,
          SUM(s.total) / COUNT(s.id) as revenue_per_sale
        FROM users u
        JOIN sales s ON u.id = s.user_id
        WHERE s.sale_date >= date('now', '-30 days')
          AND u.role IN ('waiter', 'cashier')
        GROUP BY u.id
        ORDER BY total_revenue DESC
      `).all() as any[];

      const topPerformers = staffPerformance.slice(0, 3);
      const avgRevenue = staffPerformance.reduce((sum, s) => sum + s.total_revenue, 0) / staffPerformance.length;

      if (topPerformers.some(p => p.total_revenue > avgRevenue * 1.5)) {
        recommendations.push({
          id: 'performance_training',
          category: 'staffing',
          type: 'training_program',
          title: 'Implement peer training program',
          description: 'Have top performers train other staff to improve overall productivity',
          impact: 'medium',
          effort: 'medium',
          priority: this.calculatePriority('medium', 'medium', 75),
          expected_benefit: '15-20% increase in average sales per employee',
          implementation_steps: [
            'Identify top 3 performers',
            'Document their best practices',
            'Schedule weekly training sessions',
            'Create incentive program',
            'Track improvement metrics'
          ],
          metrics_to_track: ['Sales per employee', 'Average ticket size', 'Upselling rate'],
          estimated_roi: 40000,
          confidence: 75,
          data_points: {
            top_performers: topPerformers.map(p => p.username),
            performance_gap: Math.round((topPerformers[0]?.total_revenue / avgRevenue - 1) * 100)
          }
        });
      }
    } catch (error) {
      logger.error('Error analyzing staffing efficiency:', error);
    }

    return recommendations;
  }

  // Marketing opportunity analysis
  private async analyzeMarketingOpportunities(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Customer retention opportunities
      const customerMetrics = this.db.prepare(`
        SELECT
          COUNT(DISTINCT customer_id) as total_customers,
          COUNT(DISTINCT CASE WHEN visits = 1 THEN customer_id END) as one_time_customers,
          COUNT(DISTINCT CASE WHEN last_visit < date('now', '-30 days') THEN customer_id END) as inactive_customers,
          AVG(lifetime_value) as avg_ltv
        FROM (
          SELECT
            customer_id,
            COUNT(*) as visits,
            MAX(sale_date) as last_visit,
            SUM(total) as lifetime_value
          FROM sales
          WHERE customer_id IS NOT NULL
          GROUP BY customer_id
        )
      `).get() as any;

      const oneTimeRate = (customerMetrics.one_time_customers / customerMetrics.total_customers) * 100;

      if (oneTimeRate > 40) {
        recommendations.push({
          id: 'retention_campaign',
          category: 'marketing',
          type: 'retention_program',
          title: 'Launch customer retention program',
          description: `${Math.round(oneTimeRate)}% of customers never return. Implement retention strategies.`,
          impact: 'very_high',
          effort: 'medium',
          priority: this.calculatePriority('very_high', 'medium', 90),
          expected_benefit: 'Increase customer lifetime value by 30-40%',
          implementation_steps: [
            'Send welcome email with return discount',
            'Implement loyalty points system',
            'Create VIP tier for frequent customers',
            'Set up automated win-back campaigns',
            'Personalize communications'
          ],
          metrics_to_track: ['Return rate', 'Customer lifetime value', 'Retention rate'],
          estimated_roi: 50000,
          confidence: 90,
          data_points: {
            one_time_customers: customerMetrics.one_time_customers,
            potential_ltv: Math.round(customerMetrics.avg_ltv * customerMetrics.one_time_customers * 0.3)
          }
        });
      }

      // Day-of-week opportunities
      const weekdayAnalysis = this.db.prepare(`
        SELECT
          CASE strftime('%w', sale_date)
            WHEN '0' THEN 'Sunday'
            WHEN '1' THEN 'Monday'
            WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday'
            WHEN '4' THEN 'Thursday'
            WHEN '5' THEN 'Friday'
            WHEN '6' THEN 'Saturday'
          END as day_name,
          strftime('%w', sale_date) as day_num,
          COUNT(*) as orders,
          SUM(total) as revenue,
          COUNT(DISTINCT customer_id) as unique_customers
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
        GROUP BY day_num
        ORDER BY revenue
      `).all() as any[];

      const weakestDay = weekdayAnalysis[0];
      const strongestDay = weekdayAnalysis[weekdayAnalysis.length - 1];

      if (weakestDay && strongestDay && weakestDay.revenue < strongestDay.revenue * 0.5) {
        recommendations.push({
          id: 'weekday_promotion',
          category: 'marketing',
          type: 'targeted_promotion',
          title: `Boost ${weakestDay.day_name} sales with targeted promotion`,
          description: `${weakestDay.day_name} has ${Math.round((1 - weakestDay.revenue / strongestDay.revenue) * 100)}% lower revenue than ${strongestDay.day_name}`,
          impact: 'medium',
          effort: 'low',
          priority: this.calculatePriority('medium', 'low', 80),
          expected_benefit: `Increase ${weakestDay.day_name} revenue by 25-35%`,
          implementation_steps: [
            `Create "${weakestDay.day_name} Special" promotion`,
            'Offer 20% discount or BOGO deal',
            'Promote on social media',
            'Send targeted emails on Monday',
            'Partner with local businesses'
          ],
          metrics_to_track: [`${weakestDay.day_name} revenue`, 'Customer count', 'Promotion redemption rate'],
          estimated_roi: 20000,
          confidence: 80,
          data_points: {
            weak_day: weakestDay.day_name,
            weak_day_revenue: Math.round(weakestDay.revenue),
            potential_increase: Math.round(weakestDay.revenue * 0.3)
          }
        });
      }

      // Email marketing opportunity
      const emailCapture = this.db.prepare(`
        SELECT
          COUNT(*) as total_customers,
          COUNT(CASE WHEN email IS NOT NULL AND email != '' THEN 1 END) as with_email,
          COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone
        FROM customers
      `).get() as any;

      const emailRate = (emailCapture.with_email / emailCapture.total_customers) * 100;

      if (emailRate < 60) {
        recommendations.push({
          id: 'email_capture',
          category: 'marketing',
          type: 'data_collection',
          title: 'Improve email capture rate',
          description: `Only ${Math.round(emailRate)}% of customers have email addresses. Missing marketing opportunities.`,
          impact: 'high',
          effort: 'low',
          priority: this.calculatePriority('high', 'low', 85),
          expected_benefit: 'Enable targeted marketing to additional customers',
          implementation_steps: [
            'Train staff to request emails at checkout',
            'Offer incentive for email signup',
            'Add email field to loyalty program',
            'Create WiFi login with email capture',
            'Implement tablet-based feedback system'
          ],
          metrics_to_track: ['Email capture rate', 'Email campaign ROI', 'Customer engagement'],
          estimated_roi: 25000,
          confidence: 85,
          data_points: {
            current_capture_rate: Math.round(emailRate),
            missing_emails: emailCapture.total_customers - emailCapture.with_email
          }
        });
      }
    } catch (error) {
      logger.error('Error analyzing marketing opportunities:', error);
    }

    return recommendations;
  }

  // Operational improvement analysis
  private async analyzeOperationalImprovements(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Payment method optimization
      const paymentAnalysis = this.db.prepare(`
        SELECT
          payment_method,
          COUNT(*) as transaction_count,
          SUM(total) as total_revenue,
          AVG(total) as avg_transaction,
          AVG(julianday(updated_at) - julianday(sale_date)) * 24 * 60 as avg_processing_time
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
        GROUP BY payment_method
        ORDER BY transaction_count DESC
      `).all() as any[];

      const cashTransactions = paymentAnalysis.find(p => p.payment_method === 'cash');
      const totalTransactions = paymentAnalysis.reduce((sum, p) => sum + p.transaction_count, 0);

      if (cashTransactions && (cashTransactions.transaction_count / totalTransactions) > 0.5) {
        recommendations.push({
          id: 'digital_payments',
          category: 'operations',
          type: 'payment_optimization',
          title: 'Promote digital payment methods',
          description: 'High cash usage increases processing time and security risks',
          impact: 'medium',
          effort: 'low',
          priority: this.calculatePriority('medium', 'low', 75),
          expected_benefit: 'Reduce transaction time by 30%, improve security',
          implementation_steps: [
            'Offer 2% discount for card payments',
            'Implement QR code payments',
            'Add contactless payment options',
            'Train staff on payment benefits',
            'Display payment option signs'
          ],
          metrics_to_track: ['Digital payment rate', 'Transaction processing time', 'Cash handling errors'],
          estimated_roi: 10000,
          confidence: 75,
          data_points: {
            cash_percentage: Math.round((cashTransactions.transaction_count / totalTransactions) * 100),
            avg_cash_time: Math.round(cashTransactions.avg_processing_time)
          }
        });
      }

      // Table turnover optimization
      const tableAnalysis = this.db.prepare(`
        SELECT
          AVG(duration_minutes) as avg_duration,
          COUNT(*) as total_services,
          AVG(total) as avg_revenue
        FROM (
          SELECT
            table_number,
            MIN(sale_date) as start_time,
            MAX(updated_at) as end_time,
            (julianday(MAX(updated_at)) - julianday(MIN(sale_date))) * 24 * 60 as duration_minutes,
            SUM(total) as total
          FROM sales
          WHERE table_number IS NOT NULL
            AND sale_date >= date('now', '-30 days')
          GROUP BY table_number, DATE(sale_date)
        )
      `).get() as any;

      if (tableAnalysis && tableAnalysis.avg_duration > 60) {
        recommendations.push({
          id: 'table_turnover',
          category: 'operations',
          type: 'service_optimization',
          title: 'Improve table turnover rate',
          description: `Average table time is ${Math.round(tableAnalysis.avg_duration)} minutes. Reducing by 15 minutes could increase capacity.`,
          impact: 'high',
          effort: 'medium',
          priority: this.calculatePriority('high', 'medium', 80),
          expected_benefit: 'Increase daily covers by 20-25%',
          implementation_steps: [
            'Pre-print check when clearing plates',
            'Optimize kitchen workflow',
            'Implement reservation time limits',
            'Train staff on efficient service',
            'Add express lunch menu'
          ],
          metrics_to_track: ['Table turnover rate', 'Average service time', 'Daily covers'],
          estimated_roi: 35000,
          confidence: 80,
          data_points: {
            current_avg_duration: Math.round(tableAnalysis.avg_duration),
            target_duration: Math.round(tableAnalysis.avg_duration * 0.75),
            potential_extra_covers: Math.round(tableAnalysis.total_services * 0.25)
          }
        });
      }

      // Waste reduction
      const wasteEstimate = this.db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'cancelled' THEN total END) as cancelled_amount,
          SUM(CASE WHEN status = 'refunded' THEN total END) as refunded_amount,
          SUM(total) as total_revenue
        FROM sales
        WHERE sale_date >= date('now', '-30 days')
      `).get() as any;

      const wastePercentage = ((wasteEstimate.cancelled_amount + wasteEstimate.refunded_amount) / wasteEstimate.total_revenue) * 100;

      if (wastePercentage > 3) {
        recommendations.push({
          id: 'waste_reduction',
          category: 'operations',
          type: 'cost_reduction',
          title: 'Implement waste reduction program',
          description: `Current waste/cancellation rate is ${Math.round(wastePercentage)}% of revenue`,
          impact: 'medium',
          effort: 'medium',
          priority: this.calculatePriority('medium', 'medium', 70),
          expected_benefit: 'Reduce waste costs by 40-50%',
          implementation_steps: [
            'Track waste by category daily',
            'Implement portion control',
            'Improve demand forecasting',
            'Train staff on waste prevention',
            'Create staff meal program for near-expiry items'
          ],
          metrics_to_track: ['Waste percentage', 'Food cost percentage', 'Cancellation rate'],
          estimated_roi: 18000,
          confidence: 70,
          data_points: {
            current_waste_rate: Math.round(wastePercentage),
            monthly_waste_value: Math.round((wasteEstimate.cancelled_amount + wasteEstimate.refunded_amount))
          }
        });
      }
    } catch (error) {
      logger.error('Error analyzing operational improvements:', error);
    }

    return recommendations;
  }

  // Menu optimization analysis
  private async analyzeMenuOptimization(): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    try {
      // Dead menu items
      const deadItems = this.db.prepare(`
        SELECT
          p.id,
          p.name,
          p.category,
          p.price,
          COALESCE(recent.sales_count, 0) as recent_sales
        FROM products p
        LEFT JOIN (
          SELECT product_id, COUNT(*) as sales_count
          FROM sale_items si
          JOIN sales s ON si.sale_id = s.id
          WHERE s.sale_date >= date('now', '-30 days')
          GROUP BY product_id
        ) recent ON p.id = recent.product_id
        WHERE p.active = 1
          AND (recent.sales_count IS NULL OR recent.sales_count < 5)
        ORDER BY p.price DESC
        LIMIT 10
      `).all() as any[];

      if (deadItems.length > 5) {
        recommendations.push({
          id: 'menu_cleanup',
          category: 'menu',
          type: 'menu_optimization',
          title: 'Remove underperforming menu items',
          description: `${deadItems.length} items have less than 5 sales in the past month`,
          impact: 'medium',
          effort: 'low',
          priority: this.calculatePriority('medium', 'low', 80),
          expected_benefit: 'Simplify operations, reduce inventory complexity',
          implementation_steps: [
            'Review list of dead items with chef',
            'Remove or revamp bottom 50%',
            'Update menu and POS',
            'Use space for new seasonal items',
            'Reduce ingredient inventory'
          ],
          metrics_to_track: ['Menu item count', 'Inventory turns', 'Kitchen efficiency'],
          estimated_roi: 8000,
          confidence: 80,
          data_points: {
            dead_items_count: deadItems.length,
            items_to_remove: deadItems.slice(0, 5).map(i => i.name)
          }
        });
      }

      // Cross-selling opportunities
      const itemPairs = this.db.prepare(`
        SELECT
          p1.name as item1,
          p2.name as item2,
          COUNT(*) as frequency,
          p1.category as cat1,
          p2.category as cat2
        FROM sale_items si1
        JOIN sale_items si2 ON si1.sale_id = si2.sale_id AND si1.product_id < si2.product_id
        JOIN products p1 ON si1.product_id = p1.id
        JOIN products p2 ON si2.product_id = p2.id
        JOIN sales s ON si1.sale_id = s.id
        WHERE s.sale_date >= date('now', '-30 days')
          AND p1.category != p2.category
        GROUP BY si1.product_id, si2.product_id
        HAVING frequency > 20
        ORDER BY frequency DESC
        LIMIT 5
      `).all() as any[];

      if (itemPairs.length > 0) {
        recommendations.push({
          id: 'cross_selling',
          category: 'menu',
          type: 'bundling_opportunity',
          title: 'Create combo meals from popular pairings',
          description: 'Customers frequently order these items together - create official combos',
          impact: 'medium',
          effort: 'low',
          priority: this.calculatePriority('medium', 'low', 75),
          expected_benefit: 'Increase average ticket by 15-20%',
          implementation_steps: [
            'Create combo pricing (10% discount)',
            'Train staff to suggest combos',
            'Feature combos prominently on menu',
            'Add combo buttons to POS',
            'Track combo vs separate sales'
          ],
          metrics_to_track: ['Combo sales rate', 'Average ticket size', 'Item attachment rate'],
          estimated_roi: 22000,
          confidence: 75,
          data_points: {
            top_pairs: itemPairs.slice(0, 3).map(p => `${p.item1} + ${p.item2}`),
            pairing_frequency: itemPairs[0]?.frequency || 0
          }
        });
      }
    } catch (error) {
      logger.error('Error analyzing menu optimization:', error);
    }

    return recommendations;
  }

  // Calculate priority score
  private calculatePriority(impact: string, effort: string, confidence: number): number {
    const impactScores = {
      low: 1,
      medium: 2,
      high: 3,
      very_high: 4
    };

    const effortScores = {
      low: 3,
      medium: 2,
      high: 1
    };

    const impactScore = impactScores[impact as keyof typeof impactScores] || 1;
    const effortScore = effortScores[effort as keyof typeof effortScores] || 1;

    return Math.round((impactScore * effortScore * confidence) / 10);
  }

  // Get personalized recommendations for a specific area
  async getTargetedRecommendations(area: string): Promise<Recommendation[]> {
    try {
      const allRecommendations = await this.generateRecommendations();

      return allRecommendations.filter(rec =>
        rec.category === area ||
        rec.type.includes(area.toLowerCase())
      );
    } catch (error) {
      logger.error('Error getting targeted recommendations:', error);
      throw error;
    }
  }

  // Track recommendation implementation
  async trackImplementation(recommendationId: string, status: 'started' | 'completed' | 'cancelled'): Promise<void> {
    try {
      // In a real system, this would update a recommendations tracking table
      logger.info(`Recommendation ${recommendationId} status updated to: ${status}`);
    } catch (error) {
      logger.error('Error tracking recommendation implementation:', error);
    }
  }
}