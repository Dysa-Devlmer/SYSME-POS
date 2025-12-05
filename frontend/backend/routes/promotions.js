// =====================================================
// SYSME POS - Promotions Routes
// =====================================================
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const promotionsController = require('../controllers/promotionsController');

// All routes require authentication
router.use(authenticateToken);

// Promotions
router.get('/promotions', promotionsController.getPromotions);
router.post('/promotions', requireRole(['admin', 'manager']), promotionsController.createPromotion);

// Coupons
router.get('/coupons', promotionsController.getCoupons);
router.post('/coupons', requireRole(['admin', 'manager']), promotionsController.createCoupon);
router.post('/coupons/:code/validate', promotionsController.validateCoupon);

// Gift Cards
router.get('/gift-cards', promotionsController.getGiftCards);
router.post('/gift-cards', requireRole(['admin', 'manager']), promotionsController.createGiftCard);

module.exports = router;
