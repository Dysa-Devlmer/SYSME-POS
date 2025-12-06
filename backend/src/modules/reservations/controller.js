/**
 * Reservations Controller
 * Handles all reservation operations including booking, confirmation, and management
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';

// Generate unique reservation code
const generateReservationCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `RES-${dateStr}-${random}`;
};

// Calculate end time based on start time and duration
const calculateEndTime = (startTime, durationMinutes) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
};

// ============================================
// SETTINGS
// ============================================

export const getSettings = async (req, res) => {
  try {
    const settings = await dbService.findOne('reservation_settings', { id: 1 });

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Reservation settings not found'
      });
    }

    // Parse JSON fields
    if (settings.suggested_percentages && typeof settings.suggested_percentages === 'string') {
      settings.suggested_percentages = JSON.parse(settings.suggested_percentages);
    }

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    logger.error('Error getting reservation settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting reservation settings'
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    // Update settings
    await dbService.update('reservation_settings', 1, updates);

    // Fetch updated settings
    const settings = await dbService.findOne('reservation_settings', { id: 1 });

    res.json({
      success: true,
      data: settings,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    logger.error('Error updating reservation settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reservation settings'
    });
  }
};

// ============================================
// RESERVATIONS CRUD
// ============================================

export const createReservation = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      party_size,
      reservation_date,
      reservation_time,
      duration_minutes,
      table_id,
      preferred_area,
      special_requests,
      occasion
    } = req.body;

    // Validate required fields
    if (!customer_name || !customer_phone || !party_size || !reservation_date || !reservation_time) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Get settings
    const settings = await dbService.findOne('reservation_settings', { id: 1 });

    // Validate party size
    if (party_size > settings.max_party_size) {
      return res.status(400).json({
        success: false,
        message: `Party size cannot exceed ${settings.max_party_size} people`
      });
    }

    // Generate reservation code
    const reservation_code = generateReservationCode();

    // Calculate end time
    const finalDuration = duration_minutes || settings.default_duration_minutes;
    const end_time = calculateEndTime(reservation_time, finalDuration);

    // Check table availability if table specified
    if (table_id) {
      const conflicts = await dbService.raw(
        `SELECT COUNT(*) as count FROM reservations
         WHERE table_id = ?
         AND reservation_date = ?
         AND status IN ('confirmed', 'seated')
         AND (
           (reservation_time <= ? AND end_time > ?)
           OR (reservation_time < ? AND end_time >= ?)
           OR (reservation_time >= ? AND reservation_time < ?)
         )`,
        [table_id, reservation_date, reservation_time, reservation_time, end_time, end_time, reservation_time, end_time]
      );

      if (conflicts[0].count > 0) {
        return res.status(409).json({
          success: false,
          message: 'Table not available for selected time'
        });
      }
    }

    // Create reservation
    const [reservationId] = await dbService.create('reservations', {
      reservation_code,
      customer_name,
      customer_phone,
      customer_email,
      party_size,
      reservation_date,
      reservation_time,
      duration_minutes: finalDuration,
      end_time,
      table_id,
      preferred_area,
      special_requests,
      occasion,
      status: settings.auto_confirm ? 'confirmed' : 'pending',
      created_by: req.user?.id
    });

    // Create history entry
    await dbService.create('reservation_history', {
      reservation_id: reservationId,
      action: 'created',
      new_status: settings.auto_confirm ? 'confirmed' : 'pending',
      changed_by: req.user?.id,
      notes: 'Reservation created'
    });

    // Fetch complete reservation
    const reservation = await dbService.findOne('reservations', { id: reservationId });

    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Reservation created successfully'
    });
  } catch (error) {
    logger.error('Error creating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating reservation'
    });
  }
};

export const getReservations = async (req, res) => {
  try {
    const { date, status, table_id, customer_phone } = req.query;

    let query = 'SELECT r.*, t.table_number FROM reservations r LEFT JOIN tables t ON r.table_id = t.id WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND r.reservation_date = ?';
      params.push(date);
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (table_id) {
      query += ' AND r.table_id = ?';
      params.push(table_id);
    }

    if (customer_phone) {
      query += ' AND r.customer_phone LIKE ?';
      params.push(`%${customer_phone}%`);
    }

    query += ' ORDER BY r.reservation_date DESC, r.reservation_time DESC';

    const reservations = await dbService.raw(query, params);

    res.json({
      success: true,
      data: reservations
    });
  } catch (error) {
    logger.error('Error getting reservations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting reservations'
    });
  }
};

export const getReservationById = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await dbService.raw(
      `SELECT r.*, t.table_number, t.capacity
       FROM reservations r
       LEFT JOIN tables t ON r.table_id = t.id
       WHERE r.id = ?`,
      [id]
    );

    if (!reservation || reservation.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Get history
    const history = await dbService.findMany('reservation_history', {
      reservation_id: id
    }, {
      orderBy: { field: 'created_at', direction: 'desc' }
    });

    res.json({
      success: true,
      data: {
        ...reservation[0],
        history
      }
    });
  } catch (error) {
    logger.error('Error getting reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting reservation'
    });
  }
};

export const updateReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if reservation exists
    const existing = await dbService.findOne('reservations', { id });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Recalculate end time if time or duration changed
    if (updates.reservation_time || updates.duration_minutes) {
      const time = updates.reservation_time || existing.reservation_time;
      const duration = updates.duration_minutes || existing.duration_minutes;
      updates.end_time = calculateEndTime(time, duration);
    }

    // Update reservation
    await dbService.update('reservations', id, updates);

    // Create history entry
    await dbService.create('reservation_history', {
      reservation_id: id,
      action: 'modified',
      changed_by: req.user?.id,
      change_details: JSON.stringify(updates),
      notes: 'Reservation updated'
    });

    // Fetch updated reservation
    const reservation = await dbService.findOne('reservations', { id });

    res.json({
      success: true,
      data: reservation,
      message: 'Reservation updated successfully'
    });
  } catch (error) {
    logger.error('Error updating reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating reservation'
    });
  }
};

export const confirmReservation = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await dbService.findOne('reservations', { id });
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await dbService.update('reservations', id, {
      status: 'confirmed',
      confirmed_by: req.user?.id,
      confirmation_sent: true,
      confirmation_sent_at: new Date().toISOString()
    });

    const updated = await dbService.findOne('reservations', { id });

    res.json({
      success: true,
      data: updated,
      message: 'Reservation confirmed'
    });
  } catch (error) {
    logger.error('Error confirming reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Error confirming reservation'
    });
  }
};

export const cancelReservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await dbService.findOne('reservations', { id });
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await dbService.update('reservations', id, {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason || 'No reason provided'
    });

    const updated = await dbService.findOne('reservations', { id });

    res.json({
      success: true,
      data: updated,
      message: 'Reservation cancelled'
    });
  } catch (error) {
    logger.error('Error cancelling reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling reservation'
    });
  }
};

export const markAsSeated = async (req, res) => {
  try {
    const { id } = req.params;

    const reservation = await dbService.findOne('reservations', { id });
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    await dbService.update('reservations', id, {
      status: 'seated',
      seated_at: new Date().toISOString()
    });

    const updated = await dbService.findOne('reservations', { id });

    res.json({
      success: true,
      data: updated,
      message: 'Marked as seated'
    });
  } catch (error) {
    logger.error('Error marking as seated:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking as seated'
    });
  }
};

export const markAsCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('reservations', id, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    const updated = await dbService.findOne('reservations', { id });

    res.json({
      success: true,
      data: updated,
      message: 'Reservation completed'
    });
  } catch (error) {
    logger.error('Error completing reservation:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing reservation'
    });
  }
};

export const markAsNoShow = async (req, res) => {
  try {
    const { id } = req.params;

    await dbService.update('reservations', id, {
      status: 'no_show'
    });

    const updated = await dbService.findOne('reservations', { id });

    res.json({
      success: true,
      data: updated,
      message: 'Marked as no-show'
    });
  } catch (error) {
    logger.error('Error marking as no-show:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking as no-show'
    });
  }
};

// ============================================
// AVAILABILITY
// ============================================

export const checkAvailability = async (req, res) => {
  try {
    const { date, time, party_size, duration_minutes } = req.query;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required'
      });
    }

    const settings = await dbService.findOne('reservation_settings', { id: 1 });
    const duration = parseInt(duration_minutes) || settings.default_duration_minutes;
    const end_time = calculateEndTime(time, duration);

    // Get all tables
    const tables = await dbService.findMany('tables', { is_active: 1 });

    // Get reservations for that date/time
    const reservations = await dbService.raw(
      `SELECT table_id FROM reservations
       WHERE reservation_date = ?
       AND status IN ('confirmed', 'seated')
       AND (
         (reservation_time <= ? AND end_time > ?)
         OR (reservation_time < ? AND end_time >= ?)
         OR (reservation_time >= ? AND reservation_time < ?)
       )`,
      [date, time, time, end_time, end_time, time, end_time]
    );

    const occupiedTableIds = reservations.map(r => r.table_id).filter(Boolean);
    const availableTables = tables.filter(t => !occupiedTableIds.includes(t.id));

    // If party size specified, filter by capacity
    let suitableTables = availableTables;
    if (party_size) {
      suitableTables = availableTables.filter(t => t.capacity >= parseInt(party_size));
    }

    res.json({
      success: true,
      data: {
        available: suitableTables.length > 0,
        total_tables: tables.length,
        occupied_tables: occupiedTableIds.length,
        available_tables: suitableTables.length,
        suitable_tables: suitableTables
      }
    });
  } catch (error) {
    logger.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking availability'
    });
  }
};

export const getTimeSlots = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const settings = await dbService.findOne('reservation_settings', { id: 1 });

    // Generate time slots
    const slots = [];
    const [startHour, startMinute] = settings.business_hours_start.split(':').map(Number);
    const [endHour, endMinute] = settings.business_hours_end.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes < endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      slots.push({
        time: timeStr,
        available: true // Will be updated based on reservations
      });

      currentMinutes += settings.slot_interval_minutes;
    }

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    logger.error('Error getting time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting time slots'
    });
  }
};

// ============================================
// REPORTS
// ============================================

export const getReservationStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM v_reservation_stats WHERE 1=1';
    const params = [];

    if (start_date && end_date) {
      query += ' AND date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY date DESC LIMIT 30';

    const stats = await dbService.raw(query, params);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting reservation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting reservation stats'
    });
  }
};
