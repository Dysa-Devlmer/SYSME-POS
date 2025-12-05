// =====================================================
// SYSME POS - Customers Controller
// =====================================================
// Manages customers, addresses, loyalty, and CRM features
//
// @author JARVIS AI Assistant
// @date 2025-11-20
// @version 2.1.0
// =====================================================

const { dbManager } = require('../config/database');
const logger = require('../config/logger');

class CustomersController {
  /**
   * Get all customers
   * GET /api/customers
   */
  async getCustomers(req, res, next) {
    try {
      const { search, tier, segment, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT
          c.*,
          lt.name as loyalty_tier_name,
          lt.discount_percentage,
          COUNT(DISTINCT o.id) as total_orders,
          COALESCE(SUM(o.total_amount), 0) as lifetime_value,
          MAX(o.created_at) as last_order_date
        FROM customers c
        LEFT JOIN loyalty_tiers lt ON c.loyalty_tier_id = lt.id
        LEFT JOIN orders o ON c.id = o.customer_id
        WHERE c.company_id = ?
      `;

      const params = [req.user.company_id];

      if (search) {
        query += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (tier) {
        query += ' AND c.loyalty_tier_id = ?';
        params.push(tier);
      }

      if (segment) {
        query += ' AND c.rfm_segment = ?';
        params.push(segment);
      }

      query += ` GROUP BY c.id ORDER BY lifetime_value DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const customers = await dbManager.all(query, params);

      // Get total count
      const countResult = await dbManager.get(`
        SELECT COUNT(*) as total
        FROM customers
        WHERE company_id = ?
      `, [req.user.company_id]);

      res.json({
        success: true,
        data: customers,
        meta: {
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Error fetching customers:', error);
      next(error);
    }
  }

  /**
   * Get single customer
   * GET /api/customers/:id
   */
  async getCustomer(req, res, next) {
    try {
      const { id } = req.params;

      const customer = await dbManager.get(`
        SELECT
          c.*,
          lt.name as loyalty_tier_name,
          lt.discount_percentage,
          lt.points_multiplier
        FROM customers c
        LEFT JOIN loyalty_tiers lt ON c.loyalty_tier_id = lt.id
        WHERE c.id = ? AND c.company_id = ?
      `, [id, req.user.company_id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Get addresses
      const addresses = await dbManager.all(`
        SELECT * FROM customer_addresses
        WHERE customer_id = ?
        ORDER BY is_default DESC
      `, [id]);

      // Get payment methods
      const paymentMethods = await dbManager.all(`
        SELECT * FROM customer_payment_methods
        WHERE customer_id = ?
        ORDER BY is_default DESC
      `, [id]);

      // Get recent orders
      const orders = await dbManager.all(`
        SELECT
          o.id,
          o.order_number,
          o.order_type,
          o.total_amount,
          o.status,
          o.created_at,
          l.name as location_name
        FROM orders o
        LEFT JOIN locations l ON o.location_id = l.id
        WHERE o.customer_id = ?
        ORDER BY o.created_at DESC
        LIMIT 10
      `, [id]);

      // Get loyalty summary
      const loyaltySummary = await dbManager.get(`
        SELECT
          COALESCE(SUM(CASE WHEN transaction_type = 'earn' THEN points ELSE 0 END), 0) as total_earned,
          COALESCE(SUM(CASE WHEN transaction_type = 'redeem' THEN points ELSE 0 END), 0) as total_redeemed
        FROM loyalty_transactions
        WHERE customer_id = ?
      `, [id]);

      res.json({
        success: true,
        data: {
          ...customer,
          addresses,
          payment_methods: paymentMethods,
          recent_orders: orders,
          loyalty_summary: {
            current_points: customer.loyalty_points,
            ...loyaltySummary
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching customer:', error);
      next(error);
    }
  }

  /**
   * Create new customer
   * POST /api/customers
   */
  async createCustomer(req, res, next) {
    try {
      const {
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        notes,
        address
      } = req.body;

      if (!first_name || !phone) {
        return res.status(400).json({
          success: false,
          message: 'First name and phone are required'
        });
      }

      // Check if email already exists
      if (email) {
        const existing = await dbManager.get(`
          SELECT id FROM customers
          WHERE email = ? AND company_id = ?
        `, [email, req.user.company_id]);

        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Get default loyalty tier
      const defaultTier = await dbManager.get(`
        SELECT id FROM loyalty_tiers
        WHERE company_id = ? AND tier_level = 1
      `, [req.user.company_id]);

      // Create customer
      const customer = await dbManager.run(`
        INSERT INTO customers (
          company_id, first_name, last_name, email, phone,
          date_of_birth, gender, loyalty_tier_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.company_id,
        first_name,
        last_name,
        email || null,
        phone,
        date_of_birth || null,
        gender || null,
        defaultTier?.id || null,
        notes || null
      ]);

      // Create address if provided
      if (address) {
        await dbManager.run(`
          INSERT INTO customer_addresses (
            customer_id, address_line1, address_line2,
            city, state, postal_code, country, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          customer.lastID,
          address.address_line1,
          address.address_line2 || null,
          address.city,
          address.state,
          address.postal_code,
          address.country || 'MX'
        ]);
      }

      logger.info(`Customer ${customer.lastID} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: { customer_id: customer.lastID }
      });
    } catch (error) {
      logger.error('Error creating customer:', error);
      next(error);
    }
  }

  /**
   * Update customer
   * PUT /api/customers/:id
   */
  async updateCustomer(req, res, next) {
    try {
      const { id } = req.params;
      const {
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        notes
      } = req.body;

      // Check if customer exists
      const customer = await dbManager.get(`
        SELECT * FROM customers WHERE id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Check email uniqueness if changing
      if (email && email !== customer.email) {
        const existing = await dbManager.get(`
          SELECT id FROM customers
          WHERE email = ? AND company_id = ? AND id != ?
        `, [email, req.user.company_id, id]);

        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Update customer
      await dbManager.run(`
        UPDATE customers
        SET first_name = ?,
            last_name = ?,
            email = ?,
            phone = ?,
            date_of_birth = ?,
            gender = ?,
            notes = ?
        WHERE id = ?
      `, [
        first_name || customer.first_name,
        last_name || customer.last_name,
        email || customer.email,
        phone || customer.phone,
        date_of_birth || customer.date_of_birth,
        gender || customer.gender,
        notes !== undefined ? notes : customer.notes,
        id
      ]);

      logger.info(`Customer ${id} updated by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Customer updated successfully'
      });
    } catch (error) {
      logger.error('Error updating customer:', error);
      next(error);
    }
  }

  /**
   * Delete customer
   * DELETE /api/customers/:id
   */
  async deleteCustomer(req, res, next) {
    try {
      const { id } = req.params;

      // Check if customer exists
      const customer = await dbManager.get(`
        SELECT * FROM customers WHERE id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Check if customer has orders
      const orderCount = await dbManager.get(`
        SELECT COUNT(*) as count FROM orders WHERE customer_id = ?
      `, [id]);

      if (orderCount.count > 0) {
        // Soft delete
        await dbManager.run(`
          UPDATE customers SET is_active = 0 WHERE id = ?
        `, [id]);

        logger.info(`Customer ${id} soft-deleted by user ${req.user.id}`);

        res.json({
          success: true,
          message: 'Customer deactivated (has order history)'
        });
      } else {
        // Hard delete
        await dbManager.run(`DELETE FROM customers WHERE id = ?`, [id]);

        logger.info(`Customer ${id} deleted by user ${req.user.id}`);

        res.json({
          success: true,
          message: 'Customer deleted successfully'
        });
      }
    } catch (error) {
      logger.error('Error deleting customer:', error);
      next(error);
    }
  }

  /**
   * Get customer orders history
   * GET /api/customers/:id/orders
   */
  async getCustomerOrders(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const orders = await dbManager.all(`
        SELECT
          o.*,
          l.name as location_name,
          u.username as cashier_name,
          (
            SELECT COUNT(*)
            FROM order_items
            WHERE order_id = o.id
          ) as item_count
        FROM orders o
        LEFT JOIN locations l ON o.location_id = l.id
        LEFT JOIN users u ON o.cashier_id = u.id
        WHERE o.customer_id = ? AND o.company_id = ?
        ORDER BY o.created_at DESC
        LIMIT ? OFFSET ?
      `, [id, req.user.company_id, parseInt(limit), parseInt(offset)]);

      const countResult = await dbManager.get(`
        SELECT COUNT(*) as total FROM orders
        WHERE customer_id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      res.json({
        success: true,
        data: orders,
        meta: {
          total: countResult.total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      logger.error('Error fetching customer orders:', error);
      next(error);
    }
  }

  /**
   * Get customer loyalty info
   * GET /api/customers/:id/loyalty
   */
  async getCustomerLoyalty(req, res, next) {
    try {
      const { id } = req.params;

      const customer = await dbManager.get(`
        SELECT
          c.id,
          c.loyalty_points,
          c.loyalty_tier_id,
          lt.name as tier_name,
          lt.tier_level,
          lt.discount_percentage,
          lt.points_multiplier,
          lt.min_points_required
        FROM customers c
        LEFT JOIN loyalty_tiers lt ON c.loyalty_tier_id = lt.id
        WHERE c.id = ? AND c.company_id = ?
      `, [id, req.user.company_id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Get recent transactions
      const transactions = await dbManager.all(`
        SELECT
          lt.*,
          o.order_number,
          u.username as created_by_name
        FROM loyalty_transactions lt
        LEFT JOIN orders o ON lt.order_id = o.id
        LEFT JOIN users u ON lt.created_by = u.id
        WHERE lt.customer_id = ?
        ORDER BY lt.created_at DESC
        LIMIT 20
      `, [id]);

      // Get available rewards
      const rewards = await dbManager.all(`
        SELECT * FROM loyalty_rewards
        WHERE company_id = ? AND is_active = 1
          AND points_required <= ?
        ORDER BY points_required ASC
      `, [req.user.company_id, customer.loyalty_points]);

      // Get next tier
      const nextTier = await dbManager.get(`
        SELECT * FROM loyalty_tiers
        WHERE company_id = ? AND tier_level > ?
        ORDER BY tier_level ASC
        LIMIT 1
      `, [req.user.company_id, customer.tier_level || 0]);

      res.json({
        success: true,
        data: {
          current_points: customer.loyalty_points,
          current_tier: {
            id: customer.loyalty_tier_id,
            name: customer.tier_name,
            level: customer.tier_level,
            discount_percentage: customer.discount_percentage,
            points_multiplier: customer.points_multiplier
          },
          next_tier: nextTier ? {
            name: nextTier.name,
            points_needed: nextTier.min_points_required - customer.loyalty_points
          } : null,
          recent_transactions: transactions,
          available_rewards: rewards
        }
      });
    } catch (error) {
      logger.error('Error fetching customer loyalty:', error);
      next(error);
    }
  }

  /**
   * Add loyalty points
   * POST /api/customers/:id/loyalty/add-points
   */
  async addLoyaltyPoints(req, res, next) {
    try {
      const { id } = req.params;
      const { points, reason, notes } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valid points amount is required'
        });
      }

      const customer = await dbManager.get(`
        SELECT * FROM customers WHERE id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      // Add points
      const newPoints = customer.loyalty_points + points;

      await dbManager.run(`
        UPDATE customers
        SET loyalty_points = ?
        WHERE id = ?
      `, [newPoints, id]);

      // Create transaction
      await dbManager.run(`
        INSERT INTO loyalty_transactions (
          company_id, customer_id, transaction_type,
          points, balance_after, description, notes, created_by
        ) VALUES (?, ?, 'earn', ?, ?, ?, ?, ?)
      `, [
        req.user.company_id,
        id,
        points,
        newPoints,
        reason || 'Manual adjustment',
        notes || null,
        req.user.id
      ]);

      // Check for tier upgrade
      const nextTier = await dbManager.get(`
        SELECT * FROM loyalty_tiers
        WHERE company_id = ? AND min_points_required <= ?
        ORDER BY tier_level DESC
        LIMIT 1
      `, [req.user.company_id, newPoints]);

      if (nextTier && (!customer.loyalty_tier_id || nextTier.tier_level > customer.tier_level)) {
        await dbManager.run(`
          UPDATE customers SET loyalty_tier_id = ? WHERE id = ?
        `, [nextTier.id, id]);

        logger.info(`Customer ${id} upgraded to tier ${nextTier.name}`);
      }

      logger.info(`Added ${points} loyalty points to customer ${id} by user ${req.user.id}`);

      res.json({
        success: true,
        message: 'Points added successfully',
        data: {
          points_added: points,
          new_balance: newPoints
        }
      });
    } catch (error) {
      logger.error('Error adding loyalty points:', error);
      next(error);
    }
  }

  /**
   * Redeem loyalty reward
   * POST /api/customers/:id/loyalty/redeem
   */
  async redeemReward(req, res, next) {
    try {
      const { id } = req.params;
      const { reward_id } = req.body;

      const customer = await dbManager.get(`
        SELECT * FROM customers WHERE id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const reward = await dbManager.get(`
        SELECT * FROM loyalty_rewards
        WHERE id = ? AND company_id = ? AND is_active = 1
      `, [reward_id, req.user.company_id]);

      if (!reward) {
        return res.status(404).json({
          success: false,
          message: 'Reward not found'
        });
      }

      if (customer.loyalty_points < reward.points_required) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient loyalty points'
        });
      }

      // Deduct points
      const newPoints = customer.loyalty_points - reward.points_required;

      await dbManager.run(`
        UPDATE customers SET loyalty_points = ? WHERE id = ?
      `, [newPoints, id]);

      // Create transaction
      await dbManager.run(`
        INSERT INTO loyalty_transactions (
          company_id, customer_id, transaction_type,
          points, balance_after, reward_id, description, created_by
        ) VALUES (?, ?, 'redeem', ?, ?, ?, ?, ?)
      `, [
        req.user.company_id,
        id,
        -reward.points_required,
        newPoints,
        reward_id,
        `Redeemed: ${reward.name}`,
        req.user.id
      ]);

      logger.info(`Customer ${id} redeemed reward ${reward_id}`);

      res.json({
        success: true,
        message: 'Reward redeemed successfully',
        data: {
          reward_name: reward.name,
          points_redeemed: reward.points_required,
          new_balance: newPoints
        }
      });
    } catch (error) {
      logger.error('Error redeeming reward:', error);
      next(error);
    }
  }

  /**
   * Get customer statistics
   * GET /api/customers/stats
   */
  async getCustomerStats(req, res, next) {
    try {
      const stats = await dbManager.get(`
        SELECT
          COUNT(*) as total_customers,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_customers,
          SUM(loyalty_points) as total_loyalty_points,
          AVG(loyalty_points) as avg_loyalty_points
        FROM customers
        WHERE company_id = ?
      `, [req.user.company_id]);

      const tierDistribution = await dbManager.all(`
        SELECT
          lt.name as tier_name,
          COUNT(c.id) as customer_count
        FROM loyalty_tiers lt
        LEFT JOIN customers c ON lt.id = c.loyalty_tier_id AND c.company_id = ?
        WHERE lt.company_id = ?
        GROUP BY lt.id
        ORDER BY lt.tier_level
      `, [req.user.company_id, req.user.company_id]);

      const segmentDistribution = await dbManager.all(`
        SELECT
          rfm_segment,
          COUNT(*) as count
        FROM customers
        WHERE company_id = ? AND rfm_segment IS NOT NULL
        GROUP BY rfm_segment
      `, [req.user.company_id]);

      res.json({
        success: true,
        data: {
          ...stats,
          tier_distribution: tierDistribution,
          segment_distribution: segmentDistribution
        }
      });
    } catch (error) {
      logger.error('Error fetching customer stats:', error);
      next(error);
    }
  }
}

module.exports = new CustomersController();
