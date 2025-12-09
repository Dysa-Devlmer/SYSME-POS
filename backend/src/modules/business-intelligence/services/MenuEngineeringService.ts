// Menu Engineering Service - BCG Matrix Analysis
import { Database } from 'better-sqlite3';
import { getDB } from '../../../config/database.js';
import logger from '../../../config/logger.js';

interface MenuItemAnalysis {
  product_id: number;
  product_name: string;
  category: string;
  classification: 'star' | 'puzzle' | 'plow_horse' | 'dog';
  profitability: number;
  popularity: number;
  profit_margin: number;
  sales_volume: number;
  revenue_contribution: number;
  recommendations: string[];
  price_elasticity: number;
}

interface CategoryAnalysis {
  category: string;
  total_revenue: number;
  total_profit: number;
  average_margin: number;
  item_count: number;
  performance_score: number;
  recommendations: string[];
}

export class MenuEngineeringService {
  private db: Database;

  constructor() {
    this.db = getDB();
  }

  // BCG Matrix analysis for menu items
  async analyzeMenuItems(period_days: number = 30): Promise<MenuItemAnalysis[]> {
    try {
      // Get sales data for all menu items
      const query = `
        SELECT
          p.id as product_id,
          p.name as product_name,
          p.category,
          p.price,
          p.cost,
          COUNT(DISTINCT si.sale_id) as sales_count,
          SUM(si.quantity) as units_sold,
          SUM(si.quantity * si.price) as revenue,
          SUM(si.quantity * (si.price - COALESCE(p.cost, 0))) as profit,
          AVG(si.quantity) as avg_quantity_per_sale
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-' || ? || ' days')
          AND s.status = 'completed'
        GROUP BY p.id, p.name, p.category
        ORDER BY revenue DESC
      `;

      const menuItems = this.db.prepare(query).all(period_days) as any[];

      // Calculate totals and averages
      const totalRevenue = menuItems.reduce((sum, item) => sum + (item.revenue || 0), 0);
      const totalProfit = menuItems.reduce((sum, item) => sum + (item.profit || 0), 0);
      const avgUnitsSold = menuItems.reduce((sum, item) => sum + (item.units_sold || 0), 0) / menuItems.length;
      const avgProfit = totalProfit / menuItems.length;

      // Analyze each item using BCG Matrix
      const analysis: MenuItemAnalysis[] = menuItems.map(item => {
        const profitMargin = item.cost > 0 ? (item.price - item.cost) / item.price : 0;
        const profitability = item.profit / (avgProfit || 1);
        const popularity = (item.units_sold || 0) / (avgUnitsSold || 1);
        const revenueContribution = (item.revenue || 0) / (totalRevenue || 1);

        // Classify using BCG Matrix
        let classification: 'star' | 'puzzle' | 'plow_horse' | 'dog';
        if (profitability >= 1 && popularity >= 1) {
          classification = 'star';
        } else if (profitability >= 1 && popularity < 1) {
          classification = 'puzzle';
        } else if (profitability < 1 && popularity >= 1) {
          classification = 'plow_horse';
        } else {
          classification = 'dog';
        }

        // Calculate price elasticity (simplified)
        const priceElasticity = this.calculatePriceElasticity(item.product_id, item.price);

        // Generate recommendations
        const recommendations = this.generateItemRecommendations(
          classification,
          profitMargin,
          popularity,
          priceElasticity
        );

        return {
          product_id: item.product_id,
          product_name: item.product_name,
          category: item.category,
          classification,
          profitability: Math.round(profitability * 100) / 100,
          popularity: Math.round(popularity * 100) / 100,
          profit_margin: Math.round(profitMargin * 100),
          sales_volume: item.units_sold || 0,
          revenue_contribution: Math.round(revenueContribution * 10000) / 100,
          recommendations,
          price_elasticity: Math.round(priceElasticity * 100) / 100
        };
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing menu items:', error);
      throw error;
    }
  }

  // Analyze menu categories performance
  async analyzeCategoryPerformance(): Promise<CategoryAnalysis[]> {
    try {
      const query = `
        SELECT
          p.category,
          COUNT(DISTINCT p.id) as item_count,
          SUM(si.quantity * si.price) as total_revenue,
          SUM(si.quantity * (si.price - COALESCE(p.cost, 0))) as total_profit,
          AVG((si.price - COALESCE(p.cost, 0)) / si.price) as avg_margin,
          COUNT(DISTINCT s.id) as transaction_count
        FROM products p
        LEFT JOIN sale_items si ON p.id = si.product_id
        LEFT JOIN sales s ON si.sale_id = s.id
        WHERE s.sale_date >= date('now', '-30 days')
          AND s.status = 'completed'
        GROUP BY p.category
        ORDER BY total_revenue DESC
      `;

      const categories = this.db.prepare(query).all() as any[];

      const totalRevenue = categories.reduce((sum, cat) => sum + (cat.total_revenue || 0), 0);

      return categories.map(category => {
        const performanceScore = this.calculateCategoryPerformance(
          category.total_revenue,
          category.total_profit,
          category.avg_margin,
          totalRevenue
        );

        const recommendations = this.generateCategoryRecommendations(
          category.category,
          performanceScore,
          category.avg_margin
        );

        return {
          category: category.category,
          total_revenue: Math.round(category.total_revenue || 0),
          total_profit: Math.round(category.total_profit || 0),
          average_margin: Math.round((category.avg_margin || 0) * 100),
          item_count: category.item_count,
          performance_score: Math.round(performanceScore),
          recommendations
        };
      });
    } catch (error) {
      logger.error('Error analyzing category performance:', error);
      throw error;
    }
  }

  // Get optimal price recommendations
  async getOptimalPriceRecommendations(): Promise<any[]> {
    try {
      const menuAnalysis = await this.analyzeMenuItems(60);

      const priceRecommendations = menuAnalysis
        .filter(item => item.classification !== 'star') // Don't touch stars
        .map(item => {
          let suggestedAction = '';
          let suggestedPrice = 0;
          let expectedImpact = '';

          switch (item.classification) {
            case 'puzzle':
              // High profit, low popularity - consider price reduction
              if (item.price_elasticity > 1.2) {
                suggestedAction = 'reduce_price';
                suggestedPrice = this.calculateOptimalPrice(item.product_id, 'reduce');
                expectedImpact = 'Increase sales volume by 15-25%';
              } else {
                suggestedAction = 'improve_visibility';
                expectedImpact = 'Increase awareness through promotion';
              }
              break;

            case 'plow_horse':
              // Low profit, high popularity - increase price slightly
              if (item.price_elasticity < 0.8) {
                suggestedAction = 'increase_price';
                suggestedPrice = this.calculateOptimalPrice(item.product_id, 'increase');
                expectedImpact = 'Improve margin by 10-15%';
              } else {
                suggestedAction = 'reduce_portion';
                expectedImpact = 'Reduce costs while maintaining price';
              }
              break;

            case 'dog':
              // Low profit, low popularity - consider removal or revamp
              suggestedAction = 'remove_or_revamp';
              expectedImpact = 'Free up menu space for better items';
              break;
          }

          return {
            product_id: item.product_id,
            product_name: item.product_name,
            current_classification: item.classification,
            suggested_action: suggestedAction,
            current_price: this.getCurrentPrice(item.product_id),
            suggested_price: suggestedPrice,
            expected_impact: expectedImpact,
            priority: this.calculatePriority(item)
          };
        })
        .filter(rec => rec.suggested_action !== '')
        .sort((a, b) => b.priority - a.priority);

      return priceRecommendations;
    } catch (error) {
      logger.error('Error generating price recommendations:', error);
      throw error;
    }
  }

  // Combo and bundle recommendations
  async getComboRecommendations(): Promise<any[]> {
    try {
      // Find frequently bought together items
      const query = `
        WITH item_pairs AS (
          SELECT
            si1.product_id as product1_id,
            si2.product_id as product2_id,
            p1.name as product1_name,
            p2.name as product2_name,
            p1.category as category1,
            p2.category as category2,
            COUNT(*) as frequency,
            AVG(si1.price) as price1,
            AVG(si2.price) as price2
          FROM sale_items si1
          JOIN sale_items si2 ON si1.sale_id = si2.sale_id AND si1.product_id < si2.product_id
          JOIN products p1 ON si1.product_id = p1.id
          JOIN products p2 ON si2.product_id = p2.id
          JOIN sales s ON si1.sale_id = s.id
          WHERE s.sale_date >= date('now', '-30 days')
            AND s.status = 'completed'
          GROUP BY si1.product_id, si2.product_id
          HAVING frequency > 10
        )
        SELECT * FROM item_pairs
        ORDER BY frequency DESC
        LIMIT 20
      `;

      const pairs = this.db.prepare(query).all() as any[];

      const comboRecommendations = pairs.map(pair => {
        const individualPrice = pair.price1 + pair.price2;
        const suggestedComboPrice = individualPrice * 0.9; // 10% discount
        const expectedUplift = pair.frequency * 0.2; // Expect 20% increase

        return {
          items: [
            { id: pair.product1_id, name: pair.product1_name, category: pair.category1 },
            { id: pair.product2_id, name: pair.product2_name, category: pair.category2 }
          ],
          frequency: pair.frequency,
          individual_total: Math.round(individualPrice * 100) / 100,
          suggested_combo_price: Math.round(suggestedComboPrice * 100) / 100,
          discount_percentage: 10,
          expected_additional_sales: Math.round(expectedUplift),
          confidence_score: Math.min(100, Math.round(pair.frequency * 2))
        };
      });

      return comboRecommendations;
    } catch (error) {
      logger.error('Error generating combo recommendations:', error);
      throw error;
    }
  }

  // Helper methods
  private calculatePriceElasticity(productId: number, currentPrice: number): number {
    // Simplified elasticity calculation
    // In production, this would use historical price changes and demand data
    try {
      const query = `
        SELECT
          si.price,
          SUM(si.quantity) as quantity_sold,
          COUNT(DISTINCT si.sale_id) as transactions
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE si.product_id = ?
          AND s.sale_date >= date('now', '-90 days')
        GROUP BY si.price
        ORDER BY si.price
      `;

      const pricePoints = this.db.prepare(query).all(productId) as any[];

      if (pricePoints.length < 2) {
        return 1.0; // Neutral elasticity if insufficient data
      }

      // Calculate elasticity between price points
      const elasticities: number[] = [];
      for (let i = 1; i < pricePoints.length; i++) {
        const priceDiff = (pricePoints[i].price - pricePoints[i - 1].price) / pricePoints[i - 1].price;
        const quantityDiff = (pricePoints[i].quantity_sold - pricePoints[i - 1].quantity_sold) /
                            pricePoints[i - 1].quantity_sold;

        if (priceDiff !== 0) {
          elasticities.push(Math.abs(quantityDiff / priceDiff));
        }
      }

      return elasticities.length > 0 ?
        elasticities.reduce((sum, e) => sum + e, 0) / elasticities.length :
        1.0;
    } catch {
      return 1.0;
    }
  }

  private generateItemRecommendations(
    classification: string,
    profitMargin: number,
    popularity: number,
    priceElasticity: number
  ): string[] {
    const recommendations: string[] = [];

    switch (classification) {
      case 'star':
        recommendations.push('Maintain visibility and quality');
        recommendations.push('Use as signature item in marketing');
        if (priceElasticity < 0.8) {
          recommendations.push('Consider slight price increase (3-5%)');
        }
        break;

      case 'puzzle':
        recommendations.push('Increase promotion and visibility');
        recommendations.push('Feature in combo deals');
        if (priceElasticity > 1.2) {
          recommendations.push('Test price reduction to boost volume');
        }
        recommendations.push('Review positioning on menu');
        break;

      case 'plow_horse':
        if (profitMargin < 0.2) {
          recommendations.push('Negotiate better supplier costs');
          recommendations.push('Consider portion size optimization');
        }
        if (priceElasticity < 0.8) {
          recommendations.push('Implement gradual price increase');
        }
        recommendations.push('Bundle with high-margin items');
        break;

      case 'dog':
        recommendations.push('Consider removing from menu');
        recommendations.push('Redesign or replace with new item');
        recommendations.push('Use as loss leader only if strategic');
        break;
    }

    return recommendations;
  }

  private generateCategoryRecommendations(
    category: string,
    performanceScore: number,
    avgMargin: number
  ): string[] {
    const recommendations: string[] = [];

    if (performanceScore > 80) {
      recommendations.push('Expand variety in this category');
      recommendations.push('Feature prominently in marketing');
    } else if (performanceScore < 40) {
      recommendations.push('Review and refresh category items');
      recommendations.push('Consider reducing category size');
    }

    if (avgMargin < 0.3) {
      recommendations.push('Focus on cost reduction');
      recommendations.push('Review supplier agreements');
    } else if (avgMargin > 0.7) {
      recommendations.push('Test premium additions');
    }

    return recommendations;
  }

  private calculateCategoryPerformance(
    revenue: number,
    profit: number,
    margin: number,
    totalRevenue: number
  ): number {
    const revenueWeight = 0.4;
    const profitWeight = 0.4;
    const marginWeight = 0.2;

    const revenueScore = (revenue / totalRevenue) * 100;
    const profitScore = profit > 0 ? Math.min(100, (profit / revenue) * 200) : 0;
    const marginScore = margin * 100;

    return (revenueScore * revenueWeight) +
           (profitScore * profitWeight) +
           (marginScore * marginWeight);
  }

  private getCurrentPrice(productId: number): number {
    try {
      const result = this.db.prepare('SELECT price FROM products WHERE id = ?').get(productId) as any;
      return result?.price || 0;
    } catch {
      return 0;
    }
  }

  private calculateOptimalPrice(productId: number, direction: 'increase' | 'reduce'): number {
    const currentPrice = this.getCurrentPrice(productId);
    const adjustment = direction === 'increase' ? 1.1 : 0.92;
    return Math.round(currentPrice * adjustment * 100) / 100;
  }

  private calculatePriority(item: MenuItemAnalysis): number {
    const weights = {
      puzzle: 80,
      plow_horse: 60,
      dog: 40,
      star: 20
    };

    let priority = weights[item.classification];
    priority += item.revenue_contribution * 10;
    priority += Math.abs(1 - item.price_elasticity) * 20;

    return Math.round(priority);
  }
}