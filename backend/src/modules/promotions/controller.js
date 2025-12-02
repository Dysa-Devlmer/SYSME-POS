/**
 * Promotions Controller
 * Gestión de promociones, cupones y tarjetas de regalo
 */

import { getDatabase } from '../../config/database.js';

// Helper para obtener la conexión
const getDb = () => getDatabase();

export const promotionsController = {
  // ==================== PROMOCIONES ====================

  /**
   * Obtener todas las promociones
   */
  async getPromotions(req, res) {
    try {
      const { is_active } = req.query;

      let query = 'SELECT * FROM promotions WHERE 1=1';
      const params = [];

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC';

      // Verificar si la tabla existe
      const tableExists = getDb().prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name='promotions'
      `).get();

      if (!tableExists) {
        return res.json({
          success: true,
          data: [],
          message: 'Tabla de promociones no inicializada'
        });
      }

      const promotions = getDb().prepare(query).all(...params);

      res.json({
        success: true,
        data: promotions
      });
    } catch (error) {
      console.error('Error getting promotions:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener promociones',
        error: error.message
      });
    }
  },

  /**
   * Crear promoción
   */
  async createPromotion(req, res) {
    try {
      const {
        name,
        description,
        discount_type,
        discount_value,
        start_date,
        end_date,
        conditions
      } = req.body;

      if (!name || !discount_type || !discount_value) {
        return res.status(400).json({
          success: false,
          message: 'Nombre, tipo de descuento y valor son requeridos'
        });
      }

      // Crear tabla si no existe
      getDb().exec(`
        CREATE TABLE IF NOT EXISTS promotions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          discount_type VARCHAR(20) NOT NULL,
          discount_value DECIMAL(10,2) NOT NULL,
          start_date DATETIME,
          end_date DATETIME,
          conditions TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = getDb().prepare(`
        INSERT INTO promotions (name, description, discount_type, discount_value, start_date, end_date, conditions)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        name,
        description || null,
        discount_type,
        discount_value,
        start_date || null,
        end_date || null,
        conditions ? JSON.stringify(conditions) : null
      );

      const promotion = getDb().prepare('SELECT * FROM promotions WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Promoción creada',
        data: promotion
      });
    } catch (error) {
      console.error('Error creating promotion:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear promoción',
        error: error.message
      });
    }
  },

  // ==================== CUPONES ====================

  /**
   * Obtener todos los cupones
   */
  async getCoupons(req, res) {
    try {
      const { is_active, code } = req.query;

      // Crear tabla si no existe
      getDb().exec(`
        CREATE TABLE IF NOT EXISTS coupons (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code VARCHAR(50) UNIQUE NOT NULL,
          discount_type VARCHAR(20) NOT NULL,
          discount_value DECIMAL(10,2) NOT NULL,
          max_uses INTEGER,
          current_uses INTEGER DEFAULT 0,
          max_uses_per_customer INTEGER DEFAULT 1,
          valid_from DATETIME,
          valid_until DATETIME,
          min_purchase_amount DECIMAL(10,2) DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      let query = 'SELECT * FROM coupons WHERE 1=1';
      const params = [];

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      if (code) {
        query += ' AND code = ?';
        params.push(code);
      }

      query += ' ORDER BY created_at DESC';

      const coupons = getDb().prepare(query).all(...params);

      res.json({
        success: true,
        data: coupons
      });
    } catch (error) {
      console.error('Error getting coupons:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener cupones',
        error: error.message
      });
    }
  },

  /**
   * Crear cupón
   */
  async createCoupon(req, res) {
    try {
      const {
        code,
        discount_type,
        discount_value,
        max_uses,
        max_uses_per_customer,
        valid_from,
        valid_until,
        min_purchase_amount
      } = req.body;

      if (!code || !discount_type || !discount_value) {
        return res.status(400).json({
          success: false,
          message: 'Código, tipo de descuento y valor son requeridos'
        });
      }

      // Verificar si el código ya existe
      const existing = getDb().prepare('SELECT id FROM coupons WHERE code = ?').get(code);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'El código de cupón ya existe'
        });
      }

      const result = getDb().prepare(`
        INSERT INTO coupons (code, discount_type, discount_value, max_uses, max_uses_per_customer, valid_from, valid_until, min_purchase_amount)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        code.toUpperCase(),
        discount_type,
        discount_value,
        max_uses || null,
        max_uses_per_customer || 1,
        valid_from || null,
        valid_until || null,
        min_purchase_amount || 0
      );

      const coupon = getDb().prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Cupón creado',
        data: coupon
      });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear cupón',
        error: error.message
      });
    }
  },

  /**
   * Validar cupón
   */
  async validateCoupon(req, res) {
    try {
      const { code } = req.params;
      const { order_total, customer_id } = req.body;

      const coupon = getDb().prepare('SELECT * FROM coupons WHERE code = ? AND is_active = 1').get(code.toUpperCase());

      if (!coupon) {
        return res.status(404).json({
          success: false,
          valid: false,
          message: 'Cupón no encontrado o inactivo'
        });
      }

      // Verificar fechas
      const now = new Date();
      if (coupon.valid_from && new Date(coupon.valid_from) > now) {
        return res.json({
          success: true,
          valid: false,
          message: 'Cupón aún no está activo'
        });
      }

      if (coupon.valid_until && new Date(coupon.valid_until) < now) {
        return res.json({
          success: true,
          valid: false,
          message: 'Cupón ha expirado'
        });
      }

      // Verificar usos máximos
      if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
        return res.json({
          success: true,
          valid: false,
          message: 'Cupón ha alcanzado el límite de usos'
        });
      }

      // Verificar monto mínimo
      if (coupon.min_purchase_amount && order_total < coupon.min_purchase_amount) {
        return res.json({
          success: true,
          valid: false,
          message: `Monto mínimo de compra: $${coupon.min_purchase_amount}`
        });
      }

      // Calcular descuento
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = order_total * (coupon.discount_value / 100);
      } else {
        discount = coupon.discount_value;
      }

      res.json({
        success: true,
        valid: true,
        data: {
          coupon_id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          calculated_discount: Math.min(discount, order_total),
          final_total: Math.max(order_total - discount, 0)
        }
      });
    } catch (error) {
      console.error('Error validating coupon:', error);
      res.status(500).json({
        success: false,
        message: 'Error al validar cupón',
        error: error.message
      });
    }
  },

  // ==================== TARJETAS DE REGALO ====================

  /**
   * Obtener tarjetas de regalo
   */
  async getGiftCards(req, res) {
    try {
      const { status } = req.query;

      // Crear tabla si no existe
      getDb().exec(`
        CREATE TABLE IF NOT EXISTS gift_cards (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          card_number VARCHAR(50) UNIQUE NOT NULL,
          initial_balance DECIMAL(10,2) NOT NULL,
          current_balance DECIMAL(10,2) NOT NULL,
          customer_id INTEGER,
          status VARCHAR(20) DEFAULT 'active',
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      let query = 'SELECT * FROM gift_cards WHERE 1=1';
      const params = [];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const giftCards = getDb().prepare(query).all(...params);

      res.json({
        success: true,
        data: giftCards
      });
    } catch (error) {
      console.error('Error getting gift cards:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener tarjetas de regalo',
        error: error.message
      });
    }
  },

  /**
   * Crear tarjeta de regalo
   */
  async createGiftCard(req, res) {
    try {
      const { card_number, initial_balance, customer_id } = req.body;

      if (!card_number || !initial_balance) {
        return res.status(400).json({
          success: false,
          message: 'Número de tarjeta y saldo inicial son requeridos'
        });
      }

      // Verificar si el número ya existe
      const existing = getDb().prepare('SELECT id FROM gift_cards WHERE card_number = ?').get(card_number);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'El número de tarjeta ya existe'
        });
      }

      const result = getDb().prepare(`
        INSERT INTO gift_cards (card_number, initial_balance, current_balance, customer_id)
        VALUES (?, ?, ?, ?)
      `).run(
        card_number,
        initial_balance,
        initial_balance,
        customer_id || null
      );

      const giftCard = getDb().prepare('SELECT * FROM gift_cards WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Tarjeta de regalo creada',
        data: giftCard
      });
    } catch (error) {
      console.error('Error creating gift card:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear tarjeta de regalo',
        error: error.message
      });
    }
  }
};

export default promotionsController;
