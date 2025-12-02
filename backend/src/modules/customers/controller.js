/**
 * Customers Controller
 * Gestión de clientes y programa de fidelización
 */

import { getDatabase } from '../../config/database.js';

// Helper para obtener la conexión
const getDb = () => getDatabase();

export const customersController = {
  /**
   * Obtener todos los clientes con filtros
   */
  async getAll(req, res) {
    try {
      const { search, tier, segment, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT
          c.*,
          COALESCE(c.total_spent, 0) as lifetime_value,
          COALESCE(c.visit_count, 0) as total_orders
        FROM customers c
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ` AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      query += ` ORDER BY c.created_at DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), parseInt(offset));

      const customers = getDb().prepare(query).all(...params);

      // Contar total
      let countQuery = `SELECT COUNT(*) as total FROM customers WHERE 1=1`;
      const countParams = [];
      if (search) {
        countQuery += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
      const { total } = getDb().prepare(countQuery).get(...countParams);

      res.json({
        success: true,
        data: customers,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Error getting customers:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener clientes',
        error: error.message
      });
    }
  },

  /**
   * Obtener cliente por ID
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const customer = getDb().prepare(`
        SELECT * FROM customers WHERE id = ?
      `).get(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      // Obtener órdenes recientes
      const recentOrders = getDb().prepare(`
        SELECT s.*, u.first_name as cashier_name
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.customer_id = ?
        ORDER BY s.created_at DESC
        LIMIT 10
      `).all(id);

      res.json({
        success: true,
        data: {
          ...customer,
          recent_orders: recentOrders,
          loyalty_summary: {
            current_points: customer.loyalty_points || 0,
            total_earned: customer.total_spent || 0,
            total_redeemed: 0
          }
        }
      });
    } catch (error) {
      console.error('Error getting customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener cliente',
        error: error.message
      });
    }
  },

  /**
   * Crear nuevo cliente
   */
  async create(req, res) {
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

      // Validación
      if (!first_name || !last_name) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y apellido son requeridos'
        });
      }

      const name = `${first_name} ${last_name}`;

      const result = getDb().prepare(`
        INSERT INTO customers (name, email, phone, birth_date, address, preferences)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        name,
        email || null,
        phone || null,
        date_of_birth || null,
        address ? JSON.stringify(address) : null,
        JSON.stringify({ gender, notes })
      );

      const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: customer
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear cliente',
        error: error.message
      });
    }
  },

  /**
   * Actualizar cliente
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const fields = [];
      const values = [];

      if (updates.first_name && updates.last_name) {
        fields.push('name = ?');
        values.push(`${updates.first_name} ${updates.last_name}`);
      }
      if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
      }
      if (updates.phone !== undefined) {
        fields.push('phone = ?');
        values.push(updates.phone);
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        getDb().prepare(`
          UPDATE customers SET ${fields.join(', ')} WHERE id = ?
        `).run(...values);
      }

      const updatedCustomer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);

      res.json({
        success: true,
        message: 'Cliente actualizado',
        data: updatedCustomer
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar cliente',
        error: error.message
      });
    }
  },

  /**
   * Eliminar cliente
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      getDb().prepare('DELETE FROM customers WHERE id = ?').run(id);

      res.json({
        success: true,
        message: 'Cliente eliminado'
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar cliente',
        error: error.message
      });
    }
  },

  /**
   * Obtener órdenes de un cliente
   */
  async getOrders(req, res) {
    try {
      const { id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const orders = getDb().prepare(`
        SELECT s.*, u.first_name as cashier_name
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.customer_id = ?
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
      `).all(id, parseInt(limit), parseInt(offset));

      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error getting customer orders:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener órdenes',
        error: error.message
      });
    }
  },

  /**
   * Obtener información de fidelización
   */
  async getLoyalty(req, res) {
    try {
      const { id } = req.params;

      const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      res.json({
        success: true,
        data: {
          current_points: customer.loyalty_points || 0,
          total_spent: customer.total_spent || 0,
          visit_count: customer.visit_count || 0,
          tier: customer.loyalty_tier || 'bronze'
        }
      });
    } catch (error) {
      console.error('Error getting loyalty info:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener información de fidelización',
        error: error.message
      });
    }
  },

  /**
   * Agregar puntos de fidelización
   */
  async addLoyaltyPoints(req, res) {
    try {
      const { id } = req.params;
      const { points, reason, notes } = req.body;

      if (!points || points <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Puntos debe ser mayor a 0'
        });
      }

      const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Cliente no encontrado'
        });
      }

      const newPoints = (customer.loyalty_points || 0) + points;

      getDb().prepare(`
        UPDATE customers
        SET loyalty_points = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newPoints, id);

      res.json({
        success: true,
        message: `${points} puntos agregados`,
        data: {
          previous_points: customer.loyalty_points || 0,
          added_points: points,
          new_total: newPoints
        }
      });
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      res.status(500).json({
        success: false,
        message: 'Error al agregar puntos',
        error: error.message
      });
    }
  },

  /**
   * Canjear recompensa
   */
  async redeemReward(req, res) {
    try {
      const { id } = req.params;
      const { reward_id } = req.body;

      // Por ahora retornar mensaje de funcionalidad en desarrollo
      res.json({
        success: true,
        message: 'Funcionalidad de canje en desarrollo',
        data: { reward_id }
      });
    } catch (error) {
      console.error('Error redeeming reward:', error);
      res.status(500).json({
        success: false,
        message: 'Error al canjear recompensa',
        error: error.message
      });
    }
  },

  /**
   * Estadísticas de clientes
   */
  async getStats(req, res) {
    try {
      const stats = getDb().prepare(`
        SELECT
          COUNT(*) as total_customers,
          COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as new_this_month,
          COALESCE(SUM(total_spent), 0) as total_revenue,
          COALESCE(AVG(total_spent), 0) as avg_lifetime_value
        FROM customers
      `).get();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting customer stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message
      });
    }
  }
};

export default customersController;
