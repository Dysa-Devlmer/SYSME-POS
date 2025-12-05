// =====================================================
// SYSME POS - Suppliers Controller
// =====================================================
const { dbManager } = require('../config/database');
const logger = require('../config/logger');

class SuppliersController {
  async getSuppliers(req, res, next) {
    try {
      const { search, is_active } = req.query;

      let query = 'SELECT * FROM suppliers WHERE company_id = ?';
      const params = [req.user.company_id];

      if (search) {
        query += ' AND (name LIKE ? OR contact_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (is_active !== undefined) {
        query += ' AND is_active = ?';
        params.push(is_active === 'true' ? 1 : 0);
      }

      query += ' ORDER BY name';

      const suppliers = await dbManager.all(query, params);

      res.json({ success: true, data: suppliers });
    } catch (error) {
      logger.error('Error fetching suppliers:', error);
      next(error);
    }
  }

  async getSupplier(req, res, next) {
    try {
      const { id } = req.params;

      const supplier = await dbManager.get(
        'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
        [id, req.user.company_id]
      );

      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      // Get purchase orders
      const purchaseOrders = await dbManager.all(`
        SELECT * FROM purchase_orders
        WHERE supplier_id = ?
        ORDER BY created_at DESC
        LIMIT 20
      `, [id]);

      res.json({ success: true, data: { ...supplier, purchase_orders: purchaseOrders } });
    } catch (error) {
      logger.error('Error fetching supplier:', error);
      next(error);
    }
  }

  async createSupplier(req, res, next) {
    try {
      const { name, contact_name, email, phone, address, payment_terms, notes } = req.body;

      if (!name) {
        return res.status(400).json({ success: false, message: 'Supplier name is required' });
      }

      const result = await dbManager.run(`
        INSERT INTO suppliers (
          company_id, name, contact_name, email, phone,
          address, payment_terms, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.company_id, name, contact_name || null,
        email || null, phone || null, address || null,
        payment_terms || null, notes || null
      ]);

      logger.info(`Supplier ${result.lastID} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        data: { supplier_id: result.lastID }
      });
    } catch (error) {
      logger.error('Error creating supplier:', error);
      next(error);
    }
  }

  async updateSupplier(req, res, next) {
    try {
      const { id } = req.params;
      const { name, contact_name, email, phone, address, payment_terms, notes, is_active } = req.body;

      const supplier = await dbManager.get(
        'SELECT * FROM suppliers WHERE id = ? AND company_id = ?',
        [id, req.user.company_id]
      );

      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      await dbManager.run(`
        UPDATE suppliers
        SET name = ?, contact_name = ?, email = ?, phone = ?,
            address = ?, payment_terms = ?, notes = ?, is_active = ?
        WHERE id = ?
      `, [
        name || supplier.name,
        contact_name !== undefined ? contact_name : supplier.contact_name,
        email !== undefined ? email : supplier.email,
        phone !== undefined ? phone : supplier.phone,
        address !== undefined ? address : supplier.address,
        payment_terms !== undefined ? payment_terms : supplier.payment_terms,
        notes !== undefined ? notes : supplier.notes,
        is_active !== undefined ? is_active : supplier.is_active,
        id
      ]);

      logger.info(`Supplier ${id} updated by user ${req.user.id}`);

      res.json({ success: true, message: 'Supplier updated successfully' });
    } catch (error) {
      logger.error('Error updating supplier:', error);
      next(error);
    }
  }

  async deleteSupplier(req, res, next) {
    try {
      const { id } = req.params;

      // Check for existing purchase orders
      const poCount = await dbManager.get(
        'SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?',
        [id]
      );

      if (poCount.count > 0) {
        // Soft delete
        await dbManager.run('UPDATE suppliers SET is_active = 0 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Supplier deactivated (has purchase history)' });
      } else {
        await dbManager.run('DELETE FROM suppliers WHERE id = ?', [id]);
        res.json({ success: true, message: 'Supplier deleted successfully' });
      }

      logger.info(`Supplier ${id} deleted by user ${req.user.id}`);
    } catch (error) {
      logger.error('Error deleting supplier:', error);
      next(error);
    }
  }
}

module.exports = new SuppliersController();
