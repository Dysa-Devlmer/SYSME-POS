/**
 * =====================================================
 * SYSME POS - Delivery Integration Routes
 * =====================================================
 * Rutas del API para integración con plataformas de delivery
 *
 * @module deliveryRoutes
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
// const { authenticateToken, authorizeRole } = require('../middleware/auth');

// ====================================
// RUTAS DE PLATAFORMAS
// ====================================

/**
 * @route   GET /api/delivery/platforms
 * @desc    Obtener todas las plataformas de delivery
 * @access  Private
 * @query   is_active
 */
router.get('/platforms', deliveryController.getAllPlatforms);

/**
 * @route   GET /api/delivery/platforms/:id
 * @desc    Obtener plataforma por ID con estadísticas
 * @access  Private
 */
router.get('/platforms/:id', deliveryController.getPlatformById);

/**
 * @route   POST /api/delivery/platforms
 * @desc    Crear nueva plataforma de delivery
 * @access  Private (Admin)
 */
router.post('/platforms', deliveryController.createPlatform);

/**
 * @route   PUT /api/delivery/platforms/:id
 * @desc    Actualizar plataforma
 * @access  Private (Admin)
 */
router.put('/platforms/:id', deliveryController.updatePlatform);

// ====================================
// RUTAS DE ÓRDENES
// ====================================

/**
 * @route   GET /api/delivery/orders
 * @desc    Obtener órdenes de delivery con filtros
 * @access  Private
 * @query   platform_id, platform_status, start_date, end_date, sync_status, limit, offset
 */
router.get('/orders', deliveryController.getDeliveryOrders);

/**
 * @route   GET /api/delivery/orders/active
 * @desc    Obtener órdenes activas (en proceso)
 * @access  Private
 */
router.get('/orders/active', deliveryController.getActiveOrders);

/**
 * @route   POST /api/delivery/orders
 * @desc    Crear nueva orden de delivery (desde plataforma)
 * @access  Public (webhook)
 */
router.post('/orders', deliveryController.createDeliveryOrder);

/**
 * @route   PUT /api/delivery/orders/:id/status
 * @desc    Actualizar estado de orden
 * @access  Private
 * @body    platform_status, notes
 */
router.put('/orders/:id/status', deliveryController.updateOrderStatus);

// ====================================
// RUTAS DE SINCRONIZACIÓN
// ====================================

/**
 * @route   POST /api/delivery/sync/menu
 * @desc    Iniciar sincronización de menú
 * @access  Private (Admin, Manager)
 * @body    platform_id, sync_type
 */
router.post('/sync/menu', deliveryController.syncMenu);

/**
 * @route   GET /api/delivery/sync/:id
 * @desc    Obtener estado de sincronización
 * @access  Private
 */
router.get('/sync/:id', deliveryController.getSyncStatus);

/**
 * @route   GET /api/delivery/mappings
 * @desc    Obtener mapeos de productos
 * @access  Private
 * @query   platform_id
 */
router.get('/mappings', deliveryController.getProductMappings);

// ====================================
// RUTAS DE WEBHOOKS
// ====================================

/**
 * @route   POST /api/delivery/webhook/:platform_code
 * @desc    Recibir webhook de plataforma
 * @access  Public (webhook)
 */
router.post('/webhook/:platform_code', deliveryController.handleWebhook);

// ====================================
// RUTAS DE ANALYTICS
// ====================================

/**
 * @route   GET /api/delivery/analytics/performance
 * @desc    Obtener rendimiento por plataforma
 * @access  Private (Admin, Manager)
 */
router.get('/analytics/performance', deliveryController.getPlatformPerformance);

/**
 * @route   GET /api/delivery/analytics/stats
 * @desc    Obtener estadísticas de delivery
 * @access  Private (Admin, Manager)
 * @query   period, start_date, end_date
 */
router.get('/analytics/stats', deliveryController.getDeliveryStats);

module.exports = router;
