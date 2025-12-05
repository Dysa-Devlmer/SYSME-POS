// =====================================================
// SYSME POS - Reservations Controller
// =====================================================
const { dbManager } = require('../config/database');
const logger = require('../config/logger');

class ReservationsController {
  async getReservations(req, res, next) {
    try {
      const { date, status, location_id } = req.query;
      const targetDate = date || new Date().toISOString().split('T')[0];

      let query = `
        SELECT
          r.*,
          c.first_name, c.last_name, c.email, c.phone,
          l.name as location_name,
          t.table_number
        FROM reservations r
        LEFT JOIN customers c ON r.customer_id = c.id
        LEFT JOIN locations l ON r.location_id = l.id
        LEFT JOIN tables t ON r.table_id = t.id
        WHERE r.company_id = ? AND DATE(r.reservation_datetime) = ?
      `;

      const params = [req.user.company_id, targetDate];

      if (status) {
        query += ' AND r.status = ?';
        params.push(status);
      }

      if (location_id) {
        query += ' AND r.location_id = ?';
        params.push(location_id);
      }

      query += ' ORDER BY r.reservation_datetime';

      const reservations = await dbManager.all(query, params);

      res.json({ success: true, data: reservations });
    } catch (error) {
      logger.error('Error fetching reservations:', error);
      next(error);
    }
  }

  async createReservation(req, res, next) {
    try {
      const {
        customer_id, location_id, reservation_datetime,
        party_size, table_id, special_requests, customer_name,
        customer_phone, customer_email
      } = req.body;

      if (!location_id || !reservation_datetime || !party_size) {
        return res.status(400).json({
          success: false,
          message: 'Location, datetime, and party size are required'
        });
      }

      let finalCustomerId = customer_id;

      // Create customer if not exists
      if (!customer_id && customer_name && customer_phone) {
        const newCustomer = await dbManager.run(`
          INSERT INTO customers (company_id, first_name, phone, email)
          VALUES (?, ?, ?, ?)
        `, [req.user.company_id, customer_name, customer_phone, customer_email || null]);

        finalCustomerId = newCustomer.lastID;
      }

      const result = await dbManager.run(`
        INSERT INTO reservations (
          company_id, location_id, customer_id, reservation_datetime,
          party_size, table_id, special_requests, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `, [
        req.user.company_id, location_id, finalCustomerId,
        reservation_datetime, party_size, table_id || null,
        special_requests || null, req.user.id
      ]);

      logger.info(`Reservation ${result.lastID} created by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Reservation created successfully',
        data: { reservation_id: result.lastID }
      });
    } catch (error) {
      logger.error('Error creating reservation:', error);
      next(error);
    }
  }

  async updateReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { reservation_datetime, party_size, table_id, special_requests, status } = req.body;

      const reservation = await dbManager.get(
        'SELECT * FROM reservations WHERE id = ? AND company_id = ?',
        [id, req.user.company_id]
      );

      if (!reservation) {
        return res.status(404).json({ success: false, message: 'Reservation not found' });
      }

      await dbManager.run(`
        UPDATE reservations
        SET reservation_datetime = ?,
            party_size = ?,
            table_id = ?,
            special_requests = ?,
            status = ?
        WHERE id = ?
      `, [
        reservation_datetime || reservation.reservation_datetime,
        party_size || reservation.party_size,
        table_id !== undefined ? table_id : reservation.table_id,
        special_requests !== undefined ? special_requests : reservation.special_requests,
        status || reservation.status,
        id
      ]);

      logger.info(`Reservation ${id} updated by user ${req.user.id}`);

      res.json({ success: true, message: 'Reservation updated successfully' });
    } catch (error) {
      logger.error('Error updating reservation:', error);
      next(error);
    }
  }

  async confirmReservation(req, res, next) {
    try {
      const { id } = req.params;

      await dbManager.run(`
        UPDATE reservations
        SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `, [id, req.user.company_id]);

      logger.info(`Reservation ${id} confirmed by user ${req.user.id}`);

      res.json({ success: true, message: 'Reservation confirmed' });
    } catch (error) {
      logger.error('Error confirming reservation:', error);
      next(error);
    }
  }

  async cancelReservation(req, res, next) {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body;

      await dbManager.run(`
        UPDATE reservations
        SET status = 'cancelled',
            cancellation_reason = ?,
            cancelled_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `, [cancellation_reason || null, id, req.user.company_id]);

      logger.info(`Reservation ${id} cancelled by user ${req.user.id}`);

      res.json({ success: true, message: 'Reservation cancelled' });
    } catch (error) {
      logger.error('Error cancelling reservation:', error);
      next(error);
    }
  }

  async getWaitlist(req, res, next) {
    try {
      const { location_id } = req.query;

      let query = `
        SELECT
          w.*,
          c.first_name, c.last_name, c.phone,
          l.name as location_name
        FROM waitlist w
        LEFT JOIN customers c ON w.customer_id = c.id
        LEFT JOIN locations l ON w.location_id = l.id
        WHERE w.company_id = ? AND w.status = 'waiting'
      `;

      const params = [req.user.company_id];

      if (location_id) {
        query += ' AND w.location_id = ?';
        params.push(location_id);
      }

      query += ' ORDER BY w.created_at';

      const waitlist = await dbManager.all(query, params);

      res.json({ success: true, data: waitlist });
    } catch (error) {
      logger.error('Error fetching waitlist:', error);
      next(error);
    }
  }

  async addToWaitlist(req, res, next) {
    try {
      const { location_id, party_size, customer_name, customer_phone, estimated_wait_minutes } = req.body;

      if (!location_id || !party_size || !customer_name || !customer_phone) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }

      const result = await dbManager.run(`
        INSERT INTO waitlist (
          company_id, location_id, party_size,
          customer_name, customer_phone, estimated_wait_minutes,
          status
        ) VALUES (?, ?, ?, ?, ?, ?, 'waiting')
      `, [
        req.user.company_id, location_id, party_size,
        customer_name, customer_phone, estimated_wait_minutes || 30
      ]);

      logger.info(`Added ${customer_name} to waitlist by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        message: 'Added to waitlist',
        data: { waitlist_id: result.lastID }
      });
    } catch (error) {
      logger.error('Error adding to waitlist:', error);
      next(error);
    }
  }

  async seatWaitlist(req, res, next) {
    try {
      const { id } = req.params;
      const { table_id } = req.body;

      await dbManager.run(`
        UPDATE waitlist
        SET status = 'seated',
            table_id = ?,
            seated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND company_id = ?
      `, [table_id || null, id, req.user.company_id]);

      logger.info(`Waitlist ${id} seated by user ${req.user.id}`);

      res.json({ success: true, message: 'Customer seated' });
    } catch (error) {
      logger.error('Error seating waitlist:', error);
      next(error);
    }
  }
}

module.exports = new ReservationsController();
