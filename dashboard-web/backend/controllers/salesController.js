// =====================================================
// SYSME POS - Sales Controller
// =====================================================
// Handles all sales operations: orders, tables, payments
// @author JARVIS AI Assistant
// @date 2025-11-20
// @version 2.1.0
// =====================================================

const { dbManager } = require('../config/database');
const logger = require('../config/logger');

// =====================================================
// ORDERS
// =====================================================

/**
 * Create a new order
 */
exports.createOrder = async (req, res, next) => {
    try {
        const {
            type, table_id, customer_id, items, notes,
            special_instructions, delivery_address,
            customer_name, customer_phone
        } = req.body;

        const db = dbManager.getDatabase();

        // Generate order number
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
        const orderCount = db.prepare(`
            SELECT COUNT(*) as count
            FROM orders
            WHERE DATE(order_date) = DATE('now')
        `).get();
        const orderNumber = `ORD-${today}-${String(orderCount.count + 1).padStart(4, '0')}`;

        // Calculate totals
        let subtotal = 0;
        let tax = 0;

        // Start transaction
        const transaction = db.transaction(() => {
            // Create order
            const orderInsert = db.prepare(`
                INSERT INTO orders (
                    company_id, location_id, order_number, type,
                    table_id, customer_id, customer_name, customer_phone,
                    waiter_id, delivery_address, notes, special_instructions,
                    subtotal, tax, total, payment_status, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
            `);

            const result = orderInsert.run(
                req.user.company_id,
                req.user.location_id,
                orderNumber,
                type,
                table_id || null,
                customer_id || null,
                customer_name,
                customer_phone,
                req.user.id,
                delivery_address || null,
                notes || null,
                special_instructions || null,
                0, 0, 0 // Will update after adding items
            );

            const orderId = result.lastInsertRowid;

            // Add order items
            const itemInsert = db.prepare(`
                INSERT INTO order_items (
                    order_id, product_id, variant_id, product_name, sku,
                    quantity, unit_price, base_price, modifiers_total,
                    tax_amount, subtotal, total, modifiers, special_instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const item of items) {
                // Get product details
                const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
                if (!product) throw new Error(`Product not found: ${item.product_id}`);

                const basePrice = product.base_price;
                let modifiersTotal = 0;

                // Calculate modifiers
                if (item.modifiers && item.modifiers.length > 0) {
                    for (const mod of item.modifiers) {
                        const modOption = db.prepare('SELECT price_adjustment FROM modifier_options WHERE id = ?').get(mod.option_id);
                        if (modOption) {
                            modifiersTotal += modOption.price_adjustment || 0;
                        }
                    }
                }

                const unitPrice = basePrice + modifiersTotal;
                const itemSubtotal = unitPrice * item.quantity;
                const itemTax = product.is_taxable ? itemSubtotal * (product.tax_rate / 100) : 0;
                const itemTotal = itemSubtotal + itemTax;

                subtotal += itemSubtotal;
                tax += itemTax;

                itemInsert.run(
                    orderId,
                    item.product_id,
                    item.variant_id || null,
                    product.name,
                    product.sku,
                    item.quantity,
                    unitPrice,
                    basePrice,
                    modifiersTotal,
                    itemTax,
                    itemSubtotal,
                    itemTotal,
                    item.modifiers ? JSON.stringify(item.modifiers) : null,
                    item.special_instructions || null
                );

                // Update inventory if tracked
                if (product.track_inventory) {
                    db.prepare(`
                        UPDATE inventory
                        SET quantity_allocated = quantity_allocated + ?
                        WHERE product_id = ? AND inventory_location_id = 1
                    `).run(item.quantity, item.product_id);
                }
            }

            // Update order totals
            const total = subtotal + tax;
            db.prepare(`
                UPDATE orders
                SET subtotal = ?, tax = ?, total = ?
                WHERE id = ?
            `).run(subtotal, tax, total, orderId);

            // Update table status if dine-in
            if (type === 'dine_in' && table_id) {
                db.prepare(`
                    UPDATE tables
                    SET status = 'occupied', current_order_id = ?
                    WHERE id = ?
                `).run(orderId, table_id);
            }

            return orderId;
        });

        const orderId = transaction();

        // Get complete order
        const order = db.prepare(`
            SELECT o.*,
                   json_group_array(json_object(
                       'id', oi.id,
                       'product_id', oi.product_id,
                       'product_name', oi.product_name,
                       'quantity', oi.quantity,
                       'unit_price', oi.unit_price,
                       'total', oi.total,
                       'modifiers', oi.modifiers
                   )) as items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
        `).get(orderId);

        order.items = JSON.parse(order.items);

        // Emit socket event
        global.io?.to(`location_${req.user.location_id}`).emit('order:created', order);

        logger.info(`Order created: ${orderNumber}`, { orderId, userId: req.user.id });

        res.status(201).json({
            success: true,
            data: order
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get all orders
 */
exports.getOrders = async (req, res, next) => {
    try {
        const {
            status, type, date_from, date_to,
            customer_id, table_id, payment_status,
            page = 1, limit = 50
        } = req.query;

        const db = dbManager.getDatabase();

        let query = 'SELECT * FROM orders WHERE location_id = ?';
        const params = [req.user.location_id];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (date_from) {
            query += ' AND DATE(order_date) >= ?';
            params.push(date_from);
        }

        if (date_to) {
            query += ' AND DATE(order_date) <= ?';
            params.push(date_to);
        }

        if (customer_id) {
            query += ' AND customer_id = ?';
            params.push(customer_id);
        }

        if (table_id) {
            query += ' AND table_id = ?';
            params.push(table_id);
        }

        if (payment_status) {
            query += ' AND payment_status = ?';
            params.push(payment_status);
        }

        query += ' ORDER BY order_date DESC';

        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const orders = db.prepare(query).all(...params);

        // Get items for each order
        for (const order of orders) {
            order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
        }

        res.json({
            success: true,
            data: orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Get single order
 */
exports.getOrder = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = dbManager.getDatabase();

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Get order items
        order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

        // Get payments
        order.payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(id);

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, kitchen_status, notes } = req.body;

        const db = dbManager.getDatabase();

        const updateFields = [];
        const params = [];

        if (status) {
            updateFields.push('status = ?');
            params.push(status);

            // Update timestamp based on status
            if (status === 'confirmed') updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
            if (status === 'ready') updateFields.push('ready_at = CURRENT_TIMESTAMP');
            if (status === 'delivered') updateFields.push('delivered_at = CURRENT_TIMESTAMP');
            if (status === 'completed') updateFields.push('completed_at = CURRENT_TIMESTAMP');
            if (status === 'cancelled') updateFields.push('cancelled_at = CURRENT_TIMESTAMP');
        }

        if (kitchen_status) {
            updateFields.push('kitchen_status = ?');
            params.push(kitchen_status);

            if (kitchen_status === 'preparing') updateFields.push('kitchen_started_at = CURRENT_TIMESTAMP');
            if (kitchen_status === 'ready') updateFields.push('ready_at = CURRENT_TIMESTAMP');
        }

        if (notes) {
            updateFields.push('notes = ?');
            params.push(notes);
        }

        params.push(id);

        db.prepare(`UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`).run(...params);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

        // Emit socket event
        global.io?.to(`location_${order.location_id}`).emit('order:updated', order);

        logger.info(`Order ${id} status updated to ${status || kitchen_status}`);

        res.json({
            success: true,
            data: order
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Process payment
 */
exports.processPayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { method, amount, card_type, card_last4 } = req.body;

        const db = dbManager.getDatabase();

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Generate transaction ID
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Start transaction
        const transaction = db.transaction(() => {
            // Insert payment
            const paymentInsert = db.prepare(`
                INSERT INTO payments (
                    order_id, transaction_id, amount, method,
                    card_type, card_last4, status, processed_by
                ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)
            `);

            const result = paymentInsert.run(
                id,
                transactionId,
                amount,
                method,
                card_type || null,
                card_last4 || null,
                req.user.id
            );

            // Update order payment status
            const newPaidAmount = parseFloat(order.paid_amount) + parseFloat(amount);
            const total = parseFloat(order.total);

            let paymentStatus = 'partial';
            if (newPaidAmount >= total) {
                paymentStatus = 'paid';
            }

            db.prepare(`
                UPDATE orders
                SET paid_amount = ?, payment_status = ?, cashier_id = ?
                WHERE id = ?
            `).run(newPaidAmount, paymentStatus, req.user.id, id);

            // If fully paid and not completed, mark as completed
            if (paymentStatus === 'paid' && order.status !== 'completed') {
                db.prepare(`
                    UPDATE orders
                    SET status = 'completed', completed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(id);

                // Free up table if dine-in
                if (order.type === 'dine_in' && order.table_id) {
                    db.prepare(`
                        UPDATE tables
                        SET status = 'available', current_order_id = NULL
                        WHERE id = ?
                    `).run(order.table_id);
                }

                // Finalize inventory (convert allocated to sold)
                db.prepare(`
                    INSERT INTO inventory_transactions (
                        product_id, inventory_location_id, type,
                        quantity, reference_type, reference_id, created_by
                    )
                    SELECT
                        oi.product_id, 1, 'sale',
                        -oi.quantity, 'order', ?, ?
                    FROM order_items oi
                    WHERE oi.order_id = ?
                `).run(id, req.user.id, id);

                db.prepare(`
                    UPDATE inventory i
                    SET quantity_on_hand = quantity_on_hand - (
                        SELECT SUM(oi.quantity)
                        FROM order_items oi
                        WHERE oi.order_id = ? AND oi.product_id = i.product_id
                    ),
                    quantity_allocated = quantity_allocated - (
                        SELECT SUM(oi.quantity)
                        FROM order_items oi
                        WHERE oi.order_id = ? AND oi.product_id = i.product_id
                    )
                    WHERE inventory_location_id = 1
                      AND product_id IN (SELECT product_id FROM order_items WHERE order_id = ?)
                `).run(id, id, id);
            }

            return result.lastInsertRowid;
        });

        const paymentId = transaction();

        const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);

        // Emit socket event
        global.io?.to(`location_${order.location_id}`).emit('payment:processed', {
            orderId: id,
            payment
        });

        logger.info(`Payment processed for order ${id}`, { paymentId, method, amount });

        res.json({
            success: true,
            data: payment
        });

    } catch (error) {
        next(error);
    }
};

// =====================================================
// TABLES
// =====================================================

/**
 * Get all tables
 */
exports.getTables = async (req, res, next) => {
    try {
        const db = dbManager.getDatabase();

        const tables = db.prepare(`
            SELECT t.*,
                   o.id as current_order_id,
                   o.order_number,
                   o.total,
                   o.guests_count,
                   o.order_date
            FROM tables t
            LEFT JOIN orders o ON t.current_order_id = o.id
            WHERE t.location_id = ? AND t.is_active = 1
            ORDER BY t.table_number
        `).all(req.user.location_id);

        res.json({
            success: true,
            data: tables
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update table status
 */
exports.updateTableStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const db = dbManager.getDatabase();

        db.prepare('UPDATE tables SET status = ? WHERE id = ?').run(status, id);

        const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(id);

        // Emit socket event
        global.io?.to(`location_${req.user.location_id}`).emit('table:updated', table);

        res.json({
            success: true,
            data: table
        });

    } catch (error) {
        next(error);
    }
};
