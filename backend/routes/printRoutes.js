/**
 * Print Routes
 * API endpoints for printing operations
 */

const express = require('express');
const router = express.Router();
const printService = require('../services/printService');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * @route   POST /api/v1/print/ticket
 * @desc    Print ticket
 * @access  Private
 */
router.post('/ticket', authenticate, async (req, res) => {
    try {
        const { saleId, reprint = false, printer = 'default' } = req.body;

        if (!saleId) {
            return res.status(400).json({
                success: false,
                message: 'ID de venta requerido'
            });
        }

        const result = await printService.printTicket(saleId, { reprint, printer });

        res.status(200).json(result);

    } catch (error) {
        logger.error('Error en print ticket:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/v1/print/last-ticket
 * @desc    Print last ticket for current user
 * @access  Private
 */
router.post('/last-ticket', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get last sale
        const sale = await printService.getLastSale(userId);

        // Print it
        const result = await printService.printTicket(sale.id, { reprint: true });

        res.status(200).json({
            ...result,
            sale: {
                id: sale.id,
                number: sale.sale_number,
                total: sale.total
            }
        });

    } catch (error) {
        logger.error('Error imprimiendo último ticket:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   POST /api/v1/print/kitchen-order
 * @desc    Print kitchen order
 * @access  Private
 */
router.post('/kitchen-order', authenticate, async (req, res) => {
    try {
        const { orderId } = req.body;

        if (!orderId) {
            return res.status(400).json({
                success: false,
                message: 'ID de orden requerido'
            });
        }

        const result = await printService.printKitchenOrder(orderId);

        res.status(200).json(result);

    } catch (error) {
        logger.error('Error imprimiendo orden de cocina:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

/**
 * @route   GET /api/v1/print/printers
 * @desc    Get available printers
 * @access  Private
 */
router.get('/printers', authenticate, async (req, res) => {
    try {
        // TODO: Get actual printers from system
        const printers = [
            { id: 'default', name: 'Impresora Principal', type: 'thermal', status: 'online' },
            { id: 'kitchen', name: 'Impresora Cocina', type: 'thermal', status: 'online' },
            { id: 'bar', name: 'Impresora Bar', type: 'thermal', status: 'offline' }
        ];

        res.status(200).json({
            success: true,
            printers
        });

    } catch (error) {
        logger.error('Error obteniendo impresoras:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;