/**
 * Advanced Reservations Controller
 * Sistema avanzado de reservas para restaurantes multi-sucursal
 *
 * Funcionalidades:
 * - Waitlist con notificaciones
 * - Overbooking controlado
 * - Gestión de turnos (almuerzo/cena)
 * - No-show tracking con penalizaciones
 * - Recordatorios automáticos
 * - Widget embebible público
 * - Integración con loyalty
 * - Multi-sucursal
 */

import { dbService } from '../../config/database.js';
import { logger } from '../../config/logger.js';
import { emitToAll, emitToRoom } from '../../websockets/socketHandler.js';
import crypto from 'crypto';

// ============================================
// INICIALIZACIÓN DE TABLAS AVANZADAS
// ============================================

export const initAdvancedReservationTables = () => {
  const db = dbService.getDatabase();

  // Turnos de servicio (shifts)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      name TEXT NOT NULL,
      shift_type TEXT DEFAULT 'lunch',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      max_reservations INTEGER DEFAULT 50,
      max_covers INTEGER DEFAULT 200,
      overbooking_percentage REAL DEFAULT 10,
      days_of_week TEXT DEFAULT '[1,2,3,4,5,6,7]',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )
  `);

  // Waitlist (lista de espera)
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_waitlist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      party_size INTEGER NOT NULL,
      requested_date TEXT NOT NULL,
      requested_shift_id INTEGER,
      preferred_time TEXT,
      flexible_time INTEGER DEFAULT 1,
      status TEXT DEFAULT 'waiting',
      position INTEGER,
      notification_sent INTEGER DEFAULT 0,
      notification_sent_at TEXT,
      converted_to_reservation_id INTEGER,
      expires_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (requested_shift_id) REFERENCES reservation_shifts(id),
      FOREIGN KEY (converted_to_reservation_id) REFERENCES reservations(id)
    )
  `);

  // No-show tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_no_show_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT NOT NULL,
      customer_email TEXT,
      reservation_id INTEGER,
      no_show_date TEXT NOT NULL,
      penalty_applied INTEGER DEFAULT 0,
      penalty_type TEXT,
      penalty_amount INTEGER DEFAULT 0,
      penalty_expires_at TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    )
  `);

  // Recordatorios programados
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      reminder_type TEXT DEFAULT 'sms',
      scheduled_at TEXT NOT NULL,
      sent_at TEXT,
      status TEXT DEFAULT 'pending',
      message_content TEXT,
      response TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (reservation_id) REFERENCES reservations(id)
    )
  `);

  // Configuración de widget público
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_widget_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      widget_token TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      primary_color TEXT DEFAULT '#E53935',
      secondary_color TEXT DEFAULT '#1976D2',
      logo_url TEXT,
      welcome_message TEXT DEFAULT '¡Reserva tu mesa!',
      success_message TEXT DEFAULT 'Tu reserva ha sido confirmada',
      require_email INTEGER DEFAULT 0,
      require_special_requests INTEGER DEFAULT 0,
      show_occasions INTEGER DEFAULT 1,
      min_advance_hours INTEGER DEFAULT 2,
      max_advance_days INTEGER DEFAULT 30,
      allowed_party_sizes TEXT DEFAULT '[1,2,3,4,5,6,7,8]',
      blocked_dates TEXT,
      custom_css TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )
  `);

  // Ocasiones especiales
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_occasions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      is_active INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0
    )
  `);

  // Bloqueos de horarios
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      block_type TEXT DEFAULT 'full_day',
      block_date TEXT,
      start_time TEXT,
      end_time TEXT,
      reason TEXT,
      affected_tables TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Capacidad dinámica por hora
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservation_capacity_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER,
      override_date TEXT NOT NULL,
      hour INTEGER NOT NULL,
      max_covers INTEGER NOT NULL,
      reason TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )
  `);

  // Preferencias de cliente (para clientes recurrentes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS customer_reservation_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_phone TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      preferred_table_ids TEXT,
      preferred_area TEXT,
      dietary_restrictions TEXT,
      vip_status INTEGER DEFAULT 0,
      total_reservations INTEGER DEFAULT 0,
      total_no_shows INTEGER DEFAULT 0,
      loyalty_member_id INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loyalty_member_id) REFERENCES loyalty_members(id)
    )
  `);

  // Índices
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_waitlist_date ON reservation_waitlist(requested_date);
    CREATE INDEX IF NOT EXISTS idx_waitlist_status ON reservation_waitlist(status);
    CREATE INDEX IF NOT EXISTS idx_no_show_phone ON customer_no_show_history(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_reminders_status ON reservation_reminders(status);
    CREATE INDEX IF NOT EXISTS idx_blocks_date ON reservation_blocks(block_date);
    CREATE INDEX IF NOT EXISTS idx_shifts_branch ON reservation_shifts(branch_id);
  `);

  // Insertar turnos por defecto si no existen
  const shiftsExist = db.prepare('SELECT COUNT(*) as count FROM reservation_shifts').get();
  if (shiftsExist.count === 0) {
    const defaultShifts = [
      { name: 'Almuerzo', shift_type: 'lunch', start_time: '12:00', end_time: '16:00', max_reservations: 40 },
      { name: 'Cena', shift_type: 'dinner', start_time: '19:00', end_time: '23:30', max_reservations: 50 }
    ];

    for (const shift of defaultShifts) {
      db.prepare(`
        INSERT INTO reservation_shifts (name, shift_type, start_time, end_time, max_reservations)
        VALUES (?, ?, ?, ?, ?)
      `).run(shift.name, shift.shift_type, shift.start_time, shift.end_time, shift.max_reservations);
    }
  }

  // Insertar ocasiones por defecto
  const occasionsExist = db.prepare('SELECT COUNT(*) as count FROM reservation_occasions').get();
  if (occasionsExist.count === 0) {
    const occasions = [
      { name: 'Cumpleaños', icon: '🎂', display_order: 1 },
      { name: 'Aniversario', icon: '💑', display_order: 2 },
      { name: 'Cena de negocios', icon: '💼', display_order: 3 },
      { name: 'Cita romántica', icon: '❤️', display_order: 4 },
      { name: 'Celebración familiar', icon: '👨‍👩‍👧‍👦', display_order: 5 },
      { name: 'Reunión de amigos', icon: '👥', display_order: 6 },
      { name: 'Otro', icon: '📅', display_order: 99 }
    ];

    for (const occ of occasions) {
      db.prepare(`
        INSERT INTO reservation_occasions (name, icon, display_order)
        VALUES (?, ?, ?)
      `).run(occ.name, occ.icon, occ.display_order);
    }
  }

  console.log('✅ Advanced reservation tables initialized');
};

// NOTE: initAdvancedReservationTables() debe ser llamado desde server.js
// después de que la base de datos esté inicializada

// ============================================
// UTILIDADES
// ============================================

const generateWidgetToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

const generateWaitlistPosition = async (branchId, date) => {
  const db = dbService.getDatabase();
  const result = db.prepare(`
    SELECT MAX(position) as max_pos FROM reservation_waitlist
    WHERE branch_id = ? AND requested_date = ? AND status = 'waiting'
  `).get(branchId || 1, date);
  return (result?.max_pos || 0) + 1;
};

// ============================================
// TURNOS (SHIFTS)
// ============================================

export const getShifts = async (req, res) => {
  try {
    const { branchId } = req.query;
    const db = dbService.getDatabase();

    let query = 'SELECT * FROM reservation_shifts WHERE is_active = 1';
    const params = [];

    if (branchId) {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(branchId);
    }

    query += ' ORDER BY start_time';

    const shifts = db.prepare(query).all(...params);

    res.json({
      success: true,
      shifts: shifts.map(s => ({
        ...s,
        days_of_week: JSON.parse(s.days_of_week || '[1,2,3,4,5,6,7]')
      }))
    });
  } catch (error) {
    logger.error('Error getting shifts:', error);
    res.status(500).json({ error: 'Error al obtener turnos' });
  }
};

export const createShift = async (req, res) => {
  try {
    const { name, shift_type, start_time, end_time, max_reservations, max_covers, overbooking_percentage, days_of_week, branch_id } = req.body;
    const db = dbService.getDatabase();

    const result = db.prepare(`
      INSERT INTO reservation_shifts (name, shift_type, start_time, end_time, max_reservations, max_covers, overbooking_percentage, days_of_week, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, shift_type, start_time, end_time, max_reservations || 50, max_covers || 200, overbooking_percentage || 10, JSON.stringify(days_of_week || [1,2,3,4,5,6,7]), branch_id);

    const shift = db.prepare('SELECT * FROM reservation_shifts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, shift });
  } catch (error) {
    logger.error('Error creating shift:', error);
    res.status(500).json({ error: 'Error al crear turno' });
  }
};

export const updateShift = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = dbService.getDatabase();

    if (updates.days_of_week) {
      updates.days_of_week = JSON.stringify(updates.days_of_week);
    }

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE reservation_shifts SET ${fields} WHERE id = ?`).run(...values, id);

    const shift = db.prepare('SELECT * FROM reservation_shifts WHERE id = ?').get(id);

    res.json({ success: true, shift });
  } catch (error) {
    logger.error('Error updating shift:', error);
    res.status(500).json({ error: 'Error al actualizar turno' });
  }
};

// ============================================
// WAITLIST (LISTA DE ESPERA)
// ============================================

export const addToWaitlist = async (req, res) => {
  try {
    const { customer_name, customer_phone, customer_email, party_size, requested_date, requested_shift_id, preferred_time, flexible_time, notes, branch_id } = req.body;
    const db = dbService.getDatabase();

    // Verificar no-shows previos
    const noShowCount = db.prepare(`
      SELECT COUNT(*) as count FROM customer_no_show_history
      WHERE customer_phone = ? AND penalty_expires_at > datetime('now')
    `).get(customer_phone);

    if (noShowCount.count >= 3) {
      return res.status(403).json({
        error: 'Cliente con múltiples no-shows. Contactar al restaurante directamente.',
        no_show_count: noShowCount.count
      });
    }

    // Calcular posición
    const position = await generateWaitlistPosition(branch_id, requested_date);

    // Calcular expiración (24 horas después de la fecha solicitada)
    const expiresAt = new Date(requested_date);
    expiresAt.setDate(expiresAt.getDate() + 1);

    const result = db.prepare(`
      INSERT INTO reservation_waitlist (
        branch_id, customer_name, customer_phone, customer_email, party_size,
        requested_date, requested_shift_id, preferred_time, flexible_time,
        position, expires_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      branch_id || 1, customer_name, customer_phone, customer_email, party_size,
      requested_date, requested_shift_id, preferred_time, flexible_time ? 1 : 0,
      position, expiresAt.toISOString(), notes
    );

    const waitlistEntry = db.prepare('SELECT * FROM reservation_waitlist WHERE id = ?').get(result.lastInsertRowid);

    // Notificar al dashboard
    emitToAll('waitlist:new_entry', {
      entry: waitlistEntry,
      position
    });

    res.status(201).json({
      success: true,
      waitlist: waitlistEntry,
      message: `Agregado a lista de espera. Posición: ${position}`
    });
  } catch (error) {
    logger.error('Error adding to waitlist:', error);
    res.status(500).json({ error: 'Error al agregar a lista de espera' });
  }
};

export const getWaitlist = async (req, res) => {
  try {
    const { date, branch_id, status } = req.query;
    const db = dbService.getDatabase();

    let query = `
      SELECT w.*, rs.name as shift_name
      FROM reservation_waitlist w
      LEFT JOIN reservation_shifts rs ON rs.id = w.requested_shift_id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ' AND w.requested_date = ?';
      params.push(date);
    }

    if (branch_id) {
      query += ' AND w.branch_id = ?';
      params.push(branch_id);
    }

    if (status) {
      query += ' AND w.status = ?';
      params.push(status);
    } else {
      query += " AND w.status = 'waiting'";
    }

    query += ' ORDER BY w.position ASC';

    const waitlist = db.prepare(query).all(...params);

    res.json({ success: true, waitlist });
  } catch (error) {
    logger.error('Error getting waitlist:', error);
    res.status(500).json({ error: 'Error al obtener lista de espera' });
  }
};

export const convertWaitlistToReservation = async (req, res) => {
  try {
    const { waitlistId } = req.params;
    const { table_id, reservation_time } = req.body;
    const db = dbService.getDatabase();

    const entry = db.prepare('SELECT * FROM reservation_waitlist WHERE id = ?').get(waitlistId);

    if (!entry) {
      return res.status(404).json({ error: 'Entrada de waitlist no encontrada' });
    }

    // Crear reservación
    const reservationCode = `RES-${Date.now().toString(36).toUpperCase()}`;

    const result = db.prepare(`
      INSERT INTO reservations (
        reservation_code, customer_name, customer_phone, customer_email,
        party_size, reservation_date, reservation_time, table_id,
        special_requests, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'waitlist')
    `).run(
      reservationCode, entry.customer_name, entry.customer_phone, entry.customer_email,
      entry.party_size, entry.requested_date, reservation_time || entry.preferred_time,
      table_id, entry.notes
    );

    const reservationId = result.lastInsertRowid;

    // Actualizar waitlist
    db.prepare(`
      UPDATE reservation_waitlist
      SET status = 'converted', converted_to_reservation_id = ?, notification_sent = 1, notification_sent_at = datetime('now')
      WHERE id = ?
    `).run(reservationId, waitlistId);

    // Reordenar posiciones
    db.prepare(`
      UPDATE reservation_waitlist
      SET position = position - 1
      WHERE requested_date = ? AND position > ? AND status = 'waiting'
    `).run(entry.requested_date, entry.position);

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

    // Notificar
    emitToAll('waitlist:converted', {
      waitlist_id: waitlistId,
      reservation
    });

    res.json({
      success: true,
      reservation,
      message: 'Reserva creada desde lista de espera'
    });
  } catch (error) {
    logger.error('Error converting waitlist:', error);
    res.status(500).json({ error: 'Error al convertir a reserva' });
  }
};

export const removeFromWaitlist = async (req, res) => {
  try {
    const { waitlistId } = req.params;
    const { reason } = req.body;
    const db = dbService.getDatabase();

    const entry = db.prepare('SELECT * FROM reservation_waitlist WHERE id = ?').get(waitlistId);

    if (!entry) {
      return res.status(404).json({ error: 'Entrada no encontrada' });
    }

    db.prepare(`
      UPDATE reservation_waitlist SET status = 'removed', notes = COALESCE(notes, '') || ' | Removido: ' || ?
      WHERE id = ?
    `).run(reason || 'Sin razón', waitlistId);

    // Reordenar
    db.prepare(`
      UPDATE reservation_waitlist
      SET position = position - 1
      WHERE requested_date = ? AND position > ? AND status = 'waiting'
    `).run(entry.requested_date, entry.position);

    res.json({ success: true, message: 'Removido de lista de espera' });
  } catch (error) {
    logger.error('Error removing from waitlist:', error);
    res.status(500).json({ error: 'Error al remover de lista de espera' });
  }
};

// ============================================
// NO-SHOW MANAGEMENT
// ============================================

export const recordNoShow = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { apply_penalty, penalty_type, notes } = req.body;
    const db = dbService.getDatabase();

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Actualizar reserva a no-show
    db.prepare(`UPDATE reservations SET status = 'no_show' WHERE id = ?`).run(reservationId);

    // Calcular expiración de penalidad (30 días)
    const penaltyExpires = new Date();
    penaltyExpires.setDate(penaltyExpires.getDate() + 30);

    // Registrar no-show
    db.prepare(`
      INSERT INTO customer_no_show_history (
        customer_phone, customer_email, reservation_id, no_show_date,
        penalty_applied, penalty_type, penalty_expires_at, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reservation.customer_phone, reservation.customer_email, reservationId,
      reservation.reservation_date, apply_penalty ? 1 : 0, penalty_type,
      penaltyExpires.toISOString(), notes
    );

    // Actualizar preferencias del cliente
    db.prepare(`
      INSERT INTO customer_reservation_preferences (customer_phone, customer_name, total_no_shows)
      VALUES (?, ?, 1)
      ON CONFLICT(customer_phone) DO UPDATE SET
        total_no_shows = total_no_shows + 1,
        updated_at = datetime('now')
    `).run(reservation.customer_phone, reservation.customer_name);

    // Obtener conteo total de no-shows
    const noShowHistory = db.prepare(`
      SELECT COUNT(*) as total FROM customer_no_show_history WHERE customer_phone = ?
    `).get(reservation.customer_phone);

    res.json({
      success: true,
      message: 'No-show registrado',
      total_no_shows: noShowHistory.total,
      penalty_applied: apply_penalty
    });
  } catch (error) {
    logger.error('Error recording no-show:', error);
    res.status(500).json({ error: 'Error al registrar no-show' });
  }
};

export const getCustomerNoShowHistory = async (req, res) => {
  try {
    const { phone } = req.params;
    const db = dbService.getDatabase();

    const history = db.prepare(`
      SELECT nsh.*, r.reservation_date, r.reservation_time
      FROM customer_no_show_history nsh
      LEFT JOIN reservations r ON r.id = nsh.reservation_id
      WHERE nsh.customer_phone = ?
      ORDER BY nsh.created_at DESC
    `).all(phone);

    const preferences = db.prepare(`
      SELECT * FROM customer_reservation_preferences WHERE customer_phone = ?
    `).get(phone);

    res.json({
      success: true,
      history,
      preferences,
      total_no_shows: history.length,
      active_penalties: history.filter(h => h.penalty_applied && new Date(h.penalty_expires_at) > new Date()).length
    });
  } catch (error) {
    logger.error('Error getting no-show history:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// ============================================
// RECORDATORIOS
// ============================================

export const scheduleReminder = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { reminder_type, hours_before, message_content } = req.body;
    const db = dbService.getDatabase();

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservationId);

    if (!reservation) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Calcular fecha de recordatorio
    const reservationDateTime = new Date(`${reservation.reservation_date}T${reservation.reservation_time}`);
    const reminderDateTime = new Date(reservationDateTime.getTime() - (hours_before || 24) * 60 * 60 * 1000);

    const result = db.prepare(`
      INSERT INTO reservation_reminders (reservation_id, reminder_type, scheduled_at, message_content)
      VALUES (?, ?, ?, ?)
    `).run(reservationId, reminder_type || 'sms', reminderDateTime.toISOString(), message_content);

    const reminder = db.prepare('SELECT * FROM reservation_reminders WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, reminder });
  } catch (error) {
    logger.error('Error scheduling reminder:', error);
    res.status(500).json({ error: 'Error al programar recordatorio' });
  }
};

export const getPendingReminders = async (req, res) => {
  try {
    const db = dbService.getDatabase();

    const reminders = db.prepare(`
      SELECT rr.*, r.customer_name, r.customer_phone, r.customer_email,
             r.reservation_date, r.reservation_time, r.party_size
      FROM reservation_reminders rr
      JOIN reservations r ON r.id = rr.reservation_id
      WHERE rr.status = 'pending' AND rr.scheduled_at <= datetime('now')
      ORDER BY rr.scheduled_at
    `).all();

    res.json({ success: true, reminders });
  } catch (error) {
    logger.error('Error getting pending reminders:', error);
    res.status(500).json({ error: 'Error al obtener recordatorios' });
  }
};

export const markReminderSent = async (req, res) => {
  try {
    const { reminderId } = req.params;
    const { response } = req.body;
    const db = dbService.getDatabase();

    db.prepare(`
      UPDATE reservation_reminders
      SET status = 'sent', sent_at = datetime('now'), response = ?
      WHERE id = ?
    `).run(response, reminderId);

    res.json({ success: true, message: 'Recordatorio marcado como enviado' });
  } catch (error) {
    logger.error('Error marking reminder sent:', error);
    res.status(500).json({ error: 'Error al actualizar recordatorio' });
  }
};

// ============================================
// WIDGET PÚBLICO
// ============================================

export const getWidgetConfig = async (req, res) => {
  try {
    const { token } = req.params;
    const db = dbService.getDatabase();

    const config = db.prepare(`
      SELECT wc.*, b.name as branch_name, b.address as branch_address
      FROM reservation_widget_config wc
      LEFT JOIN branches b ON b.id = wc.branch_id
      WHERE wc.widget_token = ? AND wc.is_active = 1
    `).get(token);

    if (!config) {
      return res.status(404).json({ error: 'Widget no encontrado o inactivo' });
    }

    // Obtener ocasiones
    const occasions = db.prepare(`
      SELECT * FROM reservation_occasions WHERE is_active = 1 ORDER BY display_order
    `).all();

    // Obtener turnos disponibles
    const shifts = db.prepare(`
      SELECT id, name, shift_type, start_time, end_time
      FROM reservation_shifts
      WHERE is_active = 1 AND (branch_id = ? OR branch_id IS NULL)
      ORDER BY start_time
    `).all(config.branch_id || 1);

    res.json({
      success: true,
      config: {
        ...config,
        allowed_party_sizes: JSON.parse(config.allowed_party_sizes || '[1,2,3,4,5,6,7,8]'),
        blocked_dates: JSON.parse(config.blocked_dates || '[]')
      },
      occasions,
      shifts
    });
  } catch (error) {
    logger.error('Error getting widget config:', error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

export const createWidgetConfig = async (req, res) => {
  try {
    const { branch_id, ...config } = req.body;
    const db = dbService.getDatabase();

    const token = generateWidgetToken();

    if (config.allowed_party_sizes) {
      config.allowed_party_sizes = JSON.stringify(config.allowed_party_sizes);
    }
    if (config.blocked_dates) {
      config.blocked_dates = JSON.stringify(config.blocked_dates);
    }

    const result = db.prepare(`
      INSERT INTO reservation_widget_config (branch_id, widget_token, primary_color, secondary_color, logo_url, welcome_message, success_message, require_email, min_advance_hours, max_advance_days, allowed_party_sizes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      branch_id, token,
      config.primary_color || '#E53935',
      config.secondary_color || '#1976D2',
      config.logo_url,
      config.welcome_message || '¡Reserva tu mesa!',
      config.success_message || 'Tu reserva ha sido confirmada',
      config.require_email ? 1 : 0,
      config.min_advance_hours || 2,
      config.max_advance_days || 30,
      config.allowed_party_sizes || '[1,2,3,4,5,6,7,8]'
    );

    const widgetConfig = db.prepare('SELECT * FROM reservation_widget_config WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      config: widgetConfig,
      embed_url: `${process.env.FRONTEND_URL || 'https://app.sysme.cl'}/reservations/widget/${token}`
    });
  } catch (error) {
    logger.error('Error creating widget config:', error);
    res.status(500).json({ error: 'Error al crear configuración de widget' });
  }
};

export const updateWidgetConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const db = dbService.getDatabase();

    if (updates.allowed_party_sizes) {
      updates.allowed_party_sizes = JSON.stringify(updates.allowed_party_sizes);
    }
    if (updates.blocked_dates) {
      updates.blocked_dates = JSON.stringify(updates.blocked_dates);
    }

    updates.updated_at = new Date().toISOString();

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE reservation_widget_config SET ${fields} WHERE id = ?`).run(...values, id);

    const config = db.prepare('SELECT * FROM reservation_widget_config WHERE id = ?').get(id);

    res.json({ success: true, config });
  } catch (error) {
    logger.error('Error updating widget config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

// Crear reserva desde widget (público)
export const createPublicReservation = async (req, res) => {
  try {
    const { token } = req.params;
    const { customer_name, customer_phone, customer_email, party_size, reservation_date, reservation_time, shift_id, occasion, special_requests } = req.body;
    const db = dbService.getDatabase();

    // Verificar widget
    const widget = db.prepare(`
      SELECT * FROM reservation_widget_config WHERE widget_token = ? AND is_active = 1
    `).get(token);

    if (!widget) {
      return res.status(404).json({ error: 'Widget inválido' });
    }

    // Validar party size
    const allowedSizes = JSON.parse(widget.allowed_party_sizes || '[1,2,3,4,5,6,7,8]');
    if (!allowedSizes.includes(party_size)) {
      return res.status(400).json({ error: 'Tamaño de grupo no permitido' });
    }

    // Validar fecha bloqueada
    const blockedDates = JSON.parse(widget.blocked_dates || '[]');
    if (blockedDates.includes(reservation_date)) {
      return res.status(400).json({ error: 'Fecha no disponible para reservas' });
    }

    // Verificar no-shows del cliente
    const noShowCount = db.prepare(`
      SELECT COUNT(*) as count FROM customer_no_show_history
      WHERE customer_phone = ? AND penalty_expires_at > datetime('now')
    `).get(customer_phone);

    if (noShowCount.count >= 2) {
      return res.status(403).json({
        error: 'Por favor contacte al restaurante directamente para realizar su reserva.',
        contact_required: true
      });
    }

    // Verificar disponibilidad
    const shift = db.prepare('SELECT * FROM reservation_shifts WHERE id = ?').get(shift_id);
    const existingReservations = db.prepare(`
      SELECT COUNT(*) as count FROM reservations
      WHERE reservation_date = ? AND status IN ('pending', 'confirmed')
    `).get(reservation_date);

    const maxWithOverbooking = shift ? Math.floor(shift.max_reservations * (1 + shift.overbooking_percentage / 100)) : 50;

    if (existingReservations.count >= maxWithOverbooking) {
      // Agregar a waitlist automáticamente
      const position = await generateWaitlistPosition(widget.branch_id, reservation_date);

      db.prepare(`
        INSERT INTO reservation_waitlist (
          branch_id, customer_name, customer_phone, customer_email, party_size,
          requested_date, requested_shift_id, preferred_time, position
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(widget.branch_id || 1, customer_name, customer_phone, customer_email, party_size, reservation_date, shift_id, reservation_time, position);

      return res.status(202).json({
        success: true,
        waitlisted: true,
        position,
        message: `No hay disponibilidad. Has sido agregado a la lista de espera en posición ${position}.`
      });
    }

    // Crear reserva
    const reservationCode = `RES-${Date.now().toString(36).toUpperCase()}`;

    const result = db.prepare(`
      INSERT INTO reservations (
        reservation_code, customer_name, customer_phone, customer_email,
        party_size, reservation_date, reservation_time, occasion,
        special_requests, status, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'widget')
    `).run(
      reservationCode, customer_name, customer_phone, customer_email,
      party_size, reservation_date, reservation_time, occasion, special_requests
    );

    const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);

    // Programar recordatorio (24 horas antes)
    const reminderDate = new Date(`${reservation_date}T${reservation_time}`);
    reminderDate.setHours(reminderDate.getHours() - 24);

    db.prepare(`
      INSERT INTO reservation_reminders (reservation_id, reminder_type, scheduled_at, message_content)
      VALUES (?, 'sms', ?, ?)
    `).run(
      reservation.id,
      reminderDate.toISOString(),
      `Recordatorio: Tienes una reserva mañana a las ${reservation_time} para ${party_size} personas. Código: ${reservationCode}`
    );

    // Actualizar preferencias del cliente
    db.prepare(`
      INSERT INTO customer_reservation_preferences (customer_phone, customer_name, total_reservations)
      VALUES (?, ?, 1)
      ON CONFLICT(customer_phone) DO UPDATE SET
        total_reservations = total_reservations + 1,
        updated_at = datetime('now')
    `).run(customer_phone, customer_name);

    // Notificar al dashboard
    emitToAll('reservation:new', {
      reservation,
      source: 'widget'
    });

    res.status(201).json({
      success: true,
      reservation: {
        code: reservationCode,
        date: reservation_date,
        time: reservation_time,
        party_size,
        status: 'confirmed'
      },
      message: widget.success_message || 'Tu reserva ha sido confirmada'
    });
  } catch (error) {
    logger.error('Error creating public reservation:', error);
    res.status(500).json({ error: 'Error al crear reserva' });
  }
};

// ============================================
// BLOQUEOS DE HORARIOS
// ============================================

export const createBlock = async (req, res) => {
  try {
    const { block_type, block_date, start_time, end_time, reason, affected_tables, branch_id } = req.body;
    const db = dbService.getDatabase();

    const result = db.prepare(`
      INSERT INTO reservation_blocks (branch_id, block_type, block_date, start_time, end_time, reason, affected_tables, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      branch_id, block_type || 'full_day', block_date, start_time, end_time,
      reason, affected_tables ? JSON.stringify(affected_tables) : null, req.user?.id
    );

    const block = db.prepare('SELECT * FROM reservation_blocks WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ success: true, block });
  } catch (error) {
    logger.error('Error creating block:', error);
    res.status(500).json({ error: 'Error al crear bloqueo' });
  }
};

export const getBlocks = async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;
    const db = dbService.getDatabase();

    let query = 'SELECT * FROM reservation_blocks WHERE 1=1';
    const params = [];

    if (start_date && end_date) {
      query += ' AND block_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (branch_id) {
      query += ' AND (branch_id = ? OR branch_id IS NULL)';
      params.push(branch_id);
    }

    query += ' ORDER BY block_date';

    const blocks = db.prepare(query).all(...params);

    res.json({
      success: true,
      blocks: blocks.map(b => ({
        ...b,
        affected_tables: b.affected_tables ? JSON.parse(b.affected_tables) : null
      }))
    });
  } catch (error) {
    logger.error('Error getting blocks:', error);
    res.status(500).json({ error: 'Error al obtener bloqueos' });
  }
};

export const deleteBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const db = dbService.getDatabase();

    db.prepare('DELETE FROM reservation_blocks WHERE id = ?').run(id);

    res.json({ success: true, message: 'Bloqueo eliminado' });
  } catch (error) {
    logger.error('Error deleting block:', error);
    res.status(500).json({ error: 'Error al eliminar bloqueo' });
  }
};

// ============================================
// ANALYTICS Y REPORTES
// ============================================

export const getReservationDashboard = async (req, res) => {
  try {
    const { branch_id } = req.query;
    const db = dbService.getDatabase();
    const today = new Date().toISOString().slice(0, 10);

    // Reservas de hoy
    const todayReservations = db.prepare(`
      SELECT r.*, t.table_number
      FROM reservations r
      LEFT JOIN tables t ON t.id = r.table_id
      WHERE r.reservation_date = ?
      ORDER BY r.reservation_time
    `).all(today);

    // Estadísticas del día
    const todayStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'seated' THEN 1 ELSE 0 END) as seated,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(party_size) as total_covers
      FROM reservations
      WHERE reservation_date = ?
    `).get(today);

    // Waitlist de hoy
    const todayWaitlist = db.prepare(`
      SELECT * FROM reservation_waitlist
      WHERE requested_date = ? AND status = 'waiting'
      ORDER BY position
    `).all(today);

    // Próximas reservas (próximos 7 días)
    const upcomingStats = db.prepare(`
      SELECT reservation_date, COUNT(*) as count, SUM(party_size) as covers
      FROM reservations
      WHERE reservation_date > ? AND reservation_date <= date(?, '+7 days')
        AND status IN ('pending', 'confirmed')
      GROUP BY reservation_date
      ORDER BY reservation_date
    `).all(today, today);

    // Recordatorios pendientes
    const pendingReminders = db.prepare(`
      SELECT COUNT(*) as count FROM reservation_reminders
      WHERE status = 'pending' AND scheduled_at <= datetime('now')
    `).get();

    // Capacidad por turno hoy
    const shifts = db.prepare(`
      SELECT rs.*,
             (SELECT COUNT(*) FROM reservations
              WHERE reservation_date = ? AND reservation_time >= rs.start_time AND reservation_time < rs.end_time
                AND status IN ('confirmed', 'seated')) as current_reservations,
             (SELECT SUM(party_size) FROM reservations
              WHERE reservation_date = ? AND reservation_time >= rs.start_time AND reservation_time < rs.end_time
                AND status IN ('confirmed', 'seated')) as current_covers
      FROM reservation_shifts rs
      WHERE rs.is_active = 1
    `).all(today, today);

    res.json({
      success: true,
      dashboard: {
        today: {
          date: today,
          reservations: todayReservations,
          stats: todayStats,
          waitlist: todayWaitlist
        },
        upcoming: upcomingStats,
        shifts: shifts.map(s => ({
          ...s,
          occupancy_percentage: s.max_reservations > 0 ? Math.round((s.current_reservations / s.max_reservations) * 100) : 0,
          covers_percentage: s.max_covers > 0 ? Math.round((s.current_covers / s.max_covers) * 100) : 0
        })),
        pending_reminders: pendingReminders.count
      }
    });
  } catch (error) {
    logger.error('Error getting reservation dashboard:', error);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

export const getNoShowReport = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const db = dbService.getDatabase();

    const start = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const end = end_date || new Date().toISOString().slice(0, 10);

    // Top no-show customers
    const topNoShows = db.prepare(`
      SELECT customer_phone, COUNT(*) as no_show_count,
             MAX(no_show_date) as last_no_show
      FROM customer_no_show_history
      WHERE no_show_date BETWEEN ? AND ?
      GROUP BY customer_phone
      ORDER BY no_show_count DESC
      LIMIT 20
    `).all(start, end);

    // Daily no-show rate
    const dailyRate = db.prepare(`
      SELECT
        reservation_date as date,
        COUNT(*) as total_reservations,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
        ROUND(CAST(SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as no_show_rate
      FROM reservations
      WHERE reservation_date BETWEEN ? AND ?
      GROUP BY reservation_date
      ORDER BY reservation_date DESC
    `).all(start, end);

    // Summary
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_reservations,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as total_no_shows,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completed,
        ROUND(CAST(SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS REAL) / COUNT(*) * 100, 1) as overall_no_show_rate
      FROM reservations
      WHERE reservation_date BETWEEN ? AND ?
    `).get(start, end);

    res.json({
      success: true,
      report: {
        period: { start, end },
        summary,
        top_no_show_customers: topNoShows,
        daily_breakdown: dailyRate
      }
    });
  } catch (error) {
    logger.error('Error getting no-show report:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

export const getOccupancyReport = async (req, res) => {
  try {
    const { date, branch_id } = req.query;
    const db = dbService.getDatabase();

    const targetDate = date || new Date().toISOString().slice(0, 10);

    // Ocupación por hora
    const hourlyOccupancy = db.prepare(`
      SELECT
        strftime('%H', reservation_time) as hour,
        COUNT(*) as reservations,
        SUM(party_size) as covers
      FROM reservations
      WHERE reservation_date = ? AND status IN ('confirmed', 'seated', 'completed')
      GROUP BY strftime('%H', reservation_time)
      ORDER BY hour
    `).all(targetDate);

    // Ocupación por mesa
    const tableOccupancy = db.prepare(`
      SELECT
        t.id, t.table_number, t.capacity,
        COUNT(r.id) as reservation_count,
        SUM(CASE WHEN r.status IN ('confirmed', 'seated') THEN 1 ELSE 0 END) as active_reservations
      FROM tables t
      LEFT JOIN reservations r ON r.table_id = t.id AND r.reservation_date = ?
      WHERE t.is_active = 1
      GROUP BY t.id
      ORDER BY t.table_number
    `).all(targetDate);

    res.json({
      success: true,
      report: {
        date: targetDate,
        hourly_occupancy: hourlyOccupancy,
        table_occupancy: tableOccupancy
      }
    });
  } catch (error) {
    logger.error('Error getting occupancy report:', error);
    res.status(500).json({ error: 'Error al obtener reporte de ocupación' });
  }
};

export default {
  initAdvancedReservationTables,
  getShifts,
  createShift,
  updateShift,
  addToWaitlist,
  getWaitlist,
  convertWaitlistToReservation,
  removeFromWaitlist,
  recordNoShow,
  getCustomerNoShowHistory,
  scheduleReminder,
  getPendingReminders,
  markReminderSent,
  getWidgetConfig,
  createWidgetConfig,
  updateWidgetConfig,
  createPublicReservation,
  createBlock,
  getBlocks,
  deleteBlock,
  getReservationDashboard,
  getNoShowReport,
  getOccupancyReport
};
