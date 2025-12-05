// =====================================================
// SYSME POS - Reservations Routes
// =====================================================
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const reservationsController = require('../controllers/reservationsController');

// All routes require authentication
router.use(authenticateToken);

// Reservations
router.get('/', reservationsController.getReservations);
router.post('/', reservationsController.createReservation);
router.put('/:id', reservationsController.updateReservation);
router.post('/:id/confirm', reservationsController.confirmReservation);
router.post('/:id/cancel', reservationsController.cancelReservation);

// Waitlist
router.get('/waitlist', reservationsController.getWaitlist);
router.post('/waitlist', reservationsController.addToWaitlist);
router.post('/waitlist/:id/seat', reservationsController.seatWaitlist);

module.exports = router;
