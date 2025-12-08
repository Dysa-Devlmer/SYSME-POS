// =====================================================
// SYSME POS - Products Controller
// =====================================================
// Handles product catalog management
// @author JARVIS AI Assistant
// @date 2025-11-20
// @version 2.1.0
// =====================================================

const { dbManager } = require('../config/database');
const logger = require('../config/logger');

/**
 * Get all products
 */
exports.getProducts = async (req, res, next) => {
    try {
        const {
            category_id, status, is_available,
            search, page = 1, limit = 50
        } = req.query;

        const db = dbManager.getDatabase();

        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.company_id = ?';
        const params = [req.user.company_id];

        if (category_id) {
            query += ' AND p.category_id = ?';
            params.push(category_id);
        }

        if (status) {
            query += ' AND p.status = ?';
            params.push(status);
        }

        if (is_available !== undefined) {
            query += ' AND p.is_available = ?';
            params.push(is_available === 'true' ? 1 : 0);
        }

        if (search) {
            query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY p.sort_order, p.name';

        const offset = (page - 1) * limit;
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const products = db.prepare(query).all(...params);

        // Get inventory for each product
        for (const product of products) {
            const inventory = db.prepare(`
                SELECT SUM(quantity_on_hand) as quantity, SUM(quantity_allocated) as allocated
                FROM inventory
                WHERE product_id = ? AND inventory_location_id IN (
                    SELECT id FROM inventory_locations WHERE location_id = ?
                )
            `).get(product.id, req.user.location_id);

            product.inventory = inventory;
        }

        res.json({
            success: true,
            data: products,
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
 * Get single product
 */
exports.getProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = dbManager.getDatabase();

        const product = db.prepare(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.company_id = ?
        `).get(id, req.user.company_id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Get variants
        product.variants = db.prepare('SELECT * FROM product_variants WHERE product_id = ?').all(id);

        // Get modifiers
        product.modifiers = db.prepare(`
            SELECT m.*, pm.sort_order
            FROM modifiers m
            INNER JOIN product_modifiers pm ON m.id = pm.modifier_id
            WHERE pm.product_id = ?
            ORDER BY pm.sort_order
        `).all(id);

        for (const modifier of product.modifiers) {
            modifier.options = db.prepare('SELECT * FROM modifier_options WHERE modifier_id = ?').all(modifier.id);
        }

        // Get inventory
        product.inventory = db.prepare(`
            SELECT il.name as location_name, i.*
            FROM inventory i
            INNER JOIN inventory_locations il ON i.inventory_location_id = il.id
            WHERE i.product_id = ?
        `).all(id);

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Create product
 */
exports.createProduct = async (req, res, next) => {
    try {
        const {
            category_id, sku, barcode, name, description,
            base_price, cost, tax_rate, is_taxable,
            track_inventory, stock_quantity, min_stock_level,
            image_url, tags, allergens, dietary_info
        } = req.body;

        const db = dbManager.getDatabase();

        // Check if SKU already exists
        const existing = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'SKU already exists'
            });
        }

        const transaction = db.transaction(() => {
            // Insert product
            const productInsert = db.prepare(`
                INSERT INTO products (
                    company_id, category_id, sku, barcode, name, description,
                    base_price, cost, tax_rate, is_taxable, track_inventory,
                    stock_quantity, min_stock_level, image_url, tags, allergens, dietary_info
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            const result = productInsert.run(
                req.user.company_id,
                category_id || null,
                sku,
                barcode || null,
                name,
                description || null,
                base_price,
                cost || null,
                tax_rate || 0,
                is_taxable ? 1 : 0,
                track_inventory ? 1 : 0,
                stock_quantity || 0,
                min_stock_level || 0,
                image_url || null,
                tags ? JSON.stringify(tags) : null,
                allergens ? JSON.stringify(allergens) : null,
                dietary_info ? JSON.stringify(dietary_info) : null
            );

            const productId = result.lastInsertRowid;

            // Initialize inventory for default location if track_inventory
            if (track_inventory) {
                db.prepare(`
                    INSERT INTO inventory (product_id, inventory_location_id, quantity_on_hand, unit_cost)
                    VALUES (?, 1, ?, ?)
                `).run(productId, stock_quantity || 0, cost || 0);
            }

            return productId;
        });

        const productId = transaction();

        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

        logger.info(`Product created: ${name}`, { productId, userId: req.user.id });

        res.status(201).json({
            success: true,
            data: product
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const db = dbManager.getDatabase();

        const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ?').get(id, req.user.company_id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Build update query
        const fields = [];
        const params = [];

        const allowedFields = [
            'category_id', 'name', 'description', 'base_price', 'cost',
            'tax_rate', 'is_taxable', 'is_available', 'is_featured',
            'available_for_delivery', 'available_for_pickup', 'available_for_dine_in',
            'preparation_time', 'image_url', 'status', 'sort_order',
            'tags', 'allergens', 'dietary_info'
        ];

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (typeof updates[field] === 'object') {
                    params.push(JSON.stringify(updates[field]));
                } else {
                    params.push(updates[field]);
                }
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).run(...params);

        const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

        logger.info(`Product updated: ${id}`, { userId: req.user.id });

        res.json({
            success: true,
            data: updatedProduct
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res, next) => {
    try {
        const { id } = req.params;
        const db = dbManager.getDatabase();

        const product = db.prepare('SELECT * FROM products WHERE id = ? AND company_id = ?').get(id, req.user.company_id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Soft delete - set status to discontinued
        db.prepare('UPDATE products SET status = ?, is_available = 0 WHERE id = ?').run('discontinued', id);

        logger.info(`Product deleted: ${id}`, { userId: req.user.id });

        res.json({
            success: true,
            message: 'Product discontinued successfully'
        });

    } catch (error) {
        next(error);
    }
};

// =====================================================
// CATEGORIES
// =====================================================

/**
 * Get all categories
 */
exports.getCategories = async (req, res, next) => {
    try {
        const db = dbManager.getDatabase();

        const categories = db.prepare(`
            SELECT c.*,
                   (SELECT COUNT(*) FROM products WHERE category_id = c.id AND status = 'active') as product_count
            FROM categories c
            WHERE c.company_id = ? AND c.is_active = 1
            ORDER BY c.sort_order, c.name
        `).all(req.user.company_id);

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Create category
 */
exports.createCategory = async (req, res, next) => {
    try {
        const { name, description, icon, color, parent_id, sort_order } = req.body;
        const db = dbManager.getDatabase();

        const result = db.prepare(`
            INSERT INTO categories (company_id, name, description, icon, color, parent_id, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            req.user.company_id,
            name,
            description || null,
            icon || null,
            color || null,
            parent_id || null,
            sort_order || 0
        );

        const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);

        logger.info(`Category created: ${name}`, { categoryId: category.id, userId: req.user.id });

        res.status(201).json({
            success: true,
            data: category
        });

    } catch (error) {
        next(error);
    }
};
