/**
 * Customers Routes
 * Rutas para gestión de clientes
 */

import { Router } from 'express';
import { customersController } from './controller.js';

const router = Router();

// Estadísticas (debe ir antes de /:id)
router.get('/stats', customersController.getStats);

// CRUD de clientes
router.get('/', customersController.getAll);
router.get('/:id', customersController.getById);
router.post('/', customersController.create);
router.put('/:id', customersController.update);
router.delete('/:id', customersController.delete);

// Órdenes del cliente
router.get('/:id/orders', customersController.getOrders);

// Fidelización
router.get('/:id/loyalty', customersController.getLoyalty);
router.post('/:id/loyalty/add-points', customersController.addLoyaltyPoints);
router.post('/:id/loyalty/redeem', customersController.redeemReward);

export default router;
