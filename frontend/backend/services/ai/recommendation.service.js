/**
 * =====================================================
 * Smart Recommendations Service - AI/ML
 * =====================================================
 * Generates personalized product recommendations using:
 * - Collaborative filtering (similar customers)
 * - Content-based filtering (similar products)
 * - Hybrid approach
 * - Frequently bought together analysis
 *
 * @module services/ai/recommendation
 * @author SYSME POS Team
 * @date 2025-11-21
 * =====================================================
 */

const Database = require('better-sqlite3');
const path = require('path');

class RecommendationService {
  constructor() {
    this.db = null;
    this.similarityCache = new Map();
  }

  /**
   * Initialize database connection
   */
  initDB() {
    if (!this.db) {
      const dbPath = path.join(__dirname, '../../database.sqlite');
      this.db = new Database(dbPath);
    }
    return this.db;
  }

  /**
   * Get personalized recommendations for a customer
   */
  async getPersonalizedRecommendations(customerId, limit = 10) {
    const db = this.initDB();

    try {
      // Get customer's purchase history
      const customerHistory = this.getCustomerPurchaseHistory(customerId);

      if (customerHistory.length === 0) {
        // New customer - return popular products
        return this.getPopularProducts(limit);
      }

      // Find similar customers (collaborative filtering)
      const similarCustomers = await this.findSimilarCustomers(customerId, 5);

      // Get recommendations from similar customers
      const collaborativeRecs = this.getCollaborativeRecommendations(
        customerId,
        similarCustomers,
        limit
      );

      // Content-based recommendations (similar to what they bought)
      const contentRecs = this.getContentBasedRecommendations(
        customerHistory,
        limit
      );

      // Combine and rank recommendations
      const combined = this.combineRecommendations(
        collaborativeRecs,
        contentRecs,
        limit
      );

      return combined;

    } catch (error) {
      console.error('Error getting recommendations:', error);
      return this.getPopularProducts(limit);
    }
  }

  /**
   * Get customer's purchase history
   */
  getCustomerPurchaseHistory(customerId) {
    const db = this.initDB();

    return db.prepare(`
      SELECT DISTINCT
        p.product_id,
        p.name,
        p.category_id,
        COUNT(*) as purchase_count,
        MAX(o.created_at) as last_purchase
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      JOIN products p ON od.product_id = p.product_id
      WHERE o.customer_id = ?
        AND o.status = 'completed'
      GROUP BY p.product_id
      ORDER BY purchase_count DESC, last_purchase DESC
    `).all(customerId);
  }

  /**
   * Find similar customers using collaborative filtering
   */
  async findSimilarCustomers(customerId, limit = 5) {
    const db = this.initDB();

    // Get products bought by this customer
    const customerProducts = db.prepare(`
      SELECT DISTINCT od.product_id
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      WHERE o.customer_id = ?
        AND o.status = 'completed'
    `).all(customerId).map(r => r.product_id);

    if (customerProducts.length === 0) return [];

    // Find customers who bought similar products
    const placeholders = customerProducts.map(() => '?').join(',');

    const similarCustomers = db.prepare(`
      SELECT
        o.customer_id,
        COUNT(DISTINCT od.product_id) as common_products,
        COUNT(DISTINCT o.order_id) as total_orders
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      WHERE od.product_id IN (${placeholders})
        AND o.customer_id != ?
        AND o.status = 'completed'
      GROUP BY o.customer_id
      HAVING common_products >= 2
      ORDER BY common_products DESC, total_orders DESC
      LIMIT ?
    `).all(...customerProducts, customerId, limit);

    return similarCustomers;
  }

  /**
   * Get recommendations from similar customers
   */
  getCollaborativeRecommendations(customerId, similarCustomers, limit) {
    if (similarCustomers.length === 0) return [];

    const db = this.initDB();

    // Get customer's already purchased products
    const alreadyPurchased = db.prepare(`
      SELECT DISTINCT product_id
      FROM order_details od
      JOIN orders o ON od.order_id = o.order_id
      WHERE o.customer_id = ?
    `).all(customerId).map(r => r.product_id);

    // Get products bought by similar customers
    const similarCustomerIds = similarCustomers.map(c => c.customer_id);
    const placeholders = similarCustomerIds.map(() => '?').join(',');

    let query = `
      SELECT
        p.product_id,
        p.name,
        p.price,
        p.category_id,
        c.name as category_name,
        COUNT(DISTINCT o.customer_id) as bought_by_similar,
        COUNT(DISTINCT o.order_id) as times_ordered,
        AVG(od.unit_price) as avg_price
      FROM orders o
      JOIN order_details od ON o.order_id = od.order_id
      JOIN products p ON od.product_id = p.product_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE o.customer_id IN (${placeholders})
        AND o.status = 'completed'
        AND p.is_active = 1
    `;

    if (alreadyPurchased.length > 0) {
      const excludePlaceholders = alreadyPurchased.map(() => '?').join(',');
      query += ` AND p.product_id NOT IN (${excludePlaceholders})`;
    }

    query += `
      GROUP BY p.product_id
      ORDER BY bought_by_similar DESC, times_ordered DESC
      LIMIT ?
    `;

    const params = [...similarCustomerIds];
    if (alreadyPurchased.length > 0) {
      params.push(...alreadyPurchased);
    }
    params.push(limit);

    const recommendations = db.prepare(query).all(...params);

    return recommendations.map(rec => ({
      ...rec,
      score: this.calculateCollaborativeScore(rec, similarCustomers.length),
      reason: 'Customers similar to you bought this'
    }));
  }

  /**
   * Get content-based recommendations (similar products)
   */
  getContentBasedRecommendations(customerHistory, limit) {
    const db = this.initDB();

    if (customerHistory.length === 0) return [];

    // Get categories customer has bought from
    const categories = [...new Set(customerHistory.map(h => h.category_id))];

    // Get products from same categories that customer hasn't bought
    const purchasedIds = customerHistory.map(h => h.product_id);
    const catPlaceholders = categories.map(() => '?').join(',');
    const prodPlaceholders = purchasedIds.map(() => '?').join(',');

    const recommendations = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.price,
        p.category_id,
        c.name as category_name,
        COUNT(DISTINCT od.order_id) as popularity,
        AVG(od.unit_price) as avg_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN order_details od ON p.product_id = od.product_id
      WHERE p.category_id IN (${catPlaceholders})
        AND p.product_id NOT IN (${prodPlaceholders})
        AND p.is_active = 1
      GROUP BY p.product_id
      ORDER BY popularity DESC
      LIMIT ?
    `).all(...categories, ...purchasedIds, limit);

    return recommendations.map(rec => ({
      ...rec,
      score: this.calculateContentScore(rec, customerHistory),
      reason: 'Similar to products you\'ve purchased'
    }));
  }

  /**
   * Get popular products (fallback for new customers)
   */
  getPopularProducts(limit = 10) {
    const db = this.initDB();

    const popular = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.price,
        p.category_id,
        c.name as category_name,
        COUNT(DISTINCT od.order_id) as times_ordered,
        COUNT(DISTINCT o.customer_id) as unique_customers,
        SUM(od.quantity) as total_sold,
        AVG(od.unit_price) as avg_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      JOIN order_details od ON p.product_id = od.product_id
      JOIN orders o ON od.order_id = o.order_id
      WHERE p.is_active = 1
        AND o.status = 'completed'
        AND o.created_at >= datetime('now', '-30 days')
      GROUP BY p.product_id
      ORDER BY total_sold DESC, unique_customers DESC
      LIMIT ?
    `).all(limit);

    return popular.map(rec => ({
      ...rec,
      score: this.calculatePopularityScore(rec),
      reason: 'Popular choice'
    }));
  }

  /**
   * Combine and rank recommendations from different sources
   */
  combineRecommendations(collaborative, contentBased, limit) {
    const combined = new Map();

    // Add collaborative recommendations (higher weight)
    collaborative.forEach(rec => {
      combined.set(rec.product_id, {
        ...rec,
        score: rec.score * 1.5,
        sources: ['collaborative']
      });
    });

    // Add content-based recommendations
    contentBased.forEach(rec => {
      if (combined.has(rec.product_id)) {
        const existing = combined.get(rec.product_id);
        existing.score += rec.score;
        existing.sources.push('content');
        existing.reason = 'Highly recommended for you';
      } else {
        combined.set(rec.product_id, {
          ...rec,
          sources: ['content']
        });
      }
    });

    // Convert to array and sort by score
    const recommendations = Array.from(combined.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return recommendations;
  }

  /**
   * Calculate collaborative filtering score
   */
  calculateCollaborativeScore(rec, totalSimilarCustomers) {
    const popularityScore = rec.bought_by_similar / totalSimilarCustomers;
    const frequencyScore = Math.min(rec.times_ordered / 10, 1);

    return (popularityScore * 0.7 + frequencyScore * 0.3) * 100;
  }

  /**
   * Calculate content-based score
   */
  calculateContentScore(rec, customerHistory) {
    const popularityScore = Math.min(rec.popularity / 50, 1);

    // Bonus if in a category customer frequently buys from
    const categoryPurchases = customerHistory.filter(
      h => h.category_id === rec.category_id
    ).length;
    const categoryBonus = Math.min(categoryPurchases / 5, 0.5);

    return (popularityScore * 0.7 + categoryBonus * 0.3) * 100;
  }

  /**
   * Calculate popularity score
   */
  calculatePopularityScore(rec) {
    const ordersScore = Math.min(rec.times_ordered / 100, 1);
    const customersScore = Math.min(rec.unique_customers / 50, 1);
    const volumeScore = Math.min(rec.total_sold / 500, 1);

    return (ordersScore * 0.4 + customersScore * 0.3 + volumeScore * 0.3) * 100;
  }

  /**
   * Get frequently bought together products
   */
  getFrequentlyBoughtTogether(productId, limit = 5) {
    const db = this.initDB();

    const related = db.prepare(`
      SELECT
        p2.product_id,
        p2.name,
        p2.price,
        COUNT(DISTINCT o.order_id) as times_bought_together,
        COUNT(DISTINCT o.customer_id) as unique_customers
      FROM order_details od1
      JOIN order_details od2 ON od1.order_id = od2.order_id
      JOIN products p2 ON od2.product_id = p2.product_id
      JOIN orders o ON od1.order_id = o.order_id
      WHERE od1.product_id = ?
        AND od2.product_id != ?
        AND p2.is_active = 1
        AND o.status = 'completed'
      GROUP BY p2.product_id
      HAVING times_bought_together >= 3
      ORDER BY times_bought_together DESC, unique_customers DESC
      LIMIT ?
    `).all(productId, productId, limit);

    return related.map(rec => ({
      ...rec,
      confidence: this.calculateAssociationConfidence(rec),
      reason: 'Frequently bought together'
    }));
  }

  /**
   * Get upsell options (higher-value alternatives)
   */
  getUpsellOptions(productId, limit = 3) {
    const db = this.initDB();

    // Get product details
    const product = db.prepare(`
      SELECT product_id, name, price, category_id
      FROM products
      WHERE product_id = ?
    `).get(productId);

    if (!product) return [];

    // Find similar but higher-priced products
    const upsells = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.price,
        p.category_id,
        COUNT(DISTINCT od.order_id) as popularity,
        (p.price - ?) as price_difference
      FROM products p
      LEFT JOIN order_details od ON p.product_id = od.product_id
      WHERE p.category_id = ?
        AND p.price > ?
        AND p.price <= ? * 1.5
        AND p.is_active = 1
        AND p.product_id != ?
      GROUP BY p.product_id
      ORDER BY popularity DESC, price ASC
      LIMIT ?
    `).all(product.price, product.category_id, product.price, product.price, productId, limit);

    return upsells.map(rec => ({
      ...rec,
      original_price: product.price,
      upgrade_value: rec.price_difference,
      reason: 'Premium alternative'
    }));
  }

  /**
   * Calculate association confidence (A -> B)
   */
  calculateAssociationConfidence(rec) {
    // Simple confidence based on frequency
    return Math.min(rec.times_bought_together / 20, 1);
  }

  /**
   * Get cross-sell suggestions for cart items
   */
  getSuggestedAddons(cartItems, limit = 5) {
    if (!cartItems || cartItems.length === 0) return [];

    const suggestions = new Map();

    // For each item in cart, get frequently bought together
    cartItems.forEach(item => {
      const related = this.getFrequentlyBoughtTogether(item.product_id, limit);

      related.forEach(rec => {
        // Don't suggest items already in cart
        const alreadyInCart = cartItems.some(ci => ci.product_id === rec.product_id);
        if (alreadyInCart) return;

        if (suggestions.has(rec.product_id)) {
          // If already suggested, increase score
          const existing = suggestions.get(rec.product_id);
          existing.score += rec.confidence * 50;
          existing.times_suggested++;
        } else {
          suggestions.set(rec.product_id, {
            ...rec,
            score: rec.confidence * 50,
            times_suggested: 1
          });
        }
      });
    });

    // Convert to array and sort by score
    return Array.from(suggestions.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get trending products (increasing popularity)
   */
  getTrendingProducts(limit = 10) {
    const db = this.initDB();

    // Compare last 7 days vs previous 7 days
    const trending = db.prepare(`
      SELECT
        p.product_id,
        p.name,
        p.price,
        p.category_id,
        recent.sales as recent_sales,
        previous.sales as previous_sales,
        CAST(recent.sales - previous.sales AS REAL) / previous.sales as growth_rate
      FROM products p
      JOIN (
        SELECT
          od.product_id,
          SUM(od.quantity) as sales
        FROM order_details od
        JOIN orders o ON od.order_id = o.order_id
        WHERE o.created_at >= datetime('now', '-7 days')
          AND o.status = 'completed'
        GROUP BY od.product_id
      ) recent ON p.product_id = recent.product_id
      JOIN (
        SELECT
          od.product_id,
          SUM(od.quantity) as sales
        FROM order_details od
        JOIN orders o ON od.order_id = o.order_id
        WHERE o.created_at >= datetime('now', '-14 days')
          AND o.created_at < datetime('now', '-7 days')
          AND o.status = 'completed'
        GROUP BY od.product_id
      ) previous ON p.product_id = previous.product_id
      WHERE p.is_active = 1
        AND previous.sales > 0
        AND recent.sales > previous.sales
      ORDER BY growth_rate DESC
      LIMIT ?
    `).all(limit);

    return trending.map(rec => ({
      ...rec,
      trend: 'up',
      growth_percentage: (rec.growth_rate * 100).toFixed(1),
      reason: 'Trending now'
    }));
  }
}

module.exports = new RecommendationService();
