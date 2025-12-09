// RFM (Recency, Frequency, Monetary) Customer Analysis Service
import { Database } from 'better-sqlite3';
import { getDB } from '../../../config/database.js';
import logger from '../../../config/logger.js';

interface CustomerRFM {
  customer_id: number;
  customer_name: string;
  email: string;
  phone: string;
  recency_days: number;
  frequency: number;
  monetary_value: number;
  recency_score: number;
  frequency_score: number;
  monetary_score: number;
  rfm_score: number;
  segment: string;
  lifetime_value: number;
  churn_probability: number;
  recommendations: string[];
}

interface SegmentAnalysis {
  segment: string;
  customer_count: number;
  average_value: number;
  total_revenue: number;
  percentage_of_base: number;
  characteristics: string[];
  marketing_strategy: string[];
}

export class RFMAnalysisService {
  private db: Database;

  constructor() {
    this.db = getDB();
  }

  // Main RFM analysis
  async analyzeCustomers(): Promise<CustomerRFM[]> {
    try {
      // Get customer transaction data
      const query = `
        SELECT
          c.id as customer_id,
          c.name as customer_name,
          c.email,
          c.phone,
          julianday('now') - julianday(MAX(s.sale_date)) as recency_days,
          COUNT(DISTINCT s.id) as frequency,
          SUM(s.total) as monetary_value,
          MIN(s.sale_date) as first_purchase,
          MAX(s.sale_date) as last_purchase,
          AVG(s.total) as avg_order_value,
          COUNT(DISTINCT DATE(s.sale_date)) as active_days
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        WHERE s.status = 'completed'
          AND s.sale_date >= date('now', '-365 days')
        GROUP BY c.id
        HAVING frequency > 0
        ORDER BY monetary_value DESC
      `;

      const customers = this.db.prepare(query).all() as any[];

      if (customers.length === 0) {
        return [];
      }

      // Calculate RFM scores
      const rfmAnalysis = this.calculateRFMScores(customers);

      // Add advanced metrics
      return rfmAnalysis.map(customer => {
        const segment = this.determineSegment(
          customer.recency_score,
          customer.frequency_score,
          customer.monetary_score
        );

        const lifetimeValue = this.calculateLifetimeValue(customer);
        const churnProbability = this.calculateChurnProbability(customer);
        const recommendations = this.generateCustomerRecommendations(segment, customer);

        return {
          ...customer,
          segment,
          lifetime_value: Math.round(lifetimeValue),
          churn_probability: Math.round(churnProbability * 100),
          recommendations
        };
      });
    } catch (error) {
      logger.error('Error analyzing customers:', error);
      throw error;
    }
  }

  // Segment analysis
  async analyzeSegments(): Promise<SegmentAnalysis[]> {
    try {
      const customers = await this.analyzeCustomers();
      const totalCustomers = customers.length;

      // Group by segment
      const segments = new Map<string, CustomerRFM[]>();
      customers.forEach(customer => {
        if (!segments.has(customer.segment)) {
          segments.set(customer.segment, []);
        }
        segments.get(customer.segment)!.push(customer);
      });

      const segmentAnalysis: SegmentAnalysis[] = [];

      segments.forEach((segmentCustomers, segmentName) => {
        const totalRevenue = segmentCustomers.reduce((sum, c) => sum + c.monetary_value, 0);
        const avgValue = totalRevenue / segmentCustomers.length;

        segmentAnalysis.push({
          segment: segmentName,
          customer_count: segmentCustomers.length,
          average_value: Math.round(avgValue),
          total_revenue: Math.round(totalRevenue),
          percentage_of_base: Math.round((segmentCustomers.length / totalCustomers) * 100),
          characteristics: this.getSegmentCharacteristics(segmentName),
          marketing_strategy: this.getSegmentStrategy(segmentName)
        });
      });

      return segmentAnalysis.sort((a, b) => b.total_revenue - a.total_revenue);
    } catch (error) {
      logger.error('Error analyzing segments:', error);
      throw error;
    }
  }

  // Churn prediction
  async predictChurn(): Promise<any[]> {
    try {
      const customers = await this.analyzeCustomers();

      const atRiskCustomers = customers
        .filter(c => c.churn_probability > 60)
        .sort((a, b) => b.lifetime_value - a.lifetime_value)
        .slice(0, 20)
        .map(customer => {
          const preventionStrategies = this.getChurnPreventionStrategies(customer);

          return {
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            email: customer.email,
            churn_probability: customer.churn_probability,
            lifetime_value: customer.lifetime_value,
            last_visit_days: Math.round(customer.recency_days),
            risk_level: customer.churn_probability > 80 ? 'critical' :
                       customer.churn_probability > 60 ? 'high' : 'medium',
            prevention_strategies: preventionStrategies,
            estimated_loss: Math.round(customer.lifetime_value * 0.3)
          };
        });

      return atRiskCustomers;
    } catch (error) {
      logger.error('Error predicting churn:', error);
      throw error;
    }
  }

  // Customer retention campaigns
  async getRetentionCampaigns(): Promise<any[]> {
    try {
      const segments = await this.analyzeSegments();
      const customers = await this.analyzeCustomers();

      const campaigns = [
        {
          name: 'Win Back Lost Customers',
          target_segment: 'Lost',
          customer_count: segments.find(s => s.segment === 'Lost')?.customer_count || 0,
          strategy: 'Re-engagement with special offers',
          recommended_offer: '30% off return visit',
          expected_response_rate: 15,
          estimated_revenue: this.estimateCampaignRevenue('Lost', customers, 0.15)
        },
        {
          name: 'VIP Appreciation',
          target_segment: 'Champions',
          customer_count: segments.find(s => s.segment === 'Champions')?.customer_count || 0,
          strategy: 'Exclusive perks and early access',
          recommended_offer: 'VIP membership with benefits',
          expected_response_rate: 60,
          estimated_revenue: this.estimateCampaignRevenue('Champions', customers, 0.60)
        },
        {
          name: 'Reactivation Campaign',
          target_segment: 'At Risk',
          customer_count: segments.find(s => s.segment === 'At Risk')?.customer_count || 0,
          strategy: 'Personalized incentives',
          recommended_offer: 'Free appetizer on next visit',
          expected_response_rate: 25,
          estimated_revenue: this.estimateCampaignRevenue('At Risk', customers, 0.25)
        },
        {
          name: 'Frequency Booster',
          target_segment: 'Potential Loyalists',
          customer_count: segments.find(s => s.segment === 'Potential Loyalists')?.customer_count || 0,
          strategy: 'Visit frequency rewards',
          recommended_offer: 'Buy 3 get 1 free program',
          expected_response_rate: 35,
          estimated_revenue: this.estimateCampaignRevenue('Potential Loyalists', customers, 0.35)
        }
      ];

      return campaigns.filter(c => c.customer_count > 0)
        .sort((a, b) => b.estimated_revenue - a.estimated_revenue);
    } catch (error) {
      logger.error('Error generating retention campaigns:', error);
      throw error;
    }
  }

  // Next best action recommendations
  async getNextBestActions(customerId: number): Promise<any> {
    try {
      const customerQuery = `
        SELECT
          c.*,
          julianday('now') - julianday(MAX(s.sale_date)) as days_since_last_visit,
          COUNT(DISTINCT s.id) as total_visits,
          SUM(s.total) as total_spent,
          AVG(s.total) as avg_order_value,
          GROUP_CONCAT(DISTINCT p.category) as purchased_categories
        FROM customers c
        LEFT JOIN sales s ON c.id = s.customer_id
        LEFT JOIN sale_items si ON s.id = si.sale_id
        LEFT JOIN products p ON si.product_id = p.id
        WHERE c.id = ?
          AND s.status = 'completed'
        GROUP BY c.id
      `;

      const customer = this.db.prepare(customerQuery).get(customerId) as any;

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Analyze customer behavior
      const rfmAnalysis = await this.analyzeCustomers();
      const customerRFM = rfmAnalysis.find(c => c.customer_id === customerId);

      if (!customerRFM) {
        throw new Error('Customer RFM analysis not available');
      }

      // Generate personalized actions
      const actions = [];

      // Based on recency
      if (customer.days_since_last_visit > 30) {
        actions.push({
          action: 'Send win-back offer',
          priority: 'high',
          channel: 'email',
          message: 'We miss you! Here\'s 20% off your next visit',
          expected_impact: 'High chance of reactivation'
        });
      } else if (customer.days_since_last_visit > 14) {
        actions.push({
          action: 'Send reminder',
          priority: 'medium',
          channel: 'sms',
          message: 'Your favorite items are waiting',
          expected_impact: 'Maintain engagement'
        });
      }

      // Based on frequency
      if (customer.total_visits > 10) {
        actions.push({
          action: 'Offer loyalty membership',
          priority: 'high',
          channel: 'in-app',
          message: 'Unlock VIP benefits',
          expected_impact: 'Increase retention and LTV'
        });
      }

      // Based on monetary value
      if (customer.avg_order_value > 50) {
        actions.push({
          action: 'Upsell premium items',
          priority: 'medium',
          channel: 'personalized menu',
          message: 'Recommended premium selections',
          expected_impact: 'Increase average order value'
        });
      }

      // Product recommendations
      const recommendations = await this.getProductRecommendations(customerId);

      return {
        customer_id: customerId,
        customer_name: customer.name,
        segment: customerRFM.segment,
        rfm_score: customerRFM.rfm_score,
        days_since_last_visit: Math.round(customer.days_since_last_visit),
        total_visits: customer.total_visits,
        lifetime_value: customerRFM.lifetime_value,
        next_best_actions: actions,
        product_recommendations: recommendations.slice(0, 5),
        engagement_score: this.calculateEngagementScore(customer),
        predicted_next_visit: this.predictNextVisit(customer)
      };
    } catch (error) {
      logger.error('Error getting next best actions:', error);
      throw error;
    }
  }

  // Helper methods
  private calculateRFMScores(customers: any[]): CustomerRFM[] {
    // Sort and assign scores using quintiles
    const recencySort = [...customers].sort((a, b) => a.recency_days - b.recency_days);
    const frequencySort = [...customers].sort((a, b) => b.frequency - a.frequency);
    const monetarySort = [...customers].sort((a, b) => b.monetary_value - a.monetary_value);

    const quintileSize = Math.ceil(customers.length / 5);

    return customers.map(customer => {
      // Recency: lower is better (5 = most recent)
      const recencyIndex = recencySort.findIndex(c => c.customer_id === customer.customer_id);
      const recencyScore = 5 - Math.floor(recencyIndex / quintileSize);

      // Frequency: higher is better
      const frequencyIndex = frequencySort.findIndex(c => c.customer_id === customer.customer_id);
      const frequencyScore = 5 - Math.floor(frequencyIndex / quintileSize);

      // Monetary: higher is better
      const monetaryIndex = monetarySort.findIndex(c => c.customer_id === customer.customer_id);
      const monetaryScore = 5 - Math.floor(monetaryIndex / quintileSize);

      const rfmScore = (recencyScore + frequencyScore + monetaryScore) / 3;

      return {
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        email: customer.email,
        phone: customer.phone,
        recency_days: Math.round(customer.recency_days),
        frequency: customer.frequency,
        monetary_value: Math.round(customer.monetary_value),
        recency_score: Math.max(1, Math.min(5, recencyScore)),
        frequency_score: Math.max(1, Math.min(5, frequencyScore)),
        monetary_score: Math.max(1, Math.min(5, monetaryScore)),
        rfm_score: Math.round(rfmScore * 10) / 10,
        segment: '', // Will be filled later
        lifetime_value: 0,
        churn_probability: 0,
        recommendations: []
      };
    });
  }

  private determineSegment(r: number, f: number, m: number): string {
    const rfmString = `${r}${f}${m}`;

    // Segment mapping based on RFM scores
    if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
    if (r >= 3 && f >= 4 && m >= 4) return 'Loyal Customers';
    if (r >= 4 && f >= 2 && m >= 2) return 'Potential Loyalists';
    if (r >= 4 && f <= 2) return 'New Customers';
    if (r >= 3 && f >= 3 && m >= 3) return 'Promising';
    if (r === 3 && f <= 2 && m <= 2) return 'Need Attention';
    if (r === 2 && f >= 2 && m >= 2) return 'About to Sleep';
    if (r <= 2 && f >= 4 && m >= 4) return 'At Risk';
    if (r <= 2 && f === 2 && m === 2) return 'Hibernating';
    if (r <= 2 && f <= 2 && m >= 4) return 'Cannot Lose Them';
    if (r <= 2 && f <= 2 && m <= 2) return 'Lost';

    return 'Other';
  }

  private calculateLifetimeValue(customer: any): number {
    // Simple CLV calculation
    const avgOrderValue = customer.monetary_value / customer.frequency;
    const purchaseFrequency = customer.frequency / 12; // Monthly frequency
    const customerLifespan = 36; // Assume 3 years

    return avgOrderValue * purchaseFrequency * customerLifespan;
  }

  private calculateChurnProbability(customer: any): number {
    let probability = 0;

    // Recency impact (40% weight)
    if (customer.recency_days > 60) probability += 0.4;
    else if (customer.recency_days > 30) probability += 0.25;
    else if (customer.recency_days > 14) probability += 0.1;

    // Frequency impact (30% weight)
    if (customer.frequency === 1) probability += 0.3;
    else if (customer.frequency <= 3) probability += 0.15;
    else if (customer.frequency <= 5) probability += 0.05;

    // RFM score impact (30% weight)
    if (customer.rfm_score < 2) probability += 0.3;
    else if (customer.rfm_score < 3) probability += 0.15;
    else if (customer.rfm_score < 4) probability += 0.05;

    return Math.min(1, probability);
  }

  private generateCustomerRecommendations(segment: string, customer: any): string[] {
    const recommendations: string[] = [];

    switch (segment) {
      case 'Champions':
        recommendations.push('Offer VIP membership');
        recommendations.push('Early access to new items');
        recommendations.push('Personal thank you note');
        break;

      case 'At Risk':
        recommendations.push('Send win-back campaign immediately');
        recommendations.push('Offer significant discount');
        recommendations.push('Personal outreach from manager');
        break;

      case 'New Customers':
        recommendations.push('Welcome series emails');
        recommendations.push('First-time buyer discount for next visit');
        recommendations.push('Product education content');
        break;

      case 'Cannot Lose Them':
        recommendations.push('Urgent reactivation required');
        recommendations.push('Survey to understand issues');
        recommendations.push('Exclusive comeback offer');
        break;

      default:
        recommendations.push('Standard marketing campaigns');
        recommendations.push('Monitor behavior changes');
    }

    return recommendations;
  }

  private getSegmentCharacteristics(segment: string): string[] {
    const characteristics: Record<string, string[]> = {
      'Champions': ['Best customers', 'Buy frequently', 'High spenders', 'Recent purchases'],
      'Loyal Customers': ['Spend good money', 'Responsive to promotions', 'Buy regularly'],
      'Potential Loyalists': ['Recent customers', 'Spent good amount', 'Bought more than once'],
      'New Customers': ['Recently acquired', 'Low frequency', 'Need nurturing'],
      'At Risk': ['Were great customers', 'Haven\'t purchased lately', 'High churn risk'],
      'Cannot Lose Them': ['Made big purchases', 'Long time ago', 'Critical to win back'],
      'Lost': ['Lowest recency, frequency, monetary', 'May be gone forever']
    };

    return characteristics[segment] || ['Standard customer segment'];
  }

  private getSegmentStrategy(segment: string): string[] {
    const strategies: Record<string, string[]> = {
      'Champions': [
        'Reward them',
        'Make them advocates',
        'Exclusive previews',
        'VIP treatment'
      ],
      'Loyal Customers': [
        'Upsell higher value products',
        'Ask for reviews',
        'Engage in loyalty programs'
      ],
      'Potential Loyalists': [
        'Offer membership',
        'Recommend products',
        'Increase engagement'
      ],
      'New Customers': [
        'Provide onboarding support',
        'Give special offers',
        'Build relationship'
      ],
      'At Risk': [
        'Send personalized emails',
        'Offer special discounts',
        'Reconnect with them'
      ],
      'Cannot Lose Them': [
        'Win them back',
        'Talk to them',
        'Make them special offers',
        'Survey for feedback'
      ],
      'Lost': [
        'Revive interest',
        'Reach out',
        'Ignore if low value'
      ]
    };

    return strategies[segment] || ['Monitor and engage'];
  }

  private getChurnPreventionStrategies(customer: any): string[] {
    const strategies: string[] = [];

    if (customer.recency_days > 45) {
      strategies.push('Immediate win-back email with 25% discount');
    }

    if (customer.lifetime_value > 1000) {
      strategies.push('Personal call from customer success');
      strategies.push('VIP status upgrade offer');
    }

    if (customer.frequency > 5) {
      strategies.push('Loyalty points bonus');
      strategies.push('Exclusive event invitation');
    }

    strategies.push('Feedback survey to understand concerns');
    strategies.push('Surprise and delight campaign');

    return strategies;
  }

  private async getProductRecommendations(customerId: number): Promise<any[]> {
    try {
      // Get customer's purchase history
      const query = `
        SELECT
          p.id,
          p.name,
          p.category,
          COUNT(*) as purchase_count
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        JOIN products p ON si.product_id = p.id
        WHERE s.customer_id = ?
          AND s.status = 'completed'
        GROUP BY p.id
        ORDER BY purchase_count DESC
        LIMIT 10
      `;

      const purchases = this.db.prepare(query).all(customerId) as any[];

      // Get popular items not purchased by customer
      const recommendQuery = `
        SELECT
          p.id,
          p.name,
          p.category,
          COUNT(DISTINCT s.customer_id) as customer_count
        FROM products p
        JOIN sale_items si ON p.id = si.product_id
        JOIN sales s ON si.sale_id = s.id
        WHERE p.id NOT IN (
          SELECT DISTINCT product_id
          FROM sale_items si2
          JOIN sales s2 ON si2.sale_id = s2.id
          WHERE s2.customer_id = ?
        )
        AND p.category IN (
          SELECT DISTINCT p2.category
          FROM products p2
          JOIN sale_items si3 ON p2.id = si3.product_id
          JOIN sales s3 ON si3.sale_id = s3.id
          WHERE s3.customer_id = ?
        )
        GROUP BY p.id
        ORDER BY customer_count DESC
        LIMIT 10
      `;

      const recommendations = this.db.prepare(recommendQuery).all(customerId, customerId) as any[];

      return recommendations.map(item => ({
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        confidence: Math.min(95, Math.round(item.customer_count / 10 * 100))
      }));
    } catch (error) {
      logger.error('Error getting product recommendations:', error);
      return [];
    }
  }

  private estimateCampaignRevenue(segment: string, customers: CustomerRFM[], responseRate: number): number {
    const segmentCustomers = customers.filter(c => c.segment === segment);
    const avgValue = segmentCustomers.reduce((sum, c) => sum + c.monetary_value, 0) /
                     (segmentCustomers.length || 1);
    return Math.round(segmentCustomers.length * responseRate * avgValue * 0.3);
  }

  private calculateEngagementScore(customer: any): number {
    let score = 0;

    // Frequency contribution
    if (customer.total_visits > 20) score += 40;
    else if (customer.total_visits > 10) score += 30;
    else if (customer.total_visits > 5) score += 20;
    else score += 10;

    // Recency contribution
    if (customer.days_since_last_visit < 7) score += 30;
    else if (customer.days_since_last_visit < 14) score += 20;
    else if (customer.days_since_last_visit < 30) score += 10;

    // Value contribution
    if (customer.avg_order_value > 100) score += 30;
    else if (customer.avg_order_value > 50) score += 20;
    else if (customer.avg_order_value > 25) score += 10;

    return Math.min(100, score);
  }

  private predictNextVisit(customer: any): string {
    // Simple prediction based on average days between visits
    const avgDaysBetween = customer.days_since_last_visit / customer.total_visits;
    const predictedDays = Math.round(avgDaysBetween);
    const nextVisitDate = new Date();
    nextVisitDate.setDate(nextVisitDate.getDate() + predictedDays);

    return nextVisitDate.toISOString().split('T')[0];
  }
}