/**
 * =====================================================
 * SYSME POS - Loyalty & Rewards Routes
 * =====================================================
 * Rutas del API para sistema de fidelización
 *
 * @module loyaltyRoutes
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
// const { authenticateToken, authorizeRole } = require('../middleware/auth');

// ====================================
// RUTAS DE MIEMBROS
// ====================================

/**
 * @route   GET /api/loyalty/members
 * @desc    Obtener todos los miembros del programa
 * @access  Private
 * @query   tier_id, status, search, engagement_status, sort_by, sort_order, limit, offset
 */
router.get('/members', loyaltyController.getAllMembers);

/**
 * @route   GET /api/loyalty/members/:id
 * @desc    Obtener miembro por ID con detalles completos
 * @access  Private
 */
router.get('/members/:id', loyaltyController.getMemberById);

/**
 * @route   POST /api/loyalty/members/enroll
 * @desc    Inscribir nuevo miembro al programa
 * @access  Private
 * @body    customer_id, initial_tier_id, referred_by_member_id
 */
router.post('/members/enroll', loyaltyController.enrollMember);

/**
 * @route   PUT /api/loyalty/members/:id
 * @desc    Actualizar información de miembro
 * @access  Private
 */
router.put('/members/:id', loyaltyController.updateMember);

// ====================================
// RUTAS DE PUNTOS
// ====================================

/**
 * @route   GET /api/loyalty/points/transactions
 * @desc    Obtener transacciones de puntos
 * @access  Private
 * @query   member_id, transaction_type, start_date, end_date, limit, offset
 */
router.get('/points/transactions', loyaltyController.getPointsTransactions);

/**
 * @route   POST /api/loyalty/points/award
 * @desc    Otorgar puntos a un miembro
 * @access  Private
 * @body    member_id, points, reference_type, reference_id, description, multiplier
 */
router.post('/points/award', loyaltyController.awardPoints);

/**
 * @route   POST /api/loyalty/points/adjust
 * @desc    Ajustar puntos manualmente
 * @access  Private (Admin, Manager)
 * @body    member_id, points, reason, notes
 */
router.post('/points/adjust', loyaltyController.adjustPoints);

// ====================================
// RUTAS DE RECOMPENSAS
// ====================================

/**
 * @route   GET /api/loyalty/rewards
 * @desc    Obtener catálogo de recompensas
 * @access  Public
 * @query   reward_type, min_tier_required, is_active, featured, limit, offset
 */
router.get('/rewards', loyaltyController.getAllRewards);

/**
 * @route   GET /api/loyalty/rewards/available/:member_id
 * @desc    Obtener recompensas disponibles para un miembro
 * @access  Private
 */
router.get('/rewards/available/:member_id', loyaltyController.getAvailableRewardsForMember);

/**
 * @route   POST /api/loyalty/rewards
 * @desc    Crear nueva recompensa
 * @access  Private (Admin, Manager)
 */
router.post('/rewards', loyaltyController.createReward);

/**
 * @route   POST /api/loyalty/rewards/redeem
 * @desc    Canjear recompensa
 * @access  Private
 * @body    member_id, reward_id
 */
router.post('/rewards/redeem', loyaltyController.redeemReward);

/**
 * @route   POST /api/loyalty/rewards/use/:redemption_code
 * @desc    Marcar canje como usado
 * @access  Private
 * @body    order_id, discount_applied
 */
router.post('/rewards/use/:redemption_code', loyaltyController.useRedemption);

// ====================================
// RUTAS DE TIERS
// ====================================

/**
 * @route   GET /api/loyalty/tiers
 * @desc    Obtener todos los tiers del programa
 * @access  Public
 */
router.get('/tiers', loyaltyController.getAllTiers);

// ====================================
// RUTAS DE ANALYTICS
// ====================================

/**
 * @route   GET /api/loyalty/analytics/dashboard
 * @desc    Obtener estadísticas del dashboard
 * @access  Private (Admin, Manager)
 */
router.get('/analytics/dashboard', loyaltyController.getDashboardStats);

/**
 * @route   GET /api/loyalty/analytics/top-members
 * @desc    Obtener top miembros del programa
 * @access  Private
 * @query   sort_by (lifetime_points, total_spent, total_visits), limit
 */
router.get('/analytics/top-members', loyaltyController.getTopMembers);

module.exports = router;
