/**
 * Cash Session Routes
 * Endpoints para manejo de sesiones de caja
 */

const express = require('express');
const router = express.Router();
const cashSessionService = require('../services/cashSessionService');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');
const logger = require('../utils/logger');

// Validaciones
const openSessionValidation = [
    body('initialAmount')
        .isNumeric()
        .withMessage('El monto inicial debe ser numérico')
        .isFloat({ min: 0 })
        .withMessage('El monto inicial debe ser mayor o igual a 0'),
    body('terminalId')
        .optional()
        .isString()
        .withMessage('El ID del terminal debe ser una cadena')
];

const closeSessionValidation = [
    body('countedCash')
        .isNumeric()
        .withMessage('El efectivo contado debe ser numérico')
        .isFloat({ min: 0 })
        .withMessage('El efectivo contado debe ser mayor o igual a 0'),
    body('notes')
        .optional()
        .isString()
        .withMessage('Las notas deben ser una cadena'),
    body('bills_100000').optional().isInt({ min: 0 }),
    body('bills_50000').optional().isInt({ min: 0 }),
    body('bills_20000').optional().isInt({ min: 0 }),
    body('bills_10000').optional().isInt({ min: 0 }),
    body('bills_5000').optional().isInt({ min: 0 }),
    body('bills_2000').optional().isInt({ min: 0 }),
    body('bills_1000').optional().isInt({ min: 0 }),
    body('coins_500').optional().isInt({ min: 0 }),
    body('coins_100').optional().isInt({ min: 0 }),
    body('coins_50').optional().isInt({ min: 0 }),
    body('coins_10').optional().isInt({ min: 0 })
];

const movementValidation = [
    body('type')
        .isIn(['entry', 'withdrawal', 'adjustment'])
        .withMessage('Tipo de movimiento inválido'),
    body('amount')
        .isNumeric()
        .withMessage('El monto debe ser numérico')
        .isFloat({ min: 0.01 })
        .withMessage('El monto debe ser mayor a 0'),
    body('reason')
        .isString()
        .notEmpty()
        .withMessage('La razón es requerida'),
    body('description')
        .optional()
        .isString(),
    body('authorizedBy')
        .optional()
        .isString()
];

/**
 * @route   POST /api/cash-sessions/open
 * @desc    Abrir nueva sesión de caja
 * @access  Private (Cashier, Admin)
 */
router.post('/open',
    authenticate,
    authorize(['cashier', 'admin', 'manager']),
    openSessionValidation,
    validateRequest,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const { initialAmount, terminalId } = req.body;

            const result = await cashSessionService.openSession(
                userId,
                initialAmount,
                terminalId
            );

            logger.info(`Sesión de caja abierta por usuario ${userId}`);

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.session
            });

        } catch (error) {
            logger.error('Error en apertura de sesión:', error);
            res.status(error.message.includes('Ya existe') ? 409 : 500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * @route   POST /api/cash-sessions/close
 * @desc    Cerrar sesión de caja actual
 * @access  Private (Cashier, Admin)
 */
router.post('/close',
    authenticate,
    authorize(['cashier', 'admin', 'manager']),
    closeSessionValidation,
    validateRequest,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const closingData = req.body;

            const result = await cashSessionService.closeSession(userId, closingData);

            logger.info(`Sesión de caja cerrada por usuario ${userId}`);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    session: result.session,
                    summary: result.summary,
                    report: result.report,
                    difference: result.difference
                }
            });

        } catch (error) {
            logger.error('Error en cierre de sesión:', error);
            res.status(error.message.includes('No hay') ? 404 : 500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * @route   GET /api/cash-sessions/current
 * @desc    Obtener sesión actual del usuario
 * @access  Private (Cashier, Admin)
 */
router.get('/current',
    authenticate,
    authorize(['cashier', 'admin', 'manager']),
    async (req, res) => {
        try {
            const userId = req.user.id;
            const session = await cashSessionService.getCurrentSession(userId);

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay sesión de caja abierta'
                });
            }

            res.status(200).json({
                success: true,
                data: session
            });

        } catch (error) {
            logger.error('Error obteniendo sesión actual:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener sesión actual'
            });
        }
    }
);

/**
 * @route   POST /api/cash-sessions/:sessionId/movements
 * @desc    Registrar movimiento de caja
 * @access  Private (Cashier, Admin, Manager)
 */
router.post('/:sessionId/movements',
    authenticate,
    authorize(['cashier', 'admin', 'manager']),
    param('sessionId').isNumeric(),
    movementValidation,
    validateRequest,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const movementData = {
                ...req.body,
                authorizedBy: req.body.authorizedBy || req.user.name
            };

            const result = await cashSessionService.registerMovement(
                sessionId,
                movementData
            );

            logger.info(`Movimiento registrado en sesión ${sessionId}`);

            res.status(200).json({
                success: true,
                message: 'Movimiento registrado exitosamente',
                data: result
            });

        } catch (error) {
            logger.error('Error registrando movimiento:', error);
            res.status(error.message.includes('no encontrada') ? 404 : 500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * @route   GET /api/cash-sessions/history
 * @desc    Obtener historial de sesiones
 * @access  Private (Admin, Manager)
 */
router.get('/history',
    authenticate,
    authorize(['admin', 'manager']),
    [
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
        query('userId').optional().isNumeric(),
        query('terminalId').optional().isString(),
        query('status').optional().isIn(['open', 'closed']),
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601()
    ],
    validateRequest,
    async (req, res) => {
        try {
            const filters = {
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 20,
                userId: req.query.userId,
                terminalId: req.query.terminalId,
                status: req.query.status,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo
            };

            const result = await cashSessionService.getSessionHistory(filters);

            res.status(200).json({
                success: true,
                data: result.sessions,
                pagination: result.pagination
            });

        } catch (error) {
            logger.error('Error obteniendo historial:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener historial de sesiones'
            });
        }
    }
);

/**
 * @route   GET /api/cash-sessions/:sessionId/report/x
 * @desc    Generar corte X (reporte parcial)
 * @access  Private (Cashier, Admin, Manager)
 */
router.get('/:sessionId/report/x',
    authenticate,
    authorize(['cashier', 'admin', 'manager']),
    param('sessionId').isNumeric(),
    validateRequest,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const report = await cashSessionService.generateXReport(sessionId);

            logger.info(`Corte X generado para sesión ${sessionId}`);

            res.status(200).json({
                success: true,
                data: report
            });

        } catch (error) {
            logger.error('Error generando corte X:', error);
            res.status(error.message.includes('no encontrada') ? 404 : 500).json({
                success: false,
                message: error.message
            });
        }
    }
);

/**
 * @route   GET /api/cash-sessions/:sessionId/summary
 * @desc    Obtener resumen de sesión
 * @access  Private (All authenticated)
 */
router.get('/:sessionId/summary',
    authenticate,
    param('sessionId').isNumeric(),
    validateRequest,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const summary = await cashSessionService.calculateSessionSummary(sessionId);

            res.status(200).json({
                success: true,
                data: summary
            });

        } catch (error) {
            logger.error('Error obteniendo resumen:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener resumen de sesión'
            });
        }
    }
);

/**
 * @route   GET /api/cash-sessions/:sessionId/report
 * @desc    Obtener reporte completo de sesión cerrada
 * @access  Private (Admin, Manager)
 */
router.get('/:sessionId/report',
    authenticate,
    authorize(['admin', 'manager']),
    param('sessionId').isNumeric(),
    validateRequest,
    async (req, res) => {
        try {
            const { sessionId } = req.params;
            const report = await cashSessionService.generateClosingReport(sessionId);

            res.status(200).json({
                success: true,
                data: report
            });

        } catch (error) {
            logger.error('Error obteniendo reporte:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener reporte de sesión'
            });
        }
    }
);

/**
 * @route   GET /api/cash-sessions/stats
 * @desc    Obtener estadísticas generales de sesiones
 * @access  Private (Admin, Manager)
 */
router.get('/stats',
    authenticate,
    authorize(['admin', 'manager']),
    [
        query('dateFrom').optional().isISO8601(),
        query('dateTo').optional().isISO8601(),
        query('groupBy').optional().isIn(['day', 'week', 'month'])
    ],
    validateRequest,
    async (req, res) => {
        try {
            // TODO: Implementar estadísticas agregadas
            const stats = {
                totalSessions: 0,
                averageDuration: 0,
                totalSales: 0,
                averageDifference: 0,
                topCashiers: [],
                trends: []
            };

            res.status(200).json({
                success: true,
                data: stats
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener estadísticas'
            });
        }
    }
);

/**
 * @route   POST /api/cash-sessions/validate-close
 * @desc    Validar datos antes de cerrar sesión (preview)
 * @access  Private (Cashier, Admin, Manager)
 */
router.post('/validate-close',
    authenticate,
    authorize(['cashier', 'admin', 'manager']),
    closeSessionValidation,
    validateRequest,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const session = await cashSessionService.getCurrentSession(userId);

            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: 'No hay sesión de caja abierta'
                });
            }

            // Calcular preview del cierre
            const summary = await cashSessionService.calculateSessionSummary(session.id);
            const expectedTotal = session.opening_amount + summary.totalSales - summary.totalRefunds;
            const actualTotal = req.body.countedCash;
            const difference = actualTotal - expectedTotal;

            res.status(200).json({
                success: true,
                data: {
                    sessionId: session.id,
                    expectedTotal,
                    actualTotal,
                    difference,
                    summary,
                    validation: {
                        isDifferenceAcceptable: Math.abs(difference) <= 10000,
                        warnings: difference !== 0 ? [`Diferencia de $${difference}`] : []
                    }
                }
            });

        } catch (error) {
            logger.error('Error validando cierre:', error);
            res.status(500).json({
                success: false,
                message: 'Error al validar cierre de sesión'
            });
        }
    }
);

module.exports = router;