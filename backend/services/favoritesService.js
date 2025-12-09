/**
 * Favorites Service
 * Manage favorite products for quick access
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class FavoritesService {
    /**
     * Get user favorites
     */
    async getUserFavorites(userId) {
        try {
            const favorites = await db('user_favorites')
                .where({ user_id: userId, active: true })
                .join('products', 'user_favorites.product_id', 'products.id')
                .select(
                    'products.*',
                    'user_favorites.position',
                    'user_favorites.added_at'
                )
                .orderBy('user_favorites.position', 'asc');

            return favorites;

        } catch (error) {
            logger.error('Error getting user favorites:', error);
            throw error;
        }
    }

    /**
     * Toggle favorite
     */
    async toggleFavorite(userId, productId) {
        try {
            const existing = await db('user_favorites')
                .where({ user_id: userId, product_id: productId })
                .first();

            if (existing) {
                // Remove favorite
                await db('user_favorites')
                    .where({ user_id: userId, product_id: productId })
                    .update({ active: !existing.active });

                return {
                    success: true,
                    isFavorite: !existing.active,
                    message: existing.active ? 'Eliminado de favoritos' : 'Agregado a favoritos'
                };
            } else {
                // Add favorite
                const position = await this.getNextPosition(userId);

                await db('user_favorites').insert({
                    user_id: userId,
                    product_id: productId,
                    position,
                    added_at: new Date(),
                    active: true
                });

                return {
                    success: true,
                    isFavorite: true,
                    message: 'Agregado a favoritos'
                };
            }

        } catch (error) {
            logger.error('Error toggling favorite:', error);
            throw error;
        }
    }

    /**
     * Get top products (most sold)
     */
    async getTopProducts(limit = 20, days = 30) {
        try {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - days);

            const topProducts = await db('sale_items')
                .join('sales', 'sale_items.sale_id', 'sales.id')
                .join('products', 'sale_items.product_id', 'products.id')
                .where('sales.created_at', '>=', dateFrom)
                .where('sales.status', 'completed')
                .groupBy('sale_items.product_id')
                .select(
                    'products.*',
                    db.raw('COUNT(*) as sales_count'),
                    db.raw('SUM(sale_items.quantity) as total_quantity'),
                    db.raw('SUM(sale_items.subtotal) as total_revenue')
                )
                .orderBy('sales_count', 'desc')
                .limit(limit);

            return topProducts;

        } catch (error) {
            logger.error('Error getting top products:', error);
            throw error;
        }
    }

    /**
     * Auto-populate favorites based on sales
     */
    async autoPopulateFavorites(userId) {
        try {
            const topProducts = await this.getTopProducts(10);

            let position = 1;
            for (const product of topProducts) {
                const exists = await db('user_favorites')
                    .where({ user_id: userId, product_id: product.id })
                    .first();

                if (!exists) {
                    await db('user_favorites').insert({
                        user_id: userId,
                        product_id: product.id,
                        position: position++,
                        added_at: new Date(),
                        active: true,
                        auto_added: true
                    });
                }
            }

            return {
                success: true,
                message: 'Favoritos actualizados automáticamente',
                count: topProducts.length
            };

        } catch (error) {
            logger.error('Error auto-populating favorites:', error);
            throw error;
        }
    }

    /**
     * Reorder favorites
     */
    async reorderFavorites(userId, productIds) {
        const trx = await db.transaction();

        try {
            for (let i = 0; i < productIds.length; i++) {
                await trx('user_favorites')
                    .where({ user_id: userId, product_id: productIds[i] })
                    .update({ position: i + 1 });
            }

            await trx.commit();

            return {
                success: true,
                message: 'Favoritos reordenados'
            };

        } catch (error) {
            await trx.rollback();
            logger.error('Error reordering favorites:', error);
            throw error;
        }
    }

    /**
     * Get next position for new favorite
     */
    async getNextPosition(userId) {
        const result = await db('user_favorites')
            .where({ user_id: userId })
            .max('position as max_position')
            .first();

        return (result.max_position || 0) + 1;
    }

    /**
     * Clear all favorites for user
     */
    async clearFavorites(userId) {
        try {
            await db('user_favorites')
                .where({ user_id: userId })
                .update({ active: false });

            return {
                success: true,
                message: 'Favoritos eliminados'
            };

        } catch (error) {
            logger.error('Error clearing favorites:', error);
            throw error;
        }
    }
}

module.exports = new FavoritesService();