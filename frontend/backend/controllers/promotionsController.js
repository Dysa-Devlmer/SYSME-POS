// =====================================================
// SYSME POS - Promotions Controller
// =====================================================
const { dbManager } = require('../config/database');
const logger = require('../config/logger');

class PromotionsController {
  async getPromotions(req, res, next) {
    try {
      const { is_active } = req.query;

      let query = 'SELECT * FROM promotions WHERE company_id = ?';
      const params = [req.user.company_id];

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY start_date DESC';

      const promotions = await dbManager.all(query, params);

      res.json({ success: true, data: promotions });
    } catch (error) {
      logger.error('Error fetching promotions:', error);
      next(error);
    }
  }

  async createPromotion(req, res, next) {
    try {
      const {
        name, description, discount_type, discount_value,
        start_date, end_date, min_purchase_amount, max_discount_amount,
        applicable_to, applicable_ids
      } = req.body;

      if (!name || !discount_type || !discount_value) {
        return res.status(400).json({
          success: false,
          message: 'Name, discount type, and value are required'
        });
      }

      const result = await dbManager.run(`
        INSERT INTO promotions (
          company_id, name, description, discount_type, discount_value,
          start_date, end_date, min_purchase_amount, max_discount_amount,
          applicable_to, applicable_ids
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.company_id, name, description || null,
        discount_type, discount_value, start_date || null,
        end_date || null, min_purchase_amount || null,
        max_discount_amount || null, applicable_to || 'all',
        applicable_ids || null
      ]);

      logger.info(`Promotion ${result.lastID} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Promotion created successfully',
        data: { promotion_id: result.lastID }
      });
    } catch (error) {
      logger.error('Error creating promotion:', error);
      next(error);
    }
  }

  async getCoupons(req, res, next) {
    try {
      const { is_active, code } = req.query;

      let query = 'SELECT * FROM coupons WHERE company_id = ?';
      const params = [req.user.company_id];

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      if (code) {
        query += ' AND code = ?';
        params.push(code);
      }

      query += ' ORDER BY created_at DESC';

      const coupons = await dbManager.all(query, params);

      res.json({ success: true, data: coupons });
    } catch (error) {
      logger.error('Error fetching coupons:', error);
      next(error);
    }
  }

  async createCoupon(req, res, next) {
    try {
      const {
        code, discount_type, discount_value, max_uses,
        max_uses_per_customer, valid_from, valid_until,
        min_purchase_amount
      } = req.body;

      if (!code || !discount_type || !discount_value) {
        return res.status(400).json({
          success: false,
          message: 'Code, discount type, and value are required'
        });
      }

      // Check if code exists
      const existing = await dbManager.get(
        'SELECT id FROM coupons WHERE code = ? AND company_id = ?',
        [code, req.user.company_id]
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }

      const result = await dbManager.run(`
        INSERT INTO coupons (
          company_id, code, discount_type, discount_value,
          max_uses, max_uses_per_customer, valid_from, valid_until,
          min_purchase_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.company_id, code.toUpperCase(), discount_type,
        discount_value, max_uses || null, max_uses_per_customer || null,
        valid_from || null, valid_until || null, min_purchase_amount || null
      ]);

      logger.info(`Coupon ${code} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Coupon created successfully',
        data: { coupon_id: result.lastID }
      });
    } catch (error) {
      logger.error('Error creating coupon:', error);
      next(error);
    }
  }

  async validateCoupon(req, res, next) {
    try {
      const { code } = req.params;
      const { order_total, customer_id } = req.body;

      const coupon = await dbManager.get(`
        SELECT * FROM coupons
        WHERE code = ? AND company_id = ? AND is_active = 1
      `, [code.toUpperCase(), req.user.company_id]);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or inactive'
        });
      }

      // Check validity period
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return res.status(400).json({
          success: false,
          message: 'Coupon not yet valid'
        });
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return res.status(400).json({
          success: false,
          message: 'Coupon expired'
        });
      }

      // Check max uses
      if (coupon.max_uses && coupon.times_used >= coupon.max_uses) {
        return res.status(400).json({
          success: false,
          message: 'Coupon usage limit reached'
        });
      }

      // Check min purchase
      if (coupon.min_purchase_amount && order_total < coupon.min_purchase_amount) {
        return res.status(400).json({
          success: false,
          message: `Minimum purchase of ${coupon.min_purchase_amount} required`
        });
      }

      // Check per-customer usage
      if (coupon.max_uses_per_customer && customer_id) {
        const usage = await dbManager.get(`
          SELECT COUNT(*) as count
          FROM coupon_usage
          WHERE coupon_id = ? AND customer_id = ?
        `, [coupon.id, customer_id]);

        if (usage.count >= coupon.max_uses_per_customer) {
          return res.status(400).json({
            success: false,
            message: 'Customer usage limit reached for this coupon'
          });
        }
      }

      // Calculate discount
      let discount_amount = 0;
      if (coupon.discount_type === 'percentage') {
        discount_amount = (order_total * coupon.discount_value) / 100;
      } else {
        discount_amount = coupon.discount_value;
      }

      res.json({
        success: true,
        valid: true,
        data: {
          coupon_id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount
        }
      });
    } catch (error) {
      logger.error('Error validating coupon:', error);
      next(error);
    }
  }

  async getGiftCards(req, res, next) {
    try {
      const { status } = req.query;

      let query = 'SELECT * FROM gift_cards WHERE company_id = ?';
      const params = [req.user.company_id];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const giftCards = await dbManager.all(query, params);

      res.json({ success: true, data: giftCards });
    } catch (error) {
      logger.error('Error fetching gift cards:', error);
      next(error);
    }
  }

  async createGiftCard(req, res, next) {
    try {
      const { card_number, initial_balance, customer_id, issued_by } = req.body;

      if (!card_number || !initial_balance) {
        return res.status(400).json({
          success: false,
          message: 'Card number and initial balance are required'
        });
      }

      // Check if card number exists
      const existing = await dbManager.get(
        'SELECT id FROM gift_cards WHERE card_number = ? AND company_id = ?',
        [card_number, req.user.company_id]
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Gift card number already exists'
        });
      }

      const result = await dbManager.run(`
        INSERT INTO gift_cards (
          company_id, card_number, initial_balance, current_balance,
          customer_id, issued_by, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'active')
      `, [
        req.user.company_id, card_number, initial_balance,
        initial_balance, customer_id || null, issued_by || req.user.id
      ]);

      logger.info(`Gift card ${card_number} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Gift card created successfully',
        data: { gift_card_id: result.lastID }
      });
    } catch (error) {
      logger.error('Error creating gift card:', error);
      next(error);
    }
  }
}

module.exports = new PromotionsController();
