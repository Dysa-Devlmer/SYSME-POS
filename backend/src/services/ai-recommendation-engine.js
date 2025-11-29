/**
 * Motor de Recomendaciones Inteligentes con Machine Learning
 * Implementa filtrado colaborativo, basado en contenido y sistemas híbridos
 */

const logger = require('../config/logger');
const { dbService } = require('../config/database');
const notificationService = require('./realtime-notifications');

class RecommendationEngine {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 1800000; // 30 minutos
        this.similarityThreshold = 0.3;

        // Tipos de recomendaciones
        this.TYPES = {
            FREQUENTLY_BOUGHT: 'frequently_bought_together',
            SIMILAR_PRODUCTS: 'similar_products',
            PERSONALIZED: 'personalized',
            TRENDING: 'trending',
            UPSELL: 'upsell',
            CROSS_SELL: 'cross_sell',
            SEASONAL: 'seasonal',
            NEW_ARRIVALS: 'new_arrivals'
        };

        // Pesos para el sistema híbrido
        this.weights = {
            collaborative: 0.4,
            content: 0.3,
            popularity: 0.2,
            recency: 0.1
        };
    }

    /**
     * Obtiene recomendaciones personalizadas para un cliente
     */
    async getPersonalizedRecommendations(customerId, limit = 10) {
        try {
            const cacheKey = `personalized_${customerId}_${limit}`;

            // Verificar caché
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            // Obtener historial del cliente
            const customerHistory = await this.getCustomerPurchaseHistory(customerId);

            if (!customerHistory || customerHistory.length === 0) {
                // Si no hay historial, devolver productos populares
                return await this.getTrendingProducts(limit);
            }

            // Aplicar múltiples estrategias de recomendación
            const collaborative = await this.collaborativeFiltering(customerId, customerHistory);
            const contentBased = await this.contentBasedFiltering(customerHistory);
            const popularItems = await this.getPopularProducts();

            // Combinar recomendaciones con sistema híbrido
            const hybridRecommendations = await this.hybridRecommendation({
                collaborative,
                contentBased,
                popularItems,
                customerHistory
            });

            // Filtrar productos ya comprados recientemente
            const recentPurchases = new Set(customerHistory.slice(0, 10).map(h => h.product_id));
            const filteredRecommendations = hybridRecommendations
                .filter(rec => !recentPurchases.has(rec.productId))
                .slice(0, limit);

            // Enriquecer con información adicional
            const enrichedRecommendations = await this.enrichRecommendations(filteredRecommendations);

            const result = {
                success: true,
                customerId,
                recommendations: enrichedRecommendations,
                strategies: {
                    collaborative: collaborative.length,
                    contentBased: contentBased.length,
                    popular: popularItems.length
                },
                metadata: {
                    generatedAt: new Date(),
                    cacheExpiry: new Date(Date.now() + this.cacheTimeout)
                }
            };

            // Guardar en caché
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            logger.error('Error generando recomendaciones personalizadas:', error);
            throw error;
        }
    }

    /**
     * Obtiene productos frecuentemente comprados juntos
     */
    async getFrequentlyBoughtTogether(productId, limit = 5) {
        try {
            const cacheKey = `fbt_${productId}_${limit}`;

            // Verificar caché
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    return cached.data;
                }
            }

            // Análisis de asociación (Market Basket Analysis)
            const query = `
                SELECT
                    si2.product_id,
                    p.name,
                    p.category_id,
                    p.price,
                    COUNT(DISTINCT s.id) as co_occurrence_count,
                    AVG(si2.quantity) as avg_quantity,
                    (COUNT(DISTINCT s.id) * 1.0 /
                        (SELECT COUNT(DISTINCT sale_id) FROM sale_items WHERE product_id = ?)) as confidence,
                    (COUNT(DISTINCT s.id) * 1.0 /
                        (SELECT COUNT(DISTINCT id) FROM sales WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY))) as support
                FROM sale_items si1
                INNER JOIN sales s ON si1.sale_id = s.id
                INNER JOIN sale_items si2 ON s.id = si2.sale_id AND si2.product_id != si1.product_id
                INNER JOIN products p ON si2.product_id = p.id
                WHERE si1.product_id = ?
                    AND s.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                    AND s.status != 'cancelled'
                    AND p.active = 1
                GROUP BY si2.product_id, p.name, p.category_id, p.price
                HAVING confidence > 0.1
                ORDER BY confidence DESC, co_occurrence_count DESC
                LIMIT ?
            `;

            const results = await dbService.raw(query, [productId, productId, limit]);

            // Calcular métricas de asociación
            const recommendations = results.map(item => ({
                productId: item.product_id,
                name: item.name,
                categoryId: item.category_id,
                price: item.price,
                confidence: Math.round(item.confidence * 100),
                support: Math.round(item.support * 1000) / 10,
                coOccurrences: item.co_occurrence_count,
                averageQuantity: Math.round(item.avg_quantity * 10) / 10,
                lift: this.calculateLift(item.confidence, item.support),
                recommendationType: this.TYPES.FREQUENTLY_BOUGHT
            }));

            const result = {
                success: true,
                productId,
                recommendations,
                metadata: {
                    algorithm: 'association_rules',
                    minConfidence: 0.1,
                    timeWindow: '90_days'
                }
            };

            // Guardar en caché
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            logger.error('Error obteniendo productos frecuentemente comprados juntos:', error);
            return { success: false, recommendations: [] };
        }
    }

    /**
     * Filtrado colaborativo basado en usuarios similares
     */
    async collaborativeFiltering(customerId, customerHistory) {
        try {
            // Encontrar usuarios con compras similares
            const productIds = customerHistory.map(h => h.product_id);

            const query = `
                SELECT
                    si.customer_id,
                    COUNT(DISTINCT si.product_id) as common_products,
                    GROUP_CONCAT(DISTINCT si.product_id) as products
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                WHERE si.product_id IN (${productIds.map(() => '?').join(',')})
                    AND si.customer_id != ?
                    AND s.created_at >= DATE_SUB(NOW(), INTERVAL 180 DAY)
                GROUP BY si.customer_id
                HAVING common_products >= 3
                ORDER BY common_products DESC
                LIMIT 50
            `;

            const similarUsers = await dbService.raw(query, [...productIds, customerId]);

            if (similarUsers.length === 0) {
                return [];
            }

            // Obtener productos comprados por usuarios similares pero no por el cliente actual
            const recommendations = new Map();

            for (const user of similarUsers) {
                const userProducts = await this.getUserProducts(user.customer_id);
                const similarity = this.calculateJaccardSimilarity(
                    new Set(productIds),
                    new Set(userProducts.map(p => p.product_id))
                );

                for (const product of userProducts) {
                    if (!productIds.includes(product.product_id)) {
                        const existing = recommendations.get(product.product_id) || {
                            productId: product.product_id,
                            score: 0,
                            count: 0
                        };

                        existing.score += similarity;
                        existing.count += 1;
                        recommendations.set(product.product_id, existing);
                    }
                }
            }

            // Convertir a array y ordenar por score
            return Array.from(recommendations.values())
                .map(rec => ({
                    ...rec,
                    score: rec.score / rec.count,
                    method: 'collaborative'
                }))
                .sort((a, b) => b.score - a.score);
        } catch (error) {
            logger.error('Error en filtrado colaborativo:', error);
            return [];
        }
    }

    /**
     * Filtrado basado en contenido (características del producto)
     */
    async contentBasedFiltering(customerHistory) {
        try {
            // Analizar categorías y características preferidas
            const categoryPreferences = {};
            const priceRange = { min: Infinity, max: 0, avg: 0 };
            let totalPrice = 0;

            for (const item of customerHistory) {
                // Contar preferencias de categoría
                categoryPreferences[item.category_id] = (categoryPreferences[item.category_id] || 0) + 1;

                // Analizar rango de precio
                const price = item.price || 0;
                priceRange.min = Math.min(priceRange.min, price);
                priceRange.max = Math.max(priceRange.max, price);
                totalPrice += price;
            }

            priceRange.avg = totalPrice / customerHistory.length;

            // Obtener productos similares basados en características
            const topCategories = Object.entries(categoryPreferences)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat, _]) => cat);

            const query = `
                SELECT
                    p.id as product_id,
                    p.name,
                    p.category_id,
                    p.price,
                    ABS(p.price - ?) as price_distance,
                    CASE
                        WHEN p.category_id IN (${topCategories.map(() => '?').join(',')}) THEN 1
                        ELSE 0
                    END as category_match
                FROM products p
                WHERE p.active = 1
                    AND p.price BETWEEN ? AND ?
                    AND p.id NOT IN (${customerHistory.map(() => '?').join(',')})
                ORDER BY category_match DESC, price_distance ASC
                LIMIT 20
            `;

            const params = [
                priceRange.avg,
                ...topCategories,
                priceRange.min * 0.8,
                priceRange.max * 1.2,
                ...customerHistory.map(h => h.product_id)
            ];

            const results = await dbService.raw(query, params);

            return results.map(item => ({
                productId: item.product_id,
                score: this.calculateContentScore(item, categoryPreferences, priceRange),
                method: 'content_based',
                categoryMatch: item.category_match,
                priceDistance: item.price_distance
            }));
        } catch (error) {
            logger.error('Error en filtrado basado en contenido:', error);
            return [];
        }
    }

    /**
     * Obtiene productos populares/trending
     */
    async getTrendingProducts(limit = 10) {
        try {
            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.category_id,
                    p.price,
                    p.image,
                    COUNT(si.id) as sales_count,
                    SUM(si.quantity) as total_quantity,
                    AVG(si.price) as avg_selling_price,
                    MAX(s.created_at) as last_sold,
                    DATEDIFF(NOW(), MAX(s.created_at)) as days_since_last_sale,
                    (COUNT(si.id) * EXP(-DATEDIFF(NOW(), MAX(s.created_at)) / 30)) as trending_score
                FROM products p
                INNER JOIN sale_items si ON p.id = si.product_id
                INNER JOIN sales s ON si.sale_id = s.id
                WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    AND s.status != 'cancelled'
                    AND p.active = 1
                GROUP BY p.id, p.name, p.category_id, p.price, p.image
                ORDER BY trending_score DESC
                LIMIT ?
            `;

            const results = await dbService.raw(query, [limit]);

            return {
                success: true,
                recommendations: results.map((item, index) => ({
                    productId: item.id,
                    name: item.name,
                    categoryId: item.category_id,
                    price: item.price,
                    image: item.image,
                    salesCount: item.sales_count,
                    totalQuantity: item.total_quantity,
                    trendingScore: Math.round(item.trending_score * 100) / 100,
                    rank: index + 1,
                    daysSinceLastSale: item.days_since_last_sale,
                    recommendationType: this.TYPES.TRENDING,
                    confidence: Math.min(95, 60 + (10 - index) * 3) // Confianza basada en ranking
                }))
            };
        } catch (error) {
            logger.error('Error obteniendo productos trending:', error);
            return { success: false, recommendations: [] };
        }
    }

    /**
     * Obtiene recomendaciones de upselling
     */
    async getUpsellRecommendations(productId, limit = 5) {
        try {
            // Obtener el producto actual
            const product = await dbService.findById('products', productId);
            if (!product) {
                return { success: false, message: 'Producto no encontrado' };
            }

            // Buscar productos de mayor valor en la misma categoría
            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.category_id,
                    p.price,
                    p.description,
                    (p.price - ?) as price_difference,
                    (p.price / ?) as price_ratio,
                    COUNT(si.id) as sales_count,
                    AVG(r.rating) as avg_rating
                FROM products p
                LEFT JOIN sale_items si ON p.id = si.product_id
                LEFT JOIN reviews r ON p.id = r.product_id
                WHERE p.category_id = ?
                    AND p.price > ?
                    AND p.price <= ? * 1.5
                    AND p.active = 1
                    AND p.id != ?
                GROUP BY p.id, p.name, p.category_id, p.price, p.description
                HAVING sales_count > 0 OR avg_rating > 3.5
                ORDER BY price_ratio ASC, sales_count DESC
                LIMIT ?
            `;

            const results = await dbService.raw(query, [
                product.price,
                product.price,
                product.category_id,
                product.price,
                product.price,
                productId,
                limit
            ]);

            return {
                success: true,
                originalProduct: {
                    id: product.id,
                    name: product.name,
                    price: product.price
                },
                recommendations: results.map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    priceDifference: item.price_difference,
                    priceIncrease: Math.round((item.price_ratio - 1) * 100),
                    salesCount: item.sales_count,
                    averageRating: item.avg_rating || 0,
                    recommendationType: this.TYPES.UPSELL,
                    value: this.calculateUpsellValue(item, product)
                }))
            };
        } catch (error) {
            logger.error('Error obteniendo recomendaciones de upselling:', error);
            return { success: false, recommendations: [] };
        }
    }

    /**
     * Obtiene recomendaciones de cross-selling para el carrito
     */
    async getCrossSellingRecommendations(cartItems, limit = 5) {
        try {
            if (!cartItems || cartItems.length === 0) {
                return { success: false, message: 'Carrito vacío' };
            }

            const productIds = cartItems.map(item => item.productId);

            // Buscar productos complementarios
            const query = `
                SELECT
                    p.id,
                    p.name,
                    p.category_id,
                    p.price,
                    COUNT(DISTINCT s.id) as co_occurrence,
                    GROUP_CONCAT(DISTINCT c.name) as categories
                FROM sale_items si1
                INNER JOIN sales s ON si1.sale_id = s.id
                INNER JOIN sale_items si2 ON s.id = si2.sale_id
                INNER JOIN products p ON si2.product_id = p.id
                INNER JOIN categories c ON p.category_id = c.id
                WHERE si1.product_id IN (${productIds.map(() => '?').join(',')})
                    AND si2.product_id NOT IN (${productIds.map(() => '?').join(',')})
                    AND p.active = 1
                    AND s.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
                GROUP BY p.id, p.name, p.category_id, p.price
                ORDER BY co_occurrence DESC
                LIMIT ?
            `;

            const results = await dbService.raw(query, [...productIds, ...productIds, limit * 2]);

            // Filtrar y puntuar basado en complementariedad
            const recommendations = results
                .map(item => ({
                    productId: item.id,
                    name: item.name,
                    price: item.price,
                    categoryId: item.category_id,
                    categories: item.categories,
                    coOccurrence: item.co_occurrence,
                    recommendationType: this.TYPES.CROSS_SELL,
                    complementaryScore: this.calculateComplementaryScore(item, cartItems)
                }))
                .sort((a, b) => b.complementaryScore - a.complementaryScore)
                .slice(0, limit);

            return {
                success: true,
                cartSummary: {
                    itemCount: cartItems.length,
                    totalValue: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                },
                recommendations
            };
        } catch (error) {
            logger.error('Error obteniendo recomendaciones de cross-selling:', error);
            return { success: false, recommendations: [] };
        }
    }

    /**
     * Sistema híbrido de recomendación
     */
    async hybridRecommendation(inputs) {
        const { collaborative, contentBased, popularItems, customerHistory } = inputs;
        const hybridScores = new Map();

        // Combinar scores de diferentes métodos
        for (const item of collaborative) {
            const existing = hybridScores.get(item.productId) || { productId: item.productId, score: 0 };
            existing.score += item.score * this.weights.collaborative;
            hybridScores.set(item.productId, existing);
        }

        for (const item of contentBased) {
            const existing = hybridScores.get(item.productId) || { productId: item.productId, score: 0 };
            existing.score += item.score * this.weights.content;
            hybridScores.set(item.productId, existing);
        }

        for (const item of popularItems) {
            const existing = hybridScores.get(item.productId) || { productId: item.productId, score: 0 };
            existing.score += (item.trendingScore / 100) * this.weights.popularity;
            hybridScores.set(item.productId, existing);
        }

        // Aplicar factor de recencia
        const recentProducts = await this.getRecentProducts();
        for (const item of recentProducts) {
            const existing = hybridScores.get(item.productId);
            if (existing) {
                existing.score += item.recencyScore * this.weights.recency;
            }
        }

        // Convertir a array y ordenar
        return Array.from(hybridScores.values())
            .sort((a, b) => b.score - a.score);
    }

    /**
     * Enriquece las recomendaciones con información adicional
     */
    async enrichRecommendations(recommendations) {
        const enriched = [];

        for (const rec of recommendations) {
            try {
                const product = await dbService.findById('products', rec.productId);
                if (product) {
                    enriched.push({
                        ...rec,
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        stock: product.stock,
                        categoryId: product.category_id,
                        confidence: Math.round((rec.score || 0.5) * 100),
                        reason: this.generateRecommendationReason(rec)
                    });
                }
            } catch (error) {
                logger.error(`Error enriqueciendo recomendación para producto ${rec.productId}:`, error);
            }
        }

        return enriched;
    }

    /**
     * Genera una explicación para la recomendación
     */
    generateRecommendationReason(recommendation) {
        if (recommendation.method === 'collaborative') {
            return 'Clientes con gustos similares también compraron este producto';
        } else if (recommendation.method === 'content_based') {
            return 'Basado en tus compras anteriores';
        } else if (recommendation.recommendationType === this.TYPES.FREQUENTLY_BOUGHT) {
            return `Frecuentemente comprado junto con tu selección`;
        } else if (recommendation.recommendationType === this.TYPES.TRENDING) {
            return 'Producto popular en este momento';
        } else if (recommendation.recommendationType === this.TYPES.UPSELL) {
            return 'Alternativa premium recomendada';
        } else if (recommendation.recommendationType === this.TYPES.CROSS_SELL) {
            return 'Complementa perfectamente tu selección';
        } else {
            return 'Recomendado para ti';
        }
    }

    /**
     * Utilidades auxiliares
     */

    async getCustomerPurchaseHistory(customerId, limit = 50) {
        try {
            const query = `
                SELECT
                    si.product_id,
                    si.quantity,
                    si.price,
                    p.category_id,
                    p.name,
                    s.created_at
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                INNER JOIN products p ON si.product_id = p.id
                WHERE s.customer_id = ?
                    AND s.status != 'cancelled'
                ORDER BY s.created_at DESC
                LIMIT ?
            `;

            return await dbService.raw(query, [customerId, limit]);
        } catch (error) {
            logger.error('Error obteniendo historial del cliente:', error);
            return [];
        }
    }

    async getUserProducts(userId) {
        try {
            const query = `
                SELECT DISTINCT si.product_id
                FROM sale_items si
                INNER JOIN sales s ON si.sale_id = s.id
                WHERE s.customer_id = ?
                    AND s.status != 'cancelled'
            `;

            return await dbService.raw(query, [userId]);
        } catch (error) {
            return [];
        }
    }

    async getPopularProducts() {
        const trending = await this.getTrendingProducts(20);
        return trending.recommendations || [];
    }

    async getRecentProducts() {
        try {
            const query = `
                SELECT
                    id as product_id,
                    DATEDIFF(NOW(), created_at) as days_old,
                    EXP(-DATEDIFF(NOW(), created_at) / 7) as recency_score
                FROM products
                WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    AND active = 1
            `;

            return await dbService.raw(query);
        } catch (error) {
            return [];
        }
    }

    calculateJaccardSimilarity(set1, set2) {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    calculateContentScore(item, categoryPreferences, priceRange) {
        let score = 0;

        // Puntuación por categoría
        if (categoryPreferences[item.category_id]) {
            score += 0.5 * (categoryPreferences[item.category_id] /
                Object.values(categoryPreferences).reduce((a, b) => a + b, 0));
        }

        // Puntuación por proximidad de precio
        const priceDiff = Math.abs(item.price - priceRange.avg);
        const priceScore = 1 / (1 + priceDiff / priceRange.avg);
        score += 0.5 * priceScore;

        return score;
    }

    calculateLift(confidence, support) {
        // Lift = confidence / support del consecuente
        // Un lift > 1 indica asociación positiva
        return support > 0 ? confidence / support : 0;
    }

    calculateUpsellValue(upsellProduct, originalProduct) {
        const priceIncrease = (upsellProduct.price - originalProduct.price) / originalProduct.price;
        const salesScore = Math.min(1, upsellProduct.sales_count / 100);
        const ratingScore = (upsellProduct.avg_rating || 3) / 5;

        // Valor óptimo: incremento de precio moderado con buenas ventas y ratings
        return (1 - Math.abs(priceIncrease - 0.3)) * salesScore * ratingScore;
    }

    calculateComplementaryScore(item, cartItems) {
        // Puntuación basada en co-ocurrencia y diversidad de categoría
        const cartCategories = new Set(cartItems.map(i => i.categoryId));
        const categoryDiversity = cartCategories.has(item.category_id) ? 0.5 : 1;

        return (item.co_occurrence / 10) * categoryDiversity;
    }
}

// Singleton
module.exports = new RecommendationEngine();