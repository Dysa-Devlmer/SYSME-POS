/**
 * Reservations Routes
 */

import express from 'express';
import {
  getSettings,
  updateSettings,
  createReservation,
  getReservations,
  getReservationById,
  updateReservation,
  confirmReservation,
  cancelReservation,
  markAsSeated,
  markAsCompleted,
  markAsNoShow,
  checkAvailability,
  getTimeSlots,
  getReservationStats
} from './controller.js';

const router = express.Router();

// Settings routes
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Reservation CRUD
router.post('/', createReservation);
router.get('/', getReservations);
router.get('/:id', getReservationById);
router.put('/:id', updateReservation);

// Reservation actions
router.post('/:id/confirm', confirmReservation);
router.post('/:id/cancel', cancelReservation);
router.post('/:id/seated', markAsSeated);
router.post('/:id/completed', markAsCompleted);
router.post('/:id/no-show', markAsNoShow);

// Availability
router.get('/availability/check', checkAvailability);
router.get('/availability/slots', getTimeSlots);

// Reports
router.get('/stats/summary', getReservationStats);

export default router;
