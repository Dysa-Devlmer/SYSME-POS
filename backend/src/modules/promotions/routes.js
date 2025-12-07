/**
 * Promotions Routes
 * Rutas para gestión de promociones, cupones y tarjetas de regalo
 */

import { Router } from 'express';
import { promotionsController } from './controller.js';

const router = Router();

// Promociones
router.get('/promotions', promotionsController.getPromotions);
router.post('/promotions', promotionsController.createPromotion);

// Cupones
router.get('/coupons', promotionsController.getCoupons);
router.post('/coupons', promotionsController.createCoupon);
router.post('/coupons/:code/validate', promotionsController.validateCoupon);

// Tarjetas de regalo
router.get('/gift-cards', promotionsController.getGiftCards);
router.post('/gift-cards', promotionsController.createGiftCard);

export default router;
