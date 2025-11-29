/**
 * =====================================================
 * SYSME POS - Delivery Integration Controller
 * =====================================================
 * Controlador para integración con plataformas de delivery
 *
 * Funcionalidades:
 * - Gestión de plataformas de delivery
 * - Procesamiento de órdenes de delivery
 * - Sincronización de menú
 * - Webhooks de plataformas
 * - Analytics y reportes
 *
 * @module deliveryController
 * @author JARVIS AI Assistant
 * @date 2025-11-20
 */

const db = require('../config/database');
const logger = require('../utils/logger');

// ====================================
// GESTIÓN DE PLATAFORMAS
// ====================================

/**
 * Obtener todas las plataformas de delivery
 */
exports.getAllPlatforms = async (req, res) => {
    try {
        const { is_active = '1' } = req.query;

        let query = 'SELECT * FROM delivery_platforms WHERE 1=1';
        const params = [];

        if (is_active !== 'all') {
            query += ' AND is_active = ?';
            params.push(is_active);
        }

        query += ' ORDER BY name ASC';

        const platforms = db.prepare(query).all(params);

        res.json({
            success: true,
            data: platforms
        });

    } catch (error) {
        logger.error('Error getting delivery platforms:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener plataformas',
            details: error.message
        });
    }
};

/**
 * Obtener plataforma por ID con rendimiento
 */
exports.getPlatformById = async (req, res) => {
    try {
        const { id } = req.params;

        const platform = db.prepare('SELECT * FROM v_delivery_platform_performance WHERE id = ?').get(id);

        if (!platform) {
            return res.status(404).json({
                success: false,
                error: 'Plataforma no encontrada'
            });
        }

        res.json({
            success: true,
            data: platform
        });

    } catch (error) {
        logger.error('Error getting platform:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener plataforma',
            details: error.message
        });
    }
};

/**
 * Crear nueva plataforma de delivery
 */
exports.createPlatform = async (req, res) => {
    try {
        const {
            name,
            code,
            logo_url,
            api_base_url,
            api_version,
            api_key,
            api_secret,
            merchant_id,
            store_id,
            commission_percentage = 0,
            fixed_commission = 0,
            delivery_fee = 0,
            auto_sync_menu = 0,
            sync_interval_minutes = 60,
            min_preparation_time_minutes = 15,
            max_preparation_time_minutes = 45
        } = req.body;

        if (!name || !code) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: name, code'
            });
        }

        const stmt = db.prepare(`
            INSERT INTO delivery_platforms (
                name, code, logo_url, api_base_url, api_version,
                api_key, api_secret, merchant_id, store_id,
                commission_percentage, fixed_commission, delivery_fee,
                auto_sync_menu, sync_interval_minutes,
                min_preparation_time_minutes, max_preparation_time_minutes,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            name, code, logo_url, api_base_url, api_version,
            api_key, api_secret, merchant_id, store_id,
            commission_percentage, fixed_commission, delivery_fee,
            auto_sync_menu, sync_interval_minutes,
            min_preparation_time_minutes, max_preparation_time_minutes,
            req.user?.username || 'system'
        );

        const newPlatform = db.prepare('SELECT * FROM delivery_platforms WHERE id = ?').get(result.lastInsertRowid);

        logger.info(`New delivery platform created: ${code}`);

        res.status(201).json({
            success: true,
            message: 'Plataforma creada exitosamente',
            data: newPlatform
        });

    } catch (error) {
        logger.error('Error creating platform:', error);

        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'Ya existe una plataforma con ese código'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error al crear plataforma',
            details: error.message
        });
    }
};

/**
 * Actualizar plataforma
 */
exports.updatePlatform = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const existing = db.prepare('SELECT * FROM delivery_platforms WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Plataforma no encontrada'
            });
        }

        const allowedFields = [
            'name', 'logo_url', 'api_base_url', 'api_version',
            'api_key', 'api_secret', 'merchant_id', 'store_id',
            'commission_percentage', 'fixed_commission', 'delivery_fee',
            'auto_sync_menu', 'sync_interval_minutes',
            'min_preparation_time_minutes', 'max_preparation_time_minutes',
            'is_active', 'is_test_mode', 'notes'
        ];

        const updateFields = [];
        const params = [];

        Object.keys(updates).forEach(key => {
            if (allowedFields.includes(key) && updates[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                params.push(updates[key]);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay campos válidos para actualizar'
            });
        }

        params.push(id);
        const query = `UPDATE delivery_platforms SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(params);

        const updatedPlatform = db.prepare('SELECT * FROM delivery_platforms WHERE id = ?').get(id);

        logger.info(`Platform updated: ${id}`);

        res.json({
            success: true,
            message: 'Plataforma actualizada exitosamente',
            data: updatedPlatform
        });

    } catch (error) {
        logger.error('Error updating platform:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar plataforma',
            details: error.message
        });
    }
};

// ====================================
// GESTIÓN DE ÓRDENES
// ====================================

/**
 * Obtener órdenes de delivery
 */
exports.getDeliveryOrders = async (req, res) => {
    try {
        const {
            platform_id,
            platform_status,
            start_date,
            end_date,
            sync_status,
            limit = 100,
            offset = 0
        } = req.query;

        let query = 'SELECT * FROM v_delivery_orders_detailed WHERE 1=1';
        const params = [];

        if (platform_id) {
            query += ' AND platform_id = ?';
            params.push(platform_id);
        }

        if (platform_status) {
            query += ' AND platform_status = ?';
            params.push(platform_status);
        }

        if (start_date) {
            query += ' AND ordered_at >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND ordered_at <= ?';
            params.push(end_date);
        }

        if (sync_status) {
            query += ' AND sync_status = ?';
            params.push(sync_status);
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
        const totalResult = db.prepare(countQuery).get(params);

        query += ' ORDER BY ordered_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const orders = db.prepare(query).all(params);

        // Parse JSON fields
        orders.forEach(order => {
            if (order.items) order.items = JSON.parse(order.items);
            if (order.courier_location) order.courier_location = JSON.parse(order.courier_location);
        });

        res.json({
            success: true,
            data: orders,
            pagination: {
                total: totalResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalResult.total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error getting delivery orders:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener órdenes',
            details: error.message
        });
    }
};

/**
 * Obtener órdenes activas (en proceso)
 */
exports.getActiveOrders = async (req, res) => {
    try {
        const activeOrders = db.prepare('SELECT * FROM v_active_delivery_orders').all();

        // Parse JSON fields
        activeOrders.forEach(order => {
            if (order.items) order.items = JSON.parse(order.items);
            if (order.courier_location) order.courier_location = JSON.parse(order.courier_location);
        });

        res.json({
            success: true,
            data: activeOrders,
            count: activeOrders.length
        });

    } catch (error) {
        logger.error('Error getting active orders:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener órdenes activas',
            details: error.message
        });
    }
};

/**
 * Crear nueva orden de delivery (recibida de plataforma)
 */
exports.createDeliveryOrder = async (req, res) => {
    try {
        const {
            platform_id,
            platform_order_id,
            customer_name,
            customer_phone,
            customer_email,
            delivery_address,
            delivery_instructions,
            items,
            subtotal,
            delivery_fee = 0,
            platform_fee = 0,
            tax = 0,
            tip = 0,
            discount = 0,
            total,
            ordered_at,
            estimated_preparation_time,
            estimated_pickup_time,
            estimated_delivery_time
        } = req.body;

        if (!platform_id || !platform_order_id || !customer_name || !items || !total) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: platform_id, platform_order_id, customer_name, items, total'
            });
        }

        // Check if order already exists
        const existing = db.prepare('SELECT id FROM delivery_orders WHERE platform_id = ? AND platform_order_id = ?')
            .get(platform_id, platform_order_id);

        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'La orden ya existe en el sistema',
                order_id: existing.id
            });
        }

        const stmt = db.prepare(`
            INSERT INTO delivery_orders (
                platform_id, platform_order_id, platform_status,
                customer_name, customer_phone, customer_email,
                delivery_address, delivery_instructions,
                items, subtotal, delivery_fee, platform_fee, tax, tip, discount, total,
                ordered_at, estimated_preparation_time, estimated_pickup_time, estimated_delivery_time
            ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            platform_id, platform_order_id,
            customer_name, customer_phone, customer_email,
            delivery_address, delivery_instructions,
            JSON.stringify(items), subtotal, delivery_fee, platform_fee, tax, tip, discount, total,
            ordered_at || new Date().toISOString(),
            estimated_preparation_time, estimated_pickup_time, estimated_delivery_time
        );

        const newOrder = db.prepare('SELECT * FROM v_delivery_orders_detailed WHERE id = ?').get(result.lastInsertRowid);

        logger.info(`New delivery order created: ${platform_order_id} from platform ${platform_id}`);

        res.status(201).json({
            success: true,
            message: 'Orden de delivery creada exitosamente',
            data: newOrder
        });

    } catch (error) {
        logger.error('Error creating delivery order:', error);
        res.status(500).json({
            success: false,
            error: 'Error al crear orden',
            details: error.message
        });
    }
};

/**
 * Actualizar estado de orden
 */
exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { platform_status, notes } = req.body;

        if (!platform_status) {
            return res.status(400).json({
                success: false,
                error: 'platform_status es requerido'
            });
        }

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled'];
        if (!validStatuses.includes(platform_status)) {
            return res.status(400).json({
                success: false,
                error: `Estado inválido. Debe ser uno de: ${validStatuses.join(', ')}`
            });
        }

        const existing = db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Orden no encontrada'
            });
        }

        // Update status with timestamp
        const updateFields = ['platform_status = ?'];
        const params = [platform_status];

        // Set appropriate timestamp based on status
        if (platform_status === 'confirmed' && !existing.confirmed_at) {
            updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
        } else if (platform_status === 'ready' && !existing.ready_at) {
            updateFields.push('ready_at = CURRENT_TIMESTAMP');
        } else if (platform_status === 'picked_up' && !existing.picked_up_at) {
            updateFields.push('picked_up_at = CURRENT_TIMESTAMP');
        } else if (platform_status === 'delivered' && !existing.delivered_at) {
            updateFields.push('delivered_at = CURRENT_TIMESTAMP');
        } else if (platform_status === 'cancelled' && !existing.cancelled_at) {
            updateFields.push('cancelled_at = CURRENT_TIMESTAMP');
        }

        if (notes) {
            updateFields.push('notes = ?');
            params.push(notes);
        }

        params.push(id);
        const query = `UPDATE delivery_orders SET ${updateFields.join(', ')} WHERE id = ?`;
        db.prepare(query).run(params);

        const updatedOrder = db.prepare('SELECT * FROM v_delivery_orders_detailed WHERE id = ?').get(id);

        logger.info(`Delivery order ${id} status updated to: ${platform_status}`);

        res.json({
            success: true,
            message: 'Estado actualizado exitosamente',
            data: updatedOrder
        });

    } catch (error) {
        logger.error('Error updating order status:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar estado',
            details: error.message
        });
    }
};

// ====================================
// SINCRONIZACIÓN DE MENÚ
// ====================================

/**
 * Iniciar sincronización de menú
 */
exports.syncMenu = async (req, res) => {
    try {
        const { platform_id, sync_type = 'incremental' } = req.body;

        if (!platform_id) {
            return res.status(400).json({
                success: false,
                error: 'platform_id es requerido'
            });
        }

        const platform = db.prepare('SELECT * FROM delivery_platforms WHERE id = ?').get(platform_id);
        if (!platform) {
            return res.status(404).json({
                success: false,
                error: 'Plataforma no encontrada'
            });
        }

        // Create sync record
        const stmt = db.prepare(`
            INSERT INTO delivery_menu_sync (
                platform_id, sync_type, status, triggered_by
            ) VALUES (?, ?, 'pending', ?)
        `);

        const result = stmt.run(platform_id, sync_type, req.user?.username || 'manual');

        // In real implementation, this would trigger async job
        // For now, we'll simulate it
        const syncId = result.lastInsertRowid;

        logger.info(`Menu sync initiated for platform ${platform_id}, sync_id: ${syncId}`);

        res.status(202).json({
            success: true,
            message: 'Sincronización de menú iniciada',
            sync_id: syncId,
            status: 'pending'
        });

    } catch (error) {
        logger.error('Error syncing menu:', error);
        res.status(500).json({
            success: false,
            error: 'Error al sincronizar menú',
            details: error.message
        });
    }
};

/**
 * Obtener estado de sincronización
 */
exports.getSyncStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const sync = db.prepare('SELECT * FROM delivery_menu_sync WHERE id = ?').get(id);

        if (!sync) {
            return res.status(404).json({
                success: false,
                error: 'Sincronización no encontrada'
            });
        }

        res.json({
            success: true,
            data: sync
        });

    } catch (error) {
        logger.error('Error getting sync status:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estado de sincronización',
            details: error.message
        });
    }
};

/**
 * Obtener mapeos de productos
 */
exports.getProductMappings = async (req, res) => {
    try {
        const { platform_id } = req.query;

        let query = 'SELECT * FROM v_delivery_product_sync_status WHERE 1=1';
        const params = [];

        if (platform_id) {
            query += ' AND platform_id = ?';
            params.push(platform_id);
        }

        query += ' ORDER BY product_name ASC';

        const mappings = db.prepare(query).all(params);

        res.json({
            success: true,
            data: mappings
        });

    } catch (error) {
        logger.error('Error getting product mappings:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener mapeos',
            details: error.message
        });
    }
};

// ====================================
// WEBHOOKS
// ====================================

/**
 * Recibir webhook de plataforma
 */
exports.handleWebhook = async (req, res) => {
    try {
        const { platform_code } = req.params;
        const payload = req.body;

        // Find platform by code
        const platform = db.prepare('SELECT * FROM delivery_platforms WHERE code = ?').get(platform_code);

        if (!platform) {
            logger.warn(`Webhook received for unknown platform: ${platform_code}`);
            return res.status(404).json({
                success: false,
                error: 'Plataforma no encontrada'
            });
        }

        // Log webhook
        const stmt = db.prepare(`
            INSERT INTO delivery_webhooks_log (
                platform_id, event_type, event_id,
                request_method, request_headers, request_body, request_ip,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `);

        const result = stmt.run(
            platform.id,
            payload.event_type || payload.type || 'unknown',
            payload.event_id || payload.id,
            req.method,
            JSON.stringify(req.headers),
            JSON.stringify(payload),
            req.ip
        );

        const webhookId = result.lastInsertRowid;

        logger.info(`Webhook received from ${platform_code}, webhook_id: ${webhookId}`);

        // In real implementation, process webhook asynchronously
        // For now, return success
        res.json({
            success: true,
            message: 'Webhook recibido',
            webhook_id: webhookId
        });

    } catch (error) {
        logger.error('Error handling webhook:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar webhook',
            details: error.message
        });
    }
};

// ====================================
// ANALYTICS
// ====================================

/**
 * Obtener rendimiento por plataforma
 */
exports.getPlatformPerformance = async (req, res) => {
    try {
        const performance = db.prepare('SELECT * FROM v_delivery_platform_performance').all();

        res.json({
            success: true,
            data: performance
        });

    } catch (error) {
        logger.error('Error getting platform performance:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener rendimiento',
            details: error.message
        });
    }
};

/**
 * Obtener estadísticas de delivery
 */
exports.getDeliveryStats = async (req, res) => {
    try {
        const { period = 'daily', start_date, end_date } = req.query;

        let query = 'SELECT * FROM delivery_analytics WHERE period_type = ?';
        const params = [period];

        if (start_date) {
            query += ' AND period_start >= ?';
            params.push(start_date);
        }

        if (end_date) {
            query += ' AND period_end <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY period_start DESC';

        const stats = db.prepare(query).all(params);

        // Parse JSON fields
        stats.forEach(stat => {
            if (stat.top_selling_products) stat.top_selling_products = JSON.parse(stat.top_selling_products);
        });

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error getting delivery stats:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas',
            details: error.message
        });
    }
};

module.exports = exports;
