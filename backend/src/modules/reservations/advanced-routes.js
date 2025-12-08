/**
 * Advanced Reservations Routes
 * Rutas para el sistema avanzado de reservas
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import {
  // Shifts
  getShifts,
  createShift,
  updateShift,

  // Waitlist
  addToWaitlist,
  getWaitlist,
  convertWaitlistToReservation,
  removeFromWaitlist,

  // No-show
  recordNoShow,
  getCustomerNoShowHistory,

  // Reminders
  scheduleReminder,
  getPendingReminders,
  markReminderSent,

  // Widget (público)
  getWidgetConfig,
  createWidgetConfig,
  updateWidgetConfig,
  createPublicReservation,

  // Blocks
  createBlock,
  getBlocks,
  deleteBlock,

  // Dashboard & Reports
  getReservationDashboard,
  getNoShowReport,
  getOccupancyReport
} from './advanced-controller.js';

const router = Router();

// ============================================
// RUTAS PÚBLICAS (Widget)
// ============================================

// Widget público - sin auth
router.get('/widget/:token', getWidgetConfig);
router.post('/widget/:token/book', createPublicReservation);

// ============================================
// RUTAS PROTEGIDAS
// ============================================

// Turnos (Shifts)
router.get('/shifts', authenticate, getShifts);
router.post('/shifts', authenticate, createShift);
router.put('/shifts/:id', authenticate, updateShift);

// Waitlist
router.get('/waitlist', authenticate, getWaitlist);
router.post('/waitlist', addToWaitlist); // Puede ser público o protegido
router.post('/waitlist/:waitlistId/convert', authenticate, convertWaitlistToReservation);
router.delete('/waitlist/:waitlistId', authenticate, removeFromWaitlist);

// No-show Management
router.post('/no-show/:reservationId', authenticate, recordNoShow);
router.get('/no-show/history/:phone', authenticate, getCustomerNoShowHistory);

// Reminders
router.get('/reminders/pending', authenticate, getPendingReminders);
router.post('/reminders/:reservationId', authenticate, scheduleReminder);
router.post('/reminders/:reminderId/sent', authenticate, markReminderSent);

// Widget Config (Dashboard)
router.post('/widget-config', authenticate, createWidgetConfig);
router.put('/widget-config/:id', authenticate, updateWidgetConfig);

// Blocks
router.get('/blocks', authenticate, getBlocks);
router.post('/blocks', authenticate, createBlock);
router.delete('/blocks/:id', authenticate, deleteBlock);

// Dashboard & Reports
router.get('/dashboard', authenticate, getReservationDashboard);
router.get('/reports/no-shows', authenticate, getNoShowReport);
router.get('/reports/occupancy', authenticate, getOccupancyReport);

export default router;
